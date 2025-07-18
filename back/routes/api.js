const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const tasksController = require('../controllers/tasks');
const assignmentsController = require('../controllers/assignments');
const commentsController = require('../controllers/comments');


const { Pool } = require('pg');

// Создаем пул подключения к базе данных для API
const pool = new Pool({
  user: 'democran',
  host: 'localhost',
  database: 'democran',
  password: 'qweasd-123',
  port: 5433,
});

const router = express.Router();

router.get('/assignments/:id/tasks', async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id);
    const token = req.headers.authorization?.split(' ')[1];
    
    // Проверка аутентификации
    const decoded = jwt.verify(token, 'your_jwt_secret_key');
    
    // Проверка доступа к заданию
    const assignment = await pool.query(
      'SELECT * FROM assignments WHERE id = $1 AND creator_id = $2',
      [assignmentId, decoded.userId]
    );
    
    if (assignment.rows.length === 0) {
      return res.status(404).json([]);
    }
    
    // Получение задач из tasks и archived_tasks с явным указанием колонок и приведением типов
    const tasksResult = await pool.query(
      `SELECT 
         id::text, title, description, deadline, creator_id::text, assignee_id::text, NULL::text AS assignment_id, 
         status_id::text, priority_id::text, created_at, updated_at, NULL::timestamp AS seen_at, NULL::timestamp AS in_progress_since, NULL::timestamp AS deleted_at, 
         0::int AS work_duration, 0::int AS progress_percentage
       FROM tasks
       WHERE assignment_id = $1
      UNION ALL
      SELECT 
         id::text, title, description, deadline, creator_id::text, assignee_id::text, assignment_id::text, 
         status_id::text, priority_id::text, created_at, updated_at, seen_at, in_progress_since, deleted_at, 
         work_duration::int, progress_percentage::int
       FROM archived_tasks
       WHERE assignment_id = $1`,
      [assignmentId]
    );
    
    res.json(tasksResult.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/tasks/:id/progress', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
   const { progress_percentage } = req.body;
    if (progress_percentage === undefined || progress_percentage < 0 || progress_percentage > 100) {
      return res.status(400).json({ error: 'Invalid progress_percentage value' });
    }
    const updatedTask = await require('../controllers/tasks').updateTaskProgress(pool, taskId, progress_percentage);
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task progress:', error);
    res.status(500).json({ error: 'Error updating task progress' });
  }
});

// Logging middleware for /api/tasks/*
router.use('/tasks', (req, res, next) => {
  console.log(`Incoming ${req.method} request to ${req.originalUrl}`);
  next();
});

// Тестовый маршрут
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Новый маршрут для получения информации о задачи по ID
router.get('/tasks/assigned', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, 'your_jwt_secret_key');
    } catch (err) {
      return res.status(401).json({ error: 'Неверный токен' });
    }
    const userId = decoded.userId;

    const tasks = await tasksController.getTasksByAssignee(pool, userId);
    res.json(tasks);
  } catch (error) {
    console.error('Ошибка при получении задач по assignee:', error);
    res.status(500).json({ error: 'Ошибка при получении задач по assignee' });
  }
});

