# Backend Migration Guide: Node.js -> C# ASP.NET Core

## Purpose

This file documents the current backend located in `back/` and gives a practical migration plan to rewrite it on `C# + ASP.NET Core Web API + EF Core + PostgreSQL`.

The goal is not to redesign everything at once, but to:

1. Preserve current business behavior.
2. Move modules one by one.
3. Reuse the existing PostgreSQL schema from the current project.
4. Keep the frontend working while the API is being rewritten.

---

## 1. Current Backend Map

### Entry and infrastructure

- `back/back.js`
  Purpose:
  Bootstraps Express app, connects to PostgreSQL, loads routes, starts server, handles process shutdown.

- `back/routes/api.js`
  Purpose:
  Main API router. Aggregates most REST endpoints for auth, assignments, tasks, comments, notifications, metrics and git integration.

- `back/logger.js`
  Purpose:
  Structured logging with rotating files, error logs, rejection logs, SQL logging helpers.

- `back/config/redis.js`
  Purpose:
  Redis client bootstrap.
  Status:
  Optional for migration. Can be postponed until after the core API is working.

### Middleware

- `back/middlewares/auth-jwt.js`
  Purpose:
  JWT authorization middleware.

- `back/middlewares/validate-id-param.js`
  Purpose:
  ID parameter validation.

- `back/middlewares/cors.js`
  Purpose:
  CORS policy.

- `back/middlewares/cache.js`
  Purpose:
  Response caching middleware.
  Status:
  Not part of the first migration wave.

### Controllers and domain logic

- `back/controllers/auth.js`
  Purpose:
  GitHub OAuth flow, JWT token generation, user profile retrieval, GitHub disconnect.

- `back/controllers/User.js`
  Purpose:
  User data access helpers:
  `findByEmail`, `findById`, `create`, `updateGitHubInfo`, `disconnectGitHub`, `findByGitHubId`.

- `back/controllers/tasks.js`
  Purpose:
  Task operations:
  create, delete, status change, mark seen, get by id, get assigned tasks, update progress.

- `back/controllers/assignments.js`
  Purpose:
  Project/assignment operations:
  list assignments, create assignment, create task in assignment, delete assignment, invite user, team members, remove team member, respond to invitation, get pending invitations.

- `back/controllers/comments.js`
  Purpose:
  Task comments:
  create comment, get comments, unread count, unread list, mark comments as read.

- `back/controllers/git.js`
  Purpose:
  Git integration:
  repositories, branches, commits, commit sync, task reference parsing, task-commit links.

- `back/controllers/audit-backend.js`
  Purpose:
  Task, assignment and comment operations with audit-aware transactional behavior.
  Note:
  This is one of the most important controllers to understand before migrating the write flows.

### Services

- `back/services/metrics.service.js`
  Purpose:
  KPI and dashboard calculations for assignments and users.

- `back/services/user-notifications.service.js`
  Purpose:
  `user_notifications` table bootstrap and notification CRUD helpers.

- `back/services/deleted-failed-tasks.service.js`
  Purpose:
  Bootstrap and support for `deleted_failed_tasks`.

### DTO / support files

- `back/dto/metrics.dto.js`
  Purpose:
  Maps metrics results into API response format.

- `back/def/statusPage.js`
  Purpose:
  Auxiliary status/diagnostic page logic.

### Database-side scripts

- `db/enable_audit_for_non_static_tables.sql`
  Purpose:
  Creates audit triggers for business tables except dictionaries.

- `db/fix_audit_log_tasks_trigger.sql`
  Purpose:
  Explicit fix for the `tasks_audit_trigger`.

---

## 2. Current API Surface To Preserve

These endpoints are already present and should be used as the migration contract.

### Auth and users

- `POST /api/login`
- `GET /api/auth/github`
- `GET /api/auth/github/callback`
- `GET /api/auth/profile`
- `POST /api/github/disconnect`
- `GET /api/users/:id`
- `GET /api/users/email/:email`
- `GET /api/users/:id/metrics`

