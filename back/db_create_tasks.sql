-- Создание таблицы статусов задач
CREATE TABLE task_statuses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Создание таблицы приоритетов задач
CREATE TABLE task_priorities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Создание таблицы задач
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  deadline TIMESTAMP,
  creator_id INTEGER NOT NULL REFERENCES users(id),
  assignee_id INTEGER REFERENCES users(id),
  status_id INTEGER NOT NULL REFERENCES task_statuses(id),
  priority_id INTEGER NOT NULL REFERENCES task_priorities(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Добавление стандартных статусов
INSERT INTO task_statuses (name) VALUES ('new'), ('in_progress'), ('done');

-- Добавление стандартных приоритетов
INSERT INTO task_priorities (name) VALUES ('low'), ('medium'), ('high');
