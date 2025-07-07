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
  updated_at TIMESTAMP DEFAULT now()
);

-- Вставка стандартных ролей
INSERT INTO roles (name) VALUES ('admin'), ('user'), ('guest');

-- Вставка стандартных статусов задач
INSERT INTO task_statuses (name) VALUES ('new'), ('in_progress'), ('done');

-- Вставка стандартных приоритетов задач
INSERT INTO task_priorities (name) VALUES ('low'), ('medium'), ('high');
