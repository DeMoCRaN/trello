import React from 'react';
import DeadlineProgressBar from './DeadlineProgressBar';

function Task({ task, statuses, onStatusChange, onDelete, creatorName, assigneeName }) {
  const deadline = task.deadline ? new Date(task.deadline) : null;

  console.log('Task dates:', { createdAt: task.created_at, deadline: task.deadline });

  const formatDate = (date) => {
    if (!date) return 'Нет';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;
  };

  return (
    <article className="task-card">
      <h2>{task.title}</h2>
      <p>{task.description}</p>
      <p><strong>Приоритет:</strong> {task.priority}</p>
      <p><strong>Создатель:</strong> {creatorName || 'Неизвестно'}</p>
      <p><strong>Исполнитель:</strong> {assigneeName || 'Неизвестно'}</p>
      <p><strong>Дедлайн:</strong> {formatDate(deadline)}</p>
      {deadline && (
        <DeadlineProgressBar createdAt={task.created_at || task.deadline} deadline={task.deadline} />
      )}
      <label>
        Статус:
        <select
          value={statuses.find(s => s.name === task.status)?.id || 3}
          onChange={(e) => onStatusChange(task.id, parseInt(e.target.value, 10))}
        >
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </select>
      </label>
      <button onClick={() => onDelete(task.id)}>Удалить задачу</button>
    </article>
  );
}

export default Task;
