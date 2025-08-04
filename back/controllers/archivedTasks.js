const getArchivedTasksByAssignment = async (pool, assignmentId) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        at.id,
        at.assignment_id,
        at.title,
        at.description,
        at.deadline,
        at.creator_id,
        at.assignee_id,
        u.email AS assignee_email,
        u.username AS assignee_name,
        at.status_id,
        ts.name AS status,
        at.priority_id,
        tp.name AS priority,
        at.created_at,
        at.updated_at,
        at.seen_at,
        at.in_progress_since,
        COALESCE(at.work_duration, 0) AS work_duration,
        COALESCE(at.progress_percentage, 0) AS progress_percentage,
        at.deleted_at,
        TRUE AS is_archived
      FROM archived_tasks at
      LEFT JOIN users u ON at.assignee_id = u.id
      LEFT JOIN task_statuses ts ON at.status_id = ts.id
      LEFT JOIN task_priorities tp ON at.priority_id = tp.id
      WHERE at.assignment_id = $1
      ORDER BY at.created_at DESC`,
      [assignmentId]
    );
    
    return result.rows.map(task => ({
      ...task,
      id: task.id.toString(),
      deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
      created_at: new Date(task.created_at).toISOString(),
      updated_at: new Date(task.updated_at).toISOString(),
      seen_at: task.seen_at ? new Date(task.seen_at).toISOString() : null,
      in_progress_since: task.in_progress_since ? new Date(task.in_progress_since).toISOString() : null,
      deleted_at: task.deleted_at ? new Date(task.deleted_at).toISOString() : null
    }));
  } catch (error) {
    console.error('Error in getArchivedTasksByAssignment:', error);
    throw error;
  } finally {
    client.release();
  }
};

const updateArchivedTaskStatus = async (pool, taskId, statusId, action) => {
  const client = await pool.connect();
  try {
    console.log(`Updating archived task ${taskId} status to ${statusId} with action ${action}`);
    let query = `UPDATE archived_tasks SET status_id = $1, updated_at = now()`;
    const params = [statusId];
    let paramIndex = 2;

    // Fetch current task to get in_progress_since and work_duration
    const taskResult = await client.query(
      'SELECT in_progress_since, work_duration, created_at FROM archived_tasks WHERE id = $1', 
      [taskId]
    );
    if (taskResult.rows.length === 0) {
      throw new Error('Archived task not found');
    }
    const task = taskResult.rows[0];
    const now = new Date();

    function toUTCDate(date) {
      return new Date(date.toISOString());
    }

    if (statusId === 2) { // in_progress
      if (action === 'start') {
        console.log('Action start: setting in_progress_since to now()');
        query += `, in_progress_since = now()`;
      } else if (action === 'stop') {
        if (task.in_progress_since) {
          console.log(`Current work_duration: ${task.work_duration}, type: ${typeof task.work_duration}`);
          const elapsedSeconds = Math.floor((toUTCDate(now) - toUTCDate(new Date(task.in_progress_since))) / 1000);
          const currentWorkDuration = Number(task.work_duration);
          if (isNaN(currentWorkDuration)) {
            console.warn(`Warning: work_duration is NaN, resetting to 0. Original value: ${task.work_duration}`);
          }
          const newWorkDuration = (isNaN(currentWorkDuration) ? 0 : currentWorkDuration) + elapsedSeconds;
          console.log(`Elapsed seconds: ${elapsedSeconds}, new work duration: ${newWorkDuration}, type: ${typeof newWorkDuration}`);
          query += `, in_progress_since = NULL, work_duration = $${paramIndex}`;
          params.push(newWorkDuration);
          paramIndex++;
        } else {
          query += `, in_progress_since = NULL`;
        }
      } else if (action === 'resume') {
        query += `, in_progress_since = now()`;
      }
    } else if (statusId === 3) { // done
      if (task.in_progress_since) {
        const elapsedSeconds = Math.floor((toUTCDate(now) - toUTCDate(new Date(task.in_progress_since))) / 1000);
        const newWorkDuration = (task.work_duration || 0) + elapsedSeconds;
        console.log(`Elapsed seconds: ${elapsedSeconds}, new work duration: ${newWorkDuration}`);
        query += `, in_progress_since = NULL, work_duration = $${paramIndex}`;
        params.push(newWorkDuration);
        paramIndex++;
      } else {
        query += `, in_progress_since = NULL`;
      }
    } else {
      query += `, in_progress_since = NULL`;
    }

    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(taskId);

    const result = await client.query(query, params);
    console.log('Update archived task result:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Error in updateArchivedTaskStatus:', error);
    throw error;
  } finally {
    client.release();
  }
};

const deleteArchivedTask = async (pool, taskId) => {
  const client = await pool.connect();
  try {
    console.log(`deleteArchivedTask called with taskId: ${taskId}`);
    
    // Check if task exists in archived_tasks
    const taskResult = await client.query('SELECT * FROM archived_tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      console.log('Archived task not found');
      throw new Error('Archived task not found');
    }
    
    // Permanently delete from archived_tasks
    await client.query('DELETE FROM archived_tasks WHERE id = $1', [taskId]);
    console.log('Archived task permanently deleted');
    
    return { success: true };
  } catch (error) {
    console.error('Error in deleteArchivedTask:', error);
    throw error;
  } finally {
    client.release();
  }
};

const restoreArchivedTask = async (pool, taskId) => {
  const client = await pool.connect();
  try {
    console.log(`restoreArchivedTask called with taskId: ${taskId}`);

    // Fetch the archived task
    const taskResult = await client.query('SELECT * FROM archived_tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      console.log('Archived task not found');
      throw new Error('Archived task not found');
    }
    const task = taskResult.rows[0];

    // Insert the task back into tasks table
    await client.query(
      `INSERT INTO tasks (
        id, title, description, deadline, creator_id, assignee_id, assignment_id,
        status_id, priority_id, created_at, updated_at, seen_at,
        in_progress_since, work_duration, progress_percentage
      ) 
      SELECT 
        id, title, description, deadline, creator_id, assignee_id, assignment_id,
        status_id, priority_id, created_at, updated_at, seen_at,
        in_progress_since, work_duration, progress_percentage
      FROM archived_tasks 
      WHERE id = $1`,
      [taskId]
    );
    console.log('Task restored to active tasks');

    // Delete the task from archived_tasks table
    await client.query('DELETE FROM archived_tasks WHERE id = $1', [taskId]);
    console.log('Task removed from archived_tasks');
    
    return { success: true };
  } catch (error) {
    console.error('Error in restoreArchivedTask:', error);
    throw error;
  } finally {
    client.release();
  }
};

const markArchivedTaskAsSeen = async (pool, taskId) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE archived_tasks SET seen_at = now() WHERE id = $1 RETURNING *`,
      [taskId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in markArchivedTaskAsSeen:', error);
    throw error;
  } finally {
    client.release();
  }
};

const updateArchivedTaskProgress = async (pool, taskId, progressPercentage) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'UPDATE archived_tasks SET progress_percentage = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [progressPercentage, taskId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in updateArchivedTaskProgress:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getArchivedTasksByAssignment,
  updateArchivedTaskStatus,
  deleteArchivedTask,
  restoreArchivedTask,
  markArchivedTaskAsSeen,
  updateArchivedTaskProgress,
};
