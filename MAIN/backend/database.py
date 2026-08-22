from sqlmodel import SQLModel, create_engine, Session
import os

DB_PATH = os.path.join("/tmp", "dayflow_hrms.db")
sqlite_url = f"sqlite:///{DB_PATH}"

engine = create_engine(sqlite_url, connect_args={"check_same_thread": False}, echo=False)

def create_db_and_tables():
    import models
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
