import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import BaseModal from './BaseModal';
import './TaskDetailsForm.css';

const TaskDetailsForm = ({ task, onClose, token }) => {
  const [taskDetails, setTaskDetails] = useState(null);
  const [comments, setComments] = useState([]);
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeView, setActiveView] = useState('all');

  useEffect(() => {
    const fetchTaskDetails = async () => {
      if (!task?.id) return;

      setLoading(true);
      try {
        const taskResponse = await fetch(`http://localhost:3000/api/tasks/${task.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (taskResponse.ok) {
          const taskData = await taskResponse.json();
          setTaskDetails(taskData);
        } else {
          setTaskDetails(task);
        }

        const commentsResponse = await fetch(`http://localhost:3000/api/tasks/${task.id}/comments`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData);
        }

        const commitsResponse = await fetch(`http://localhost:3000/api/tasks/${task.id}/commits`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (commitsResponse.ok) {
          const commitsData = await commitsResponse.json();
          setCommits(commitsData);
        }
      } catch (error) {
        console.error('Error fetching task details:', error);
        setTaskDetails(task);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskDetails();
  }, [task, task?.id, token]);

  const handleSubmitComment = async (event) => {
    event.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3000/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: newComment }),
      });

      if (response.ok) {
        setNewComment('');
        const commentsResponse = await fetch(`http://localhost:3000/api/tasks/${task.id}/comments`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData);
        }
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';

    try {
      return new Date(dateString).toLocaleString('ru-RU');
    } catch {
      return 'Неверный формат даты';
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0м';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}ч ${mins}м`;
    }

    return `${mins}м`;
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'new':
        return 'Новая';
      case 'in_progress':
        return 'В работе';
      case 'done':
        return 'Завершена';
      default:
        return status;
    }
  };

  const getPriorityText = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'low':
        return 'Низкий';
      case 'medium':
        return 'Средний';
      case 'high':
        return 'Высокий';
      default:
        return priority || 'Не указано';
    }
  };

  const allItems = [
    ...comments.map((comment) => ({
      ...comment,
      type: 'comment',
      date: comment.created_at || comment.createdAt,
    })),
    ...commits.map((commit) => ({
      ...commit,
      type: 'commit',
      date: commit.commit_date,
      author: commit.author_name,
      email: commit.author_email,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredItems = activeView === 'all'
    ? allItems
    : activeView === 'comments'
      ? allItems.filter((item) => item.type === 'comment')
      : allItems.filter((item) => item.type === 'commit');

  const displayTask = taskDetails || task;

  if (loading) {
    return (
      <BaseModal onClose={onClose} title="Детали задачи" size="lg">
        <div className="task-details-loading">
          <div className="loading">Загрузка данных задачи...</div>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      onClose={onClose}
      title="Детали задачи"
      size="lg"
      panelClassName="task-details-modal"
      bodyClassName="task-details-modal__body"
    >
      <div className="task-details-modal__content">
        <div className="task-info-section">
          <h3>{displayTask.title}</h3>
          <p className="task-description">{displayTask.description}</p>

          <div className="task-meta-grid">
            <div className="meta-item">
              <span className="meta-label">Статус:</span>
              <span className={`meta-value status-${displayTask.status}`}>
                {getStatusText(displayTask.status)}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Приоритет:</span>
              <span className={`meta-value priority-${displayTask.priority}`}>
                {getPriorityText(displayTask.priority)}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Дедлайн:</span>
              <span className="meta-value">{formatDate(displayTask.deadline)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Создана:</span>
              <span className="meta-value">{formatDate(displayTask.created_at || displayTask.createdAt)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Автор:</span>
              <span className="meta-value">
                {displayTask.creator_name || displayTask.creatorName || displayTask.creator_email || displayTask.creatorEmail || 'Неизвестно'}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Исполнитель:</span>
              <span className="meta-value">
                {displayTask.assignee_name || displayTask.assigneeName || displayTask.assignee_email || displayTask.assigneeEmail || 'Не назначен'}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Время работы:</span>
              <span className="meta-value">{formatTime(displayTask.work_duration || 0)}</span>
            </div>
          </div>
        </div>

        <div className="task-activity-section">
          <div className="activity-header">
            <h4>Активность</h4>
            <div className="view-toggle">
              <button
                className={`toggle-btn ${activeView === 'all' ? 'active' : ''}`}
                onClick={() => setActiveView('all')}
                type="button"
              >
                Все
              </button>
              <button
                className={`toggle-btn ${activeView === 'comments' ? 'active' : ''}`}
                onClick={() => setActiveView('comments')}
                type="button"
              >
                Комментарии
              </button>
              <button
                className={`toggle-btn ${activeView === 'commits' ? 'active' : ''}`}
                onClick={() => setActiveView('commits')}
                type="button"
              >
                Коммиты
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitComment} className="comment-form">
            <textarea
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder="Добавьте комментарий..."
              rows="2"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="submit-comment-btn"
            >
              {submitting ? 'Отправка...' : 'Отправить'}
            </button>
          </form>

          <div className="activity-list">
            {filteredItems.length === 0 ? (
              <p className="no-activity">Нет активности</p>
            ) : (
              filteredItems.map((item, index) => (
                <div key={`${item.type}-${item.id || index}`} className="activity-item">
                  {item.type === 'commit' ? (
                    <div className="commit-item">
                      <div className="commit-header">
                        <span className="commit-badge">Коммит</span>
                        <span className="commit-hash">{item.hash?.substring(0, 7)}</span>
                      </div>
                      <p className="commit-message">{item.message}</p>
                      <div className="commit-meta">
                        <span>{item.author}</span>
                        <span>{formatDate(item.date)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="comment-item">
                      <div className="comment-header">
                        <span className="comment-author">{item.user_email || 'Аноним'}</span>
                        <span className="comment-date">{formatDate(item.date)}</span>
                      </div>
                      <p className="comment-content">{item.text || item.content}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

TaskDetailsForm.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string,
    description: PropTypes.string,
    status: PropTypes.string,
    priority: PropTypes.string,
    deadline: PropTypes.string,
    created_at: PropTypes.string,
    createdAt: PropTypes.string,
    creator_email: PropTypes.string,
    creatorEmail: PropTypes.string,
    assignee_email: PropTypes.string,
    assigneeEmail: PropTypes.string,
    work_duration: PropTypes.number,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  token: PropTypes.string,
};

export default TaskDetailsForm;
