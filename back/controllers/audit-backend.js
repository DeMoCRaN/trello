const logger = require('../logger');

// =============================================
// ПРОСТЫЕ АУДИТ-УТИЛИТЫ
// =============================================

/**
 * Устанавливает текущего пользователя для аудита в сессии PostgreSQL
 */
async function setAuditUser(client, userId) {
  if (!userId) {
    logger.warn('Attempt to set audit user without userId');
    return;
  }
  
  try {
    await client.query('SELECT set_current_user($1)', [userId]);
    logger.debug(`Audit user set to: ${userId}`);
  } catch (error) {
    logger.error('Failed to set audit user:', error);
    // Не прерываем выполнение, если аудит не настроен
  }
}

/**
 * Простая валидация ID
 */
function validateId(id, name = 'ID') {
  if (id === undefined || id === null) throw new Error(`${name} is required`);
  const numId = Number(id);
  if (!Number.isInteger(numId)) throw new Error(`${name} must be an integer`);
  if (numId <= 0) throw new Error(`${name} must be positive`);
  return numId;
}

/**
 * Простая валидация текста
 */
function validateText(text, fieldName, maxLength = 255) {
  if (text === undefined || text === null) throw new Error(`${fieldName} is required`);
  if (typeof text !== 'string') throw new Error(`${fieldName} must be a string`);
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new Error(`${fieldName} cannot be empty`);
  if (trimmed.length > maxLength) throw new Error(`${fieldName} exceeds maximum length`);
  return trimmed;
}

/**
 * Безопасный запрос
 */
async function safeQuery(client, query, params = []) {
  try {
    const result = await client.query(query, params);
    return result;
  } catch (error) {
    logger.error('Database query failed', {
      query: query.replace(/\s+/g, ' '),
      error: error.message
    });
    throw error;
  }
}

// =============================================
// ОСНОВНЫЕ ФУНКЦИИ АУДИТА
// =============================================

/**
 * Обновление статуса задачи с аудитом
 */
