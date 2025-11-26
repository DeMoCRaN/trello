import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './Components.css';

const CommitHistory = ({ taskId }) => {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCommits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Не авторизован');
      }

      const response = await fetch(`/api/tasks/${taskId}/commits`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка при загрузке коммитов');
      }

      const data = await response.json();
      setCommits(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching commits:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) {
      fetchCommits();
    }
  }, [taskId, fetchCommits]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Неизвестно';
    try {
      return new Date(dateString).toLocaleString('ru-RU');
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      return 'Неверный формат даты';
    }
  };

  const truncateHash = (hash) => {
    return hash ? `${hash.substring(0, 8)}...` : 'Нет хэша';
  };

  const highlightTaskReferences = (message) => {
    if (!message) return 'Нет сообщения';

    // Подсвечиваем ссылки на задачи
    const highlighted = message.replace(
      /(#\d+|Task:\s*\d+|task\s+\d+)/gi,
      (match) => `<span class="task-reference">${match}</span>`
    );

    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  if (loading) {
    return (
      <div className="commit-history">
        <h3>История коммитов</h3>
        <div className="loading-spinner">Загрузка коммитов...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="commit-history">
        <h3>История коммитов</h3>
        <div className="error-message">
          Ошибка загрузки коммитов: {error}
          <button onClick={fetchCommits} className="retry-button">
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="commit-history">
      <h3>История коммитов ({commits.length})</h3>

      {commits.length === 0 ? (
        <div className="no-commits">
          <p>Коммиты, связанные с этой задачей, не найдены.</p>
          <p className="hint">
            Добавьте ссылки на задачу в сообщениях коммитов используя форматы:
            #123, Task: 123 или task 123
          </p>
        </div>
      ) : (
        <div className="commits-list">
          {commits.map((commit) => (
            <div key={commit.id} className="commit-item">
              <div className="commit-header">
                <div className="commit-hash">
                  <code>{truncateHash(commit.hash)}</code>
                </div>
                <div className="commit-author">
                  {commit.author_name || 'Неизвестный автор'}
                  {commit.author_email && (
                    <span className="commit-email">({commit.author_email})</span>
                  )}
                </div>
                <div className="commit-date">
                  {formatDate(commit.commit_date)}
                </div>
              </div>

              <div className="commit-message">
                {highlightTaskReferences(commit.message)}
              </div>

              <div className="commit-meta">
                <div className="commit-repo">
                  Репозиторий: {commit.repository_name || 'Неизвестный'}
                </div>
                {commit.branch_name && (
                  <div className="commit-branch">
                    Ветка: {commit.branch_name}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

CommitHistory.propTypes = {
  taskId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default CommitHistory;