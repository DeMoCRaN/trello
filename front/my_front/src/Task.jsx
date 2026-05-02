import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import DeadlineProgressBar from './DeadlineProgressBar';
import BaseModal from './components/BaseModal';
import './components/Components.css';

const getPriorityClass = (priority) => {
  const priorityName = typeof priority === 'object'
    ? priority.name?.toLowerCase()
    : priority?.toLowerCase();

  return `priority-${priorityName || 'normal'}`;
};

const getRussianPriority = (priority) => {
  const name = typeof priority === 'object' ? priority.name?.toLowerCase() : priority?.toLowerCase();
  switch (name) {
    case 'low':
    case 'низкий':
      return 'Низкий';
    case 'medium':
    case 'средний':
      return 'Средний';
    case 'high':
    case 'высокий':
      return 'Высокий';
    case 'critical':
      return 'Критический';
    default:
      return priority?.name || priority || 'Нормальный';
  }
};

function FailedTaskModal({ onClose, onConfirm, loading, onNotify }) {
  const [reason, setReason] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!reason.trim()) {
      onNotify('Укажите причину провала задачи');
      return;
    }

    onConfirm(reason.trim());
  };

  return (
    <BaseModal onClose={onClose} title="Провалить задачу" size="sm">
      <form onSubmit={handleSubmit}>
        <div className="modal-form-group">
          <label htmlFor="failed-reason" className="modal-label">
            Причина провала
          </label>
          <textarea
            id="failed-reason"
            className="modal-textarea"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={5}
            placeholder="Опишите, почему задача не может быть выполнена..."
            autoFocus
          />
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="modal-button modal-button-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="modal-button modal-button-fail"
            disabled={loading}
          >
            {loading ? 'Провал...' : 'Подтвердить провал'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function RestoreTaskModal({ task, onClose, onConfirm, loading, onNotify }) {
  const [title, setTitle] = useState(task.title || '');
  const [deadline, setDeadline] = useState(
    task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : ''
  );

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!title.trim()) {
      onNotify('Укажите название задачи');
      return;
    }

    onConfirm({
      title: title.trim(),
      deadline: deadline ? new Date(deadline).toISOString() : null,
    });
  };

  return (
    <BaseModal onClose={onClose} title="Восстановить задачу" size="sm">
      <form onSubmit={handleSubmit}>
        <div className="modal-form-group">
          <label htmlFor="restore-title" className="modal-label">
            Название задачи
          </label>
          <input
            id="restore-title"
            className="modal-input"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Введите название задачи"
            autoFocus
          />
        </div>

        <div className="modal-form-group">
          <label htmlFor="restore-deadline" className="modal-label">
            Дедлайн
          </label>
          <input
            id="restore-deadline"
            className="modal-input"
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="modal-button modal-button-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="modal-button modal-button-restore"
            disabled={loading}
          >
            {loading ? 'Восстановление...' : 'Восстановить'}
          </button>
        </div>
      </form>
    </BaseModal>
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
  onNotify = () => {},
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
  const isOverdue = deadline
    && new Date() > deadline
    && !['done', 'failed'].includes(normalizedTask.status);
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
            <div className="task-update-spinner" />
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
            <span className="late-badge" style={{ backgroundColor: '#fdecd3' }}>
              На ревью
            </span>
          )}
<span className="task-priority">{getRussianPriority(normalizedTask.priority)}</span>
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
          onNotify={onNotify}
        />
      )}

      {showRestoreModal && (
        <RestoreTaskModal
          task={normalizedTask}
          onClose={() => setShowRestoreModal(false)}
          onConfirm={handleRestoreConfirm}
          loading={isUpdating}
          onNotify={onNotify}
        />
      )}
    </>
  );
}

FailedTaskModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  onNotify: PropTypes.func,
};

RestoreTaskModal.propTypes = {
  task: PropTypes.shape({
    title: PropTypes.string,
    deadline: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  onNotify: PropTypes.func,
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
  onNotify: PropTypes.func,
  isProjectAuthor: PropTypes.bool,
  loading: PropTypes.bool,
  isArchived: PropTypes.bool,
  activeTab: PropTypes.string,
};

export default Task;
