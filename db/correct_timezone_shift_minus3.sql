-- Скрипт коррекции даты/времени, которые были сохранены с неверным фиксированным смещением -3 часа.
-- ВАЖНО:
-- 1) Он предназначен для postgres (timestamptz).
-- 2) Он ПЕРЕДВИГАЕТ время на +3 часа.
-- 3) Запускайте только если вы уверены, что эти поля были смещены.
-- 4) Сделайте бэкап базы перед запуском.

BEGIN;

-- tasks
UPDATE tasks
SET
  created_at = created_at + interval '3 hours',
  updated_at = updated_at + interval '3 hours',
  seen_at = CASE WHEN seen_at IS NOT NULL THEN seen_at + interval '3 hours' ELSE NULL END,
  in_progress_since = CASE WHEN in_progress_since IS NOT NULL THEN in_progress_since + interval '3 hours' ELSE NULL END,
  deadline = CASE WHEN deadline IS NOT NULL THEN deadline + interval '3 hours' ELSE NULL END,
  failed_at = CASE WHEN failed_at IS NOT NULL THEN failed_at + interval '3 hours' ELSE NULL END
WHERE
  created_at IS NOT NULL
;

-- archived_tasks
UPDATE archived_tasks
SET
  created_at = created_at + interval '3 hours',
  updated_at = updated_at + interval '3 hours',
  seen_at = CASE WHEN seen_at IS NOT NULL THEN seen_at + interval '3 hours' ELSE NULL END,
  in_progress_since = CASE WHEN in_progress_since IS NOT NULL THEN in_progress_since + interval '3 hours' ELSE NULL END,
  deadline = CASE WHEN deadline IS NOT NULL THEN deadline + interval '3 hours' ELSE NULL END,
  failed_at = CASE WHEN failed_at IS NOT NULL THEN failed_at + interval '3 hours' ELSE NULL END,
  deleted_at = CASE WHEN deleted_at IS NOT NULL THEN deleted_at + interval '3 hours' ELSE NULL END
WHERE
  created_at IS NOT NULL
;

-- deleted_failed_tasks
UPDATE deleted_failed_tasks
SET
  created_at = created_at + interval '3 hours',
  updated_at = updated_at + interval '3 hours',
  seen_at = CASE WHEN seen_at IS NOT NULL THEN seen_at + interval '3 hours' ELSE NULL END,
  in_progress_since = CASE WHEN in_progress_since IS NOT NULL THEN in_progress_since + interval '3 hours' ELSE NULL END,
  deadline = CASE WHEN deadline IS NOT NULL THEN deadline + interval '3 hours' ELSE NULL END,
  failed_at = CASE WHEN failed_at IS NOT NULL THEN failed_at + interval '3 hours' ELSE NULL END,
  deleted_at = CASE WHEN deleted_at IS NOT NULL THEN deleted_at + interval '3 hours' ELSE NULL END
WHERE
  created_at IS NOT NULL
;

COMMIT;

-- Проверка (пример):
-- SELECT id, created_at, deadline FROM tasks ORDER BY created_at DESC LIMIT 20;

