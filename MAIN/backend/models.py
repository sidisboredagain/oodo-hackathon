from typing import Optional, List
import datetime
from sqlmodel import SQLModel, Field, Relationship

class RoleEnum:
    EMPLOYEE = "employee"
    HR = "hr"

class LeaveStatusEnum:
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class AttendanceStatusEnum:
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half-day"
    LEAVE = "leave"

# User table for authentication & credentials
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    role: str = Field(default=RoleEnum.EMPLOYEE)  # 'employee' or 'hr'
    email_verified: bool = Field(default=False)
    verification_code: Optional[str] = Field(default="123456")  # Dev verification code
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

    # Relationships
    profile: Optional["EmployeeProfile"] = Relationship(back_populates="user")
    attendances: List["Attendance"] = Relationship(back_populates="user")
    leave_requests: List["LeaveRequest"] = Relationship(back_populates="user")
    payroll: Optional["Payroll"] = Relationship(back_populates="user")
    notifications: List["Notification"] = Relationship(back_populates="user")
    documents: List["Document"] = Relationship(back_populates="user")

# Detailed profile for employees
class EmployeeProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    name: str
    phone: Optional[str] = Field(default="")
    address: Optional[str] = Field(default="")
    profile_picture: Optional[str] = Field(default="")
    job_title: str = Field(default="Team Member")
    department: str = Field(default="General")
    joining_date: datetime.date = Field(default_factory=datetime.date.today)
    employment_status: str = Field(default="Full-Time") # Full-Time, Part-Time, Contract

    user: Optional[User] = Relationship(back_populates="profile")

# Daily attendance record
class Attendance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    date: datetime.date = Field(default_factory=datetime.date.today, index=True)
    check_in: Optional[datetime.datetime] = Field(default=None)
    check_out: Optional[datetime.datetime] = Field(default=None)
    status: str = Field(default=AttendanceStatusEnum.PRESENT) # present, absent, half-day, leave
    working_hours: Optional[float] = Field(default=0.0)

    user: Optional[User] = Relationship(back_populates="attendances")

# Leave requests & approval workflow
class LeaveRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    leave_type: str  # Paid, Sick, Unpaid
    start_date: datetime.date
    end_date: datetime.date
    remarks: Optional[str] = Field(default="")
    status: str = Field(default=LeaveStatusEnum.PENDING)  # pending, approved, rejected
    admin_comment: Optional[str] = Field(default="")
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    reviewed_at: Optional[datetime.datetime] = Field(default=None)

    user: Optional[User] = Relationship(back_populates="leave_requests")

# Payroll & salary structure
class Payroll(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    base_salary: float = Field(default=0.0)
    allowances: float = Field(default=0.0)
    deductions: float = Field(default=0.0)
    net_salary: float = Field(default=0.0)
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

    user: Optional[User] = Relationship(back_populates="payroll")

# Internal Notifications
class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str
    message: str
    read: bool = Field(default=False)
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

    user: Optional[User] = Relationship(back_populates="notifications")

# Employee Documents
class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    document_name: str
    file_type: str  # PDF, PNG, DOCX, etc.
    document_url: str
    uploaded_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

    user: Optional[User] = Relationship(back_populates="documents")
