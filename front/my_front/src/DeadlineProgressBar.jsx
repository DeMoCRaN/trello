import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './DeadlineProgressBar.css';

function DeadlineProgressBar({ taskId, createdAt, deadline, status }) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');
  const [error, setError] = useState(null);

  const parseDate = (dateInput) => {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;

    const formats = [
      dateInput,
      dateInput.replace(' ', 'T') + 'Z',
      dateInput.includes('T') ? dateInput : `${dateInput}T00:00:00Z`,
      dateInput.endsWith('Z') ? dateInput : `${dateInput}Z`
    ];

    for (const format of formats) {
      const date = new Date(format);
      if (!isNaN(date.getTime())) return date;
    }

    return null;
  };

  useEffect(() => {

    const fetchProgress = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/tasks/${taskId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch task progress');
        }
        const task = await response.json();
        setProgress(task.progress_percentage || 0);
      } catch (err) {
        console.error(err);
        setError('Ошибка загрузки прогресса');
      }
    };

    fetchProgress();
  }, [taskId]);

  useEffect(() => {
    if (status === 'done') {
      setProgress(100);
      setTimeLeft('Задача завершена');
      return;
    }

    const calculateProgress = () => {
      try {
        const now = new Date();
        const start = parseDate(createdAt);
        const end = parseDate(deadline);

        if (!start || !end) {
          setError('Некорректные даты');
          return;
        }

        if (end <= start) {
          setError('Дедлайн раньше создания');
          return;
        }

        const totalMs = end - start;
        const elapsedMs = now - start;

        if (now < start) {
          setProgress(0);
          setTimeLeft(`До начала: ${formatTime(start - now)}`);
          return;
        }

        if (now >= end) {
          setProgress(100);
          setTimeLeft('Время истекло');
          return;
        }

        const currentProgress = (elapsedMs / totalMs) * 100;
        setProgress(currentProgress);
        setTimeLeft(`Осталось: ${formatTime(end - now)}`);

        // Update progress in backend
        updateProgress(currentProgress);

      } catch (err) {
        console.error('Progress calculation error:', err);
        setError('Ошибка расчета');
      }
    };

    const formatTime = (ms) => {
      const totalSeconds = Math.floor(ms / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (days > 0) return `${days}д ${hours}ч`;
      if (hours > 0) return `${hours}ч ${minutes}м`;
      if (minutes > 0) return `${minutes}м ${seconds}с`;
      return `${seconds}с`;
    };

    const updateProgress = async (progressValue) => {
      try {
        const response = await fetch(`http://localhost:3000/api/tasks/${taskId}/progress`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ progress_percentage: progressValue }),
        });
        if (!response.ok) {
          throw new Error('Failed to update progress');
        }
      } catch (err) {
        console.error('Error updating progress:', err);
      }
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 1000);
    return () => clearInterval(interval);
  }, [taskId, createdAt, deadline, status]);

  if (error) {
    return <div className="deadline-error">{error}</div>;
  }

  return (
    <div className="deadline-progress-container">
      <div className="progress-bar-background">
        <div 
          className={`progress-bar-fill ${
            progress >= 90 ? 'critical' : 
            progress >= 70 ? 'warning' : 'normal'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="time-info">
        <span>Прогресс: {progress.toFixed(1)}%</span>
        <span>{timeLeft}</span>
      </div>
    </div>
  );
}

DeadlineProgressBar.propTypes = {
  taskId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  createdAt: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date)
  ]).isRequired,
  deadline: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date)
  ]).isRequired,
  status: PropTypes.string.isRequired,
};

export default DeadlineProgressBar;
