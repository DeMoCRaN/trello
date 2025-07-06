const { Pool } = require('pg');

const pool = new Pool({
  user: 'democran',
  host: 'localhost',
  database: 'democran',
  password: 'qweasd-123',
  port: 5433,
});

// Получить все задания с вложенными задачами
async function getAssignments() {
  const client = await pool.connect();
  try {
    const assignmentsResult = await client.query('SELECT * FROM assignments ORDER BY created_at DESC');
    const assignments = assignmentsResult.rows;

    for (const assignment of assignments) {
      const tasksResult = await client.query(
        `SELECT t.id, t.title, t.description, t.deadline, 
                ts.name AS status, tp.name AS priority
         FROM tasks t
         LEFT JOIN task_statuses ts ON t.status_id = ts.id
         LEFT JOIN task_priorities tp ON t.priority_id = tp.id
         WHERE t.assignment_id = $1
         ORDER BY t.created_at DESC`,
        [assignment.id]
      );
      assignment.tasks = tasksResult.rows;
    }

    return assignments;
  } finally {
    client.release();
  }
}

// Создать новое задание
async function createAssignment({ title, description }) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO assignments (title, description, created_at, updated_at)
       VALUES ($1, $2, now(), now())
       RETURNING *`,
      [title, description]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

// Создать задачу в задании
async function createTaskInAssignment(assignmentId, taskData) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO tasks (title, description, deadline, creator_id, assignee_id, status_id, priority_id, assignment_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
       RETURNING *`,
      [
        taskData.title,
        taskData.description,
        taskData.deadline,
        taskData.creator_id,
        taskData.assignee_id,
        taskData.status_id,
        taskData.priority_id,
        assignmentId,
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

module.exports = {
  getAssignments,
  createAssignment,
  createTaskInAssignment,
};
