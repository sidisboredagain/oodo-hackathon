"""Payroll & company financial overview (HR) + own salary (employee)."""
import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import Optional

from database import get_session
from models import User, EmployeeProfile, Payroll, RoleEnum
from auth import get_current_user, require_role

router = APIRouter(prefix="/payroll", tags=["Payroll"])


class SalaryUpdate(BaseModel):
    base_salary: float
    allowances: float = 0
    deductions: float = 0


@router.get("/me")
def my_salary(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    payroll = session.exec(
        select(Payroll).where(Payroll.user_id == current_user.id)
    ).first()
    if not payroll:
        return {
            "base_salary": 0,
            "allowances": 0,
            "deductions": 0,
            "net_salary": 0,
            "updated_at": None,
        }
    return {
        "base_salary": payroll.base_salary,
        "allowances": payroll.allowances,
        "deductions": payroll.deductions,
        "net_salary": payroll.net_salary,
        "updated_at": payroll.updated_at,
    }


@router.get("/company", dependencies=[Depends(require_role([RoleEnum.HR]))])
def company_payroll(session: Session = Depends(get_session)):
    """All employees' financial details + company totals."""
    employees = session.exec(select(User).where(User.role == RoleEnum.EMPLOYEE)).all()
    rows = []
    total_base = total_allow = total_ded = total_net = 0.0

    for u in employees:
        profile = session.exec(
            select(EmployeeProfile).where(EmployeeProfile.user_id == u.id)
        ).first()
        payroll = session.exec(
            select(Payroll).where(Payroll.user_id == u.id)
        ).first()
        base = payroll.base_salary if payroll else 0
        allow = payroll.allowances if payroll else 0
        ded = payroll.deductions if payroll else 0
        net = payroll.net_salary if payroll else 0
        total_base += base
        total_allow += allow
        total_ded += ded
        total_net += net
        rows.append({
            "user_id": u.id,
            "employee_id": u.employee_id,
            "name": profile.name if profile else "—",
            "department": profile.department if profile else "—",
            "job_title": profile.job_title if profile else "—",
            "base_salary": base,
            "allowances": allow,
            "deductions": ded,
            "net_salary": net,
            "updated_at": payroll.updated_at if payroll else None,
        })

    rows.sort(key=lambda r: r["net_salary"], reverse=True)
    return {
        "employees": rows,
        "company": {
            "employee_count": len(rows),
            "total_base_salary": total_base,
            "total_allowances": total_allow,
            "total_deductions": total_ded,
            "total_net_payroll": total_net,
            "average_net_salary": (total_net / len(rows)) if rows else 0,
        },
    }


@router.put("/{user_id}", dependencies=[Depends(require_role([RoleEnum.HR]))])
def update_salary(
    user_id: int,
    payload: SalaryUpdate,
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "Employee not found")
    payroll = session.exec(select(Payroll).where(Payroll.user_id == user_id)).first()
    net = payload.base_salary + payload.allowances - payload.deductions
    if not payroll:
        payroll = Payroll(
            user_id=user_id,
            base_salary=payload.base_salary,
            allowances=payload.allowances,
            deductions=payload.deductions,
            net_salary=net,
        )
    else:
        payroll.base_salary = payload.base_salary
        payroll.allowances = payload.allowances
        payroll.deductions = payload.deductions
        payroll.net_salary = net
        payroll.updated_at = datetime.datetime.utcnow()
    session.add(payroll)
    session.commit()
    session.refresh(payroll)
    return {
        "message": "Salary updated",
        "base_salary": payroll.base_salary,
        "allowances": payroll.allowances,
        "deductions": payroll.deductions,
        "net_salary": payroll.net_salary,
    }
