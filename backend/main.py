import datetime
import os
from fastapi import FastAPI, Depends, HTTPException, status, Request, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.responses import JSONResponse
import backend.models as models
import backend.database as database
import backend.auth as auth
from pydantic import BaseModel, Field, EmailStr, field_validator
import backend.ai_service as ai_service

app = FastAPI(title="SomaSense API")

# Initialize database tables and indexes
database.create_schema()

DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 250
AI_CONTEXT_ITEM_LIMIT = 100
AI_CONTEXT_ACTIVITY_LIMIT = 30

# Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda request, exc: JSONResponse(
    status_code=429,
    content={"detail": "Too many requests. Please try again later."},
))

# CORS Configuration - Restrict to specific origin
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # Allow swagger UI to work (iframe for /docs)
    if not request.url.path.startswith("/docs") and not request.url.path.startswith("/openapi"):
        response.headers["X-Frame-Options"] = "DENY"
    return response


# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=auth.MIN_PASSWORD_LENGTH, max_length=auth.MAX_PASSWORD_BYTES)

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, password: str) -> str:
        if not auth.has_valid_password_length(password):
            raise ValueError(
                f"Password must be at least {auth.MIN_PASSWORD_LENGTH} characters and no more than {auth.MAX_PASSWORD_BYTES} bytes."
            )
        return password


class Token(BaseModel):
    access_token: str
    token_type: str


class PantryItemCreate(BaseModel):
    name: str = Field(..., max_length=50)
    quantity: int = Field(gt=0)
    unit: models.UnitEnum = models.UnitEnum.GRAMS
    location: models.LocationEnum
    expirationDate: str = Field(..., max_length=20)


class ActivityCreate(BaseModel):
    activity_type: str = Field(..., max_length=100)
    calories_burned: int = Field(gt=0)
    duration_minutes: int = Field(gt=0)
    date: str = Field(..., max_length=20)


class UserProfileUpdate(BaseModel):
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    gender: Optional[str] = None
    goal: Optional[str] = None
    activity_level: Optional[str] = None
    dietary_preferences: Optional[str] = None


class WorkoutRequest(BaseModel):
    goal: Optional[str] = None
    age: Optional[int] = None
    weight: Optional[float] = None
    activityLevel: Optional[str] = None
    injuries: Optional[str] = None
    discipline: Optional[str] = None
    equipment: Optional[str] = None
    focus_areas: Optional[str] = None


class ShoppingRequest(BaseModel):
    workout_plan: Optional[str] = None
    days: Optional[int] = Field(default=7, ge=1, le=30)
    budget: Optional[float] = None
    avoids: Optional[str] = None
    preferences: Optional[str] = None


class ItemConsume(BaseModel):
    name: str
    quantity_used: int = Field(gt=0)


class ConsumptionResponse(BaseModel):
    updated_items: List[dict]
    warnings: List[str]
    missing_items: List[str]


# --- Auth Endpoints ---


