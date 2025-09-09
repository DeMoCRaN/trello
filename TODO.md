# TODO: Реализация состава команды для assignments

## Задача
Создать функционал "состав команды" для проектов (assignments), где можно приглашать пользователей в команду проекта. Только создатель проекта или пользователь с правами может приглашать. Пользователи могут принимать или отклонять приглашения.

## Шаги реализации

### 1. Обновление базы данных
- [ ] Создать таблицу `assignment_members` с полями:
  - id (SERIAL PRIMARY KEY)
  - assignment_id (INTEGER REFERENCES assignments(id))
  - user_id (INTEGER REFERENCES users(id))
  - invited_by (INTEGER REFERENCES users(id)) - кто пригласил
  - status (VARCHAR(20) DEFAULT 'pending') - pending/accepted/rejected
  - invited_at (TIMESTAMP DEFAULT now())
  - responded_at (TIMESTAMP)
- [ ] Добавить индексы для производительности
- [ ] Обновить существующие assignments, если нужно

### 2. Обновление бэкенда
- [ ] Добавить функции в `controllers/assignments.js`:
  - `inviteUserToAssignment(pool, assignmentId, userId, invitedBy)`
  - `getTeamMembers(pool, assignmentId)`
  - `respondToInvitation(pool, invitationId, userId, status)`
  - `getPendingInvitations(pool, userId)`
- [ ] Добавить API endpoints в `routes/api.js`:
  - POST `/assignments/:id/invite` - пригласить пользователя
  - GET `/assignments/:id/team` - получить состав команды
  - POST `/assignments/:id/invitations/:invitationId/respond` - ответить на приглашение
  - GET `/users/me/invitations` - получить свои приглашения
- [ ] Добавить проверки прав: только creator или admin может приглашать

### 3. Обновление фронтенда
- [ ] Создать компонент `TeamManagement.jsx` для управления командой
- [ ] Обновить `AssignmentCreationForm.jsx` для выбора пользователей при создании
- [ ] Добавить компонент `InvitationsList.jsx` для просмотра приглашений
- [ ] Обновить `AssignmentsList.jsx` для отображения состава команды
- [ ] Добавить уведомления о новых приглашениях

### 4. Настройка ролей
- [ ] Расширить таблицу roles новыми ролями:
  - project_manager
  - team_lead
  - developer
  - tester
- [ ] Обновить логику прав доступа

### 5. Тестирование
- [ ] Протестировать приглашения
- [ ] Проверить права доступа
- [ ] Тестировать отклонение/принятие приглашений
- [ ] Проверить отображение на фронтенде

## Зависимости
- Обновить `back/package.json` если нужны новые зависимости
- Обновить `front/my_front/package.json` если нужны новые компоненты
