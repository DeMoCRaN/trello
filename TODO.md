# Trello Failed Task Button Implementation
Current Working Directory: c:/Users/DeMoCRaN/Desktop/trello

## Plan Overview
✅ Plan approved with condition: Button only for assignment creator (userEmail == assignment.creator_email)

## Steps (0/6)

### 1. ✅ Update fetchAssignmentNames() in AssignedTasks.jsx
Extend to fetch creator_email for auth check

### 2. ✅ Create FailedTaskModal.jsx
New component: confirmation modal w/ reason textarea

### 3. [ ] Add modal state & button logic in AssignedTasks.jsx
- States: showFailedModal, selectedFailedTask
- Button condition: !archived && status!=3/done && isProjectAuthor
- handleFailClick, confirmFailTask

### 4. [ ] Update AssignedTasks.css
Add .failed-button & modal styles

### 5. [ ] Test functionality
- Load tasks → button visible only for author on eligible tasks
- Modal → submit → API call → refresh → button gone, status=4

### 6. [ ] Verify backend
Check DB: failed_reason, failed_at set

**Next:** Step 1 then confirm before proceeding.

Updated: $(date)
