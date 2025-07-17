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
    console.log(`Fetching unread comments for user ${userId}`); // Логирование
    
    const queryText = `
      SELECT c.id, c.text, c.created_at, t.id as task_id, t.title as task_title,
             u.id as author_id, u.email as author_email
      FROM task_comments c
      JOIN tasks t ON c.task_id = t.id
      JOIN users u ON c.user_id = u.id
      WHERE t.assignee_id = $1 
      AND c.is_read = FALSE 
      AND c.user_id != $1
      ORDER BY c.created_at DESC
    `;
    
    console.log('Executing query:', queryText); // Логирование запроса
    
    const result = await client.query(queryText, [userId]);
    
    console.log(`Found ${result.rows.length} unread comments`); // Логирование результата
    
    return result.rows;
  } catch (error) {
    console.error('Error in getUnreadComments:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function markCommentsAsReadByIds(pool, commentIds) {
  if (!commentIds || commentIds.length === 0) {
    console.log('No comment IDs provided to mark as read');
    return 0;
  }
  const client = await pool.connect();
  try {
    const queryText = `
      UPDATE task_comments
      SET is_read = TRUE
      WHERE id = ANY($1::int[])
    `;
    console.log(`Marking comments as read: ${commentIds.join(', ')}`);
    const result = await client.query(queryText, [commentIds]);
    console.log(`Marked ${result.rowCount} comments as read`);
    return result.rowCount;
  } catch (error) {
    console.error('Error in markCommentsAsReadByIds:', error);
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
