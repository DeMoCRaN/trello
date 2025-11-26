-- Создание таблицы для множественного назначения пользователей на задачи
CREATE TABLE task_assignees (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT now(),
  assigned_by INTEGER REFERENCES users(id), -- кто назначил пользователя
  UNIQUE(task_id, user_id) -- один пользователь может быть назначен на задачу только один раз
);

-- Индексы для производительности
CREATE INDEX idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON task_assignees(user_id);
CREATE INDEX idx_task_assignees_assigned_by ON task_assignees(assigned_by);

-- Миграция существующих данных из assignee_id в новую таблицу
INSERT INTO task_assignees (task_id, user_id, assigned_by)
SELECT id, assignee_id, creator_id
FROM tasks
WHERE assignee_id IS NOT NULL;


