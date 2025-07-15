import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import DeadlineProgressBar from './DeadlineProgressBar';
import './components/Components.css';

// Определяем режим разработки
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

const getPriorityClass = (priority) => {
  const priorityName = typeof priority === 'object' 
    ? priority.name?.toLowerCase() 
    : priority?.toLowerCase();
  return `priority-${priorityName || 'normal'}`;
};

function Task({ task, onDelete, creatorName, assigneeName, onDetails, onCompleteWork }) {
  // Проверка данных при монтировании
  useEffect(() => {
    if (isDev) {
      console.groupCollapsed(`Task Data Validation (ID: ${task.id || 'unknown'})`);
      
      // Основная информация о задаче
      console.log('📌 Основные данные:', {
        'ID задачи': task.id,
        'Заголовок': task.title,
        'Статус': task.status,
        'Приоритет': task.priority || 'не указан',
        'Создатель': creatorName || 'не указан',
        'Исполнитель': assigneeName || 'не указан'
      });

      // Функция для логирования дат
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

      // Проверяем все возможные варианты поля created_at
      const creationDate = task.createdAt || task.created_at;
      logDateInfo(creationDate, 'Дата создания');

      // Логируем дедлайн
      logDateInfo(task.deadline, 'Дедлайн');

      // Логируем дату начала работы
      logDateInfo(task.in_progress_since, 'В работе с');

      console.groupEnd();
    }
  }, [task, creatorName, assigneeName]);

  // Нормализация данных
  const normalizedTask = {
    ...task,
    createdAt: task.createdAt || task.created_at,
    inProgressSince: task.in_progress_since || task.inProgressSince,
    workDuration: task.work_duration || task.workDuration
  };

  const deadline = normalizedTask.deadline ? new Date(normalizedTask.deadline) : null;
  const [, setElapsedTime] = useState('');
  const priorityClass = getPriorityClass(normalizedTask.priority);

  const formatDate = (date) => {
    if (!date) return 'Нет';
    return new Date(date).toLocaleString('ru-RU');
  };

  const calculateElapsedTime = () => {
    if (!normalizedTask.inProgressSince) {
      setElapsedTime('');
      return;
    }
    const diff = new Date() - new Date(normalizedTask.inProgressSince);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    setElapsedTime(`${hours}ч ${minutes}м ${seconds}с`);
  };

  useEffect(() => {
    if (normalizedTask.status === 'done') return;
    calculateElapsedTime();
    const interval = setInterval(calculateElapsedTime, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedTask.inProgressSince, normalizedTask.status]);

  return (
    <article className={`task-card ${priorityClass}`}>
      <div className="task-header">
        <h2>{normalizedTask.title}</h2>
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
        <button onClick={() => onDetails(normalizedTask)}>Подробнее</button>
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
    work_duration: PropTypes.number
  }).isRequired,
  statuses: PropTypes.array.isRequired,
  onStatusChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  creatorName: PropTypes.string,
  assigneeName: PropTypes.string,
  onDetails: PropTypes.func.isRequired,
  onStopWork: PropTypes.func.isRequired,
  onResumeWork: PropTypes.func.isRequired,
  onCompleteWork: PropTypes.func.isRequired
};

export default Task;