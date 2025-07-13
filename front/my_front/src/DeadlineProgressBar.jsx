import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './DeadlineProgressBar.css';

function DeadlineProgressBar({ taskId, createdAt, deadline, status }) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (status === 'done') {
      setProgress(100);
      setTimeLeft('Время истекло');
      return;
    }

    const calculateProgress = () => {
      const now = new Date();
      const start = createdAt ? new Date(createdAt) : new Date(); // Если createdAt отсутствует, используем текущее время
      const end = new Date(deadline);

      if (isNaN(end.getTime())) {
        console.error(`Invalid deadline for task ${taskId}:`, deadline);
        return;
      }

      // Если дедлайн уже прошёл
      if (now >= end) {
        setProgress(100);
        setTimeLeft('Время истекло');
        return;
      }

      // Рассчитываем общее время и прошедшее время
      const totalDuration = end - start;
      const timePassed = now - start;

      // Вычисляем процент выполнения (0-100)
      const currentProgress = (timePassed / totalDuration) * 100;
      setProgress(Math.min(100, Math.max(0, currentProgress)));

      // Форматируем оставшееся время
      const remainingMs = end - now;
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 1000);
    return () => clearInterval(interval);
  }, [taskId, createdAt, deadline, status]);

  return (
    <div className="deadline-progress-container">
      <div className="progress-bar-background">
        <div 
          className={`progress-bar-fill ${
            progress >= 80 ? 'critical' : 
            progress >= 50 ? 'warning' : 'normal'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="time-info">
        {progress >= 100 ? (
          <span>Время истекло</span>
        ) : (
          <span>{progress.toFixed(1)}% • Осталось: {timeLeft}</span>
        )}
      </div>
    </div>
  );
}

DeadlineProgressBar.propTypes = {
  taskId: PropTypes.number.isRequired,
  createdAt: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date)
  ]),
  deadline: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date)
  ]).isRequired,
};

DeadlineProgressBar.defaultProps = {
  createdAt: null,
};

export default DeadlineProgressBar;