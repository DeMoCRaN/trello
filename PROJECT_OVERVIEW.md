# Project Overview and Documentation

## Subject Area

The subject area is the development of a comprehensive web application for managing projects and tasks (task board) with integrated Git repository tracking and audit logging. The application is designed to organize collaborative work of user teams, providing tools for task distribution, execution control, progress tracking, communication between project participants, and version control integration.

The application targets small and medium-sized development teams, combining ease of use with advanced functionality for effective project management, code tracking, and compliance monitoring.

## Key Functions of the System

### Authentication and Authorization
- User authentication and authorization with role-based access control.
- Support for multiple roles (administrator, regular user) with differentiated permissions.
- Secure password hashing using bcryptjs.
- JWT-based session management with configurable token expiration.
- Middleware-based route protection and permission validation.

### Project and Assignment Management
- Creation, editing, and management of projects (assignments) with team association.
- Project-based access control with invitation system for team members.
- Assignment archiving and restoration capabilities.
- Hierarchical project structure with creator/administrator roles.

### Task Management
- Comprehensive task lifecycle management (creation, editing, deletion, archiving).
- Task assignment to team members with progress tracking and time logging.
- Priority levels (low, medium, high) and status management (new, in_progress, done).
- Deadline setting with overdue detection and progress percentage tracking.
- Work duration tracking with start/stop functionality.
- Task comments system with read/unread status tracking.
- Bulk operations for task status updates and comment marking.

### Team Collaboration
- Team formation tied to specific projects with role-based permissions.
- Invitation system for adding new team members via email.
- Invitation acceptance/rejection workflow with status tracking.
- Team member management with access control validation.
- Collaborative commenting on tasks with notification system.

