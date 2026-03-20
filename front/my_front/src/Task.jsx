import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import DeadlineProgressBar from './DeadlineProgressBar';
import './components/Components.css';

// eslint-disable-next-line no-undef, no-unused-vars
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

const getPriorityClass = (priority) => {
  const priorityName = typeof priority === 'object' 
    ? priority.name?.toLowerCase() 
    : priority?.toLowerCase();
  return `priority-${priorityName || 'normal'}`;
};

function Task({ 
  task, 
  onDelete, 
  creatorName, 
  assigneeName, 
  onDetails, 
  onCompleteWork, 
  onFail,
  isProjectAuthor = false,
  userEmail = '',
  loading = false,
  isArchived = false
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [showFailedModal, setShowFailedModal] = useState(false);


  useEffect(() => {
    if (loading) {
      setIsUpdating(true);
    } else {
      // Задержка для плавного исчезновения индикатора загрузки
      const timer = setTimeout(() => {
        setIsUpdating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);

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

  const handleDetails = () => {
    console.log('Подробнее clicked, task:', task);
    console.log('onDetails prop:', onDetails);
    if (onDetails) {
      onDetails(task);
    } else {
      console.warn('onDetails prop is not defined');
    }
  };


  const normalizedTask = {
    ...task,
    createdAt: task.createdAt || task.created_at,
    inProgressSince: task.in_progress_since || task.inProgressSince,
    workDuration: task.work_duration || task.workDuration
  };

  const deadline = normalizedTask.deadline ? new Date(normalizedTask.deadline) : null;
  const priorityClass = getPriorityClass(normalizedTask.priority);

  const isOverdue = deadline && 
                   new Date() > deadline && 
                   normalizedTask.status !== 'done';

  const formatDate = (date) => {
    if (!date) return 'Нет';
    return new Date(date).toLocaleString('ru-RU');
  };

  const taskStyle = {
    ...(isOverdue && {
      backgroundColor: 'rgba(255, 0, 0, 0.1)',
      borderLeft: '4px solid #ff0000'
    }),
    ...(isUpdating && {
      opacity: 0.7,
      pointerEvents: 'none'
    })
  };

  return (
    <article 
      className={`task-card ${priorityClass} ${isUpdating ? 'updating' : ''}`}
      style={taskStyle}
    >
      {isUpdating && (
        <div className="task-update-overlay">
          <div className="task-update-spinner"></div>
          <span className="task-update-text">
            {lastAction === 'delete' ? 'Удаление...' : 
             lastAction === 'complete' ? 'Завершение...' : 
             'Обновление...'}
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
    <button 
      onClick={handleDetails}
      disabled={isUpdating}
    >
      Подробнее
    </button>
    
    {normalizedTask.status !== 'done' && !isArchived && (
      <button 
        onClick={handleComplete}
        disabled={isUpdating}
        className="complete-button"
      >
        {isUpdating && lastAction === 'complete' ? '...' : 'Завершить'}
      </button>
    )}
    
    {isProjectAuthor && normalizedTask.status !== 'done' && normalizedTask.status !== 'failed' && !isArchived && (
      <button 
        onClick={() => setShowFailedModal(true)}
        disabled={isUpdating}
        className="fail-button"
      >
        ❌ Провалено
      </button>
    )}
    
    <button 
      onClick={handleDelete}
      disabled={isUpdating}
      className="delete-button"
    >
      {isUpdating && lastAction === 'delete' ? '...' : 'Удалить'}
    </button>
  </div>
  
  {showFailedModal && (
    <FailedTaskModal 
      task={normalizedTask}
      token={localStorage.getItem('token')}
      onClose={() => setShowFailedModal(false)}
      onConfirm={(reason) => {
        onFail?.(normalizedTask.id, 4, reason);
        setShowFailedModal(false);
      }}
    />
  )}

    </article>
  );
}

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
      PropTypes.object
    ]),
    in_progress_since: PropTypes.string,
    work_duration: PropTypes.number,
    completedAt: PropTypes.string
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  creatorName: PropTypes.string,
  assigneeName: PropTypes.string,
  onDetails: PropTypes.func,
  onCompleteWork: PropTypes.func.isRequired,
  onFail: PropTypes.func,
  isProjectAuthor: PropTypes.bool,
  userEmail: PropTypes.string,
  loading: PropTypes.bool,
  isArchived: PropTypes.bool
};


export default Task;
