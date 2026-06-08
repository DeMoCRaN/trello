import React, { useEffect, useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import './DeadlineProgressBar.css';

function DeadlineProgressBar({ taskId, deadline, status, createdAt }) {
  const [timeLeft, setTimeLeft] = useState('');
  const updateIntervalRef = useRef(null);
  const updateProgressOnServerRef = useRef(null);

  const parseDate = (dateInput) => {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;
    const date = new Date(dateInput);
    return isNaN(date.getTime()) ? null : date;
  };

  // Функция для расчета прогресса на основе времени
  const calculateProgressFromTime = useCallback(() => {
    if (status === 'done') return 100;
    if (status === 'failed') return 0;
    
    const start = parseDate(createdAt);
    const end = parseDate(deadline);
    
    if (!start || !end) return 0;
    
    const now = new Date();
    if (now <= start) return 0;
    if (now >= end) return 100;
    
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }, [createdAt, deadline, status]);

  // Функция для отправки прогресса на сервер
  const updateProgressOnServer = useCallback(async (newProgress) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const roundedProgress = Math.round(newProgress);
      
      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ progressPercentage: roundedProgress }),
      });

      if (!response.ok) {
        console.error(`Failed to update progress for task ${taskId}`);
      }
    } catch (err) {
      console.error(`Error updating progress:`, err);
    }
  }, [taskId]);

  // Сохраняем функцию в ref, чтобы интервал всегда использовал актуальную
  updateProgressOnServerRef.current = updateProgressOnServer;

  // Расчет времени до дедлайна
  useEffect(() => {
    if (status === 'done') {
      setTimeLeft('Задача завершена');
      return;
    }

    if (status === 'failed') {
      setTimeLeft('Задача провалена');
      return;
    }

    const calculateTimeLeft = () => {
      const end = parseDate(deadline);
      if (!end) {
        setTimeLeft('Нет дедлайна');
        return;
      }

      const now = new Date();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Дедлайн просрочен');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}д ${hours % 24}ч`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}ч ${minutes}м`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}м ${seconds}с`);
      } else {
        setTimeLeft(`${seconds}с`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [taskId, deadline, status]);

  // Периодическое обновление прогресса на сервере (раз в минуту)
  useEffect(() => {
    if (status === 'done' || status === 'failed') return;
    
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }
    
    // Отправляем начальный прогресс
    const initialProgress = calculateProgressFromTime();
    if (initialProgress > 0) {
      updateProgressOnServerRef.current(initialProgress);
    }
    
    // Запускаем интервал
    updateIntervalRef.current = setInterval(() => {
      const newProgress = calculateProgressFromTime();
      updateProgressOnServerRef.current(newProgress);
    }, 60000); // каждую минуту
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [status, calculateProgressFromTime]);

  const getUrgencyClass = () => {
    const end = parseDate(deadline);
    if (!end || status === 'done' || status === 'failed') return 'normal';
    
    const hoursLeft = (end - new Date()) / (1000 * 60 * 60);
    if (hoursLeft < 1) return 'critical';
    if (hoursLeft < 24) return 'warning';
    return 'normal';
  };

  const progress = calculateProgressFromTime();

  return (
    <div className="deadline-progress-container">
      <div className="progress-bar-background">
        <div 
          className={`progress-bar-fill ${getUrgencyClass()}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <div className="time-info">
        <span>Прогресс: {Math.round(progress)}%</span>
        <span>{timeLeft}</span>
      </div>
    </div>
  );
}

DeadlineProgressBar.propTypes = {
  taskId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  deadline: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date)
  ]),
  status: PropTypes.string.isRequired,
  initialProgress: PropTypes.number,
  createdAt: PropTypes.string,
};

export default DeadlineProgressBar;