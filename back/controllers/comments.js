const { Pool } = require('pg');

// Вспомогательная функция для валидации ID
function isValidId(id) {
  return Number.isInteger(Number(id)) && id > 0;
}

// Вспомогательная функция для валидации текста комментария
function isValidCommentText(text) {
  return typeof text === 'string' && text.trim().length > 0 && text.length <= 2000;
}

async function createComment(pool, { task_id, user_id, text }) {
  // Валидация входных данных
  if (!isValidId(task_id)) throw new Error('Invalid task ID'); // <-- Добавлена недостающая скобка
  if (!isValidId(user_id)) throw new Error('Invalid user ID');
  if (!isValidCommentText(text)) throw new Error('Invalid comment text');

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO task_comments (task_id, user_id, text, created_at, is_read)
       VALUES ($1, $2, $3, now(), FALSE)
       RETURNING *`,
      [task_id, user_id, text.trim()]
    );
    return result.rows[0];
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

async function getCommentsByTaskId(pool, taskId, userId) {
  // Валидация taskId
  if (!isValidId(taskId)) throw new Error('Invalid task ID');
  
  // Делаем userId опциональным (если комментарии читает неавторизованный пользователь)
  if (userId && !isValidId(userId)) {
    throw new Error('Invalid user ID');
  }

  const client = await pool.connect();
  try {
    // Обновляем статус is_read только если userId передан
    if (userId) {
      await client.query(
        `UPDATE task_comments 
         SET is_read = TRUE 
         WHERE task_id = $1 AND user_id != $2 AND is_read = FALSE`,
        [taskId, userId]
      );
    }
    
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
  // Валидация входных данных
  if (!isValidId(userId)) throw new Error('Invalid user ID');

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
  // Валидация входных данных
  if (!isValidId(userId)) throw new Error('Invalid user ID'); // Убрана лишняя скобка

  const client = await pool.connect();
  try {
    console.log(`Fetching unread comments for user ${userId}`);
    
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
    
    console.log('Executing query:', queryText);
    
    const result = await client.query(queryText, [userId]);
    
    console.log(`Found ${result.rows.length} unread comments`);
    
    return result.rows;
  } catch (error) {
    console.error('Error in getUnreadComments:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function markCommentsAsReadByIds(pool, commentIds) {
  // Валидация входных данных
  if (!commentIds || !Array.isArray(commentIds)) {
    console.log('Invalid comment IDs array');
    return 0;
  }
  
  // Фильтрация ID - оставляем только валидные числовые значения
  const validCommentIds = commentIds.filter(id => isValidId(id));
  
  if (validCommentIds.length === 0) {
    console.log('No valid comment IDs provided to mark as read');
    return 0;
  }

  const client = await pool.connect();
  try {
    const queryText = `
      UPDATE task_comments
      SET is_read = TRUE
      WHERE id = ANY($1::int[])
    `;
    console.log(`Marking comments as read: ${validCommentIds.join(', ')}`);
    const result = await client.query(queryText, [validCommentIds]);
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