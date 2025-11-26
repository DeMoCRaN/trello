-- Установка часового пояса
ALTER DATABASE democran SET timezone TO 'Europe/Moscow';

-- Таблица ролей
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Таблица пользователей
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255) NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Таблица заданий
CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  creator_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Таблица статусов задач
CREATE TABLE task_statuses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Таблица приоритетов задач
CREATE TABLE task_priorities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Таблица задач
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER REFERENCES assignments(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  deadline TIMESTAMP,
  creator_id INTEGER NOT NULL REFERENCES users(id),
  assignee_id INTEGER REFERENCES users(id),
  status_id INTEGER NOT NULL REFERENCES task_statuses(id),
  priority_id INTEGER NOT NULL REFERENCES task_priorities(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  seen_at TIMESTAMP NULL,
  in_progress_since TIMESTAMP WITH TIME ZONE NULL,
  work_duration INTEGER DEFAULT 0,
  progress_percentage FLOAT DEFAULT 0
);

-- Таблица комментариев к задачам
CREATE TABLE task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  text TEXT NOT NULL
);

-- Таблица для множественного назначения пользователей на задачи
CREATE TABLE task_assignees (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT now(),
  assigned_by INTEGER REFERENCES users(id), -- кто назначил пользователя
  UNIQUE(task_id, user_id) -- один пользователь может быть назначен на задачу только один раз
);

-- Индексы для производительности task_assignees
CREATE INDEX idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON task_assignees(user_id);
CREATE INDEX idx_task_assignees_assigned_by ON task_assignees(assigned_by);

-- Таблица членов команды проекта (assignment_members)
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

-- Индексы для производительности assignment_members
CREATE INDEX idx_assignment_members_assignment_id ON assignment_members(assignment_id);
CREATE INDEX idx_assignment_members_user_id ON assignment_members(user_id);
CREATE INDEX idx_assignment_members_status ON assignment_members(status);

-- Таблица архивированных задач
CREATE TABLE archived_tasks (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER REFERENCES assignments(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  deadline TIMESTAMP,
  creator_id INTEGER NOT NULL REFERENCES users(id),
  assignee_id INTEGER REFERENCES users(id),
  status_id INTEGER NOT NULL REFERENCES task_statuses(id),
  priority_id INTEGER NOT NULL REFERENCES task_priorities(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  seen_at TIMESTAMP NULL,
  in_progress_since TIMESTAMP NULL,
  work_duration INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,
  deleted_at TIMESTAMP DEFAULT now()
);

-- Вставка стандартных ролей
INSERT INTO roles (name) VALUES ('admin'), ('user'), ('guest');

-- Вставка стандартных статусов задач
INSERT INTO task_statuses (name) VALUES ('new'), ('in_progress'), ('done');

-- Вставка стандартных приоритетов задач
INSERT INTO task_priorities (name) VALUES ('low'), ('medium'), ('high');


-- Таблица аудита для отслеживания всех изменений
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id INTEGER NOT NULL,
  operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_columns TEXT[],
  user_id INTEGER REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Индексы для производительности
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX idx_audit_log_operation ON audit_log(operation);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);