router.get('/tasks/:id', async (req, res) => {
  try {
    let taskIdRaw = req.params.id;
    console.log(`GET /tasks/:id called with id param: ${taskIdRaw}`);

    // Sanitize and validate taskIdRaw
    taskIdRaw = taskIdRaw.trim();
    if (!/^\d+$/.test(taskIdRaw)) {
      console.warn(`Invalid task ID received: ${taskIdRaw}`);
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const taskId = parseInt(taskIdRaw, 10);

    const task = await tasksController.getTaskById(pool, taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    console.error('Error fetching task by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Маршрут для логина
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { userId: user.id, roleId: user.role_id, email: user.email },
      'your_jwt_secret_key',
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Ошибка при логине:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});


// Новый маршрут для получения информации о пользователе по ID
router.get('/users/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const userResult = await pool.query('SELECT id, email, role_id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    const user = userResult.rows[0];
    res.json(user);
  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Новый маршрут для получения информации о пользователе по email
router.get('/users/email/:email', async (req, res) => {
  const email = req.params.email;
  try {
    const userResult = await pool.query('SELECT id, email, role_id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    const user = userResult.rows[0];
    res.json(user);
  } catch (error) {
    console.error('Ошибка при получении пользователя по email:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Роуты для задач и заданий
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

// Получить комментарии задачи
router.get('/tasks/:id/comments', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const comments = await commentsController.getCommentsByTaskId(pool, taskId);
    res.json(comments);
  } catch (error) {
    console.error('Ошибка при получении комментариев:', error);
    res.status(500).json({ error: 'Ошибка при получении комментариев' });
  }
});

// Добавить комментарий к задаче
router.post('/tasks/:id/comments', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = require('jsonwebtoken').verify(token, 'your_jwt_secret_key');
    } catch (err) {
      return res.status(401).json({ error: 'Неверный токен' });
    }
    const userId = decoded.userId;
    const taskId = parseInt(req.params.id, 10);
    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Текст комментария не может быть пустым' });
    }
    const newComment = await commentsController.createComment(pool, { task_id: taskId, user_id: userId, text });
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Ошибка при добавлении комментария:', error);
    res.status(500).json({ error: 'Ошибка при добавлении комментария' });
  }
});

router.get('/assignments', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, 'your_jwt_secret_key');
    } catch (err) {
      return res.status(401).json({ error: 'Неверный токен' });
    }
    const userId = decoded.userId;

    const assignments = await assignmentsController.getAssignments(pool, userId);
    res.json(assignments);
  } catch (error) {
    console.error('Ошибка при получении заданий:', error);
    res.status(500).json({ error: 'Ошибка при получении заданий' });
  }
});

router.post('/assignments', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, 'your_jwt_secret_key');
    } catch (err) {
      return res.status(401).json({ error: 'Неверный токен' });
    }
    const userId = decoded.userId;

    const assignmentData = req.body;
    assignmentData.creator_id = userId;
    const newAssignment = await assignmentsController.createAssignment(pool, assignmentData);
    res.status(201).json(newAssignment);
  } catch (error) {
    console.error('Ошибка при создании задания:', error);
    res.status(500).json({ error: 'Ошибка при создании задания' });
  }
});

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
    const { status_id, action } = req.body;
    if (!status_id) {
      return res.status(400).json({ error: 'status_id is required' });
    }
    const updatedTask = await tasksController.updateTaskStatus(pool, taskId, status_id, action);
    res.json(updatedTask);
  } catch (error) {
    console.error('Ошибка при обновлении статуса задачи:', error);
    res.status(500).json({ error: 'Ошибка при обновлении статуса задачи' });
  }
});

router.patch('/tasks/:id/seen', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const updatedTask = await tasksController.markTaskAsSeen(pool, taskId);
    res.json(updatedTask);
  } catch (error) {
    console.error('Ошибка при обновлении статуса просмотра задачи:', error);
    res.status(500).json({ error: 'Ошибка при обновлении статуса просмотра задачи' });
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



router.get('/comments/unread/count', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, 'your_jwt_secret_key');
    } catch (err) {
      return res.status(401).json({ error: 'Неверный токен' });
    }
    const userId = decoded.userId;

    const count = await commentsController.getUnreadCommentsCount(pool, userId);
    res.json({ unread_count: count });
  } catch (error) {
    console.error('Ошибка при получении количества непрочитанных комментариев:', error);
    res.status(500).json({ error: 'Ошибка при получении количества непрочитанных комментариев' });
  }
});

router.get('/comments/unread', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, 'your_jwt_secret_key');
    } catch (err) {
      return res.status(401).json({ error: 'Неверный токен' });
    }
    
    const userId = decoded.userId;
    const comments = await commentsController.getUnreadComments(pool, userId);
    
    res.json(comments);
  } catch (error) {
    console.error('Ошибка при получении непрочитанных комментариев:', error);
    res.status(500).json({ error: 'Ошибка при получении непрочитанных комментариев' });
  }
});

router.post('/comments/mark-read', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, 'your_jwt_secret_key');
    } catch (err) {
      return res.status(401).json({ error: 'Неверный токен' });
    }
    const { commentIds } = req.body;
    if (!Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({ error: 'commentIds должен быть непустым массивом' });
    }

    const updatedCount = await commentsController.markCommentsAsReadByIds(pool, commentIds);
    res.json({ updated_count: updatedCount });
  } catch (error) {
    console.error('Ошибка при обновлении статуса прочтения комментариев:', error);
    res.status(500).json({ error: 'Ошибка при обновлении статуса прочтения комментариев' });
  }
});

module.exports = (app) => {
  app.use('/api', router);
};
