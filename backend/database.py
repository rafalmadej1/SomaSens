import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Ścieżka do pliku bazy (bezwzględna)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "fitness_app.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# 2. Silnik bazy danych
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 3. Sesja (to nasze "okno" do bazy)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Baza (klasa-matka dla wszystkich modeli)
Base = declarative_base()


def create_schema():
    """Create tables and add indexes for databases created before new indexes existed."""
    Base.metadata.create_all(bind=engine)
    for table in Base.metadata.tables.values():
        for index in table.indexes:
            index.create(bind=engine, checkfirst=True)


# Funkcja do obsługi sesji bazy (Dependency Injection)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
