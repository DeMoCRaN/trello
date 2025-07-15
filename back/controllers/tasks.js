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
    const params = [statusId];
    let paramIndex = 2;

    // Fetch current task to get in_progress_since and work_duration
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
    // Set in_progress_since to now explicitly
    console.log('Action start: setting in_progress_since to now()');
    query += `, in_progress_since = now()`;
  } else if (action === 'stop') {
        // Calculate elapsed time and add to work_duration, clear in_progress_since
        if (task.in_progress_since) {
          console.log(`Current work_duration: ${task.work_duration}, type: ${typeof task.work_duration}`);
          const elapsedSeconds = Math.floor((toUTCDate(now) - toUTCDate(new Date(task.in_progress_since))) / 1000);
          const currentWorkDuration = Number(task.work_duration);
          if (isNaN(currentWorkDuration)) {
            console.warn(`Warning: work_duration is NaN, resetting to 0. Original value: ${task.work_duration}`);
          }
          const newWorkDuration = (isNaN(currentWorkDuration) ? 0 : currentWorkDuration) + elapsedSeconds;
          console.log(`Elapsed seconds: ${elapsedSeconds}, new work duration: ${newWorkDuration}, type: ${typeof newWorkDuration}`);
          query += `, in_progress_since = NULL, work_duration = $${paramIndex}`;
          params.push(newWorkDuration);
          paramIndex++;
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
        const elapsedSeconds = Math.floor((toUTCDate(now) - toUTCDate(new Date(task.in_progress_since))) / 1000);
        const newWorkDuration = (task.work_duration || 0) + elapsedSeconds;
        console.log(`Elapsed seconds: ${elapsedSeconds}, new work duration: ${newWorkDuration}`);
        query += `, in_progress_since = NULL, work_duration = $${paramIndex}`;
        params.push(newWorkDuration);
        paramIndex++;
      } else {
        query += `, in_progress_since = NULL`;
      }
    } else {
      // Clear in_progress_since if status is not "in progress" or "done"
      query += `, in_progress_since = NULL`;
    }

    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(taskId);

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
        p.name AS priority
      FROM tasks t
      LEFT JOIN users u1 ON t.creator_id = u1.id
      LEFT JOIN users u2 ON t.assignee_id = u2.id
      LEFT JOIN task_statuses s ON t.status_id = s.id
      LEFT JOIN task_priorities p ON t.priority_id = p.id
      WHERE t.id = $1`,
      [taskId]
    );
      const task = result.rows[0];
  if (!task) return null;
  
  return {
    ...task,
    id: task.id.toString(),
    created_at: task.created_at ? new Date(task.created_at).toISOString() : null,
    updated_at: task.updated_at ? new Date(task.updated_at).toISOString() : null,
    in_progress_since: task.in_progress_since ? new Date(task.in_progress_since).toISOString() : null,
    deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
    progress_percentage: task.progress_percentage || 0
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
