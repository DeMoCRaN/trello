-- Git Integration Tables for Task Management System
-- This file extends the main database schema with Git-related tables

-- Таблица репозиториев Git
CREATE TABLE repositories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL UNIQUE,
  description TEXT,
  assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Таблица веток Git
CREATE TABLE branches (
  id SERIAL PRIMARY KEY,
  repository_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  last_commit_hash VARCHAR(40),
  last_commit_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(repository_id, name)
);

-- Таблица коммитов Git
CREATE TABLE commits (
  id SERIAL PRIMARY KEY,
  repository_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  hash VARCHAR(40) NOT NULL UNIQUE,
  author_name VARCHAR(255),
  author_email VARCHAR(255),
  message TEXT NOT NULL,
  commit_date TIMESTAMP NOT NULL,
  parent_hashes TEXT[], -- массив хэшей родительских коммитов
  task_references INTEGER[], -- массив ID задач, упомянутых в коммите
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Таблица связи коммитов и задач (для более гибкого поиска)
CREATE TABLE commit_task_links (
  id SERIAL PRIMARY KEY,
  commit_id INTEGER NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reference_type VARCHAR(50) DEFAULT 'message', -- 'message', 'branch', 'tag', etc.
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(commit_id, task_id, reference_type)
);

-- Индексы для производительности
CREATE INDEX idx_repositories_assignment_id ON repositories(assignment_id);
CREATE INDEX idx_repositories_created_by ON repositories(created_by);
CREATE INDEX idx_branches_repository_id ON branches(repository_id);
CREATE INDEX idx_commits_repository_id ON commits(repository_id);
CREATE INDEX idx_commits_branch_id ON commits(branch_id);
CREATE INDEX idx_commits_commit_date ON commits(commit_date);
CREATE INDEX idx_commits_task_references ON commits USING GIN(task_references);
CREATE INDEX idx_commit_task_links_commit_id ON commit_task_links(commit_id);
CREATE INDEX idx_commit_task_links_task_id ON commit_task_links(task_id);

-- Функция для парсинга ссылок на задачи в сообщении коммита
CREATE OR REPLACE FUNCTION parse_task_references(commit_message TEXT)
RETURNS INTEGER[] AS $$
DECLARE
  task_ids INTEGER[] := ARRAY[]::INTEGER[];
  matches TEXT[];
  match TEXT;
  task_id INTEGER;
BEGIN
  -- Ищем паттерны вида #123 или Task: 123 или task 123
  SELECT array_agg(regexp_matches[1]) INTO matches
  FROM regexp_matches(commit_message, '(?:#|Task:\s*|task\s+)(\d+)', 'gi');

  IF matches IS NOT NULL THEN
    FOREACH match IN ARRAY matches LOOP
      BEGIN
        task_id := match::INTEGER;
        task_ids := array_append(task_ids, task_id);
      EXCEPTION WHEN OTHERS THEN
        -- Пропускаем некорректные ID
        CONTINUE;
      END;
    END LOOP;
  END IF;

  RETURN task_ids;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического парсинга ссылок на задачи при вставке коммита
CREATE OR REPLACE FUNCTION trigger_parse_commit_task_references()
RETURNS TRIGGER AS $$
BEGIN
  -- Парсим ссылки на задачи из сообщения коммита
  NEW.task_references := parse_task_references(NEW.message);

  -- Создаем связи коммит-задача
  IF NEW.task_references IS NOT NULL AND array_length(NEW.task_references, 1) > 0 THEN
    INSERT INTO commit_task_links (commit_id, task_id, reference_type)
    SELECT NEW.id, unnest(NEW.task_references), 'message'
    ON CONFLICT (commit_id, task_id, reference_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_commit_task_references
  AFTER INSERT ON commits
  FOR EACH ROW
  EXECUTE FUNCTION trigger_parse_commit_task_references();

-- Представление для получения коммитов с информацией о задачах
CREATE VIEW commits_with_tasks AS
SELECT
  c.*,
  r.name as repository_name,
  r.url as repository_url,
  b.name as branch_name,
  array_agg(DISTINCT t.id) FILTER (WHERE t.id IS NOT NULL) as linked_task_ids,
  array_agg(DISTINCT t.title) FILTER (WHERE t.title IS NOT NULL) as linked_task_titles
FROM commits c
LEFT JOIN repositories r ON c.repository_id = r.id
LEFT JOIN branches b ON c.branch_id = b.id
LEFT JOIN commit_task_links ctl ON c.id = ctl.commit_id
LEFT JOIN tasks t ON ctl.task_id = t.id
GROUP BY c.id, r.name, r.url, b.name;

-- Функция для получения коммитов по ID задачи
CREATE OR REPLACE FUNCTION get_commits_by_task(task_id_param INTEGER)
RETURNS TABLE (
  id INTEGER,
  hash VARCHAR(40),
  message TEXT,
  author_name VARCHAR(255),
  author_email VARCHAR(255),
  commit_date TIMESTAMP,
  repository_name VARCHAR(255),
  branch_name VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.hash,
    c.message,
    c.author_name,
    c.author_email,
    c.commit_date,
    r.name,
    b.name
  FROM commits c
  JOIN repositories r ON c.repository_id = r.id
  LEFT JOIN branches b ON c.branch_id = b.id
  WHERE task_id_param = ANY(c.task_references)
  ORDER BY c.commit_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Вставка тестовых данных (опционально, для разработки)
-- INSERT INTO repositories (name, url, assignment_id, created_by)
-- VALUES ('test-repo', 'https://github.com/user/test-repo.git', 1, 1);
