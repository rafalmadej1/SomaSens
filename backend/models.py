import enum
from typing import List

from pydantic import BaseModel, Field
from sqlalchemy import Column, DateTime, Integer, String, Enum, ForeignKey, Float, Index
from sqlalchemy.orm import relationship
from backend.database import Base


class LocationEnum(str, enum.Enum):
    LODOWKA = "lodowka"
    SPIZARNIA = "spizarnia"
    ZAMRAZARKA = "zamrazarka"


class UnitEnum(str, enum.Enum):
    GRAMS = "g"
    PIECES = "szt"


class PantryItemCreate(BaseModel):
    name: str = Field(..., max_length=50)
    quantity: int = Field(gt=0)
    unit: UnitEnum = UnitEnum.GRAMS
    location: LocationEnum
    expirationDate: str = Field(..., max_length=20)


class ItemConsume(BaseModel):
    name: str
    quantity_used: int = Field(gt=0)


class ConsumptionResponse(BaseModel):
    updated_items: List[dict]
    warnings: List[str]
    missing_items: List[str]


class ActivityCreate(BaseModel):
    activity_type: str = Field(..., max_length=100)
    calories_burned: int = Field(gt=0)
    duration_minutes: int = Field(gt=0)
    date: str = Field(..., max_length=20)


class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    items = relationship("PantryItemDB", back_populates="owner")
    activities = relationship("ActivityDB", back_populates="owner")
    plans = relationship("PlanDB", back_populates="owner")
    profile = relationship("UserProfileDB", back_populates="owner", uselist=False)

class UserProfileDB(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    age = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    gender = Column(String(50), nullable=True)
    goal = Column(String(100), nullable=True)
    activity_level = Column(String(100), nullable=True)
    dietary_preferences = Column(String, nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id"), unique=True)
    owner = relationship("UserDB", back_populates="profile")

class PantryItemDB(Base):
    __tablename__ = "pantry_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50))
    quantity = Column(Integer)
    unit = Column(Enum(UnitEnum), default=UnitEnum.GRAMS)
    location = Column(Enum(LocationEnum), default=LocationEnum.SPIZARNIA)
    expirationDate = Column(String(20))
    owner_id = Column(Integer, ForeignKey("users.id"), index=True)
    owner = relationship("UserDB", back_populates="items")


class ActivityDB(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    activity_type = Column(String(100))
    calories_burned = Column(Integer)
    duration_minutes = Column(Integer)
    date = Column(String(20))
    
    owner_id = Column(Integer, ForeignKey("users.id"), index=True)
    owner = relationship("UserDB", back_populates="activities")


class PlanDB(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_type = Column(String(50), index=True)
    content = Column(String)
    created_at = Column(String(50))
    
    owner_id = Column(Integer, ForeignKey("users.id"), index=True)
    owner = relationship("UserDB", back_populates="plans")


class RevokedTokenDB(Base):
    __tablename__ = "revoked_tokens"

    jti = Column(String(36), primary_key=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)


Index(
    "ix_plans_owner_type_id",
    PlanDB.owner_id,
    PlanDB.plan_type,
    PlanDB.id,
)
