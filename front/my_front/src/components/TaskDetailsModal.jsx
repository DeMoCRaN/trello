import React from 'react';
import './Components.css';

function TaskDetailsModal({ task, onClose, isLoading }) {
  if (!task && !isLoading) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {isLoading ? (
          <div>Загрузка...</div>
        ) : (
          <>
            <h2>{task.title}</h2>
            <p><strong>Описание:</strong> {task.description}</p>
            <p><strong>Статус:</strong> {task.status}</p>
            <p><strong>Дедлайн:</strong> {task.deadline ? new Date(task.deadline).toLocaleString() : 'Нет'}</p>
            <button onClick={onClose}>Закрыть</button>
          </>
        )}
      </div>
    </div>
  );
}

export default TaskDetailsModal;
