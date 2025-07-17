import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import DeadlineProgressBar from './DeadlineProgressBar';
import './components/Components.css';

// eslint-disable-next-line no-undef
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

const getPriorityClass = (priority) => {
  const priorityName = typeof priority === 'object' 
    ? priority.name?.toLowerCase() 
    : priority?.toLowerCase();
  return `priority-${priorityName || 'normal'}`;
};

function Task({ task, onDelete, creatorName, assigneeName, onDetails, onCompleteWork }) {
  useEffect(() => {
    if (isDev) {
      console.groupCollapsed(`Task Data Validation (ID: ${task.id || 'unknown'})`);
      console.log('📌 Основные данные:', {
        'ID задачи': task.id,
        'Заголовок': task.title,
        'Статус': task.status,
        'Приоритет': task.priority || 'не указан',
        'Создатель': creatorName || 'не указан',
        'Исполнитель': assigneeName || 'не указан'
      });

      const logDateInfo = (dateValue, dateName) => {
        if (!dateValue) {
          console.log(`⏰ ${dateName}: не указана`);
          return null;
        }

        try {
          const dateObj = new Date(dateValue);
          if (isNaN(dateObj.getTime())) {
            console.error(`❌ ${dateName}: неверный формат даты`, dateValue);
            return null;
          }

          const now = new Date();
          const diffDays = Math.floor((now - dateObj) / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor((now - dateObj) / (1000 * 60 * 60));
          
          console.log(`⏰ ${dateName}:`, {
            'Исходное значение': dateValue,
            'Дата/время (ISO)': dateObj.toISOString(),
            'Локальный формат': dateObj.toLocaleString('ru-RU'),
            'Относительное время': diffDays > 0 
              ? `${diffDays} дней назад` 
              : `${diffHours} часов назад`,
            'День недели': dateObj.toLocaleString('ru-RU', { weekday: 'long' })
          });
          
          return dateObj;
        } catch (error) {
          console.error(`❌ Ошибка обработки ${dateName}:`, error);
          return null;
        }
      };

      const creationDate = task.createdAt || task.created_at;
      logDateInfo(creationDate, 'Дата создания');
      logDateInfo(task.deadline, 'Дедлайн');
      logDateInfo(task.in_progress_since, 'В работе с');

      console.groupEnd();
    }
  }, [task, creatorName, assigneeName]);

  const normalizedTask = {
    ...task,
    createdAt: task.createdAt || task.created_at,
    inProgressSince: task.in_progress_since || task.inProgressSince,
    workDuration: task.work_duration || task.workDuration
  };

  const deadline = normalizedTask.deadline ? new Date(normalizedTask.deadline) : null;
  const priorityClass = getPriorityClass(normalizedTask.priority);

  // Новая логика определения просрочки
  const isOverdue = deadline && 
                   new Date() > deadline && 
                   normalizedTask.status !== 'done';

  const formatDate = (date) => {
    if (!date) return 'Нет';
    return new Date(date).toLocaleString('ru-RU');
  };

  // Стиль только для просроченных задач
  const taskStyle = isOverdue ? {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderLeft: '4px solid #ff0000'
  } : {};

  return (
    <article 
      className={`task-card ${priorityClass}`}
      style={taskStyle}
    >
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
        <button onClick={() => onDetails && onDetails(normalizedTask)}>Подробнее</button>
        {normalizedTask.status !== 'done' && (
          <button onClick={() => onCompleteWork(normalizedTask.id)}>Завершить</button>
        )}
        <button onClick={() => onDelete(normalizedTask.id)}>Удалить</button>
      </div>
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
  onCompleteWork: PropTypes.func.isRequired
};

export default Task;