@app.post("/auth/register", response_model=Token)
@limiter.limit("5/minute")
def register(request: Request, user_data: UserCreate, db: Session = Depends(database.get_db)):
    db_user = (
        db.query(models.UserDB).filter(models.UserDB.email == user_data.email).first()
    )
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = auth.get_password_hash(user_data.password)
    new_user = models.UserDB(email=user_data.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = auth.create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/auth/token", response_model=Token)
@limiter.limit("5/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db),
):
    user = (
        db.query(models.UserDB)
        .filter(models.UserDB.email == form_data.username)
        .first()
    )
    password_hash = user.hashed_password if user else auth.DUMMY_PASSWORD_HASH
    password_is_valid = auth.has_valid_password_length(form_data.password)
    password_matches = auth.verify_password(form_data.password, password_hash) if password_is_valid else False
    if not user or not password_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    token: str = Depends(auth.oauth2_scheme),
    _current_user: models.UserDB = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    auth.revoke_access_token(token, db)


# --- Protected Endpoints ---


@app.post("/items")
def create_item(
    item: PantryItemCreate,
    db: Session = Depends(database.get_db),
    current_user: models.UserDB = Depends(auth.get_current_user),
):
    new_item = models.PantryItemDB(
        name=item.name,
        quantity=item.quantity,
        unit=item.unit,
        location=item.location,
        expirationDate=item.expirationDate,
        owner_id=current_user.id,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@app.get("/items")
def list_items(
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    offset: int = Query(0, ge=0),
    db: Session = Depends(database.get_db),
    current_user: models.UserDB = Depends(auth.get_current_user),
):
    return (
        db.query(models.PantryItemDB)
        .filter(models.PantryItemDB.owner_id == current_user.id)
        .order_by(models.PantryItemDB.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@app.delete("/items/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.UserDB = Depends(auth.get_current_user),
):
    db_item = (
        db.query(models.PantryItemDB)
        .filter(
            models.PantryItemDB.id == item_id,
            models.PantryItemDB.owner_id == current_user.id,
        )
        .first()
    )
    if not db_item:
        raise HTTPException(
            status_code=404, detail="Product not found or access denied"
        )
    db.delete(db_item)
    db.commit()
    return {"message": "Success"}


@app.post("/items/consume", response_model=ConsumptionResponse)
def consume_items(
    consumption: List[ItemConsume],
    db: Session = Depends(database.get_db),
    current_user: models.UserDB = Depends(auth.get_current_user),
):
    warnings = []
    missing_items = []
    updated_list = []

    requested_names = {item.name.lower() for item in consumption}
    db_items = (
        db.query(models.PantryItemDB)
        .filter(
            models.PantryItemDB.owner_id == current_user.id,
            func.lower(models.PantryItemDB.name).in_(requested_names),
        )
        .all()
    )
    items_by_name = {}
    for db_item in db_items:
        items_by_name.setdefault(db_item.name.lower(), db_item)

    for req_item in consumption:
        db_item = items_by_name.get(req_item.name.lower())

        if not db_item:
            missing_items.append(req_item.name)
            continue

        if db_item.quantity is None:
            warnings.append(f"Product {db_item.name}: quantity is undefined.")
            continue

        item_quantity = db_item.quantity
        unit_label = db_item.unit.value  # type: ignore
        if item_quantity < req_item.quantity_used:  # type: ignore
            shortage = req_item.quantity_used - item_quantity
            warnings.append(
                f"Product {db_item.name}: used more than available (missing {shortage}{unit_label})."
            )
            db_item.quantity = 0  # type: ignore
        else:
            new_qty = item_quantity - req_item.quantity_used
            db_item.quantity = new_qty  # type: ignore
            threshold = 50 if db_item.unit == models.UnitEnum.GRAMS else 1  # type: ignore
            if new_qty <= threshold:  # type: ignore
                warnings.append(
                    f"Product {db_item.name}: low stock ({new_qty}{unit_label})."
                )

        updated_list.append(
            {
                "id": db_item.id,
                "name": db_item.name,
                "new_quantity": db_item.quantity,
                "unit": db_item.unit,
            }
        )

    db.commit()
    return {
        "updated_items": updated_list,
        "warnings": warnings,
        "missing_items": missing_items,
    }


@app.get("/profile")
def get_profile(
    db: Session = Depends(database.get_db),
    current_user: models.UserDB = Depends(auth.get_current_user),
):
    profile = (
        db.query(models.UserProfileDB)
        .filter(models.UserProfileDB.owner_id == current_user.id)
        .first()
    )
    if not profile:
        profile = models.UserProfileDB(owner_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@app.put("/profile")
def update_profile(
    profile_data: UserProfileUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.UserDB = Depends(auth.get_current_user),
):
    profile = (
        db.query(models.UserProfileDB)
        .filter(models.UserProfileDB.owner_id == current_user.id)
        .first()
    )
    if not profile:
        profile = models.UserProfileDB(owner_id=current_user.id)
        db.add(profile)

    for key, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile


@app.get("/activities")
def list_activities(
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    offset: int = Query(0, ge=0),
    db: Session = Depends(database.get_db),
    current_user: models.UserDB = Depends(auth.get_current_user),
):
    return (
        db.query(models.ActivityDB)
        .filter(models.ActivityDB.owner_id == current_user.id)
        .order_by(models.ActivityDB.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@app.post("/activities")
def create_activity(
    activity: ActivityCreate,
    db: Session = Depends(database.get_db),
    current_user: models.UserDB = Depends(auth.get_current_user),
):
    new_activity = models.ActivityDB(
        activity_type=activity.activity_type,
        calories_burned=activity.calories_burned,
        duration_minutes=activity.duration_minutes,
        date=activity.date,
        owner_id=current_user.id,
    )
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    return new_activity


@app.delete("/activities/{activity_id}")
def delete_activity(
    activity_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.UserDB = Depends(auth.get_current_user),
):
    db_activity = (
        db.query(models.ActivityDB)
        .filter(
            models.ActivityDB.id == activity_id,
            models.ActivityDB.owner_id == current_user.id,
        )
        .first()
    )
    if not db_activity:
        raise HTTPException(
            status_code=404, detail="Activity not found or access denied"
        )
    db.delete(db_activity)
    db.commit()
    return {"message": "Success"}


@app.get("/ai/last_plan/{plan_type}")
def get_last_plan(
    plan_type: str,
    db: Session = Depends(database.get_db),
    current_user: models.UserDB = Depends(auth.get_current_user),
):
    plan = (
        db.query(models.PlanDB)
        .filter(
            models.PlanDB.plan_type == plan_type,
            models.PlanDB.owner_id == current_user.id,
        )
        .order_by(models.PlanDB.id.desc())
        .first()
    )
    if not plan:
        return {"plan": None}
    return {"plan": plan.content, "created_at": plan.created_at}


@app.post("/ai/diet")
def get_diet_plan(
    db: Session = Depends(database.get_db),
    current_user: models.UserDB = Depends(auth.get_current_user),
):
    items = (
        db.query(models.PantryItemDB)
        .filter(models.PantryItemDB.owner_id == current_user.id)
        .order_by(models.PantryItemDB.expirationDate.asc(), models.PantryItemDB.id.asc())
        .limit(AI_CONTEXT_ITEM_LIMIT)
        .all()
    )
    if not items:
        raise HTTPException(status_code=400, detail="Inventory is empty.")

    activities = (
        db.query(models.ActivityDB)
        .filter(models.ActivityDB.owner_id == current_user.id)
        .order_by(models.ActivityDB.id.desc())
        .limit(AI_CONTEXT_ACTIVITY_LIMIT)
        .all()
    )
    profile = (
        db.query(models.UserProfileDB)
        .filter(models.UserProfileDB.owner_id == current_user.id)
        .first()
    )

    pantry_list = [
        {"name": i.name, "quantity": i.quantity, "unit": i.unit.value} for i in items
    ]
    activity_list = [
        {
            "type": a.activity_type,
            "calories": a.calories_burned,
            "duration": a.duration_minutes,
            "date": a.date,
        }
        for a in activities
    ]

    profile_context = ""
    if profile:
        profile_parts = []
        if profile.gender:  # type: ignore
            profile_parts.append(f"Gender: {profile.gender}")
        if profile.age:  # type: ignore
            profile_parts.append(f"Age: {profile.age}")
        if profile.weight:  # type: ignore
            profile_parts.append(f"Weight: {profile.weight}kg")
        if profile.height:  # type: ignore
            profile_parts.append(f"Height: {profile.height}cm")
        if profile.goal:  # type: ignore
            profile_parts.append(f"Goal: {profile.goal}")
        if profile.dietary_preferences:  # type: ignore
            profile_parts.append(f"Preferences: {profile.dietary_preferences}")
        if profile_parts:
            profile_context = ", ".join(profile_parts)

    plan = ai_service.generate_diet_plan(pantry_list, activity_list, profile_context)

    new_plan = models.PlanDB(
        plan_type="diet",
        content=plan,
        created_at=datetime.datetime.now().isoformat(),
        owner_id=current_user.id,
    )
    db.add(new_plan)
    db.commit()
    return {"plan": plan}


@app.post("/ai/workout")
def get_workout_plan(
    request: WorkoutRequest,
    db: Session = Depends(database.get_db),
    current_user: models.UserDB = Depends(auth.get_current_user),
):
    user_data = request.model_dump()
    profile = (
        db.query(models.UserProfileDB)
        .filter(models.UserProfileDB.owner_id == current_user.id)
        .first()
    )

    if profile:
        # Profile data overrides or fills missing request data
        if profile.age:  # type: ignore
            user_data["age"] = profile.age
        if profile.weight:  # type: ignore
            user_data["weight"] = profile.weight
        if profile.goal:  # type: ignore
            user_data["goal"] = profile.goal
        if profile.activity_level:  # type: ignore
            user_data["activityLevel"] = profile.activity_level
        if profile.gender:  # type: ignore
            user_data["gender"] = profile.gender
        if profile.height:  # type: ignore
            user_data["height"] = profile.height

    # Validation: Ensure we have a goal either from request or profile
    if not user_data.get("goal"):
        raise HTTPException(
            status_code=400,
            detail="Goal not defined. Please set 'Primary Goal' in your profile.",
        )

    plan = ai_service.generate_workout_plan(user_data)

    new_plan = models.PlanDB(
        plan_type="workout",
        content=plan,
        created_at=datetime.datetime.now().isoformat(),
        owner_id=current_user.id,
    )
    db.add(new_plan)
    db.commit()
    return {"plan": plan}


@app.post("/ai/shopping")
def get_shopping_list(
    request: ShoppingRequest,
    db: Session = Depends(database.get_db),
    current_user: models.UserDB = Depends(auth.get_current_user),
):
    items = (
        db.query(models.PantryItemDB)
        .filter(models.PantryItemDB.owner_id == current_user.id)
        .order_by(models.PantryItemDB.expirationDate.asc(), models.PantryItemDB.id.asc())
        .limit(AI_CONTEXT_ITEM_LIMIT)
        .all()
    )
    pantry_list = [
        {"name": i.name, "quantity": i.quantity, "unit": i.unit.value} for i in items
    ]

    list_content = ai_service.generate_shopping_list(
        pantry_items=pantry_list,
        workout_plan=request.workout_plan,
        days=request.days if request.days is not None else 7,
        budget=request.budget,
        avoids=request.avoids,
        preferences=request.preferences,
    )

    # Save to database
    new_plan = models.PlanDB(
        plan_type="shopping",
        content=list_content,
        created_at=datetime.datetime.now().isoformat(),
        owner_id=current_user.id,
    )
    db.add(new_plan)
    db.commit()

    return {"plan": list_content}

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0", port=8000)