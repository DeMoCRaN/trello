const { Pool } = require('pg');

async function createComment(pool, { task_id, user_id, text }) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO task_comments (task_id, user_id, text, created_at, is_read)
       VALUES ($1, $2, $3, now(), FALSE)
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

async function getCommentsByTaskId(pool, taskId, userId) {
  const client = await pool.connect();
  try {
    // First mark comments as read when user views them
    await client.query(
      `UPDATE task_comments 
       SET is_read = TRUE 
       WHERE task_id = $1 AND user_id != $2 AND is_read = FALSE`,
      [taskId, userId]
    );
    
    // Then fetch all comments
    const result = await client.query(
      `SELECT c.id, c.text, c.created_at, c.is_read, u.id AS user_id, u.email AS user_email
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

async function getUnreadCommentsCount(pool, userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT COUNT(c.id) as unread_count
       FROM task_comments c
       JOIN tasks t ON c.task_id = t.id
       WHERE t.assignee_id = $1 
       AND c.is_read = FALSE 
       AND c.user_id != $1`,
      [userId]
    );
    return parseInt(result.rows[0].unread_count, 10);
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

async function getUnreadComments(pool, userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT c.id, c.text, c.created_at, t.id as task_id, t.title as task_title,
              u.id as author_id, u.email as author_email
       FROM task_comments c
       JOIN tasks t ON c.task_id = t.id
       JOIN users u ON c.user_id = u.id
       WHERE t.assignee_id = $1 
       AND c.is_read = FALSE 
       AND c.user_id != $1
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

async function markCommentsAsReadByIds(pool, commentIds) {
  if (!commentIds || commentIds.length === 0) {
    return 0;
  }
  const client = await pool.connect();
  try {
    const queryText = `
      UPDATE task_comments
      SET is_read = TRUE
      WHERE id = ANY($1::int[])
    `;
    const result = await client.query(queryText, [commentIds]);
    return result.rowCount;
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createComment,
  getCommentsByTaskId,
  getUnreadCommentsCount,
  getUnreadComments,
  markCommentsAsReadByIds
};