### Git Integration
- Repository management linked to projects (assignments).
- Git commit synchronization with automatic task reference parsing.
- Branch tracking and commit history visualization.
- Task-commit linking through commit message patterns (#123, Task: 123).
- GitHub API integration for repository data fetching.

### Audit and Compliance
- Comprehensive audit logging for all critical operations.
- PostgreSQL audit triggers for automatic logging of data changes.
- User action tracking with timestamps and context information.
- Audit trail for task creation, updates, deletions, and user actions.
- Compliance-ready logging for regulatory requirements.

### Notification System
- Real-time notifications for task comments and updates.
- Unread comment counting and marking functionality.
- Browser notifications with permission management.
- Notification persistence and user preference handling.

### Progress Visualization and Analytics
- Interactive dashboards with task statistics and progress tracking.
- Charts for task distribution by status, priority, and assignee.
- Time tracking analytics and productivity metrics.
- Project completion percentage calculations.
- Team member workload visualization.

## Technology Stack

### Backend
- **Node.js** with **Express.js** framework for RESTful API development.
- **PostgreSQL** database with connection pooling and transaction management.
- **bcryptjs** for secure password hashing.
- **jsonwebtoken (JWT)** for authentication and authorization.
- **pg** library for PostgreSQL integration with parameterized queries.
- Custom logging system with Winston-style structured logging.
- Security middleware: CORS, helmet, input validation and sanitization.
- Audit system with database triggers and application-level logging.

### Frontend
- **React.js** with modern hooks and functional components.
- **React Router** for client-side routing and navigation.
- **Material UI** for responsive, accessible UI components.
- **Axios** for HTTP client with JWT token management.
- **Framer Motion** for smooth animations and transitions.
- **React Icons** for consistent iconography.
- **Recharts** for data visualization (planned for analytics).
- State management using React hooks and Context API.

### Database Schema
- **users**: User accounts with roles and authentication data.
- **roles**: Role definitions for access control.
- **assignments**: Projects/assignments with creator and metadata.
- **assignment_members**: Many-to-many relationship for team membership.
- **tasks**: Task entities with status, priority, deadlines, and progress tracking.
- **archived_tasks**: Soft-deleted tasks for data retention.
- **task_comments**: Comments on tasks with read status.
- **task_statuses**: Predefined status options.
- **task_priorities**: Predefined priority levels.
- **repositories**: Git repositories linked to assignments.
- **commits**: Git commits with task references and metadata.
- **branches**: Repository branches tracking.
- **audit_log**: Comprehensive audit trail for compliance.

### Development Tools
- **Visual Studio Code** as primary IDE.
- **Docker** and **Docker Compose** for containerized development.
- **Git** for version control with conventional commit messages.
- **Postman** for API testing and documentation.
- **ESLint** and **Prettier** for code quality and formatting.
- **pgAdmin** for database administration.

## Security Implementation

### Authentication Flow
- POST `/api/login` endpoint validates credentials against hashed passwords.
- Successful authentication generates JWT containing user ID, role, and email.
- Frontend stores JWT in localStorage with expiration tracking.
- Automatic token refresh and logout on expiration.

### Authorization
- Middleware validates JWT on protected routes.
- Role-based permissions checked for sensitive operations.
- Assignment-level access control for team members only.
- Input validation and SQL injection prevention.

### Data Protection
- Password hashing with bcryptjs and salt rounds.
- Parameterized queries preventing SQL injection.
- Input sanitization and validation on all endpoints.
- CORS configuration for cross-origin security.

## API Architecture

### RESTful Endpoints
- **Authentication**: `/api/login`, `/api/users/*`
- **Assignments**: `/api/assignments` (CRUD operations)
- **Tasks**: `/api/tasks`, `/api/assignments/:id/tasks`
- **Comments**: `/api/tasks/:id/comments`
- **Team Management**: `/api/assignments/:id/invite`, `/api/assignments/:id/team`
- **Git Integration**: `/api/assignments/:id/repositories`, `/api/repositories/:id/commits`
- **Notifications**: `/api/comments/unread/*`

### Response Format
- Consistent JSON responses with error handling.
- Pagination support for large datasets.
- Normalized data structures for frontend consumption.
- Development-friendly error messages with production sanitization.

## User Interface Overview

### Main Application Flow
- **Authentication Page**: Login form with validation and error handling.
- **Main Dashboard**: Assignment list with task overview and quick actions.
- **Assignment Details**: Task board with filtering and status management.
- **Task Details**: Comprehensive task view with comments and progress tracking.
- **Team Management**: Member invitation and role management interface.
- **User Profile**: Personal settings and notification preferences.

### Responsive Design
- Mobile-first approach with adaptive layouts.
- Material UI components ensuring consistency.
- Accessibility features with keyboard navigation and screen reader support.
- Dark/light theme support (planned).

## Business Process Documentation

The system implements comprehensive business processes documented through multiple diagram types:

### Data Flow (DFD)
- Illustrates data movement between frontend, backend, PostgreSQL database, and Git repositories.
- Shows authentication flow, task management data flows, and audit logging streams.

### Functional Decomposition (IDEF0)
- A0: Manage Task Management System (top-level function)
- A1-A6: Sub-functions for authentication, assignments, tasks, collaboration, Git integration, and audit.

### Process Flow (IDEF3)
- Detailed process flows for user operations from login through task completion.
- Decision points and alternative flows for error handling and permissions.

### Activity Diagrams
- User workflows from authentication through all system operations.
- Parallel activities for team collaboration and notification handling.

### Class Diagrams
- Entity-relationship model showing all database tables and relationships.
- Business logic classes with methods and associations.

### Use Case Diagrams
- Actor-system interactions covering all user roles and system functions.
- 15+ use cases from basic authentication to advanced Git integration.

### Sequence Diagrams
- Detailed interaction flows for complex operations like task creation.
- Shows frontend-backend-database communication patterns.

## Deployment and Operations

### Development Environment
- Docker Compose setup for PostgreSQL, backend, and frontend services.
- Hot reloading for development productivity.
- Environment-based configuration management.

### Production Deployment
- Containerized deployment with orchestration.
- Environment variables for secrets and configuration.
- Database migrations and backup strategies.
- Monitoring and logging aggregation.

### Maintenance
- Automated audit log archiving and cleanup.
- Performance monitoring for database queries and API response times.
- Regular security updates and dependency management.
- Backup and disaster recovery procedures.

This comprehensive task management system provides a solid foundation for team collaboration with advanced features for development workflow tracking and compliance auditing.
