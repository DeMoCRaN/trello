-- Создание таблицы заданий (assignments)
CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Добавление поля assignment_id в таблицу tasks
ALTER TABLE tasks
ADD COLUMN assignment_id INTEGER REFERENCES assignments(id);
