async function ensureUserNotificationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id SERIAL PRIMARY KEY,
      recipient_id integer NOT NULL REFERENCES users(id),
      actor_id integer REFERENCES users(id),
      assignment_id integer REFERENCES assignments(id),
      invitation_id integer,
      type character varying(64) NOT NULL,
      title character varying(255) NOT NULL,
      message text NOT NULL,
      is_read boolean NOT NULL DEFAULT FALSE,
      created_at timestamp without time zone NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_id
    ON user_notifications (recipient_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_unread
    ON user_notifications (recipient_id, is_read, created_at DESC)
  `);
}

async function createUserNotification(clientOrPool, payload) {
  const {
    recipientId,
    actorId = null,
    assignmentId = null,
    invitationId = null,
    type,
    title,
    message,
  } = payload;

  const result = await clientOrPool.query(
    `INSERT INTO user_notifications
      (recipient_id, actor_id, assignment_id, invitation_id, type, title, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [recipientId, actorId, assignmentId, invitationId, type, title, message]
  );

  return result.rows[0];
}

async function consumeUnreadUserNotifications(pool, recipientId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const unreadResult = await client.query(
      `SELECT id, type, title, message, assignment_id, invitation_id, actor_id, created_at
       FROM user_notifications
       WHERE recipient_id = $1 AND is_read = FALSE
       ORDER BY created_at DESC`,
      [recipientId]
    );

    const ids = unreadResult.rows.map((row) => row.id);
    if (ids.length > 0) {
      await client.query(
        `UPDATE user_notifications
         SET is_read = TRUE
         WHERE id = ANY($1::int[])`,
        [ids]
      );
    }

    await client.query('COMMIT');
    return unreadResult.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  ensureUserNotificationsTable,
  createUserNotification,
  consumeUnreadUserNotifications,
};
