const { Pool } = require('pg');
const logger = require('../logger');
const auditController = require('./audit-backend');

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
  // Используем функцию с аудитом
  return await auditController.createTaskWithAudit(pool, taskData, taskData.creator_id);
}

async function deleteTask(pool, taskId, permanent = false, currentUserId) {
  // Используем функцию с аудитом
  return await auditController.deleteTaskWithAudit(pool, taskId, permanent, currentUserId);
}

async function updateTaskStatus(pool, taskId, statusId, action = null, currentUserId) {
  // Используем функцию с аудитом
  return await auditController.updateTaskStatusWithAudit(pool, taskId, statusId, action, currentUserId);
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