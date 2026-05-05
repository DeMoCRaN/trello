# План миграции фронтенда на C# бэкенд (порт 7069)

## ✅ Понимание проблемы
- Frontend → Node.js (5000) → 404 на PATCH /api/tasks/{id}/status
- C# backend (7069) **ИМЕЕТ** endpoint ✅
- Swagger показывает endpoint (пользователь мог пропустить)

## 📋 Шаги реализации (по порядку)

### 1. Создать API конфигурацию [ПРИОРИТЕТ 1]
```
front/my_front/src/services/api.js
```
- `BASE_URL = 'http://localhost:7069'` 
- Функции для всех endpoints с правильным payload (statusId вместо status_id)

### 2. Миграция AssignedTasks.jsx [ПРИОРИТЕТ 1]
- Заменить все `localhost:5000` → api functions
- `updateTaskStatus()`: `{status_id: X, action: Y}` → `{statusId: X}`

### 3. Миграция MainPage.jsx [ПРИОРИТЕТ 1]
- `handleStatusChange()`, все fetch → api functions

### 4. Тестирование C# endpoints [ПРИОРИТЕТ 2]
```
cd с#/Diploma/Diploma && dotnet run
curl -X PATCH http://localhost:7069/api/tasks/213/status -H "Authorization: Bearer TOKEN" -d '{"statusId":2}'
```

### 5. Миграция остальных компонентов [ПРИОРИТЕТ 2]
```
TaskCreationForm.jsx
AssignmentsList.jsx  
TeamMembersPanel.jsx
```

### 6. Auth/Login миграция [ПРИОРИТЕТ 3]
- Проверить JWT совместимость C# `/api/login`

### 7. Финализация [ПРИОРИТЕТ 3]
- Обновить README
- Удалить Node.js зависимости (опционально)

## ⏳ Текущее состояние
```
[ ] 1. API config
[ ] 2. AssignedTasks.jsx  
[ ] 3. MainPage.jsx
[ ] 4. Тестирование
[ ] 5. Остальные компоненты
[ ] 6. Auth
[ ] 7. Финализация
```

**ДАВАЙТЕ НАЧИНЕМ С ШАГА 1!**

