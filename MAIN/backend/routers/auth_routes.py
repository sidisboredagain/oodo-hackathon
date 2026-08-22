"""
Authentication Routes
=====================
- Registration auto-generates Login ID (employee_id)
- Login uses unique Login ID (employee_id), not email
"""

import re
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlmodel import Session, select

from database import get_session
from models import User, EmployeeProfile, Payroll, RoleEnum
from auth import hash_password, verify_password, create_access_token, get_current_user
from id_generator import generate_login_id

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = ""
    department: Optional[str] = "General"
    job_title: Optional[str] = "Team Member"
    # employee_id is auto-generated — not accepted from client

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) < 2:
            raise ValueError("Full name is required.")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number.")
        return v


class LoginRequest(BaseModel):
    """Login with Login ID (employee_id) or email + password."""
    password: str
    login_id: Optional[str] = None
    email: Optional[str] = None

    @field_validator("login_id")
    @classmethod
    def clean_login_id(cls, v: Optional[str]) -> Optional[str]:
        if v is None or str(v).strip() == "":
            return None
        return str(v).strip().upper()

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None or str(v).strip() == "":
            return None
        return str(v).strip().lower()


class VerifyEmailRequest(BaseModel):
    email: str
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    employee_id: str
    user_id: int
    email: str
    name: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, session: Session = Depends(get_session)):
    if session.exec(select(User).where(User.email == request.email)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    joining = datetime.date.today()
    login_id = generate_login_id(session, request.name, joining)

    # Extremely unlikely collision — retry once
    if session.exec(select(User).where(User.employee_id == login_id)).first():
        login_id = generate_login_id(session, request.name, joining)

    user = User(
        employee_id=login_id,
        email=request.email,
        password_hash=hash_password(request.password),
        role=RoleEnum.EMPLOYEE,
        email_verified=True,  # auto-verify for smoother demo
        verification_code="123456",
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    profile = EmployeeProfile(
        user_id=user.id,
        name=request.name,
        phone=request.phone or "",
        job_title=request.job_title or "Team Member",
        department=request.department or "General",
        joining_date=joining,
    )
    session.add(profile)

    payroll = Payroll(
        user_id=user.id,
        base_salary=45000,
        allowances=5000,
        deductions=3000,
        net_salary=47000,
    )
    session.add(payroll)
    session.commit()

    return {
        "message": "Account created successfully. Use your Login ID to sign in.",
        "employee_id": user.employee_id,
        "login_id": user.employee_id,
        "email": user.email,
        "name": request.name,
        "note": f"Your unique Login ID is {user.employee_id}. Save it — you will need it to log in.",
    }


@router.post("/verify-email")
def verify_email(request: VerifyEmailRequest, session: Session = Depends(get_session)):
    email = request.email.strip().lower()
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email address.")
    if user.email_verified:
        return {"message": "Email is already verified. You may now log in."}
    if request.code != user.verification_code:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    user.email_verified = True
    session.add(user)
    session.commit()
    return {"message": "Email verified successfully. You may now log in with your Login ID."}


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, session: Session = Depends(get_session)):
    """Log in with Login ID (employee_id) OR email + password."""
    user = None
    identifier = request.login_id or request.email

    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Login ID or email is required.",
        )

    # Try employee_id / login_id first
    if request.login_id:
        user = session.exec(
            select(User).where(User.employee_id == request.login_id)
        ).first()

    # Email login (current UI still sends "email")
    if not user and request.email:
        user = session.exec(
            select(User).where(User.email == request.email)
        ).first()

    # If login_id field contains an email address
    if not user and identifier and "@" in identifier:
        user = session.exec(
            select(User).where(User.email == identifier.lower())
        ).first()

    # If login_id field contains an employee id
    if not user and identifier:
        user = session.exec(
            select(User).where(User.employee_id == identifier.upper())
        ).first()

    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials. Check your email / Login ID and password.",
    )
    if not user or not verify_password(request.password, user.password_hash):
        raise auth_error

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not verified. Please contact HR.",
        )

    profile = session.exec(
        select(EmployeeProfile).where(EmployeeProfile.user_id == user.id)
    ).first()
    name = profile.name if profile else user.employee_id

    token = create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id}
    )
    return TokenResponse(
        access_token=token,
        role=user.role,
        employee_id=user.employee_id,
        user_id=user.id,
        email=user.email,
        name=name,
    )


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    profile = session.exec(
        select(EmployeeProfile).where(EmployeeProfile.user_id == current_user.id)
    ).first()
    name = profile.name if profile else current_user.employee_id
    return {
        "user_id": current_user.id,
        "employee_id": current_user.employee_id,
        "login_id": current_user.employee_id,
        "email": current_user.email,
        "role": current_user.role,
        "email_verified": current_user.email_verified,
        "name": name,
        "created_at": current_user.created_at,
    }
