import sys
import os
import datetime

sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("  DAYFLOW HRMS - COMPREHENSIVE END-TO-END BACKEND TEST SUITE")
    print("=" * 70)

    passed = 0
    failed = 0

    def check(name, condition, details=""):
        nonlocal passed, failed
        if condition:
            passed += 1
            print(f"  [PASS] {name}")
        else:
            failed += 1
            print(f"  [FAIL] {name} - {details}")

    # 1. Login HR
    res = client.post("/api/auth/login", json={
        "email": "hr@dayflow.dev",
        "password": "HRAdmin2026"
    })
    check("HR Login", res.status_code == 200)
    hr_token = res.json().get("access_token")
    hr_headers = {"Authorization": f"Bearer {hr_token}"}

    # 2. Login Employee (Alice)
    res = client.post("/api/auth/login", json={
        "email": "alice@dayflow.dev",
        "password": "Employee2026"
    })
    check("Employee Login (Alice)", res.status_code == 200)
    alice_token = res.json().get("access_token")
    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    alice_id = res.json().get("user_id")

    # 3. Invalid credentials
    res = client.post("/api/auth/login", json={
        "email": "alice@dayflow.dev",
        "password": "WrongPassword!"
    })
    check("Invalid login returns 401", res.status_code == 401)

    # 4. HR Dashboard Stats
    res = client.get("/api/dashboard/hr", headers=hr_headers)
    check("HR Dashboard stats returns 200", res.status_code == 200)
    data = res.json()
    check("HR Dashboard contains total_employees >= 3", data.get("total_employees", 0) >= 3, f"data={data}")
    check("HR Dashboard contains department_summary", "department_summary" in data)

    # 5. Employee Dashboard Stats
    res = client.get("/api/dashboard/employee", headers=alice_headers)
    check("Employee Dashboard stats returns 200", res.status_code == 200)
    emp_data = res.json()
    check("Employee Dashboard contains leave_summary", "leave_summary" in emp_data)
    check("Employee Dashboard contains today_attendance", "today_attendance" in emp_data)

    # 6. Employee creates leave request
    today = datetime.date.today()
    start_date = str(today + datetime.timedelta(days=15))
    end_date = str(today + datetime.timedelta(days=17))
    res = client.post("/api/leaves/apply", json={
        "leave_type": "Paid",
        "start_date": start_date,
        "end_date": end_date,
        "remarks": "Attending technology conference"
    }, headers=alice_headers)
    check("Employee applies for leave (201)", res.status_code == 201, f"res={res.text}")
    leave_id = res.json().get("leave", {}).get("id")

    # 7. Employee viewing own leaves
    res = client.get("/api/leaves/me", headers=alice_headers)
    check("Employee views own leaves (200)", res.status_code == 200)
    my_leaves = res.json().get("requests", [])
    check("Applied leave appears in employee list", any(l["id"] == leave_id for l in my_leaves))

    # 8. HR views all leaves
    res = client.get("/api/leaves/all", headers=hr_headers)
    check("HR views all leaves (200)", res.status_code == 200)
    all_leaves = res.json()
    check("Applied leave is visible to HR", any(l["id"] == leave_id for l in all_leaves))

    # 9. HR Approves the leave request
    if leave_id:
        res = client.patch(f"/api/leaves/{leave_id}/status", json={
            "status": "approved",
            "admin_comment": "Approved. Have a great conference!"
        }, headers=hr_headers)
        check("HR approves leave request (200)", res.status_code == 200)
        check("Status is now approved", res.json().get("leave", {}).get("status") == "approved")

    # 10. Employee verifies updated leave status
    res = client.get("/api/leaves/me", headers=alice_headers)
    my_leaves_updated = res.json().get("requests", [])
    approved_leave = next((l for l in my_leaves_updated if l["id"] == leave_id), None)
    check("Employee sees approved status", approved_leave is not None and approved_leave["status"] == "approved")

    # 11. Attendance - Clock in
    # Login Bob to test attendance
    res = client.post("/api/auth/login", json={
        "email": "bob@dayflow.dev",
        "password": "Employee2026"
    })
    bob_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.get("/api/attendance/today", headers=bob_headers)
    check("Get today's attendance status (200)", res.status_code == 200)

    # 12. HR lists all employees
    res = client.get("/api/employees", headers=hr_headers)
    check("HR lists all employees (200)", res.status_code == 200 and len(res.json()) >= 4)

    # 13. HR creates new employee
    test_emp_code = f"EMP-TEST-{datetime.datetime.now().strftime('%H%M%S')}"
    res = client.post("/api/employees", json={
        "employee_id": test_emp_code,
        "name": "David Miller",
        "email": f"david.{datetime.datetime.now().strftime('%H%M%S')}@dayflow.dev",
        "password": "Password123!",
        "job_title": "QA Automation Engineer",
        "department": "Quality Assurance",
        "joining_date": str(today),
        "employment_status": "Full-Time",
        "base_salary": 75000
    }, headers=hr_headers)
    check("HR creates new employee (201)", res.status_code == 201, f"res={res.text}")
    new_user_id = res.json().get("employee", {}).get("user_id")

    # 14. Non-HR blocked from employee creation
    res = client.post("/api/employees", json={
        "employee_id": "EMP-HACK",
        "name": "Hacker",
        "email": "hack@dayflow.dev",
        "password": "Password123!"
    }, headers=alice_headers)
    check("Employee blocked from creating employees (403)", res.status_code == 403)

    # 15. HR clean up test employee
    if new_user_id:
        res = client.delete(f"/api/employees/{new_user_id}", headers=hr_headers)
        check("HR deletes test employee (200)", res.status_code == 200)

    print("\n" + "=" * 70)
    print(f"  TOTAL TESTS: {passed + failed} | PASSED: {passed} | FAILED: {failed}")
    print("=" * 70 + "\n")

    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
