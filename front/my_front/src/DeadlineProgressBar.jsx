import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import './DeadlineProgressBar.css';

function DeadlineProgressBar({ taskId, deadline, status, initialProgress }) {
  const [progress, setProgress] = useState(initialProgress || 0);
  const [timeLeft, setTimeLeft] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const parseDate = (dateInput) => {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;
    const date = new Date(dateInput);
    return isNaN(date.getTime()) ? null : date;
  };

  // Загружаем прогресс только один раз при монтировании
  useEffect(() => {
    isMountedRef.current = true;

    if (status === 'done') {
      setProgress(100);
      setIsLoading(false);
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchProgress = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          if (isMountedRef.current) {
            setError('Пользователь не авторизован');
            setIsLoading(false);
          }
          return;
        }

        // Таймаут 5 секунд
        const timeoutId = setTimeout(() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
        }, 5000);

        const response = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          signal: abortControllerRef.current.signal,
        });

        clearTimeout(timeoutId);

        if (!isMountedRef.current) return;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const task = await response.json();
        
        if (isMountedRef.current) {
          setProgress(task.progress_percentage || 0);
          setError(null);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        
        console.error(`Failed to fetch progress for task ${taskId}:`, err);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchProgress();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [taskId, status]);

  useEffect(() => {
    if (status === 'done') {
      setTimeLeft('Задача завершена');
      return;
    }

    const calculateTimeLeft = () => {
      const end = parseDate(deadline);
      if (!end) return;

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

  const getUrgencyClass = () => {
    const end = parseDate(deadline);
    if (!end || status === 'done') return 'normal';
    
    const hoursLeft = (end - new Date()) / (1000 * 60 * 60);
    if (hoursLeft < 1) return 'critical';
    if (hoursLeft < 24) return 'warning';
    return 'normal';
  };

  if (error && !isLoading) {
    return null;
  }

  return (
    <div className="deadline-progress-container">
      <div className="progress-bar-background">
        <div 
          className={`progress-bar-fill ${getUrgencyClass()}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <div className="time-info">
        <span>Прогресс: {isLoading ? '...' : `${progress.toFixed(1)}%`}</span>
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
};

export default DeadlineProgressBar;