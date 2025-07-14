async function createTask(pool, { title, description, deadline, creator_id, assignee_id, status_id, priority_id }) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO tasks (title, description, deadline, creator_id, assignee_id, status_id, priority_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
       RETURNING *`,
      [title, description, deadline, creator_id, assignee_id, status_id, priority_id]
    );
    return result.rows[0];
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

async function deleteTask(pool, taskId) {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM tasks WHERE id = $1', [taskId]);
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

async function updateTaskStatus(pool, taskId, statusId, action) {
  const client = await pool.connect();
  try {
    console.log(`Updating task ${taskId} status to ${statusId} with action ${action}`);
    let query = `UPDATE tasks SET status_id = $1, updated_at = now()`;
    const params = [statusId, taskId];

    // Fetch current task to get in_progress_since and work_duration
    const taskResult = await client.query('SELECT in_progress_since, work_duration FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      throw new Error('Task not found');
    }
    const task = taskResult.rows[0];
    const now = new Date();

    if (statusId === 2) { // in_progress
      if (action === 'start') {
        // Set in_progress_since if not set
        query += `, in_progress_since = COALESCE(in_progress_since, now())`;
      } else if (action === 'stop') {
        // Calculate elapsed time and add to work_duration, clear in_progress_since
        if (task.in_progress_since) {
          const elapsedSeconds = Math.floor((now - new Date(task.in_progress_since)) / 1000);
          const newWorkDuration = (task.work_duration || 0) + elapsedSeconds;
          query += `, in_progress_since = NULL, work_duration = ${newWorkDuration}`;
        } else {
          query += `, in_progress_since = NULL`;
        }
      } else if (action === 'resume') {
        // Set in_progress_since to now without changing status
        query += `, in_progress_since = now()`;
      }
    } else if (statusId === 3) { // done
      // Calculate elapsed time if in_progress_since is set, add to work_duration, clear in_progress_since
      if (task.in_progress_since) {
        const elapsedSeconds = Math.floor((now - new Date(task.in_progress_since)) / 1000);
        const newWorkDuration = (task.work_duration || 0) + elapsedSeconds;
        query += `, in_progress_since = NULL, work_duration = ${newWorkDuration}`;
      } else {
        query += `, in_progress_since = NULL`;
      }
    } else {
      // Clear in_progress_since if status is not "in progress" or "done"
      query += `, in_progress_since = NULL`;
    }

    query += ` WHERE id = $2 RETURNING *`;

    const result = await client.query(query, params);
    console.log('Update result:', result.rows[0]);
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
    const result = await client.query(
      `SELECT t.*, 
        u1.email AS creator_name, 
        u2.email AS assignee_name,
        s.name AS status,
        p.name AS priority
      FROM tasks t
      LEFT JOIN users u1 ON t.creator_id = u1.id
      LEFT JOIN users u2 ON t.assignee_id = u2.id
      LEFT JOIN task_statuses s ON t.status_id = s.id
      LEFT JOIN task_priorities p ON t.priority_id = p.id
      WHERE t.id = $1`,
      [taskId]
    );
    return result.rows[0];
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

async function getAssignedTasks(pool, userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        t.id,
        t.title,
        t.description,
        t.deadline,
        t.in_progress_since,
        t.created_at,
        t.updated_at,
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
      [userId]
    );
    
    return result.rows.map(task => ({
      ...task,
      id: task.id.toString(), // Гарантируем строковый ID
      deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
      in_progress_since: task.in_progress_since ? new Date(task.in_progress_since).toISOString() : null,
      created_at: new Date(task.created_at).toISOString(),
      updated_at: new Date(task.updated_at).toISOString()
    }));
  } catch (error) {
    console.error('Error in getAssignedTasks:', error);
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
        t.created_at,
        t.updated_at,
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
      updated_at: new Date(task.updated_at).toISOString()
    }));
  } catch (error) {
    console.error('Error in getTasksByAssignee:', error);
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
};
