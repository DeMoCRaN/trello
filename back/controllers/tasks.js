const { Pool } = require('pg');
const logger = require('../logger');

// =============================================
// БЕЗОПАСНЫЕ УТИЛИТЫ И ВАЛИДАЦИЯ
// =============================================

async function safeQuery(client, query, params = []) {
  params.forEach((param, index) => {
    if (param === undefined || param === null) return;
    
    if (typeof param === 'string' && /[;'"\\]|(--)|(\/\*)/.test(param)) {
      logger.warn(`SQL Injection attempt detected in param ${index}: ${param}`);
      throw new Error('Invalid input detected');
    }
    
    if (typeof param === 'number' && !Number.isFinite(param)) {
      throw new Error(`Invalid numeric parameter at position ${index}`);
    }
  });

  try {
    const result = await client.query(query, params);
    logger.sql(query, params); // Логируем SQL запросы
    return result;
  } catch (error) {
    logger.error('Database query failed', {
      query: query.replace(/\s+/g, ' '),
      params: params.map(p => (typeof p === 'string' ? p.substring(0, 100) : p)),
      error: error.message
    });
    throw error;
  }
}

function validateId(id, name = 'ID') {
  if (id === undefined || id === null) throw new Error(`${name} is required`);
  const numId = Number(id);
  if (!Number.isInteger(numId)) throw new Error(`${name} must be an integer`);
  if (numId <= 0) throw new Error(`${name} must be positive`);
  return numId;
}

function validateText(text, fieldName, maxLength = 255) {
  if (text === undefined || text === null) throw new Error(`${fieldName} is required`);
  if (typeof text !== 'string') throw new Error(`${fieldName} must be a string`);
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new Error(`${fieldName} cannot be empty`);
  if (trimmed.length > maxLength) throw new Error(`${fieldName} exceeds maximum length`);
  return trimmed;
}

function validateDate(dateStr, fieldName) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) throw new Error(`Invalid ${fieldName} format`);
    return date.toISOString();
  } catch (error) {
    throw new Error(`Invalid ${fieldName}: ${error.message}`);
  }
}

function normalizeTask(task) {
  if (!task) return null;
  return {
    ...task,
    id: task.id.toString(),
    created_at: task.created_at?.toISOString(),
    updated_at: task.updated_at?.toISOString(),
    in_progress_since: task.in_progress_since?.toISOString(),
    deadline: task.deadline?.toISOString(),
    deleted_at: task.deleted_at?.toISOString(),
    progress_percentage: task.progress_percentage || 0,
    is_archived: !!task.deleted_at
  };
}

// =============================================
// ОСНОВНЫЕ ФУНКЦИИ РАБОТЫ С ЗАДАЧАМИ
// =============================================

async function createTask(pool, taskData) {
  const client = await pool.connect();
  try {
    const validatedData = {
      title: validateText(taskData.title, 'Title'),
      description: validateText(taskData.description || '', 'Description', 2000),
      deadline: validateDate(taskData.deadline, 'Deadline'),
      creator_id: validateId(taskData.creator_id, 'Creator ID'),
      assignee_id: validateId(taskData.assignee_id, 'Assignee ID'),
      status_id: validateId(taskData.status_id, 'Status ID'),
      priority_id: validateId(taskData.priority_id, 'Priority ID')
    };

    const result = await safeQuery(client,
      `INSERT INTO tasks (
        title, description, deadline, 
        creator_id, assignee_id, 
        status_id, priority_id, 
        created_at, updated_at,
        progress_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), 0)
      RETURNING *`,
      Object.values(validatedData)
    );
    
    return normalizeTask(result.rows[0]);
  } finally {
    client.release();
  }
}

