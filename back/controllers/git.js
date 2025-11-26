const { Pool } = require('pg');
const logger = require('../logger');

// =============================================
// БЕЗОПАСНЫЕ УТИЛИТЫ И ВАЛИДАЦИЯ
// =============================================

async function safeQuery(client, query, params = []) {
  params.forEach((param, index) => {
    if (param === undefined || param === null) return;

    if (typeof param === 'string' && /[;'"\\]|(--)|(\/\*)/.test(param)) {
      logger.warn(`SQL Injection attempt detected in param ${index}: ${param}`);
      throw new Error('Invalid input detected');
    }

    if (typeof param === 'number' && !Number.isFinite(param)) {
      throw new Error(`Invalid numeric parameter at position ${index}`);
    }
  });

  try {
    const result = await client.query(query, params);
    logger.sql(query, params); // Логируем SQL запросы
    return result;
  } catch (error) {
    logger.error('Database query failed', {
      query: query.replace(/\s+/g, ' '),
      params: params.map(p => (typeof p === 'string' ? p.substring(0, 100) : p)),
      error: error.message
    });
    throw error;
  }
}

function validateId(id, name = 'ID') {
  if (id === undefined || id === null) throw new Error(`${name} is required`);
  const numId = Number(id);
  if (!Number.isInteger(numId)) throw new Error(`${name} must be an integer`);
  if (numId <= 0) throw new Error(`${name} must be positive`);
  return numId;
}

function validateText(text, fieldName, maxLength = 255) {
  if (text === undefined || text === null) throw new Error(`${fieldName} is required`);
  if (typeof text !== 'string') throw new Error(`${fieldName} must be a string`);
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new Error(`${fieldName} cannot be empty`);
  if (trimmed.length > maxLength) throw new Error(`${fieldName} exceeds maximum length`);
  return trimmed;
}

// =============================================
// ПАРСИНГ ССЫЛОК НА ЗАДАЧИ В СООБЩЕНИЯХ КОММИТОВ
// =============================================

/**
 * Парсит ссылки на задачи в сообщении коммита
 * Поддерживает форматы: #123, Task: 123, task 123
 */
function parseTaskReferences(commitMessage) {
  if (!commitMessage || typeof commitMessage !== 'string') {
    return [];
  }

  const taskIds = [];
  // Регулярное выражение для поиска ссылок на задачи
  const patterns = [
    /#(\d+)/g,           // #123
    /Task:\s*(\d+)/gi,   // Task: 123
    /task\s+(\d+)/gi     // task 123
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(commitMessage)) !== null) {
      const taskId = parseInt(match[1], 10);
      if (!isNaN(taskId) && taskId > 0 && !taskIds.includes(taskId)) {
        taskIds.push(taskId);
      }
    }
  });

  return taskIds;
}

// =============================================
// ОСНОВНЫЕ ФУНКЦИИ РАБОТЫ С РЕПОЗИТОРИЯМИ
// =============================================

