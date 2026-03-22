async function ensureDeletedFailedTasksTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deleted_failed_tasks (
      id SERIAL PRIMARY KEY,
      original_task_id integer,
      assignment_id integer,
      title character varying(255) NOT NULL,
      description text,
      deadline timestamp without time zone,
      creator_id integer NOT NULL,
      assignee_id integer,
      status_id integer NOT NULL,
      priority_id integer NOT NULL,
      created_at timestamp without time zone,
      updated_at timestamp without time zone,
      seen_at timestamp without time zone,
      in_progress_since timestamp without time zone,
      work_duration integer DEFAULT 0,
      progress_percentage double precision DEFAULT 0,
      failed_reason text,
      failed_at timestamp without time zone,
      deleted_at timestamp without time zone DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_deleted_failed_tasks_assignee_id
    ON deleted_failed_tasks (assignee_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_deleted_failed_tasks_creator_id
    ON deleted_failed_tasks (creator_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_deleted_failed_tasks_deleted_at
    ON deleted_failed_tasks (deleted_at)
  `);
}

module.exports = {
  ensureDeletedFailedTasksTable,
};
