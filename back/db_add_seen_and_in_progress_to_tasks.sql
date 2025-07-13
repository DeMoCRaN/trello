-- Добавление полей seen_at и in_progress_since в таблицу tasks
ALTER TABLE tasks
ADD COLUMN seen_at TIMESTAMP NULL,
ADD COLUMN in_progress_since TIMESTAMP NULL;
