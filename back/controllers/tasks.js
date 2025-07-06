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
    const result = await client.query(
      `UPDATE tasks SET status_id = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [statusId, taskId]
    );
    console.log('Update result:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Error in updateTaskStatus:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createTask,
  deleteTask,
  updateTaskStatus,
};

