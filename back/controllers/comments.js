const { Pool } = require('pg');

async function createComment(pool, { task_id, user_id, text }) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO task_comments (task_id, user_id, text, created_at)
       VALUES ($1, $2, $3, now())
       RETURNING *`,
      [task_id, user_id, text]
    );
    return result.rows[0];
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

async function getCommentsByTaskId(pool, taskId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT c.id, c.text, c.created_at, u.id AS user_id, u.email AS user_email
       FROM task_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [taskId]
    );
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createComment,
  getCommentsByTaskId,
};
