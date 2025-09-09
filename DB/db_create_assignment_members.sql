-- Создание таблицы членов команды проекта (assignment_members)
CREATE TABLE assignment_members (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_at TIMESTAMP DEFAULT now(),
  responded_at TIMESTAMP,
  UNIQUE(assignment_id, user_id) -- один пользователь может быть только один раз в команде проекта
);

-- Индексы для производительности
CREATE INDEX idx_assignment_members_assignment_id ON assignment_members(assignment_id);
CREATE INDEX idx_assignment_members_user_id ON assignment_members(user_id);
CREATE INDEX idx_assignment_members_status ON assignment_members(status);

-- Добавление поля creator_id к assignments, если его нет
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS creator_id INTEGER REFERENCES users(id);

-- Обновление существующих assignments, если creator_id пустой (предполагаем, что первый пользователь admin)
UPDATE assignments
SET creator_id = (SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin') LIMIT 1)
WHERE creator_id IS NULL;
