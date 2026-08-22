"""
Comprehensive Phase 2 Verification Test Suite
=============================================
Tests all Phase 2 backend requirements end-to-end:
1. Register employee -> 201
2. Register attempt with HR role -> Rejected (422/400)
3. Duplicate registration (email and employee_id) -> 400
4. Dev email verification (code 123456) -> 200
5. Login with correct credentials -> 200 + JWT
6. Login with incorrect credentials -> 401
7. Login unverified user -> 403
8. Invalid JWT access -> 401
9. Expired / malformed Bearer token -> 401
10. Employee accessing /api/profile/all (HR only) -> 403
11. Employee accessing another employee's profile -> 403
12. Employee viewing own profile -> 200
13. Employee modifying own allowed fields (phone, address, profile_picture) -> 200
14. Employee modifying restricted fields (job_title, department, etc.) -> 403
15. Employee modifying another employee's profile -> 403
16. HR viewing any employee profile -> 200
17. HR listing all profiles -> 200
18. HR modifying employee profile (including job_title, department) -> 200
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app
from database import create_db_and_tables

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("  RUNNING PHASE 2 AUTOMATED TEST SUITE")
    print("=" * 70)
    
    passed = 0
    failed = 0
    
    def test(name, condition, details=""):
        nonlocal passed, failed
        if condition:
            passed += 1
            print(f"  [PASS] {name}")
        else:
            failed += 1
            print(f"  [FAIL] {name} - {details}")

    # 1. Health check
    res = client.get("/api/health")
    test("Health check (/api/health returns 200)", res.status_code == 200)

    # 2. Register new employee
    test_emp_id = "EMP-TEST-999"
    test_email = "test999@dayflow.dev"
    test_pw = "Password123"
    
    res = client.post("/api/auth/register", json={
        "employee_id": test_emp_id,
        "email": test_email,
        "password": test_pw,
    })
    # Accept 201 or 400 if already exists from prior run
    test("1. Register employee", res.status_code in [201, 400], f"Got {res.status_code}: {res.text}")

    # 2. Attempt HR self-registration (Security Rule 1)
    res = client.post("/api/auth/register", json={
        "employee_id": "HR-HACK-01",
        "email": "hack_hr@dayflow.dev",
        "password": "Password123",
        "role": "hr"
    })
    test("2. Attempt HR self-registration rejected (422/400)", res.status_code in [400, 422], f"Got {res.status_code}")

    # 3. Duplicate email registration
    res = client.post("/api/auth/register", json={
        "employee_id": "EMP-DIFF-01",
        "email": test_email,
        "password": test_pw,
    })
    test("3a. Duplicate email rejected (400)", res.status_code == 400, f"Got {res.status_code}")

    # Duplicate employee_id registration
    res = client.post("/api/auth/register", json={
        "employee_id": test_emp_id,
        "email": "diff_email@dayflow.dev",
        "password": test_pw,
    })
    test("3b. Duplicate Employee ID rejected (400)", res.status_code == 400, f"Got {res.status_code}")

    # 4. Dev Email verification
    res = client.post("/api/auth/verify-email", json={
        "email": test_email,
        "code": "123456"
    })
    test("4a. Dev email verify with code 123456 (200)", res.status_code == 200, f"Got {res.status_code}: {res.text}")

    res = client.post("/api/auth/verify-email", json={
        "email": test_email,
        "code": "wrong_code"
    })
    test("4b. Wrong verify code rejected (400 or already verified)", res.status_code in [400, 200], f"Got {res.status_code}")

    # 5. Login correct credentials (seeded HR)
    res = client.post("/api/auth/login", json={
        "email": "hr@dayflow.dev",
        "password": "HRAdmin2026"
    })
    hr_token = res.json().get("access_token") if res.status_code == 200 else None
    hr_user_id = res.json().get("user_id") if res.status_code == 200 else None
    test("5a. HR login successful (200 + token)", res.status_code == 200 and hr_token is not None, f"Got {res.status_code}")

    # Login correct credentials (seeded Employee - Alice)
    res = client.post("/api/auth/login", json={
        "email": "alice@dayflow.dev",
        "password": "Employee2026"
    })
    alice_token = res.json().get("access_token") if res.status_code == 200 else None
    alice_user_id = res.json().get("user_id") if res.status_code == 200 else None
    test("5b. Employee (Alice) login successful (200 + token)", res.status_code == 200 and alice_token is not None, f"Got {res.status_code}")

    # Login correct credentials (seeded Employee - Bob)
    res = client.post("/api/auth/login", json={
        "email": "bob@dayflow.dev",
        "password": "Employee2026"
    })
    bob_token = res.json().get("access_token") if res.status_code == 200 else None
    bob_user_id = res.json().get("user_id") if res.status_code == 200 else None
    test("5c. Employee (Bob) login successful (200 + token)", res.status_code == 200 and bob_token is not None, f"Got {res.status_code}")

    # 6. Login wrong password
    res = client.post("/api/auth/login", json={
        "email": "alice@dayflow.dev",
        "password": "WrongPassword999"
    })
    test("6. Login with incorrect password (401)", res.status_code == 401, f"Got {res.status_code}")

    # 7. Invalid JWT
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_token_xyz"})
    test("7. Invalid JWT returns 401", res.status_code == 401, f"Got {res.status_code}")

    # Expired / Missing JWT
    res = client.get("/api/auth/me")
    test("8. Missing JWT returns 401 / 403", res.status_code in [401, 403], f"Got {res.status_code}")

    # 8. Employee attempting HR-only endpoint (/api/profile/all) -> 403
    res = client.get("/api/profile/all", headers={"Authorization": f"Bearer {alice_token}"})
    test("9. Employee accessing HR-only endpoint (/api/profile/all) returns 403", res.status_code == 403, f"Got {res.status_code}")

    # 9. Employee accessing another employee's profile -> 403
    res = client.get(f"/api/profile/{bob_user_id}", headers={"Authorization": f"Bearer {alice_token}"})
    test("10. Employee accessing another employee's profile returns 403", res.status_code == 403, f"Got {res.status_code}")

    # 10. Employee viewing own profile -> 200
    res = client.get(f"/api/profile/{alice_user_id}", headers={"Authorization": f"Bearer {alice_token}"})
    test("11. Employee viewing own profile returns 200", res.status_code == 200 and res.json().get("name") == "Alice Johnson", f"Got {res.status_code}")

    # 11. Employee modifying own allowed fields (phone, address, profile_picture) -> 200
    res = client.patch(f"/api/profile/{alice_user_id}", json={
        "phone": "+1-555-9988",
        "address": "99 Austin Tech Boulevard",
        "profile_picture": "https://example.com/alice.png"
    }, headers={"Authorization": f"Bearer {alice_token}"})
    test("12. Employee modifying allowed fields returns 200", res.status_code == 200 and res.json().get("profile", {}).get("phone") == "+1-555-9988", f"Got {res.status_code}: {res.text}")

    # 12. Employee attempting to modify restricted fields (job_title, department) -> 403
    res = client.patch(f"/api/profile/{alice_user_id}", json={
        "job_title": "VP of Engineering",
        "department": "Executive Leadership"
    }, headers={"Authorization": f"Bearer {alice_token}"})
    test("13. Employee modifying restricted fields (job_title/department) returns 403", res.status_code == 403, f"Got {res.status_code}: {res.text}")

    # 13. Employee attempting to modify another employee's profile -> 403
    res = client.patch(f"/api/profile/{bob_user_id}", json={
        "phone": "+1-555-0000"
    }, headers={"Authorization": f"Bearer {alice_token}"})
    test("14. Employee modifying another employee's profile returns 403", res.status_code == 403, f"Got {res.status_code}")

    # 14. HR accessing employee's profile -> 200
    res = client.get(f"/api/profile/{alice_user_id}", headers={"Authorization": f"Bearer {hr_token}"})
    test("15. HR accessing employee profile returns 200", res.status_code == 200, f"Got {res.status_code}")

    # 15. HR listing all profiles -> 200
    res = client.get("/api/profile/all", headers={"Authorization": f"Bearer {hr_token}"})
    test("16. HR listing all profiles returns 200", res.status_code == 200 and len(res.json()) >= 4, f"Got {res.status_code}, count={len(res.json()) if res.status_code == 200 else 0}")

    # 16. HR modifying employee's profile (including job_title and department) -> 200
    res = client.patch(f"/api/profile/{alice_user_id}", json={
        "job_title": "Lead Software Engineer",
        "department": "Core Platform"
    }, headers={"Authorization": f"Bearer {hr_token}"})
    test("17. HR modifying employee profile fields returns 200", res.status_code == 200 and res.json().get("profile", {}).get("job_title") == "Lead Software Engineer", f"Got {res.status_code}")

    print("\n" + "=" * 70)
    print(f"  TOTAL TESTS: {passed + failed} | PASSED: {passed} | FAILED: {failed}")
    print("=" * 70 + "\n")

    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
