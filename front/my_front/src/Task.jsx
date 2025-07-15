import React, { useEffect, useState } from 'react';
import DeadlineProgressBar from './DeadlineProgressBar';

// Utility function to get priority color
const getPriorityColor = (priority) => {
  const priorityName = typeof priority === 'object' 
    ? priority.name?.toLowerCase() 
    : priority?.toLowerCase();
  
  switch(priorityName) {
    case 'low': return '#9e9e9e';
    case 'medium': return '#ff9800';
    case 'high': return '#f44336';
    default: return '#9e9e9e';
  }
};

function Task({ task, statuses, onStatusChange, onDelete, creatorName, assigneeName, onDetails, onStopWork, onResumeWork, onCompleteWork }) {
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const [elapsedTime, setElapsedTime] = useState('');
  const [totalElapsedTime, setTotalElapsedTime] = useState('');

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

  const calculateTotalElapsedTime = () => {
    if (!task.work_duration) {
      setTotalElapsedTime('');
      return;
    }
    const totalSeconds = task.work_duration;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    setTotalElapsedTime(`${hours}ч ${minutes}м ${seconds}с`);
  };

  useEffect(() => {
    if (task.status === 'done') {
      calculateTotalElapsedTime();
      setElapsedTime('');
      return;
    }
    calculateElapsedTime();
    const interval = setInterval(calculateElapsedTime, 1000);
    return () => clearInterval(interval);
  }, [task.in_progress_since, task.status, task.work_duration]);

  // Add event listener for real-time updates
  useEffect(() => {
    const handleTaskUpdate = () => {
      // Force update elapsed times on task update
      calculateElapsedTime();
      calculateTotalElapsedTime();
    };

    window.addEventListener('taskUpdated', handleTaskUpdate);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
    };
  }, []);

  const handleStopProgress = () => {
    onStopWork(task.id);
  };

  const isCreator = creatorName === assigneeName ? false : true;

  return (
    <article
      className="task-card"
      style={{
        borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
        borderLeftStyle: 'solid',
        borderLeftWidth: '4px',
      }}
    >
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
          disabled={task.inProgress}
        >
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </select>
      </label>
      {task.inProgress && (
        <>
          <p>В работе: {elapsedTime}</p>
          <button onClick={handleStopProgress}>Остановить выполнение</button>
          <button onClick={() => onResumeWork(task.id)}>Продолжить выполнение</button>
          <button onClick={() => onCompleteWork(task.id)}>Выполнено</button>
        </>
      )}
      {task.status === 'in_progress' && (
        <button onClick={() => onCompleteWork(task.id)}>Выполнено</button>
      )}
      {task.status === 'done' && (
        <p>Общее время работы: {totalElapsedTime}</p>
      )}
      {isCreator && task.status !== 'done' && (
        <button onClick={() => onStatusChange(task.id, statuses.find(s => s.name.toLowerCase() === 'done')?.id)}>Выполнить</button>
      )}
      <button onClick={() => onDelete(task.id)}>Удалить задачу</button>
      <button onClick={() => onDetails(task)}>Подробнее</button>
    </article>
  );
}

export default Task;
