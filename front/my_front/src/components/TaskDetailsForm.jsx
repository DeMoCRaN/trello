import React from 'react';
import DeadlineProgressBar from '../DeadlineProgressBar';
import '../components/Components.css';

const formatWorkDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0 сек';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  let result = [];
  if (hours > 0) result.push(`${hours} ч`);
  if (minutes > 0) result.push(`${minutes} мин`);
  if (secs > 0 || result.length === 0) result.push(`${secs} сек`);
  
  return result.join(' ');
};

function TaskDetailsForm({ task, onClose }) {
  if (!task) return null;

  // Получаем email из данных задачи
  const creatorEmail = task.creator_name || task.creator_email || 'Не указан';
  const assigneeEmail = task.assignee_name || task.assignee_email || 'Не назначен';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <h2>{task.title}</h2>
        
        <div className="task-details-grid">
          <div className="detail-item">
            <span className="detail-label">Статус:</span>
            <span className={`detail-value status-${task.status?.toLowerCase()}`}>
              {task.status || 'Не указан'}
            </span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Приоритет:</span>
            <span className={`detail-value priority-${task.priority?.toLowerCase()}`}>
              {task.priority || 'Не указан'}
            </span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Создатель:</span>
            <span className="detail-value email">
              {creatorEmail}
            </span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Исполнитель:</span>
            <span className="detail-value email">
              {assigneeEmail}
            </span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Дедлайн:</span>
            <span className="detail-value">
              {task.deadline ? new Date(task.deadline).toLocaleString('ru-RU') : 'Не установлен'}
            </span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Время работы:</span>
            <span className="detail-value">
              {formatWorkDuration(task.work_duration || task.workDuration)}
            </span>
          </div>
        </div>
        
        <div className="description-section">
          <h3>Описание:</h3>
          <p>{task.description || 'Описание отсутствует'}</p>
        </div>
        
        <div className="progress-section">
          <DeadlineProgressBar 
            taskId={task.id}
            createdAt={task.created_at || task.createdAt}
            deadline={task.deadline}
            status={task.status}
          />
        </div>
      </div>
    </div>
  );
}

export default TaskDetailsForm;