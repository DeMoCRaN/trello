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

// Middleware для проверки аутентификации
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  jwt.verify(token, 'your_jwt_secret_key', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Неверный токен' });
    }
    req.user = decoded;
    next();
  });
};

// Middleware для проверки параметров ID
const validateIdParam = (req, res, next) => {
  const id = req.params.id;
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Неверный формат ID' });
  }
  next();
};

router.get('/assignments/:id/tasks', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id);
    const includeArchived = req.query.include_archived === 'true';
    
    // Проверка доступа к заданию
    const assignment = await pool.query(
      `SELECT * FROM assignments 
       WHERE id = $1 AND (creator_id = $2 OR EXISTS (
         SELECT 1 FROM tasks WHERE assignment_id = $1 AND assignee_id = $2
       ))`,
      [assignmentId, req.user.userId]
    );
    
    if (assignment.rows.length === 0) {
      return res.status(403).json({ error: 'Доступ запрещен или задание не найдено' });
    }
    
    // Основной запрос для активных задач
    let tasksQuery = `
      SELECT 
        t.id,
        t.assignment_id,
        t.title,
        t.description,
        t.deadline,
        t.creator_id,
        t.assignee_id,
        u.email AS assignee_email,
        u.username AS assignee_name,
        t.status_id,
        ts.name AS status,
        t.priority_id,
        tp.name AS priority,
        t.created_at,
        t.updated_at,
        t.seen_at,
        t.in_progress_since,
        COALESCE(t.work_duration, 0) AS work_duration,
        COALESCE(t.progress_percentage, 0) AS progress_percentage,
        NULL AS deleted_at,
        FALSE AS is_archived
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      LEFT JOIN task_priorities tp ON t.priority_id = tp.id
      WHERE t.assignment_id = $1
    `;
    
    // Если запрашивают архивные задачи, добавляем их через UNION
    if (includeArchived) {
      tasksQuery += `
        UNION ALL
        SELECT 
          at.id,
          at.assignment_id,
          at.title,
          at.description,
          at.deadline,
          at.creator_id,
          at.assignee_id,
          u.email AS assignee_email,
          u.username AS assignee_name,
          at.status_id,
          ts.name AS status,
          at.priority_id,
          tp.name AS priority,
          at.created_at,
          at.updated_at,
          at.seen_at,
          at.in_progress_since,
          COALESCE(at.work_duration, 0) AS work_duration,
          COALESCE(at.progress_percentage, 0) AS progress_percentage,
          at.deleted_at,
          TRUE AS is_archived
        FROM archived_tasks at
        LEFT JOIN users u ON at.assignee_id = u.id
        LEFT JOIN task_statuses ts ON at.status_id = ts.id
        LEFT JOIN task_priorities tp ON at.priority_id = tp.id
        WHERE at.assignment_id = $1
      `;
    }
    
    tasksQuery += ' ORDER BY created_at DESC';
    
    const tasksResult = await pool.query(tasksQuery, [assignmentId]);
    
    // Преобразование данных для фронтенда
    const tasks = tasksResult.rows.map(task => ({
      ...task,
      deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
      created_at: new Date(task.created_at).toISOString(),
      updated_at: new Date(task.updated_at).toISOString(),
      seen_at: task.seen_at ? new Date(task.seen_at).toISOString() : null,
      in_progress_since: task.in_progress_since ? new Date(task.in_progress_since).toISOString() : null,
      deleted_at: task.deleted_at ? new Date(task.deleted_at).toISOString() : null
    }));
    
    res.json(tasks);
  } catch (error) {
    console.error('Ошибка при получении задач:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.patch('/tasks/:id/progress', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { progress_percentage } = req.body;
    
    if (progress_percentage === undefined || progress_percentage < 0 || progress_percentage > 100) {
      return res.status(400).json({ error: 'Invalid progress_percentage value' });
    }
    
    const updatedTask = await tasksController.updateTaskProgress(pool, taskId, progress_percentage);
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
router.get('/tasks/assigned', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tasks = await tasksController.getTasksByAssignee(pool, userId);
    res.json(tasks);
  } catch (error) {
    console.error('Ошибка при получении задач по assignee:', error);
    res.status(500).json({ error: 'Ошибка при получении задач по assignee' });
  }
});

