import React from 'react';
import CountdownProgressBar from './CountdownProgressBar';

function Task({ task, statuses, onStatusChange, onDelete, name,  }) {
  const deadline = task.deadline ? new Date(task.deadline) : null;

  return (
    <article className="task-card">
      <h2>{task.title}</h2>
      <p>{task.description}</p>
      <p><strong>Приоритет:</strong> {task.priority}</p>
      <p><strong>Создатель:</strong> {name || 'Неизвестно'}</p>
      <p><strong>Исполнитель:</strong> {name || 'Неизвестно'}</p>
      <p><strong>Дедлайн:</strong> {deadline ? new Date(deadline.getTime() - deadline.getTimezoneOffset() * 60000).toLocaleString() : 'Нет'}</p>
      {deadline && (
        <CountdownProgressBar createdAt={task.created_at} deadline={task.deadline} />
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
