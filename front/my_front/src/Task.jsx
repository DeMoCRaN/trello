import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import DeadlineProgressBar from './DeadlineProgressBar';
import './components/Components.css';

const getPriorityClass = (priority) => {
  const priorityName = typeof priority === 'object'
    ? priority.name?.toLowerCase()
    : priority?.toLowerCase();

  return `priority-${priorityName || 'normal'}`;
};

function FailedTaskModal({ onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!reason.trim()) {
      alert('Укажите причину провала задачи');
      return;
    }

    onConfirm(reason.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <h2>Провалить задачу</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="failed-reason">Причина</label>
            <textarea
              id="failed-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder="Опишите, почему задача провалена"
            />
          </div>

          <div className="task-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Отмена
            </button>
            <button type="submit" className="fail-button" disabled={loading}>
              Подтвердить провал
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RestoreTaskModal({ task, onClose, onConfirm, loading }) {
  const [title, setTitle] = useState(task.title || '');
  const [deadline, setDeadline] = useState(
    task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : ''
  );

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!title.trim()) {
      alert('Укажите название задачи');
      return;
    }

    onConfirm({
      title: title.trim(),
      deadline: deadline ? new Date(deadline).toISOString() : null,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <h2>Восстановить задачу</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="restore-title">Название</label>
            <input
              id="restore-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Название задачи"
            />
          </div>

          <div className="form-group">
            <label htmlFor="restore-deadline">Дедлайн</label>
            <input
              id="restore-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </div>

          <div className="task-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Отмена
            </button>
            <button type="submit" className="complete-button" disabled={loading}>
              Восстановить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Task({
  task,
  onDelete,
  creatorName,
  assigneeName,
  onDetails,
  onCompleteWork,
  onFail,
  onRestore,
  isProjectAuthor = false,
  loading = false,
  isArchived = false,
  activeTab = 'active',
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  useEffect(() => {
    if (loading) {
      setIsUpdating(true);
      return undefined;
    }

    const timer = setTimeout(() => {
      setIsUpdating(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [loading]);

  const normalizedTask = {
    ...task,
    createdAt: task.createdAt || task.created_at,
    inProgressSince: task.in_progress_since || task.inProgressSince,
    workDuration: task.work_duration || task.workDuration,
  };

  const deadline = normalizedTask.deadline ? new Date(normalizedTask.deadline) : null;
  const priorityClass = getPriorityClass(normalizedTask.priority);
  const isOverdue = deadline &&
    new Date() > deadline &&
    !['done', 'failed'].includes(normalizedTask.status);
  const isFailed = normalizedTask.status === 'failed';
  const isReview = normalizedTask.status === 'rew';
  const canComplete = !isArchived && !isFailed && normalizedTask.status !== 'done';
  const canFail = isProjectAuthor && !isArchived && !isFailed && normalizedTask.status !== 'done';
  const canRestore = isProjectAuthor && !isArchived && activeTab === 'failed' && isFailed;

  const formatDate = (date) => {
    if (!date) {
      return 'Нет';
    }

    return new Date(date).toLocaleString('ru-RU');
  };

  const handleDelete = async () => {
    setIsUpdating(true);
    setLastAction('delete');

    try {
      await onDelete(task.id);
    } catch (error) {
      console.error('Ошибка удаления:', error);
      setIsUpdating(false);
    }
  };

  const handleComplete = async () => {
    setIsUpdating(true);
    setLastAction('complete');

    try {
      await onCompleteWork(task.id);
    } catch (error) {
      console.error('Ошибка завершения:', error);
      setIsUpdating(false);
    }
  };

  const handleFailConfirm = async (reason) => {
    setIsUpdating(true);
    setLastAction('fail');

    try {
      await onFail?.(normalizedTask.id, reason);
      setShowFailedModal(false);
    } catch (error) {
      console.error('Ошибка провала задачи:', error);
      setIsUpdating(false);
    }
  };

  const handleRestoreConfirm = async (restoreData) => {
    setIsUpdating(true);
    setLastAction('restore');

    try {
      await onRestore?.(normalizedTask.id, restoreData);
      setShowRestoreModal(false);
    } catch (error) {
      console.error('Ошибка восстановления задачи:', error);
      setIsUpdating(false);
    }
  };

  const taskStyle = {
    ...(isOverdue && {
      backgroundColor: 'rgba(255, 0, 0, 0.1)',
      borderLeft: '4px solid #ff0000',
    }),
    ...(isUpdating && {
      opacity: 0.7,
      pointerEvents: 'none',
    }),
  };

  return (
    <>
      <article
        className={`task-card ${priorityClass} ${isUpdating ? 'updating' : ''}`}
        style={taskStyle}
      >
        {isUpdating && (
          <div className="task-update-overlay">
            <div className="task-update-spinner"></div>
            <span className="task-update-text">
              {lastAction === 'delete' && 'Удаление...'}
              {lastAction === 'complete' && 'Завершение...'}
              {lastAction === 'fail' && 'Провал задачи...'}
              {lastAction === 'restore' && 'Восстановление...'}
              {!lastAction && 'Обновление...'}
            </span>
          </div>
        )}

        <div className="task-header">
          <h2>{normalizedTask.title}</h2>
          {isOverdue && (
            <span className="late-badge" title="Задача просрочена">
              Просрочено
            </span>
          )}
          {isReview && (
            <span className="late-badge" style={{ backgroundColor: '#ff9800' }}>
              На ревью
            </span>
          )}
          <span className="task-priority">{normalizedTask.priority}</span>
        </div>

        <p className="task-description">{normalizedTask.description}</p>

        <div className="task-meta">
          <div className="meta-item">
            <span>Создатель:</span>
            <span>{creatorName || 'Неизвестно'}</span>
          </div>
          <div className="meta-item">
            <span>Исполнитель:</span>
            <span>{assigneeName || 'Неизвестно'}</span>
          </div>
          <div className="meta-item">
            <span>Дедлайн:</span>
            <span>{formatDate(deadline)}</span>
          </div>
          {normalizedTask.status === 'done' && (
            <div className="meta-item">
              <span>Завершено:</span>
              <span>{formatDate(normalizedTask.completedAt)}</span>
            </div>
          )}
        </div>

        {normalizedTask.deadline ? (
          <DeadlineProgressBar
            taskId={normalizedTask.id}
            createdAt={normalizedTask.createdAt}
            deadline={normalizedTask.deadline}
            status={normalizedTask.status}
          />
        ) : (
          <div className="no-deadline">Дедлайн не установлен</div>
        )}

        <div className="task-actions">
          <button onClick={() => onDetails?.(task)} disabled={isUpdating}>
            Подробнее
          </button>

          {canComplete && (
            <button
              onClick={handleComplete}
              disabled={isUpdating}
              className="complete-button"
            >
              {isReview ? 'Принять' : 'Завершить'}
            </button>
          )}

          {canFail && (
            <button
              onClick={() => setShowFailedModal(true)}
              disabled={isUpdating}
              className="fail-button"
            >
              Провалить
            </button>
          )}

          {canRestore && (
            <button
              onClick={() => setShowRestoreModal(true)}
              disabled={isUpdating}
              className="complete-button"
            >
              Восстановить
            </button>
          )}

          <button
            onClick={handleDelete}
            disabled={isUpdating}
            className="delete-button"
          >
            {isFailed && activeTab === 'failed' ? 'Удалить без восстановления' : 'Удалить'}
          </button>
        </div>
      </article>

      {showFailedModal && (
        <FailedTaskModal
          onClose={() => setShowFailedModal(false)}
          onConfirm={handleFailConfirm}
          loading={isUpdating}
        />
      )}

      {showRestoreModal && (
        <RestoreTaskModal
          task={normalizedTask}
          onClose={() => setShowRestoreModal(false)}
          onConfirm={handleRestoreConfirm}
          loading={isUpdating}
        />
      )}
    </>
  );
}

FailedTaskModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

RestoreTaskModal.propTypes = {
  task: PropTypes.shape({
    title: PropTypes.string,
    deadline: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

Task.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    deadline: PropTypes.string,
    createdAt: PropTypes.string,
    created_at: PropTypes.string,
    status: PropTypes.string.isRequired,
    priority: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object,
    ]),
    in_progress_since: PropTypes.string,
    work_duration: PropTypes.number,
    completedAt: PropTypes.string,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  creatorName: PropTypes.string,
  assigneeName: PropTypes.string,
  onDetails: PropTypes.func,
  onCompleteWork: PropTypes.func.isRequired,
  onFail: PropTypes.func,
  onRestore: PropTypes.func,
  isProjectAuthor: PropTypes.bool,
  loading: PropTypes.bool,
  isArchived: PropTypes.bool,
  activeTab: PropTypes.string,
};

export default Task;
