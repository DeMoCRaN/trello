# Project Overview and Documentation

## Subject Area

The subject area is the development of a web application for managing projects and tasks (task board), designed to organize collaborative work of user teams. The application provides tools for task distribution, execution control, progress tracking, and improving communication between project participants.

The application is aimed at small and medium-sized teams, combining ease of use with sufficient functionality for effective project management.

## Key Functions of the System

### Authentication and Authorization
- User authentication and authorization with access rights differentiation.
- Role-based access control (e.g., administrator, participant) within teams and projects.
- Secure password hashing using bcrypt.
- JWT-based session management with token expiration.

### Task and Project Management
- Creation, editing, deletion, and archiving of tasks and projects.
- Task assignment to one or multiple users with progress tracking.
- Priority and status management for tasks (e.g., new, in progress, completed, overdue).
- Deadline setting and progress percentage tracking.
- Time tracking for task execution.
- Support for collaborative tasks with multiple assignees.

### Progress Visualization
- Use of charts and diagrams to visualize task execution progress.
- Interactive dashboards with real-time statistics.
- Recharts library for adaptive and interactive visualizations.

### Notification System
- Notifications about new comments and changes in tasks.
- Real-time updates using WebSockets or polling mechanisms.
- Sound notifications for user alerts.

### Time Tracking and Deadline Control
- Logging of work time on tasks.
- Automatic calculation of overdue tasks.
- Progress bars and deadline indicators.

### Adaptive User Interface
- Responsive design supporting work on various devices (desktop, tablet, mobile).
- Material UI components for consistent and modern UI.
- Accessibility features for inclusive design.

### Team Management
- Creation of teams tied to specific projects.
- Project creator automatically becomes team member and administrator.
- Role models within the team (administrator, participant) defining access levels to project management functions.
- Invitation system for adding new participants:
  - Administrators can send invitations by specifying the email of the new participant.
  - Invitations contain direct links for joining the team.
  - Users can accept invitations through a dedicated form, automatically gaining access to project tasks and functionality.
- Closed access to projects only for approved participants.

### Statistics and Analytics Page
- Specialized page for project statistics and analytics, providing detailed visualization of key metrics and performance indicators.

#### Summary Indicators by Project
- Total number of tasks in the project.
- Number of completed tasks.
- Tasks in progress.
- Overdue tasks.
- Project completion percentage.

#### Data Visualization
- Pie charts for task distribution by statuses.
- Bar charts for team member workload.
- Progress charts for task execution over time.

#### Analytics by Performers
- Statistics on task completion by each team member.
- Time spent on task execution.
- Number of accepted and completed tasks.
- Performance rating of participants.

#### Project Dynamics
- Charts of task quantity changes over time.
- Team productivity trends.
- Analysis of task execution deadlines.

#### Filtering and Grouping
- Ability to filter statistics by time periods.
- Grouping data by performers, priorities, statuses.
- Comparative analytics between different projects.

#### Technical Implementation
- Data visualization using Recharts library for interactive and adaptive charts.
- Data loading via API from the server, aggregated from PostgreSQL database using complex SQL queries and aggregating functions.

#### Practical Value
- Allows project managers to:
  - Quickly assess the current project state.
  - Identify bottlenecks in workflows.
  - Optimize team resource distribution.
  - Make data-driven management decisions.
  - Forecast project completion dates.
- Transforms the system from a simple task manager into a full-fledged project management tool with business analytics elements.

## Technology Stack

### Backend
- Node.js with Express.js framework for building RESTful APIs.
- PostgreSQL database with Docker containerization and pgAdmin for management.
- bcryptjs for secure password hashing.
- jsonwebtoken (JWT) for authentication and authorization.
- Additional libraries: cors for cross-origin requests, helmet for security headers, morgan for logging, etc.
- Redis for caching and session management (if implemented).

### Frontend
- React.js for building dynamic user interfaces.
- Material UI for UI components and styling, ensuring responsive and accessible design.
- Recharts for data visualization and interactive charts.
- React Router for client-side routing and navigation.
- Axios for HTTP requests to the backend API.
- Additional libraries: React Hooks for state management, Context API or Redux for global state.

### Database
- PostgreSQL with relational schema for users, tasks, assignments, comments, roles, etc.
- Docker Compose for easy setup and deployment of database and related services.

### Development Tools
- Visual Studio Code as the primary IDE.
- Postman for API testing and documentation.
- Git for version control and collaboration.
- ESLint and Prettier for code quality and formatting.

## JWT Security Implementation

- Backend exposes a `/api/login` endpoint that accepts user credentials (email and password).
- Passwords are securely hashed using bcrypt with salt rounds for added security.
- On successful login, a JWT token is issued containing user ID, role ID, email, and possibly project/team affiliations, with a configurable expiration (e.g., 1 hour).
- Frontend stores the JWT token and expiry time in localStorage or secure cookies.
- Frontend automatically includes the JWT token in the `Authorization: Bearer <token>` header for all protected API requests.
- Backend uses middleware to verify JWT tokens on protected routes, checking validity, expiration, and user permissions.
- Unauthorized or invalid tokens result in 401 Unauthorized responses, triggering re-authentication.
- Refresh token mechanism can be implemented for seamless session extension.
- Role-based access control ensures users can only access resources based on their assigned roles (e.g., admin can manage team members, participants can view and update assigned tasks).

## Interface Overview

- **Login Page**: Email and password fields with validation, submitting to backend login API. Includes options for password recovery and registration if applicable.
- **Dashboard Page**: Central hub displaying:
  - List of assignments and tasks with advanced filtering options (by status, priority, assignee, deadline).
  - Task statistics including total, completed, in-progress, overdue counts.
  - Interactive charts visualizing task status distribution (pie charts), priorities (bar charts), deadlines (timeline), and time spent (histograms).
  - User performance tables showing task completion rates, average completion time, and efficiency metrics.
  - Notifications panel for unread comments, task updates, and system alerts.
  - Quick action buttons for creating new tasks, inviting members, and accessing statistics.
- **Task Details Page**: Detailed view of individual tasks with comments, attachments, time logs, and progress updates.
- **Team Management Page**: Interface for administrators to manage team members, send invitations, assign roles, and view member activity.
- **Statistics and Analytics Page**: Dedicated page with comprehensive visualizations, filters, and export options for reports.
- **User Profile Page**: Settings for personal information, password change, notification preferences.
- Responsive and interactive UI built with Material UI components, supporting dark/light themes, internationalization (i18n), and accessibility standards (WCAG).

## Deployment and Setup

- Docker Compose for containerized deployment of backend, frontend, and database.
- Environment variables for configuration (database URLs, JWT secrets, API keys).
- CI/CD pipelines using GitHub Actions or similar for automated testing and deployment.
- Production deployment on cloud platforms like AWS, Heroku, or Vercel.
- Monitoring and logging with tools like Winston for backend logs and Sentry for error tracking.

## Requested Diagrams

The following diagrams will be created to document the system:

- Data Flow Diagram (DFD): Illustrates data movement between frontend, backend, database, and external systems (e.g., email for invitations).
- SADT Diagram: Describes the task management process, team collaboration, and system activities in detail.
- Activity Diagram: Shows user login flow, task creation/assignment/updates, invitation process, and analytics generation.
- IDEF0 Diagram: Represents system functions (e.g., authenticate user, manage tasks), inputs (user data, task details), controls (roles, permissions), and outputs (responses, reports).
- Class Diagram: Models main entities such as User (with roles), Task (with status, priority, deadlines), Assignment (linking users to tasks), Comment (with timestamps), Project (with teams), and relationships between them.
