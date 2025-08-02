-- Migration script to add work_duration column to tasks table
ALTER TABLE tasks
ADD COLUMN work_duration INTEGER DEFAULT 0;
