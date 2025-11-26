# Git Integration for Task Management System

## Database Schema Extension
- [x] Create `repositories` table for Git repo management
- [x] Create `commits` table to store commit data with task references
- [x] Create `branches` table for branch tracking
- [x] Add foreign keys and indexes to Git tables

## Backend Implementation
- [x] Create `back/controllers/git.js` with commit parsing logic
- [x] Implement functions to fetch commits by task ID
- [x] Add Git repository operations handling

## API Routes Extension
- [x] Add `/api/tasks/:id/commits` endpoint to get commits for a task
- [x] Add `/api/repositories` endpoints for repo management
- [x] Add `/api/commits/sync` for syncing commit data

## Frontend Components
- [x] Create `CommitHistory.jsx` component to display commit list
- [x] Enhance `TaskDetailsForm.jsx` to show commit history
- [x] Add Git tab/section to task details view

## Dependencies and Testing
- [x] Install Git-related dependencies (simple-git)
- [ ] Test commit parsing with sample data
- [ ] Implement Git authentication if needed
- [ ] Add repository configuration UI