router.get('/tasks/:id', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    console.log(`GET /tasks/:id called with id param: ${taskId}`);

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

  // Валидация входных данных
  if (!email || !password) {
    return res.status(400).json({ message: 'Email и пароль обязательны' });
  }

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

router.get('/users/:id', authenticateToken, validateIdParam, async (req, res) => {
  const userId = req.params.id;
  try {
    // Проверяем, что пользователь запрашивает свои данные или имеет права администратора
    if (req.user.userId !== parseInt(userId) && req.user.roleId !== 1) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const userResult = await pool.query(
      'SELECT id, email, role_id FROM users WHERE id = $1', 
      [userId]
    );
    
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
router.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const taskData = req.body;
    
    // Валидация данных задачи
    if (!taskData.title || !taskData.assignment_id) {
      return res.status(400).json({ error: 'Название и ID задания обязательны' });
    }
    
    const newTask = await tasksController.createTask(pool, taskData);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Ошибка при создании задачи:', error);
    res.status(500).json({ error: 'Ошибка при создании задачи' });
  }
});

// Получить комментарии задачи
router.get('/tasks/:id/comments', authenticateToken, validateIdParam, async (req, res) => {
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
router.post('/tasks/:id/comments', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user.userId;
    const taskId = parseInt(req.params.id, 10);
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Текст комментария не может быть пустым' });
    }
    
    const newComment = await commentsController.createComment(pool, { 
      task_id: taskId, 
      user_id: userId, 
      text 
    });
    
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Ошибка при добавлении комментария:', error);
    res.status(500).json({ error: 'Ошибка при добавлении комментария' });
  }
});

router.get('/assignments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const includeArchived = req.query.include_archived === 'true';
    
    const assignments = await assignmentsController.getAssignments(
      pool, 
      userId,
      includeArchived
    );
    
    res.json(assignments);
  } catch (error) {
    console.error('Ошибка при получении заданий:', error);
    res.status(500).json({ error: 'Ошибка при получении заданий' });
  }
});

router.post('/assignments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const assignmentData = req.body;
    
    // Валидация данных задания
    if (!assignmentData.title) {
      return res.status(400).json({ error: 'Название задания обязательно' });
    }
    
    assignmentData.creator_id = userId;
    const newAssignment = await assignmentsController.createAssignment(pool, assignmentData);
    res.status(201).json(newAssignment);
  } catch (error) {
    console.error('Ошибка при создании задания:', error);
    res.status(500).json({ error: 'Ошибка при создании задания' });
  }
});

router.post('/assignments/:id/tasks', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    const taskData = req.body;
    
    // Валидация данных задачи
    if (!taskData.title) {
      return res.status(400).json({ error: 'Название задачи обязательно' });
    }
    
    const newTask = await assignmentsController.createTaskInAssignment(pool, assignmentId, taskData);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Ошибка при создании задачи в задании:', error);
    res.status(500).json({ error: 'Ошибка при создании задачи в задании' });
  }
});

router.delete('/tasks/:id', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    await tasksController.deleteTask(pool, taskId);
    res.json({ message: 'Задача успешно удалена' });
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error);
    res.status(500).json({ error: 'Ошибка при удалении задачи' });
  }
});

router.delete('/assignments/:id', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    await assignmentsController.deleteAssignment(pool, assignmentId);
    res.json({ message: 'Задание успешно удалено' });
  } catch (error) {
    console.error('Ошибка при удалении задания:', error);
    res.status(500).json({ error: 'Ошибка при удалении задания' });
  }
});

// Роуты для управления командой проекта
router.post('/assignments/:id/invite', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    const { user_email } = req.body;
    const invitedBy = req.user.userId;

    if (!user_email) {
      return res.status(400).json({ error: 'Email пользователя обязателен' });
    }

    // Получаем ID пользователя по email
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [user_email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь с таким email не найден' });
    }

    const userId = userResult.rows[0].id;

    const invitation = await assignmentsController.inviteUserToAssignment(pool, assignmentId, userId, invitedBy);
    res.status(201).json(invitation);
  } catch (error) {
    console.error('Ошибка при приглашении пользователя:', error);
    res.status(500).json({ error: 'Ошибка при приглашении пользователя' });
  }
});