async function createRepository(pool, repoData) {
  const client = await pool.connect();
  try {
    const { name, url, description, assignment_id, created_by } = repoData;

    validateText(name, 'Repository name');
    validateText(url, 'Repository URL');
    validateId(assignment_id, 'Assignment ID');
    validateId(created_by, 'Created by user ID');

    const result = await safeQuery(client,
      `INSERT INTO repositories (name, url, description, assignment_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, url, description, assignment_id, created_by]
    );

    logger.info(`Repository created: ${name} (${url})`);
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function getRepositoriesByAssignment(pool, assignmentId) {
  const client = await pool.connect();
  try {
    validateId(assignmentId, 'Assignment ID');

    const result = await safeQuery(client,
      `SELECT r.*, u.email as creator_email
       FROM repositories r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.assignment_id = $1 AND r.is_active = true
       ORDER BY r.created_at DESC`,
      [assignmentId]
    );

    return result.rows;
  } finally {
    client.release();
  }
}

async function getRepositoryById(pool, repoId) {
  const client = await pool.connect();
  try {
    validateId(repoId, 'Repository ID');

    const result = await safeQuery(client,
      `SELECT r.*, u.email as creator_email
       FROM repositories r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.id = $1`,
      [repoId]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

// =============================================
// ФУНКЦИИ РАБОТЫ С КОММИТАМИ
// =============================================

async function createCommit(pool, commitData) {
  const client = await pool.connect();
  try {
    const {
      repository_id,
      branch_id,
      hash,
      author_name,
      author_email,
      message,
      commit_date,
      parent_hashes = []
    } = commitData;

    validateId(repository_id, 'Repository ID');
    validateText(hash, 'Commit hash', 40);
    validateText(message, 'Commit message');
    validateText(commit_date, 'Commit date');

    // Парсим ссылки на задачи
    const taskReferences = parseTaskReferences(message);

    const result = await safeQuery(client,
      `INSERT INTO commits (
        repository_id, branch_id, hash, author_name, author_email,
        message, commit_date, parent_hashes, task_references
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        repository_id,
        branch_id,
        hash,
        author_name,
        author_email,
        message,
        commit_date,
        parent_hashes,
        taskReferences
      ]
    );

    logger.info(`Commit created: ${hash} with ${taskReferences.length} task references`);
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function getCommitsByTaskId(pool, taskId) {
  const client = await pool.connect();
  try {
    validateId(taskId, 'Task ID');

    const result = await safeQuery(client,
      `SELECT
        c.id,
        c.hash,
        c.message,
        c.author_name,
        c.author_email,
        c.commit_date,
        r.name as repository_name,
        r.url as repository_url,
        b.name as branch_name,
        c.created_at
       FROM commits c
       JOIN repositories r ON c.repository_id = r.id
       LEFT JOIN branches b ON c.branch_id = b.id
       WHERE $1 = ANY(c.task_references)
       ORDER BY c.commit_date DESC`,
      [taskId]
    );

    return result.rows.map(commit => ({
      ...commit,
      commit_date: commit.commit_date?.toISOString(),
      created_at: commit.created_at?.toISOString()
    }));
  } finally {
    client.release();
  }
}

async function getCommitsByRepository(pool, repoId, limit = 50, offset = 0) {
  const client = await pool.connect();
  try {
    validateId(repoId, 'Repository ID');

    const result = await safeQuery(client,
      `SELECT
        c.*,
        b.name as branch_name,
        array_agg(DISTINCT t.title) FILTER (WHERE t.title IS NOT NULL) as linked_task_titles
       FROM commits c
       LEFT JOIN branches b ON c.branch_id = b.id
       LEFT JOIN commit_task_links ctl ON c.id = ctl.commit_id
       LEFT JOIN tasks t ON ctl.task_id = t.id
       WHERE c.repository_id = $1
       GROUP BY c.id, b.name
       ORDER BY c.commit_date DESC
       LIMIT $2 OFFSET $3`,
      [repoId, limit, offset]
    );

    return result.rows.map(commit => ({
      ...commit,
      commit_date: commit.commit_date?.toISOString(),
      created_at: commit.created_at?.toISOString()
    }));
  } finally {
    client.release();
  }
}

async function syncCommitsFromGit(pool, repoId, gitCommits) {
  const client = await pool.connect();
  try {
    validateId(repoId, 'Repository ID');

    const syncedCommits = [];
    let successCount = 0;
    let errorCount = 0;

    for (const gitCommit of gitCommits) {
      try {
        // Проверяем, существует ли уже такой коммит
        const existing = await safeQuery(client,
          'SELECT id FROM commits WHERE hash = $1',
          [gitCommit.hash]
        );

        if (existing.rows.length === 0) {
          const commitData = {
            repository_id: repoId,
            hash: gitCommit.hash,
            author_name: gitCommit.author.name,
            author_email: gitCommit.author.email,
            message: gitCommit.message,
            commit_date: gitCommit.date,
            parent_hashes: gitCommit.parents || []
          };

          const newCommit = await createCommit(pool, commitData);
          syncedCommits.push(newCommit);
          successCount++;
        }
      } catch (error) {
        logger.error(`Failed to sync commit ${gitCommit.hash}:`, error.message);
        errorCount++;
      }
    }

    logger.info(`Commit sync completed: ${successCount} synced, ${errorCount} errors`);
    return {
      synced: successCount,
      errors: errorCount,
      commits: syncedCommits
    };
  } finally {
    client.release();
  }
}

// =============================================
// ФУНКЦИИ РАБОТЫ С ВЕТКАМИ
// =============================================

async function createBranch(pool, branchData) {
  const client = await pool.connect();
  try {
    const { repository_id, name, is_default = false, last_commit_hash } = branchData;

    validateId(repository_id, 'Repository ID');
    validateText(name, 'Branch name');

    const result = await safeQuery(client,
      `INSERT INTO branches (repository_id, name, is_default, last_commit_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [repository_id, name, is_default, last_commit_hash]
    );

    logger.info(`Branch created: ${name} in repo ${repository_id}`);
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function getBranchesByRepository(pool, repoId) {
  const client = await pool.connect();
  try {
    validateId(repoId, 'Repository ID');

    const result = await safeQuery(client,
      `SELECT * FROM branches
       WHERE repository_id = $1
       ORDER BY is_default DESC, name ASC`,
      [repoId]
    );

    return result.rows;
  } finally {
    client.release();
  }
}

// =============================================
// ЭКСПОРТ
// =============================================

module.exports = {
  // Утилиты
  safeQuery,
  validateId,
  validateText,
  parseTaskReferences,

  // Репозитории
  createRepository,
  getRepositoriesByAssignment,
  getRepositoryById,

  // Коммиты
  createCommit,
  getCommitsByTaskId,
  getCommitsByRepository,
  syncCommitsFromGit,

  // Ветки
  createBranch,
  getBranchesByRepository
};
