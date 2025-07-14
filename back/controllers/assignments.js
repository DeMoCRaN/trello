async function getAssignments(pool, creator_id) {
  const client = await pool.connect();
  try {
    const assignmentsResult = await client.query(
      'SELECT * FROM assignments WHERE creator_id = $1 ORDER BY created_at DESC',
      [creator_id]
    );
    const assignments = assignmentsResult.rows;

    for (const assignment of assignments) {
      const tasksResult = await client.query(
        "SELECT t.id, t.title, t.description, t.deadline, t.seen_at, t.in_progress_since, t.work_duration, " +
        "ts.name AS status, tp.name AS priority, " +
        "u1.email AS creator_name, u2.email AS assignee_name " +
        "FROM tasks t " +
        "LEFT JOIN task_statuses ts ON t.status_id = ts.id " +
        "LEFT JOIN task_priorities tp ON t.priority_id = tp.id " +
        "LEFT JOIN users u1 ON t.creator_id = u1.id " +
        "LEFT JOIN users u2 ON t.assignee_id = u2.id " +
        "WHERE t.assignment_id = $1 AND t.creator_id = $2 " +
        "ORDER BY t.created_at DESC",
        [assignment.id, creator_id]
      );
      assignment.tasks = tasksResult.rows;
    }

    return assignments;
  } finally {
    client.release();
  }
}

async function createAssignment(pool, { title, description, creator_id }) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "INSERT INTO assignments (title, description, creator_id, created_at, updated_at) " +
      "VALUES ($1, $2, $3, now(), now()) " +
      "RETURNING *",
      [title, description, creator_id]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function createTaskInAssignment(pool, assignmentId, taskData) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "INSERT INTO tasks (title, description, deadline, creator_id, assignee_id, status_id, priority_id, assignment_id, created_at, updated_at) " +
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())",
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

async function deleteAssignment(pool, assignmentId) {
  const client = await pool.connect();
  try {
    // Удаляем все задачи, связанные с заданием
    await client.query('DELETE FROM tasks WHERE assignment_id = $1', [assignmentId]);
    // Удаляем само задание
    await client.query('DELETE FROM assignments WHERE id = $1', [assignmentId]);
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getAssignments,
  createAssignment,
  createTaskInAssignment,
  deleteAssignment,
};