async function updateTaskStatusWithAudit(pool, taskId, statusId, action = null, currentUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setAuditUser(client, currentUserId);

    const validatedTaskId = validateId(taskId);
    const validatedStatusId = validateId(statusId);

    const archivedCheck = await safeQuery(client,
      'SELECT 1 FROM archived_tasks WHERE id = $1',
      [validatedTaskId]
    );
    if (archivedCheck.rows.length > 0) throw new Error('Cannot update archived task');

    const taskResult = await safeQuery(client,
      'SELECT in_progress_since, work_duration FROM tasks WHERE id = $1',
      [validatedTaskId]
    );
    if (taskResult.rows.length === 0) throw new Error('Task not found');

    const task = taskResult.rows[0];
    let query = 'UPDATE tasks SET status_id = $1, updated_at = NOW()';
    const params = [validatedStatusId];
    let paramIndex = 2;

    const now = new Date();
    if (validatedStatusId === 2) { // in_progress
      if (action === 'start' || action === 'resume') {
        query += `, in_progress_since = NOW()`;
      } else if (action === 'stop' && task.in_progress_since) {
        const elapsedMs = now - new Date(task.in_progress_since);
        const newDuration = (task.work_duration || 0) + Math.floor(elapsedMs / 1000);
        query += `, in_progress_since = NULL, work_duration = $${paramIndex}`;
        params.push(newDuration);
        paramIndex++;
      }
    } else if (validatedStatusId === 3 && task.in_progress_since) { // done
      const elapsedMs = now - new Date(task.in_progress_since);
      const newDuration = (task.work_duration || 0) + Math.floor(elapsedMs / 1000);
      query += `, in_progress_since = NULL, work_duration = $${paramIndex}`;
      params.push(newDuration);
      paramIndex++;
    }

    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(validatedTaskId);

    const result = await safeQuery(client, query, params);
    
    await client.query('COMMIT');
    
    logger.info('Task status updated with audit', { 
      taskId: validatedTaskId, 
      newStatus: validatedStatusId,
      userId: currentUserId 
    });
    
    // Простая нормализация
    const normalizedTask = {
      ...result.rows[0],
      id: result.rows[0].id.toString(),
      created_at: result.rows[0].created_at?.toISOString(),
      updated_at: result.rows[0].updated_at?.toISOString(),
      in_progress_since: result.rows[0].in_progress_since?.toISOString(),
      deadline: result.rows[0].deadline?.toISOString(),
      progress_percentage: result.rows[0].progress_percentage || 0
    };
    
    return normalizedTask;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Создание задачи с аудитом
 */
async function createTaskWithAudit(pool, taskData, currentUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setAuditUser(client, currentUserId);

    const validatedData = {
      title: validateText(taskData.title, 'Title'),
      description: validateText(taskData.description || '', 'Description', 2000),
      deadline: taskData.deadline ? new Date(taskData.deadline).toISOString() : null,
      creator_id: validateId(currentUserId, 'Creator ID'),
      assignee_id: validateId(taskData.assignee_id, 'Assignee ID'),
      status_id: validateId(taskData.status_id, 'Status ID'),
      priority_id: validateId(taskData.priority_id, 'Priority ID'),
      assignment_id: validateId(taskData.assignment_id, 'Assignment ID')
    };

    const result = await safeQuery(client,
      `INSERT INTO tasks (
        title, description, deadline, 
        creator_id, assignee_id, 
        status_id, priority_id, assignment_id,
        created_at, updated_at,
        progress_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), 0)
      RETURNING *`,
      [
        validatedData.title,
        validatedData.description,
        validatedData.deadline,
        validatedData.creator_id,
        validatedData.assignee_id,
        validatedData.status_id,
        validatedData.priority_id,
        validatedData.assignment_id
      ]
    );
    
    await client.query('COMMIT');
    
    logger.info('Task created with audit', { 
      taskId: result.rows[0].id, 
      userId: currentUserId 
    });
    
    // Простая нормализация
    const normalizedTask = {
      ...result.rows[0],
      id: result.rows[0].id.toString(),
      created_at: result.rows[0].created_at?.toISOString(),
      updated_at: result.rows[0].updated_at?.toISOString(),
      in_progress_since: result.rows[0].in_progress_since?.toISOString(),
      deadline: result.rows[0].deadline?.toISOString(),
      progress_percentage: result.rows[0].progress_percentage || 0
    };
    
    return normalizedTask;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Создание комментария с аудитом
 */
async function createCommentWithAudit(pool, taskId, text, currentUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setAuditUser(client, currentUserId);

    const validatedTaskId = validateId(taskId);
    const validatedText = validateText(text, 'Comment text', 2000);

    const result = await safeQuery(client,
      `INSERT INTO task_comments (task_id, user_id, text, created_at, is_read)
       VALUES ($1, $2, $3, now(), FALSE)
       RETURNING *`,
      [validatedTaskId, currentUserId, validatedText]
    );
    
    await client.query('COMMIT');
    
    logger.info('Comment created with audit', { 
      commentId: result.rows[0].id, 
      taskId: validatedTaskId,
      userId: currentUserId 
    });
    
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Создание задания с аудитом
 */
async function createAssignmentWithAudit(pool, assignmentData, currentUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setAuditUser(client, currentUserId);

    const validatedData = {
      title: validateText(assignmentData.title, 'Название задания'),
      description: assignmentData.description ? 
        validateText(assignmentData.description, 'Описание', 2000) : null,
      creator_id: currentUserId
    };

    const result = await safeQuery(client,
      `INSERT INTO assignments 
        (title, description, creator_id, created_at, updated_at) 
       VALUES ($1, $2, $3, now(), now()) 
       RETURNING *`,
      [validatedData.title, validatedData.description, validatedData.creator_id]
    );

    await client.query('COMMIT');
    
    logger.info('Assignment created with audit', { 
      assignmentId: result.rows[0].id, 
      userId: currentUserId 
    });
    
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Удаление задачи с аудитом
 */
async function deleteTaskWithAudit(pool, taskId, permanent = false, currentUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setAuditUser(client, currentUserId);

    const validatedId = validateId(taskId);

    const taskCheck = await safeQuery(client,
      `SELECT 'active' as type FROM tasks WHERE id = $1
       UNION ALL
       SELECT 'archived' as type FROM archived_tasks WHERE id = $1`,
      [validatedId]
    );

    if (taskCheck.rows.length === 0) throw new Error('Task not found');

    const taskType = taskCheck.rows[0].type;

    if (taskType === 'active' && !permanent) {
      await safeQuery(client,
        `INSERT INTO archived_tasks 
         SELECT *, NOW() as deleted_at FROM tasks WHERE id = $1`,
        [validatedId]
      );
      await safeQuery(client, 'DELETE FROM tasks WHERE id = $1', [validatedId]);
    } else {
      await safeQuery(client, 'DELETE FROM task_comments WHERE task_id = $1', [validatedId]);
      await safeQuery(client,
        `DELETE FROM ${taskType === 'active' ? 'tasks' : 'archived_tasks'} 
         WHERE id = $1`,
        [validatedId]
      );
    }

    await client.query('COMMIT');

    logger.info('Task deleted with audit', { 
      taskId: validatedId, 
      permanent,
      userId: currentUserId 
    });
    
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// =============================================
// ЭКСПОРТ
// =============================================

module.exports = {
  // Аудит-функции
  updateTaskStatusWithAudit,
  createTaskWithAudit,
  createCommentWithAudit,
  createAssignmentWithAudit,
  deleteTaskWithAudit,
  
  // Утилиты
  setAuditUser,
  safeQuery,
  validateId,
  validateText
};