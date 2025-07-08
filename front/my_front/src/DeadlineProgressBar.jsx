import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './DeadlineProgressBar.css';

function DeadlineProgressBar({ createdAt, deadline }) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateProgress = () => {
      // Парсим даты как есть (без учета временной зоны)
      const start = new Date(createdAt);
      const end = new Date(deadline);
      const now = new Date();

      // Проверка валидности дат
      if (isNaN(start.getTime())) {
        console.error('Invalid createdAt date:', createdAt);
        return;
      }
      if (isNaN(end.getTime())) {
        console.error('Invalid deadline date:', deadline);
        return;
      }

      // Вычисляем общее время и прошедшее время
      const totalDuration = end - start;
      const timePassed = now - start;

      // Вычисляем процент выполнения (0-100)
      let currentProgress = (timePassed / totalDuration) * 100;
      currentProgress = Math.max(0, Math.min(100, currentProgress));

      // Форматируем оставшееся время
      const remainingMs = Math.max(end - now, 0);
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

      setProgress(currentProgress);
      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 1000);
    return () => clearInterval(interval);
  }, [createdAt, deadline]);

  return (
    <div className="deadline-progress-container">
      <div className="progress-bar-background">
        <div 
          className={`progress-bar-fill ${
            progress >= 80 ? 'red' : progress >= 50 ? 'yellow' : 'green'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="time-info">
        {progress >= 100 ? (
          <span>Время истекло</span>
        ) : (
          <span>{progress.toFixed(1)}% - Осталось: {timeLeft}</span>
        )}
      </div>
    </div>
  );
}

DeadlineProgressBar.propTypes = {
  createdAt: PropTypes.string.isRequired,
  deadline: PropTypes.string.isRequired,
};

export default DeadlineProgressBar;