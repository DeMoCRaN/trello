const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const tasksController = require('../controllers/tasks');
const assignmentsController = require('../controllers/assignments');

const { Pool } = require('pg');

// Создаем пул подключения к базе данных для API
const pool = new Pool({
  user: 'democran',
  host: 'localhost',
  database: 'democran',
  password: 'qweasd-123',
  port: 5433,
});

const setPool = (app) => {
  // Оставляем пустой, так как пул создается здесь
};

const router = express.Router();

// Теперь используем pool в обработчиках

// Тестовый маршрут
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});


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
    const newTask = await tasksController.createTask(pool, taskData);
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
    const assignments = await assignmentsController.getAssignments(pool);
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
    const newAssignment = await assignmentsController.createAssignment(pool, assignmentData);
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
    const newTask = await assignmentsController.createTaskInAssignment(pool, assignmentId, taskData);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Ошибка при создании задачи в задании:', error);
    res.status(500).json({ error: 'Ошибка при создании задачи в задании' });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    await tasksController.deleteTask(pool, taskId);
    res.json({ message: 'Задача успешно удалена' });
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error);
    res.status(500).json({ error: 'Ошибка при удалении задачи' });
  }
});

router.delete('/assignments/:id', async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    await assignmentsController.deleteAssignment(pool, assignmentId);
    res.json({ message: 'Задание успешно удалено' });
  } catch (error) {
    console.error('Ошибка при удалении задания:', error);
    res.status(500).json({ error: 'Ошибка при удалении задания' });
  }
});

router.patch('/tasks/:id/status', async (req, res) => {
  try {
    console.log('PATCH /tasks/:id/status called with params:', req.params, 'body:', req.body);
    const taskId = parseInt(req.params.id, 10);
    const { status_id } = req.body;
    if (!status_id) {
      return res.status(400).json({ error: 'status_id is required' });
    }
    const updatedTask = await tasksController.updateTaskStatus(pool, taskId, status_id);
    res.json(updatedTask);
  } catch (error) {
    console.error('Ошибка при обновлении статуса задачи:', error);
    res.status(500).json({ error: 'Ошибка при обновлении статуса задачи' });
  }
});

router.get('/task_statuses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM task_statuses ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении статусов задач:', error);
    res.status(500).json({ error: 'Ошибка при получении статусов задач' });
  }
});

router.get('/task_priorities', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM task_priorities ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении приоритетов задач:', error);
    res.status(500).json({ error: 'Ошибка при получении приоритетов задач' });
  }
});

module.exports = (app) => {
  app.use('/api', router);
};
