const { invalidateCache } = require('../config/redis');

async function getAssignments(pool, creator_id, includeArchived = false) {
  const client = await pool.connect();
  try {
    // Получаем все задания пользователя
    const assignmentsResult = await client.query(
      'SELECT * FROM assignments WHERE creator_id = $1 ORDER BY created_at DESC',
      [creator_id]
    );
    const assignments = assignmentsResult.rows;

    // Для каждого задания получаем задачи
    for (const assignment of assignments) {
      // Базовый запрос для активных задач
      let tasksQuery = `
        SELECT 
          t.id, t.title, t.description, t.deadline, t.seen_at, 
          t.in_progress_since, t.work_duration, t.created_at, 
          t.updated_at, t.status_id, t.priority_id,
          t.creator_id, t.assignee_id, t.progress_percentage,
          ts.name AS status, 
          tp.name AS priority,
          u1.email AS creator_name, 
          u2.email AS assignee_name,
          NULL AS deleted_at,
          FALSE AS is_archived
        FROM tasks t
        LEFT JOIN task_statuses ts ON t.status_id = ts.id
        LEFT JOIN task_priorities tp ON t.priority_id = tp.id
        LEFT JOIN users u1 ON t.creator_id = u1.id
        LEFT JOIN users u2 ON t.assignee_id = u2.id
        WHERE t.assignment_id = $1 AND t.creator_id = $2
      `;

      // Добавляем архивные задачи, если нужно
      if (includeArchived) {
        tasksQuery += `
          UNION ALL
          SELECT 
            at.id, at.title, at.description, at.deadline, at.seen_at, 
            at.in_progress_since, at.work_duration, at.created_at, 
            at.updated_at, at.status_id, at.priority_id,
            at.creator_id, at.assignee_id, at.progress_percentage,
            ts.name AS status, 
            tp.name AS priority,
            u1.email AS creator_name, 
            u2.email AS assignee_name,
            at.deleted_at,
            TRUE AS is_archived
          FROM archived_tasks at
          LEFT JOIN task_statuses ts ON at.status_id = ts.id
          LEFT JOIN task_priorities tp ON at.priority_id = tp.id
          LEFT JOIN users u1 ON at.creator_id = u1.id
          LEFT JOIN users u2 ON at.assignee_id = u2.id
          WHERE at.assignment_id = $1 AND at.creator_id = $2
        `;
      }

      tasksQuery += ' ORDER BY created_at DESC';

      const tasksResult = await client.query(tasksQuery, [assignment.id, creator_id]);
      
      // Преобразуем данные для фронтенда
      assignment.tasks = tasksResult.rows.map(task => ({
        ...task,
        deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
        created_at: new Date(task.created_at).toISOString(),
        updated_at: new Date(task.updated_at).toISOString(),
        seen_at: task.seen_at ? new Date(task.seen_at).toISOString() : null,
        in_progress_since: task.in_progress_since ? new Date(task.in_progress_since).toISOString() : null,
        deleted_at: task.deleted_at ? new Date(task.deleted_at).toISOString() : null
      }));
    }

    return assignments;
  } finally {
    client.release();
  }
}

async function createAssignment(pool, { title, description, creator_id }) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "INSERT INTO assignments (title, description, creator_id, created_at, updated_at) " +
      "VALUES ($1, $2, $3, now(), now()) " +
      "RETURNING *",
      [title, description, creator_id]
    );
    
    // Invalidate assignments cache
    await invalidateCache(['assignments:*']);
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function createTaskInAssignment(pool, assignmentId, taskData) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "INSERT INTO tasks (title, description, deadline, creator_id, assignee_id, status_id, priority_id, assignment_id, created_at, updated_at) " +
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())",
      [
        taskData.title,
        taskData.description,
        taskData.deadline,
        taskData.creator_id,
        taskData.assignee_id,
        taskData.status_id,
        taskData.priority_id,
        assignmentId,
      ]
    );
    
    // Invalidate assignments cache
    await invalidateCache(['assignments:*']);
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function deleteAssignment(pool, assignmentId) {
  const client = await pool.connect();
  try {
    // Удаляем все задачи, связанные с заданием
    await client.query('DELETE FROM tasks WHERE assignment_id = $1', [assignmentId]);
    // Удаляем само задание
    await client.query('DELETE FROM assignments WHERE id = $1', [assignmentId]);
    
    // Invalidate assignments cache
    await invalidateCache(['assignments:*']);
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getAssignments,
  createAssignment,
  createTaskInAssignment,
  deleteAssignment,
};
