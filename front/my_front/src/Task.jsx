import React, { useEffect, useState } from 'react';
import DeadlineProgressBar from './DeadlineProgressBar';

function Task({ task, statuses, onStatusChange, onDelete, creatorName, assigneeName, onDetails }) {
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const [elapsedTime, setElapsedTime] = useState('');

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

  const calculateElapsedTime = () => {
    if (!task.in_progress_since) {
      setElapsedTime('');
      return;
    }
    const start = new Date(task.in_progress_since);
    const now = new Date();
    const diffMs = now - start;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
    setElapsedTime(`${diffHrs}ч ${diffMins}м ${diffSecs}с`);
  };

  useEffect(() => {
    if (task.status === 'done') {
      setElapsedTime('');
      return;
    }
    calculateElapsedTime();
    const interval = setInterval(calculateElapsedTime, 1000);
    return () => clearInterval(interval);
  }, [task.in_progress_since, task.status]);

  const handleStartProgress = async () => {
    const inProgressStatus = statuses.find(s => s.name.toLowerCase() === 'in_progress');
    if (!inProgressStatus) {
      alert('Статус "in_progress" не найден');
      return;
    }
    try {
      const response = await fetch(`http://localhost:3000/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: inProgressStatus.id }),
      });
      if (!response.ok) {
        throw new Error('Ошибка при обновлении статуса задачи');
      }
      onStatusChange(task.id, inProgressStatus.id);
    } catch (error) {
      alert(error.message);
    }
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
      {!task.in_progress_since && (
        <button onClick={handleStartProgress}>Начать выполнение</button>
      )}
      {task.in_progress_since && (
        <p>В работе: {elapsedTime}</p>
      )}
      <button onClick={() => onDelete(task.id)}>Удалить задачу</button>
      <button onClick={() => onDetails(task)}>Подробнее</button>
    </article>
  );
}

export default Task;
