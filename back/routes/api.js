const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createTask } = require('../controllers/tasks');
const { getAssignments, createAssignment, createTaskInAssignment } = require('../controllers/assignments');

// Получаем пул подключения к базе из app.locals
let pool;

const setPool = (app) => {
  pool = app.locals.pool;
};

const router = express.Router();

// Теперь используем pool в обработчиках

// Тестовый маршрут
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// ... остальные маршруты, где используется pool ...

// В каждом маршруте используем pool, например:
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }
    const user = userResult.rows[0];
    const isMatch = await require('bcryptjs').compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }
    const token = require('jsonwebtoken').sign(
      { userId: user.id, roleId: user.role_id },
      'your_jwt_secret_key',
      { expiresIn: '1h' }
    );
    res.json({ token });
  } catch (error) {
    console.error('Ошибка при логине:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Аналогично для других маршрутов...

// Экспортируем функцию для регистрации роутов и установки пула
module.exports = (app) => {
  setPool(app);
  app.use('/api', router);
};

// Секретный ключ для JWT (в реальном проекте храните в .env)
const JWT_SECRET = 'your_jwt_secret_key';

// Тестовый маршрут
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Маршрут для логина
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Ищем пользователя по email
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const user = userResult.rows[0];

    // Сравниваем пароль с хэшем из базы
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id, roleId: user.role_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Отправляем токен клиенту
    res.json({ token });
  } catch (error) {
    console.error('Ошибка при логине:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Роут для создания задачи
router.post('/tasks', async (req, res) => {
  try {
    const taskData = req.body;
    const newTask = await createTask(taskData);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Ошибка при создании задачи:', error);
    res.status(500).json({ error: 'Ошибка при создании задачи' });
  }
});

// Роут для получения списка задач с join на статусы и приоритеты
router.get('/tasks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.id, t.title, t.description, t.deadline, 
             u1.name AS creator_name, u2.name AS assignee_name,
             ts.name AS status, tp.name AS priority,
             t.created_at, t.updated_at
      FROM tasks t
      LEFT JOIN users u1 ON t.creator_id = u1.id
      LEFT JOIN users u2 ON t.assignee_id = u2.id
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      LEFT JOIN task_priorities tp ON t.priority_id = tp.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении задач:', error);
    res.status(500).json({ error: 'Ошибка при получении задач' });
  }
});

// Роут для получения списка заданий с задачами
router.get('/assignments', async (req, res) => {
  try {
    const assignments = await getAssignments();
    res.json(assignments);
  } catch (error) {
    console.error('Ошибка при получении заданий:', error);
    res.status(500).json({ error: 'Ошибка при получении заданий' });
  }
});

// Роут для создания нового задания
router.post('/assignments', async (req, res) => {
  try {
    const assignmentData = req.body;
    const newAssignment = await createAssignment(assignmentData);
    res.status(201).json(newAssignment);
  } catch (error) {
    console.error('Ошибка при создании задания:', error);
    res.status(500).json({ error: 'Ошибка при создании задания' });
  }
});

// Роут для создания задачи в задании
router.post('/assignments/:id/tasks', async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    const taskData = req.body;
    const newTask = await createTaskInAssignment(assignmentId, taskData);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Ошибка при создании задачи в задании:', error);
    res.status(500).json({ error: 'Ошибка при создании задачи в задании' });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  console.log('DELETE /tasks/:id called with id:', req.params.id);
  try {
    const taskId = parseInt(req.params.id, 10);
    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }
    res.json({ message: 'Задача успешно удалена' });
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error);
    res.status(500).json({ error: 'Ошибка при удалении задачи' });
  }
});

module.exports = (app) => {
  app.use('/api', router);
};
