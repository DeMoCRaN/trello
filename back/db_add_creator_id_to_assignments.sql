-- Добавление поля creator_id в таблицу assignments
ALTER TABLE assignments
ADD COLUMN creator_id INTEGER NOT NULL REFERENCES users(id);