async function deleteTask(pool, taskId, permanent = false) {
  const validatedId = validateId(taskId);
  const client = await pool.connect();
  
  try {
    await safeQuery(client, 'BEGIN');

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

    await safeQuery(client, 'COMMIT');
    return { success: true };
  } catch (error) {
    await safeQuery(client, 'ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateTaskStatus(pool, taskId, statusId, action = null) {
  const validatedTaskId = validateId(taskId);
  const validatedStatusId = validateId(statusId);
  const client = await pool.connect();
  
  try {
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
    return normalizeTask(result.rows[0]);
  } finally {
    client.release();
  }
}

async function markTaskAsSeen(pool, taskId) {
  const client = await pool.connect();
  try {
    const archivedCheck = await safeQuery(client,
      'SELECT 1 FROM archived_tasks WHERE id = $1',
      [taskId]
    );
    if (archivedCheck.rows.length > 0) throw new Error('Cannot mark archived task as seen');

    const result = await safeQuery(client,
      `UPDATE tasks SET seen_at = NOW() WHERE id = $1 RETURNING *`,
      [taskId]
    );
    return normalizeTask(result.rows[0]);
  } finally {
    client.release();
  }
}

async function getTaskById(pool, taskId) {
  const client = await pool.connect();
  try {
    let result = await safeQuery(client,
      `SELECT 
        t.id, t.title, t.description, t.deadline,
        t.created_at, t.updated_at, t.in_progress_since,
        t.work_duration, t.status_id, t.priority_id,
        t.creator_id, t.assignee_id, t.progress_percentage,
        u1.email AS creator_name, u2.email AS assignee_name,
        s.name AS status, p.name AS priority,
        false as is_archived
      FROM tasks t
      LEFT JOIN users u1 ON t.creator_id = u1.id
      LEFT JOIN users u2 ON t.assignee_id = u2.id
      LEFT JOIN task_statuses s ON t.status_id = s.id
      LEFT JOIN task_priorities p ON t.priority_id = p.id
      WHERE t.id = $1`,
      [taskId]
    );

    if (result.rows.length === 0) {
      result = await safeQuery(client,
        `SELECT 
          at.id, at.title, at.description, at.deadline,
          at.created_at, at.updated_at, at.in_progress_since,
          at.work_duration, at.status_id, at.priority_id,
          at.creator_id, at.assignee_id, at.progress_percentage,
          u1.email AS creator_name, u2.email AS assignee_name,
          s.name AS status, p.name AS priority,
          true as is_archived, at.deleted_at
        FROM archived_tasks at
        LEFT JOIN users u1 ON at.creator_id = u1.id
        LEFT JOIN users u2 ON at.assignee_id = u2.id
        LEFT JOIN task_statuses s ON at.status_id = s.id
        LEFT JOIN task_priorities p ON at.priority_id = p.id
        WHERE at.id = $1`,
        [taskId]
      );
    }

    return normalizeTask(result.rows[0]);
  } finally {
    client.release();
  }
}

async function getTasksByAssignee(pool, assigneeId) {
  const client = await pool.connect();
  try {
    const result = await safeQuery(client,
      `SELECT 
        t.id, t.title, t.description, t.deadline,
        t.in_progress_since, t.work_duration,
        t.created_at, t.updated_at, t.progress_percentage,
        u1.email AS creator_email, u2.email AS assignee_email,
        ts.name AS status, tp.name AS priority,
        ts.id AS status_id, tp.id AS priority_id
      FROM tasks t
      LEFT JOIN users u1 ON t.creator_id = u1.id
      LEFT JOIN users u2 ON t.assignee_id = u2.id
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      LEFT JOIN task_priorities tp ON t.priority_id = tp.id
      WHERE t.assignee_id = $1
      ORDER BY 
        CASE 
          WHEN t.in_progress_since IS NOT NULL THEN 0
          WHEN t.deadline IS NOT NULL AND t.deadline < NOW() THEN 1
          ELSE 2
        END,
        t.deadline ASC`,
      [assigneeId]
    );
    
    return result.rows.map(normalizeTask);
  } finally {
    client.release();
  }
}

async function updateTaskProgress(pool, taskId, progressPercentage) {
  const client = await pool.connect();
  try {
    const archivedCheck = await safeQuery(client,
      'SELECT 1 FROM archived_tasks WHERE id = $1',
      [taskId]
    );
    if (archivedCheck.rows.length > 0) throw new Error('Cannot update archived task');

    const result = await safeQuery(client,
      'UPDATE tasks SET progress_percentage = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [progressPercentage, taskId]
    );
    return normalizeTask(result.rows[0]);
  } finally {
    client.release();
  }
}

// =============================================
// ЭКСПОРТ
// =============================================

module.exports = {
  // Безопасные утилиты
  safeQuery,
  validateId,
  validateText,
  validateDate,
  normalizeTask,
  
  // Основные функции
  createTask,
  deleteTask,
  updateTaskStatus,
  markTaskAsSeen,
  getTaskById,
  getTasksByAssignee,
  updateTaskProgress
};