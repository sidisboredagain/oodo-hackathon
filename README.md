## 1. Introduction

Dayflow is a digital solution for managing Human Resource Management System (HRMS) for employees and Admin/HR Officers
It involves digitization of the following aspects of work:

Employee Onboarding and Profiles

Attendance
Leaves

Payroll

Approvals by Admin/HR Officers and Employees

## 2. Goals
Dayflow aims to offer:
Secure logins
Authorization and access control (Admin/HR and Employees)
Employees profiles
Attendance
Leaves and Timeoffs
Payrolls
Leave approvals
Email and notification management
Analytic reports

## 3. Roles
### Admin / HR Officer
An admin or an HR officer can:
Manage employees
View employee profiles
View attendance
View, approve, and reject leaves with comments
View payrolls information
Update salary information
View analytics and reports

### Employee
An employee can:
View his/her profile
Edit his/her profile
Clock in and out
View attendance
Apply and view leaves
View salary/payroll information
View activity feed

## 4. Features
### Authentication
This will involve:
Registering Users
Employees will provide: Employee ID, Email, and Password, and select a role (Admin/HR or Employee)
Email verification
Logging in with email and password
Error messages with invalid login credentials
Redirect to the dashboard upon successful login

### Employee Dashboard
The employee dashboard will have the following:
Profile
Attendance
Leaves
Log out
View activity feed

### Admin Dashboard
The admin dashboard will have the following:
View employees
View attendance
Leave approvals
Employee switching
View payrolls
View analytics and reports
### Employee Profile
Employee Profile will have:
Employee details
Employment information
Salary information
Documents
Profile picture
An employee can update the following:
Address
Contact information
Profile picture
Admin can update employee information

### Attendance
The Dayflow app will have:
Attendance overview
Weekly view
Check-in
Check-out
Attendance status
Present
Absent
Half-day
Leave
An employee can view his/her attendance whereas an admin can view attendance of all employees

### Leaves and Time offs
An employee can:
Select a leave type
Choose a date range
Add remarks
Submit a leave application
Leave type options are:
Paid leave
Sick leave
Unpaid leave
Leave application status can either be:
Pending
Approved
Rejected
The admin can:
View leave requests
Approve and reject leaves
Add comments

### Payrolls
An employee cannot update his/her payroll.
An admin can:
View employee payroll information
Update payroll information to ensure accuracy
### Notifications, Alerts, and Reports
The Dayflow app will also offer:
Email and notification system
Analytic dashboards
Attendance reports
Payroll reports and salary slips

## 5. Frontend
The frontend will be built using
React
CSS
JavaScript

### Frontend Features
The following are some of the frontend features:
Design system
React application
Navigation
Login
Signup screen
Employee dashboard
Admin dashboard
Reusable components
Responsive user interface
The frontend will communicate with the backend through application programming interfaces (APIs)

## 6. Proposed Frontend Structure
```
src/
├── assets/
├── components/
├── layouts/
├── pages/
├── styles/
├── services/
├── hooks/
├── App.jsx
└── main.jsx
```
## 7. Application Flow
```
Landing / Authentication
│
├── Sign Up
│   │
│   └── Email Verification
│
└── Sign In
      │
      ▼
Role-Based Dashboard
       │
┌──────┴──────┐
│             │
Employee    Admin / HR
│             │
▼             ▼
Profile     Employees
Attendance  Attendance
Leave       Leave Approvals
Payroll     Payroll
Alerts       Reports
```
## 8. Design System
The following design system will be used to develop the user interface:
Color palette
Fonts
Spacing
Buttons
Inputs
Cards
Navigation
Status badgers
Tables
Responsive layouts

## 9. Development
The react application was built using the Vite development environment
Once the application was installed, the development server was started using the following command:
```
npm run dev
```
The local URL will be printed in the terminal
## 10. Scope
This project focuses on digitizing certain aspects of the employees experience while offering different features for Employees and Admin/HR Officers

It will feature secure logins, employee and attendance management, payroll information, leave requests, and approvals among other features

## 11. Next Steps
Other features not mentioned above can also be added depending on the scope of the project
