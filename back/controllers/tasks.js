async function createTask(pool, { title, description, deadline, creator_id, assignee_id, status_id, priority_id }) {
  const client = await pool.connect();
  try {
    // Теперь deadline приходит в правильном формате "YYYY-MM-DD HH:MM:SS"
    const result = await client.query(
      `INSERT INTO tasks (
        title, description, deadline, 
        creator_id, assignee_id, 
        status_id, priority_id, 
        created_at, updated_at,
        progress_percentage
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now(), 0)
      RETURNING *`,
      [
        title, 
        description, 
        deadline, // Используем как есть (уже правильный формат)
        creator_id, 
        assignee_id, 
        status_id, 
        priority_id
      ]
    );
    
    return result.rows[0];
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

async function deleteTask(pool, taskId, permanent = false) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Проверяем существование задачи
    const taskCheck = await client.query(
      `SELECT 'active' as type FROM tasks WHERE id = $1
       UNION ALL
       SELECT 'archived' as type FROM archived_tasks WHERE id = $1`,
      [taskId]
    );

    if (taskCheck.rows.length === 0) {
      throw new Error('Task not found');
    }

    const taskType = taskCheck.rows[0].type;

    if (taskType === 'active' && !permanent) {
      // Переносим задачу в архив
      await client.query(
        `INSERT INTO archived_tasks 
         SELECT *, now() as deleted_at FROM tasks WHERE id = $1`,
        [taskId]
      );
      
      // Удаляем задачу из активных
      await client.query('DELETE FROM tasks WHERE id = $1', [taskId]);
      
      // Комментарии остаются в task_comments, ничего с ними не делаем
    } else {
      // Полное удаление задачи и её комментариев
      await client.query('DELETE FROM task_comments WHERE task_id = $1', [taskId]);
      await client.query(
        `DELETE FROM ${taskType === 'active' ? 'tasks' : 'archived_tasks'} 
         WHERE id = $1`,
        [taskId]
      );
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in deleteTask:', error);
    throw error;
  } finally {
    client.release();
  }
}
async function updateTaskStatus(pool, taskId, statusId, action) {
  const client = await pool.connect();
  try {
    // Проверяем, не архивная ли это задача
    const archivedCheck = await client.query(
      'SELECT 1 FROM archived_tasks WHERE id = $1',
      [taskId]
    );

    if (archivedCheck.rows.length > 0) {
      throw new Error('Cannot update status of archived task');
    }

    console.log(`Updating task ${taskId} status to ${statusId} with action ${action}`);
    let query = `UPDATE tasks SET status_id = $1, updated_at = now()`;
    const params = [statusId];
    let paramIndex = 2;

    // Остальная логика функции остается без изменений
    const taskResult = await client.query('SELECT in_progress_since, work_duration, created_at FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      throw new Error('Task not found');
    }
    const task = taskResult.rows[0];
    const now = new Date();

    function toUTCDate(date) {
      return new Date(date.toISOString());
    }

    if (statusId === 2) { // in_progress
      if (action === 'start') {
        query += `, in_progress_since = now()`;
      } else if (action === 'stop') {
        if (task.in_progress_since) {
          const elapsedSeconds = Math.floor((toUTCDate(now) - toUTCDate(new Date(task.in_progress_since))) / 1000);
          const currentWorkDuration = Number(task.work_duration);
          const newWorkDuration = (isNaN(currentWorkDuration) ? 0 : currentWorkDuration) + elapsedSeconds;
          query += `, in_progress_since = NULL, work_duration = $${paramIndex}`;
          params.push(newWorkDuration);
          paramIndex++;
        } else {
          query += `, in_progress_since = NULL`;
        }
      } else if (action === 'resume') {
        query += `, in_progress_since = now()`;
      }
    } else if (statusId === 3) { // done
      if (task.in_progress_since) {
        const elapsedSeconds = Math.floor((toUTCDate(now) - toUTCDate(new Date(task.in_progress_since))) / 1000);
        const newWorkDuration = (task.work_duration || 0) + elapsedSeconds;
        query += `, in_progress_since = NULL, work_duration = $${paramIndex}`;
        params.push(newWorkDuration);
        paramIndex++;
      } else {
        query += `, in_progress_since = NULL`;
      }
    } else {
      query += `, in_progress_since = NULL`;
    }

    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(taskId);

    const result = await client.query(query, params);
    return result.rows[0];
  } catch (error) {
    console.error('Error in updateTaskStatus:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function markTaskAsSeen(pool, taskId) {
  const client = await pool.connect();
  try {
    // Проверяем, не архивная ли это задача
    const archivedCheck = await client.query(
      'SELECT 1 FROM archived_tasks WHERE id = $1',
      [taskId]
    );

    if (archivedCheck.rows.length > 0) {
      throw new Error('Cannot mark archived task as seen');
    }

    const result = await client.query(
      `UPDATE tasks SET seen_at = now() WHERE id = $1 RETURNING *`,
      [taskId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in markTaskAsSeen:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function getTaskById(pool, taskId) {
  const client = await pool.connect();
  try {
    // Сначала проверяем активные задачи
    let result = await client.query(
      `SELECT 
        t.id,
        t.title,
        t.description,
        t.deadline,
        t.created_at, 
        t.updated_at,
        t.in_progress_since,
        t.work_duration,
        t.status_id,
        t.priority_id,
        t.creator_id,
        t.assignee_id,
        t.progress_percentage,
        u1.email AS creator_name, 
        u2.email AS assignee_name,
        s.name AS status,
        p.name AS priority,
        false as is_archived
      FROM tasks t
      LEFT JOIN users u1 ON t.creator_id = u1.id
      LEFT JOIN users u2 ON t.assignee_id = u2.id
      LEFT JOIN task_statuses s ON t.status_id = s.id
      LEFT JOIN task_priorities p ON t.priority_id = p.id
      WHERE t.id = $1`,
      [taskId]
    );

    // Если не найдено в активных, проверяем архивные
    if (result.rows.length === 0) {
      result = await client.query(
        `SELECT 
          at.id,
          at.title,
          at.description,
          at.deadline,
          at.created_at, 
          at.updated_at,
          at.in_progress_since,
          at.work_duration,
          at.status_id,
          at.priority_id,
          at.creator_id,
          at.assignee_id,
          at.progress_percentage,
          u1.email AS creator_name, 
          u2.email AS assignee_name,
          s.name AS status,
          p.name AS priority,
          true as is_archived,
          at.deleted_at
        FROM archived_tasks at
        LEFT JOIN users u1 ON at.creator_id = u1.id
        LEFT JOIN users u2 ON at.assignee_id = u2.id
        LEFT JOIN task_statuses s ON at.status_id = s.id
        LEFT JOIN task_priorities p ON at.priority_id = p.id
        WHERE at.id = $1`,
        [taskId]
      );
    }

    const task = result.rows[0];
    if (!task) return null;
    
    return {
      ...task,
      id: task.id.toString(),
      created_at: task.created_at ? new Date(task.created_at).toISOString() : null,
      updated_at: task.updated_at ? new Date(task.updated_at).toISOString() : null,
      in_progress_since: task.in_progress_since ? new Date(task.in_progress_since).toISOString() : null,
      deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
      progress_percentage: task.progress_percentage || 0,
      deleted_at: task.deleted_at ? new Date(task.deleted_at).toISOString() : null
    };
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

async function getTasksByAssignee(pool, assigneeId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        t.id,
        t.title,
        t.description,
        t.deadline,
        t.in_progress_since,
        t.work_duration,
        t.created_at,
        t.updated_at,
        t.progress_percentage,
        u1.email AS creator_email,
        u2.email AS assignee_email,
        ts.name AS status,
        tp.name AS priority,
        ts.id AS status_id,
        tp.id AS priority_id
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
    
    return result.rows.map(task => ({
      ...task,
      id: task.id.toString(),
      deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
      in_progress_since: task.in_progress_since ? new Date(task.in_progress_since).toISOString() : null,
      created_at: new Date(task.created_at).toISOString(),
      updated_at: new Date(task.updated_at).toISOString(),
      progress_percentage: task.progress_percentage || 0
    }));
  } catch (error) {
    console.error('Error in getTasksByAssignee:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function updateTaskProgress(pool, taskId, progressPercentage) {
  const client = await pool.connect();
  try {
    // Сначала проверяем, не архивная ли это задача
    const archivedCheck = await client.query(
      'SELECT 1 FROM archived_tasks WHERE id = $1',
      [taskId]
    );

    if (archivedCheck.rows.length > 0) {
      throw new Error('Cannot update progress of archived task');
    }

    const result = await client.query(
      'UPDATE tasks SET progress_percentage = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [progressPercentage, taskId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in updateTaskProgress:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createTask,
  deleteTask,
  updateTaskStatus,
  markTaskAsSeen,
  getTaskById,
  getTasksByAssignee,
  updateTaskProgress,
};