router.get('/assignments/:id/team', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    const teamMembers = await assignmentsController.getTeamMembers(pool, assignmentId);
    res.json(teamMembers);
  } catch (error) {
    console.error('Ошибка при получении состава команды:', error);
    res.status(500).json({ error: 'Ошибка при получении состава команды' });
  }
});

router.post('/assignments/:assignmentId/invitations/:invitationId/respond', authenticateToken, async (req, res) => {
  try {
    console.log('Route hit: POST /assignments/:assignmentId/invitations/:invitationId/respond');
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    console.log('User:', req.user);

    const invitationId = parseInt(req.params.invitationId, 10);
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const { status } = req.body;
    const userId = req.user.userId;

    console.log('Parsed values:', { invitationId, assignmentId, status, userId });

    // Validate invitationId
    if (isNaN(invitationId)) {
      console.log('Validation failed: invalid invitationId');
      return res.status(400).json({ error: 'Неверный формат ID приглашения' });
    }

    // Validate assignmentId
    if (isNaN(assignmentId)) {
      console.log('Validation failed: invalid assignmentId');
      return res.status(400).json({ error: 'Неверный формат ID задания' });
    }

    if (!['accepted', 'rejected'].includes(status)) {
      console.log('Validation failed: invalid status');
      return res.status(400).json({ error: 'Статус должен быть "accepted" или "rejected"' });
    }

    console.log('Calling controller...');
    const response = await assignmentsController.respondToInvitation(pool, invitationId, userId, status);
    console.log('Controller response:', response);
    res.json(response);
  } catch (error) {
    console.error('Ошибка при ответе на приглашение:', error);
    res.status(500).json({ error: 'Ошибка при ответе на приглашение' });
  }
});

router.get('/users/me/invitations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const invitations = await assignmentsController.getPendingInvitations(pool, userId);
    res.json(invitations);
  } catch (error) {
    console.error('Ошибка при получении приглашений:', error);
    res.status(500).json({ error: 'Ошибка при получении приглашений' });
  }
});

router.patch('/tasks/:id/status', authenticateToken, validateIdParam, async (req, res) => {
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

router.patch('/tasks/:id/seen', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const updatedTask = await tasksController.markTaskAsSeen(pool, taskId);
    res.json(updatedTask);
  } catch (error) {
    console.error('Ошибка при обновлении статуса просмотра задачи:', error);
    res.status(500).json({ error: 'Ошибка при обновлении статуса просмотра задачи' });
  }
});

router.get('/task_statuses', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM task_statuses ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении статусов задач:', error);
    res.status(500).json({ error: 'Ошибка при получении статусов задач' });
  }
});

router.get('/task_priorities', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM task_priorities ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении приоритетов задач:', error);
    res.status(500).json({ error: 'Ошибка при получении приоритетов задач' });
  }
});

router.get('/comments/unread/count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = await commentsController.getUnreadCommentsCount(pool, userId);
    res.json({ unread_count: count });
  } catch (error) {
    console.error('Ошибка при получении количества непрочитанных комментариев:', error);
    res.status(500).json({ error: 'Ошибка при получении количества непрочитанных комментариев' });
  }
});

router.get('/comments/unread', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const comments = await commentsController.getUnreadComments(pool, userId);
    res.json(comments);
  } catch (error) {
    console.error('Ошибка при получении непрочитанных комментариев:', error);
    res.status(500).json({ error: 'Ошибка при получении непрочитанных комментариев' });
  }
});

router.post('/comments/mark-read', authenticateToken, async (req, res) => {
  try {
    const { commentIds } = req.body;

    if (!Array.isArray(commentIds)) {
      return res.status(400).json({ error: 'commentIds должен быть массивом' });
    }

    // Валидация ID комментариев
    const invalidIds = commentIds.filter(id => !/^\d+$/.test(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: 'Некорректные ID комментариев' });
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