import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './Components.css';

const TaskComments = ({ taskId, token }) => {
  const [comments, setComments] = useState([]);
  const [commits, setCommits] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('all'); // 'all', 'comments', 'commits'

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка при загрузке комментариев');
      }

      const data = await response.json();
      setComments(data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  }, [taskId, token]);

  const fetchCommits = useCallback(async () => {
    try {
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
      console.error('Error fetching commits:', err);
    }
  }, [taskId, token]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchComments(), fetchCommits()]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (taskId && token) {
      fetchData();
    }
  }, [taskId, token, fetchComments, fetchCommits]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newComment })
      });

      if (!response.ok) {
        throw new Error('Ошибка при отправке комментария');
      }

      setNewComment('');
      await fetchComments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Неизвестно';
    try {
      return new Date(dateString).toLocaleString('ru-RU');
    } catch {
      return 'Неверный формат даты';
    }
  };

  const truncateHash = (hash) => {
    return hash ? `${hash.substring(0, 7)}` : 'Нет хэша';
  };

  const highlightTaskReferences = (message) => {
    if (!message) return 'Нет сообщения';

    const highlighted = message.replace(
      /(#\d+|Task:\s*\d+|task\s+\d+)/gi,
      (match) => `<span class="task-reference">${match}</span>`
    );

    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  // Объединяем комментарии и коммиты в один массив для отображения
  const allItems = [
    ...comments.map(comment => ({
      ...comment,
      type: 'comment',
      date: comment.created_at || comment.createdAt
    })),
    ...commits.map(commit => ({
      ...commit,
      type: 'commit',
      date: commit.commit_date,
      author: commit.author_name,
      email: commit.author_email
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredItems = activeView === 'all' 
    ? allItems 
    : activeView === 'comments' 
      ? allItems.filter(item => item.type === 'comment')
      : allItems.filter(item => item.type === 'commit');

  if (loading) {
    return (
      <div className="task-comments">
        <div className="loading-spinner">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="task-comments">
      <div className="comments-header">
        <h3>Активность</h3>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${activeView === 'all' ? 'active' : ''}`}
            onClick={() => setActiveView('all')}
          >
            Все
          </button>
          <button
            className={`toggle-btn ${activeView === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveView('comments')}
          >
            Комментарии
          </button>
          <button
            className={`toggle-btn ${activeView === 'commits' ? 'active' : ''}`}
            onClick={() => setActiveView('commits')}
          >
            Коммиты
          </button>
        </div>
      </div>

      {/* Форма добавления комментария */}
      <form onSubmit={handleSubmitComment} className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Добавьте комментарий..."
          rows="3"
          disabled={submitting}
        />
        <button type="submit" disabled={submitting || !newComment.trim()}>
          {submitting ? 'Отправка...' : 'Комментировать'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="dismiss-button">
            ×
          </button>
        </div>
      )}

      <div className="activity-timeline">
        {filteredItems.length === 0 ? (
          <div className="no-activity">
            <p>Нет активности</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={`${item.type}-${item.id}`} className="timeline-item">
              <div className="timeline-marker">
                {item.type === 'commit' ? (
                  <div className="commit-marker">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0a8 8 0 1 1-8 8 8 8 0 0 1 8-8zm0 2a6 6 0 1 0 6 6 6 6 0 0 0-6-6z"/>
                    </svg>
                  </div>
                ) : (
                  <div className="comment-marker">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0a8 8 0 1 1-8 8 8 8 0 0 1 8-8zm0 2a6 6 0 1 0 6 6 6 6 0 0 0-6-6z"/>
                    </svg>
                  </div>
                )}
              </div>

              <div className="timeline-content">
                {item.type === 'commit' ? (
                  <div className="commit-item github-style">
                    <div className="commit-header">
                      <div className="commit-hash-badge">
                        <code>{truncateHash(item.hash)}</code>
                      </div>
                      <div className="commit-message">
                        {highlightTaskReferences(item.message)}
                      </div>
                    </div>
                    
                    <div className="commit-meta">
                      <span className="commit-author">
                        {item.author || 'Неизвестный автор'}
                      </span>
                      <span className="commit-date">
                        {formatDate(item.date)}
                      </span>
                      {item.repository_name && (
                        <span className="commit-repo">
                          в {item.repository_name}
                        </span>
                      )}
                      {item.branch_name && (
                        <span className="commit-branch">
                          на ветке {item.branch_name}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="comment-item">
                    <div className="comment-header">
                      <span className="comment-author">
                        {item.author_name || item.author || 'Аноним'}
                      </span>
                      <span className="comment-date">
                        {formatDate(item.date)}
                      </span>
                    </div>
                    <div className="comment-content">
                      {item.content}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

TaskComments.propTypes = {
  taskId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  token: PropTypes.string.isRequired
};

export default TaskComments;