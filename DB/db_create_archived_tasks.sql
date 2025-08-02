-- Создание таблицы архивированных задач с порядком столбцов, точно совпадающим с порядком в списке
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
