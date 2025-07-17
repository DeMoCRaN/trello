-- Миграция для изменения типа поля in_progress_since на TIMESTAMP WITH TIME ZONE
ALTER TABLE tasks
ALTER COLUMN in_progress_since TYPE TIMESTAMP WITH TIME ZONE
USING in_progress_since AT TIME ZONE 'UTC';
