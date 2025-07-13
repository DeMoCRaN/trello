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

async function updateTaskStatus(pool, taskId, statusId) {
  const client = await pool.connect();
  try {
    console.log(`Updating task ${taskId} status to ${statusId}`);
    let query = `UPDATE tasks SET status_id = $1, updated_at = now()`;
    const params = [statusId, taskId];

    // If status is "in progress" (assuming statusId 2 means "in progress"), set in_progress_since if not already set
    if (statusId === 2) {
      query += `, in_progress_since = COALESCE(in_progress_since, now())`;
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
        u1.name AS creator_name, 
        u2.name AS assignee_name,
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

module.exports = {
  createTask,
  deleteTask,
  updateTaskStatus,
  markTaskAsSeen,
  getTaskById,
};