### Assignments / projects

- `GET /api/assignments`
- `POST /api/assignments`
- `DELETE /api/assignments/:id`
- `GET /api/assignments/:id/tasks`
- `POST /api/assignments/:id/tasks`
- `POST /api/assignments/:id/invite`
- `GET /api/assignments/:id/team`
- `DELETE /api/assignments/:id/team/:memberId`
- `POST /api/assignments/:assignmentId/invitations/:invitationId/respond`
- `GET /api/users/me/invitations`
- `GET /api/assignments/:id/metrics`

### Tasks

- `GET /api/tasks/assigned`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PATCH /api/tasks/:id/status`
- `PATCH /api/tasks/:id/progress`
- `PATCH /api/tasks/:id/seen`
- `DELETE /api/tasks/:id`
- `GET /api/task_statuses`
- `GET /api/task_priorities`

### Comments and notifications

- `GET /api/tasks/:id/comments`
- `POST /api/tasks/:id/comments`
- `GET /api/comments/unread/count`
- `GET /api/comments/unread`
- `POST /api/comments/mark-read`
- `GET /api/notifications/summary`
- `POST /api/notifications/system/mark-read`

### Git integration

- `GET /api/tasks/:id/commits`
- `GET /api/assignments/:id/repositories`
- `POST /api/assignments/:id/repositories`
- `GET /api/repositories/:id/commits`
- `GET /api/repositories/:id/branches`
- `POST /api/repositories/:id/sync`

---

## 3. Existing PostgreSQL Schema To Reuse

From the existing dump and SQL scripts, the core tables are:

- `users`
- `roles`
- `assignments`
- `tasks`
- `task_statuses`
- `task_priorities`
- `task_comments`
- `assignment_members`
- `repositories`
- `branches`
- `commits`
- `commit_task_links`
- `audit_log`
- `archived_tasks`
- `deleted_failed_tasks`
- `user_notifications`

Important:
For the migration, it is safer to map C# entities to the current table names first, and only rename the domain later if needed.

---

## 4. Target C# Solution Structure

Recommended solution layout:

- `Diploma.Api`
- `Diploma.Application`
- `Diploma.Domain`
- `Diploma.Infrastructure`

### Responsibilities

- `Diploma.Api`
  Controllers, `Program.cs`, middleware, auth configuration, Swagger.

- `Diploma.Application`
  Services, DTOs, interfaces, validators, use cases.

- `Diploma.Domain`
  Entities and domain constants.

- `Diploma.Infrastructure`
  `AppDbContext`, EF configurations, repository implementations, JWT generation, background workers.

---

## 5. Current Script -> C# Mapping

### Entry and infrastructure

- `back/back.js`
  Move to:
  `Diploma.Api/Program.cs`

  Responsibilities to migrate:
  - app bootstrap
  - database registration
  - middleware registration
  - route registration
  - graceful shutdown

- `back/logger.js`
  Move to:
  `Serilog` configuration inside `Program.cs`
  and optional `Diploma.Infrastructure/Logging`

### Middleware

- `back/middlewares/auth-jwt.js`
  Move to:
  built-in JWT bearer auth in `Program.cs`
  plus optional authorization helper service.

- `back/middlewares/validate-id-param.js`
  Move to:
  route parameter typing plus `FluentValidation` or manual request validation.

- `back/middlewares/cors.js`
  Move to:
  `builder.Services.AddCors(...)`

- `back/middlewares/cache.js`
  Move to:
  postpone, or replace with ASP.NET response caching / output caching.

### Auth and users

- `back/controllers/auth.js`
  Move to:
  `AuthController.cs`
  `AuthService.cs`
  `GithubOAuthService.cs`
  `JwtTokenService.cs`

- `back/controllers/User.js`
  Move to:
  `IUserRepository.cs`
  `UserRepository.cs`

### Assignments

- `back/controllers/assignments.js`
  Move to:
  `AssignmentsController.cs`
  `AssignmentService.cs`
  `AssignmentMemberService.cs`

### Tasks

- `back/controllers/tasks.js`
  Move to:
  `TasksController.cs`
  `TaskService.cs`

### Comments

- `back/controllers/comments.js`
  Move to:
  `CommentsController.cs`
  `CommentService.cs`

### Audit-aware writes

- `back/controllers/audit-backend.js`
  Move to:
  Mostly into application services with transactions:
  - `TaskService`
  - `AssignmentService`
  - `CommentService`
  and optionally an `AuditService`.

### Git integration

- `back/controllers/git.js`
  Move to:
  `GitController.cs`
  `RepositoryService.cs`
  `CommitService.cs`
  `GithubWebhookService.cs`

### Metrics

- `back/services/metrics.service.js`
  Move to:
  `MetricsService.cs`

- `back/dto/metrics.dto.js`
  Move to:
  `MetricsDtos.cs` in `Diploma.Application/DTOs`

### Notifications

- `back/services/user-notifications.service.js`
  Move to:
  `NotificationService.cs`

### Deleted failed tasks

- `back/services/deleted-failed-tasks.service.js`
  Move to:
  `DeletedFailedTaskService.cs`
  or integrate into `TaskService` if only used from task deletion flow.

### SQL scripts

- `db/enable_audit_for_non_static_tables.sql`
  Move to:
  Keep as SQL migration script.
  Do not rewrite this into EF first.

- `db/fix_audit_log_tasks_trigger.sql`
  Move to:
  Keep as SQL patch script.

---

## 6. Migration Order

Migrate in this order. Do not start from Git integration or metrics first.

### Phase 1. Foundation

1. Create C# solution and projects.
2. Add NuGet packages:
   - `Microsoft.EntityFrameworkCore`
   - `Microsoft.EntityFrameworkCore.Design`
   - `Npgsql.EntityFrameworkCore.PostgreSQL`
   - `Microsoft.AspNetCore.Authentication.JwtBearer`
   - `Swashbuckle.AspNetCore`
   - `Serilog.AspNetCore`
3. Create domain entities mapped to the current schema.
4. Create `AppDbContext`.
5. Create EF Core configurations.
6. Register PostgreSQL in `Program.cs`.
7. Verify startup and DB connectivity.

### Phase 2. Authentication and user read flow

1. Implement JWT auth.
2. Implement `POST /api/login`.
3. Implement `GET /api/auth/profile`.
4. Implement user lookup methods required by other modules.

### Phase 3. Assignments

1. Implement assignment listing.
2. Implement assignment creation.
3. Implement assignment deletion.
4. Implement invitation flow and team member retrieval.

### Phase 4. Tasks

1. Implement `GET /api/tasks/assigned`.
2. Implement `GET /api/tasks/:id`.
3. Implement `POST /api/tasks`.
4. Implement `PATCH /api/tasks/:id/status`.
5. Implement `PATCH /api/tasks/:id/progress`.
6. Implement `PATCH /api/tasks/:id/seen`.
7. Implement `DELETE /api/tasks/:id`.

### Phase 5. Comments and notifications

1. Implement task comments.
2. Implement unread comments count/list.
3. Implement mark-read.
4. Implement system notifications summary.

### Phase 6. Metrics

1. Port KPI formulas from `metrics.service.js`.
2. Keep formulas identical first.
3. Only refactor calculation style after parity is verified.

### Phase 7. Git integration

1. Repositories.
2. Branches.
3. Commits.
4. Task-commit queries.
5. Manual sync endpoint.
6. GitHub webhook endpoint.

### Phase 8. Audit and DB-side behavior

1. Keep existing PostgreSQL triggers alive.
2. Add app-level audit metadata where needed.
3. Only after parity is achieved decide whether to move more logic into app services.

---

## 7. Required C# Modules

### Domain entities

Already based on the current DB:

- `User`
- `Role`
- `Assignment`
- `TaskItem`
- `TaskStatusEntity`
- `TaskPriority`
- `TaskComment`
- `AssignmentMember`
- `Repository`
- `Branch`
- `Commit`
- `CommitTaskLink`
- `AuditLog`
- `ArchivedTask`
- `DeletedFailedTask`
- `UserNotification`

### Application services

- `AuthService`
- `AssignmentService`
- `TaskService`
- `CommentService`
- `NotificationService`
- `MetricsService`
- `GitRepositoryService`
- `CommitService`
- `GithubWebhookService`
- `AuditService`

### API controllers

- `AuthController`
- `AssignmentsController`
- `TasksController`
- `CommentsController`
- `NotificationsController`
- `MetricsController`
- `GitController`

---

## 8. Notes About Naming

The current database uses `assignments`, not `projects`.

To reduce migration risk:

- keep `Assignment` in the first C# version
- keep `assignment_id` mapping in EF
- keep endpoint compatibility first if frontend already depends on it

After successful migration you can do a second-stage domain rename:

- `Assignment` -> `Project`
- `assignment_id` -> `project_id`

But do this only after the API behavior is stable.

---

## 9. Important Technical Differences Between Current Node Backend and C#

### Transactions

Current code often does:

- `const client = await pool.connect()`
- `BEGIN / COMMIT / ROLLBACK`

In C# this becomes:

- `await using var transaction = await db.Database.BeginTransactionAsync();`

### Validation

Current code validates with helper functions:

- `validateId`
- `validateText`
- `validateDate`

In C# move this to:

- DTO validation
- `FluentValidation`
- service guard clauses

### SQL access

Current backend uses raw SQL through `pg`.

In C#:

- first prefer EF Core LINQ for CRUD and simple joins
- keep raw SQL only for complex analytics or DB-specific functions

### Audit triggers

Current system already relies on PostgreSQL triggers.

Recommendation:

- keep them
- do not reimplement them immediately in C#
- only add application-side enrichment when needed

---

## 10. Per-File Migration Notes

### `back/controllers/tasks.js`

Port first:

- `getTasksByAssignee`
- `getTaskById`
- `markTaskAsSeen`
- `updateTaskProgress`

Port later:

- delete/archiving nuances
- audit-coupled write paths

### `back/controllers/assignments.js`

Port first:

- `getAssignments`
- `createAssignment`
- `getTeamMembers`
- `getPendingInvitations`

Port later:

- `deleteAssignment`
- invitation accept/reject
- access checks

### `back/controllers/comments.js`

Port fully in one pass:

- compact and self-contained module
- easy first win after tasks

### `back/controllers/git.js`

Port in pieces:

1. repositories
2. branches
3. commits
4. sync
5. webhook

### `back/services/metrics.service.js`

Port carefully without changing formulas.
This file contains business rules, not just formatting.

---

## 11. What Can Be Deferred

These items should not block the first working C# API:

- Redis
- cache middleware
- webhook processing queue refinement
- logger parity
- complete audit enhancement
- non-critical admin/reporting endpoints

---

## 12. Practical First Sprint

If rewriting alone, the best first sprint is:

1. Build the solution.
2. Map entities to existing DB.
3. Add JWT auth.
4. Implement:
   - `POST /api/login`
   - `GET /api/auth/profile`
   - `GET /api/assignments`
   - `POST /api/assignments`
   - `GET /api/tasks/assigned`
   - `GET /api/tasks/:id`

That gives a thin but usable API skeleton and validates:

- DB mapping
- auth
- controller/service flow
- EF Core configuration correctness

---

## 13. Recommended Verification Strategy

For every migrated endpoint:

1. Call old Node endpoint.
2. Save JSON response example.
3. Call new C# endpoint.
4. Compare:
   - status code
   - field names
   - nullability
   - date formatting

Do this module by module before turning the frontend over to the new API.

---

## 14. Immediate Next Step

Immediate next step after this document:

1. Finish `AppDbContext`.
2. Finish EF configurations for all core entities.
3. Register DB and JWT in `Program.cs`.
4. Implement the first controller:
   `AuthController`.

