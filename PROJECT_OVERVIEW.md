# Project Overview and Documentation

## Technology Stack

### Backend
- Node.js with Express framework
- PostgreSQL database
- bcryptjs for password hashing
- jsonwebtoken (JWT) for authentication and authorization

### Frontend
- React.js for UI development
- Material UI for UI components and styling
- Recharts for data visualization and charts
- React Router for client-side routing

## JWT Security Implementation

- Backend exposes a `/api/login` endpoint that accepts user credentials (email and password).
- Passwords are securely hashed using bcrypt.
- On successful login, a JWT token is issued containing user ID, role ID, and email, with a 1-hour expiration.
- Frontend stores the JWT token and expiry time in localStorage.
- Frontend sends the JWT token in the `Authorization` header for protected API requests.
- Backend verifies the JWT token on protected routes to authorize access.
- Unauthorized or invalid tokens result in 401 Unauthorized responses.

## Interface Overview

- Login page with email and password fields, submitting to backend login API.
- Dashboard page displaying:
  - List of assignments and tasks with filtering options.
  - Task statistics including total, completed, in-progress, overdue.
  - Charts visualizing task status distribution, priorities, deadlines, and time spent.
  - User performance tables showing task completion rates.
  - Notifications for unread comments.
- Responsive and interactive UI built with Material UI components.

## Requested Diagrams

The following diagrams will be created to document the system:

- Data Flow Diagram (DFD): Illustrates data movement between frontend, backend, and database.
- SADT Diagram: Describes the task management process and system activities.
- Activity Diagram: Shows user login flow and task operations.
- IDEF0 Diagram: Represents system functions, inputs, controls, and outputs.
- Class Diagram: Models main entities such as User, Task, Assignment, Comment, Status, and Priority.
