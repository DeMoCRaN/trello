const { Pool } = require('pg');

const pool = new Pool({
  user: 'democran',
  host: 'localhost',
  database: 'democran',
  password: 'qweasd-123',
  port: 5433,
});

async function createTask({ title, description, deadline, creator_id, assignee_id, status_id, priority_id }) {
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

module.exports = {
  createTask,
};

