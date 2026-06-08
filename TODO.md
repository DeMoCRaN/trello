# TODO — исправление timezone/created_at (-3 часа)

## Шаг 1: Исправить C# преобразование DateTime
- [ ] Обновить `с#/Diploma/Diploma.Infrastructure/Utils/DateTimeUtils.cs`: убрать `AddHours(-3)`.
- [ ] При необходимости добавить метод `ToPgTimestampUtc`/обновить существующие вызовы.

## Шаг 2: Заменить вызовы `ToPgTimestampWithOffset` в backend
- [ ] В `с#/Diploma/Diploma.Infrastructure/Services/TaskService.cs` заменить `ToPgTimestampWithOffset(...)` на корректный метод UTC.
- [ ] Поискать другие места использования `ToPgTimestampWithOffset` и обновить.

## Шаг 3: Миграция/скрипт коррекции уже записанных значений
- [ ] Подготовить SQL-скрипт коррекции для таблиц задач (tasks, archived_tasks, deleted_failed_tasks и т.п.), смещённых на -3 часа.
- [ ] Убедиться, что смещение применяется только к полям created_at/deadline/updated_at/in_progress_since (по факту), и что корректировка обратима.

## Шаг 4: Сборка/проверка
- [ ] Пересобрать проект и запустить.
- [ ] Создать тестовую задачу и проверить, что created_at/прогресс совпадают с дедлайном.

