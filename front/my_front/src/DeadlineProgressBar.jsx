import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './DeadlineProgressBar.css';

function DeadlineProgressBar({ taskId, created_at, deadline, status }) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');
  const [error, setError] = useState(null);

  const parseDate = (dateInput) => {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;
    
    // Пробуем разные форматы дат
    const formats = [
      dateInput, // исходный формат
      dateInput.replace(' ', 'T'), // для формата с пробелом
      dateInput.includes('T') ? dateInput : `${dateInput}T00:00:00` // добавляем время если его нет
    ];
    
    for (const format of formats) {
      const date = new Date(format);
      if (!isNaN(date.getTime())) return date;
    }
    
    return null;
  };

  useEffect(() => {
    if (status === 'done') {
      setProgress(100);
      setTimeLeft('Задача завершена');
      return;
    }

    const calculateProgress = () => {
      try {
        setError(null);
        const now = new Date();
        const end = parseDate(deadline);
        
        if (!end) {
          setError('Дедлайн не указан');
          return;
        }

        // Используем createdAt или текущую дату минус 1 день (как минимальное значение)
        const start = parseDate(created_at);
        
        // Проверка что дедлайн в будущем относительно даты создания
        if (end <= start) {
          setError('Дедлайн должен быть после даты создания');
          return;
        }

        // Если текущее время раньше даты создания
        if (now < start) {
          setProgress(0);
          const totalDuration = end - start;
          setTimeLeft(formatDuration(totalDuration));
          return;
        }

        // Если дедлайн уже прошёл
        if (now >= end) {
          setProgress(100);
          setTimeLeft('Время истекло');
          return;
        }

        // Рассчитываем прогресс
        const totalDuration = end - start;
        const timePassed = now - start;
        const currentProgress = Math.min(100, (timePassed / totalDuration) * 100);
        
        setProgress(currentProgress);
        setTimeLeft(formatDuration(end - now));
      } catch (err) {
        console.error('Ошибка в DeadlineProgressBar:', err);
        setError('Ошибка расчета времени');
      }
    };

    const formatDuration = (ms) => {
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);

      if (days > 0) {
        return `${days}д ${hours}ч`;
      } else if (hours > 0) {
        return `${hours}ч ${minutes}м`;
      }
      return `${minutes}м ${seconds}с`;
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 1000);
    return () => clearInterval(interval);
  }, [taskId, created_at, deadline, status]);

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
  taskId: PropTypes.number.isRequired,
  createdAt: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date)
  ]),
  deadline: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date)
  ]),
  status: PropTypes.string.isRequired,
};

DeadlineProgressBar.defaultProps = {
  createdAt: null,
  deadline: null,
};

export default DeadlineProgressBar;