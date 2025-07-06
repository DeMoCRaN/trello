import React from 'react';

function Task({ task }) {
  return (
    <article className="task-card">
      <h2>{task.title}</h2>
      <p>{task.description}</p>
      <p><strong>Статус:</strong> {task.status}</p>
      <p><strong>Приоритет:</strong> {task.priority}</p>
      <p><strong>Дедлайн:</strong> {task.deadline ? new Date(task.deadline).toLocaleString() : 'Нет'}</p>
    </article>
  );
}

export default Task;
