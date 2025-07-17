import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './components/Header';
import TaskNotification from './components/TaskNotification';
import './AssignedTasks.css';

function AssignedTasks({ userEmail }) {
  const [tasks, setTasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [timers, setTimers] = useState({});
  const [sortByAssignment, setSortByAssignment] = useState(false);
  const [assignmentNames, setAssignmentNames] = useState({});
  const [showNotification, setShowNotification] = useState(true);
  const navigate = useNavigate();

  const debouncedFetchTasks = useCallback(() => {
    let timeoutId;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchTasks();
      }, 500);
    };
  }, []);

  function onNavigate(page) {
    switch (page) {
      case 'main':
        navigate('/main');
        break;
      case 'tasks':
        navigate('/tasks');
        break;
      default:
        break;
    }
  }

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Пользователь не авторизован');
        setLoading(false);
        return;
      }
      const response = await fetch('http://localhost:3000/api/tasks/assigned', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Ошибка загрузки задач: ' + errorText);
      }
      const data = await response.json();

      const newTimers = {};
      data.forEach(task => {
        let elapsedSeconds = Number(task.work_duration) || 0;
        if (task.in_progress_since) {
          const inProgressSince = new Date(task.in_progress_since);
          const now = new Date();
          elapsedSeconds += Math.floor((now - inProgressSince) / 1000);
        }
        newTimers[task.id] = {
          elapsedSeconds,
          isRunning: !!task.in_progress_since,
          lastSyncTimestamp: Date.now(),
        };
      });

      data.forEach(task => {
        if (task.status === 'done' && !newTimers[task.id]) {
          newTimers[task.id] = {
            elapsedSeconds: Number(task.work_duration) || 0,
            isRunning: false,
            lastSyncTimestamp: Date.now(),
          };
        }
      });

      setTimers(newTimers);
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssignmentNames = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/assignments', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
      });
      if (!response.ok) throw new Error('Ошибка загрузки заданий');
      const assignments = await response.json();
      
      const namesMap = {};
      assignments.forEach(assignment => {
        namesMap[assignment.id] = assignment.name || `Задание ${assignment.id}`;
      });
      setAssignmentNames(namesMap);
    } catch (err) {
      console.error('Ошибка загрузки заданий:', err);
    }
  }, []);

const fetchComments = useCallback(async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No auth token found');
    }
    const response = await fetch('http://localhost:3000/api/comments/unread', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch comments: ' + response.status);
    }
    const data = await response.json();
    console.log('Fetched comments:', data);
    // Фильтруем комментарии, которые не принадлежат текущему пользователю
    const filteredComments = data.filter(comment => 
      comment.author_email !== userEmail
    ).map(comment => ({
      ...comment,
      is_new: true
    }));
    console.log('Filtered comments:', filteredComments);
    setComments(filteredComments);
  } catch (error) {
    console.error('Ошибка загрузки комментариев:', error);
  }
}, [userEmail]); 

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    fetchTasks();
    fetchAssignmentNames();
    fetchComments();
  }, [fetchTasks, fetchAssignmentNames, fetchComments]);

  useEffect(() => {
    const debouncedHandler = debouncedFetchTasks();
    const handleTaskUpdate = () => {
      debouncedHandler();
    };

    window.addEventListener('taskUpdated', handleTaskUpdate);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
    };
  }, [debouncedFetchTasks]);

  useEffect(() => {
    if (tasks.length > 0) {
      const newTasks = tasks.filter(task => task.status === 'new');
      if (newTasks.length > 0) {
        const audio = new Audio();
        audio.volume = 0.3;
        try {
          audio.src = '/notification.mp3';
          audio.play().catch(e => {
            console.log('Не удалось воспроизвести звук:', e);
            const beep = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...');
            beep.volume = 0.3;
            beep.play();
          });
        } catch (e) {
          console.log('Ошибка воспроизведения звука:', e);
        }
      }
    }
  }, [tasks]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimers(prevTimers => {
        const newTimers = { ...prevTimers };
        const now = Date.now();
        Object.entries(newTimers).forEach(([taskId, timer]) => {
          if (timer.isRunning) {
            const elapsedSinceLastSync = Math.floor((now - (timer.lastSyncTimestamp || now)) / 1000);
            if (elapsedSinceLastSync > 0) {
              newTimers[taskId].elapsedSeconds += elapsedSinceLastSync;
              newTimers[taskId].lastSyncTimestamp = now;
            }
          }
        });
        return newTimers;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const tasksGroupedByStatus = React.useMemo(() => {
    const groups = {
      new: [],
      in_progress: [],
      done: [],
    };

    tasks.forEach(task => {
      groups[task.status]?.push(task);
    });

    return groups;
  }, [tasks]);

  const tasksGroupedByAssignment = React.useMemo(() => {
    const groups = {};
    
    groups['none'] = {
      name: 'Без задания',
      tasks: []
    };

    tasks.forEach(task => {
      const assignmentId = task.assignment_id !== undefined && task.assignment_id !== null 
        ? task.assignment_id 
        : 'none';
      
      if (!groups[assignmentId]) {
        groups[assignmentId] = {
          name: assignmentNames[assignmentId] || `Задание ${assignmentId}`,
          tasks: []
        };
      }
      groups[assignmentId].tasks.push(task);
    });
    
    return groups;
  }, [tasks, assignmentNames]);

  const updateTaskStatus = useCallback(async (taskId, statusId, action) => {
    setUpdatingTaskId(taskId);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Пользователь не авторизован');
        setUpdatingTaskId(null);
        return;
      }
      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ status_id: statusId, action }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Ошибка обновления статуса: ' + errorText);
      }
      await fetchTasks();
      window.dispatchEvent(new Event('taskUpdated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingTaskId(null);
    }
  }, [fetchTasks]);

  const formatTime = useCallback((seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const goBack = useCallback(() => {
    navigate('/main');
  }, [navigate]);

  const handleNotificationClick = useCallback((taskId) => {
    const element = document.getElementById(`task-${taskId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.style.boxShadow = '0 0 0 3px rgba(67, 97, 238, 0.5)';
      setTimeout(() => {
        element.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }, 2000);
    }
  }, []);

const handleCommentClick = useCallback(async (comment) => {
  try {
    const token = localStorage.getItem('token');
    // Отмечаем комментарий как прочитанный
    await fetch('http://localhost:3000/api/comments/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({ commentIds: [comment.id] }),
    });
    
    // Навигация к задаче
    navigate(`/tasks/${comment.task_id}?highlightComment=${comment.id}`);
    
    // Обновляем список комментариев
    fetchComments();
  } catch (error) {
    console.error('Ошибка при отметке комментария как прочитанного:', error);
  }
}, [navigate, fetchComments]);

  const formatDeadline = useCallback((deadline) => {
    const date = new Date(deadline);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  }, []);

  const renderTaskCard = useCallback((task) => {
    const timer = timers[task.id] || { elapsedSeconds: 0, isRunning: false };
    const isInProgress = task.status === 'in_progress' || timer.isRunning;
    
    return (
      <div
        id={`task-${task.id}`}
        key={task.id}
        className="task-card"
        style={{
          borderLeft: '4px solid ' + (
            task.priority.toLowerCase() === 'low' ? '#4caf50' :
            task.priority.toLowerCase() === 'medium' ? '#ff9800' :
            task.priority.toLowerCase() === 'high' ? '#f44336' :
            '#9e9e9e'
          ),
          marginBottom: '16px',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          backgroundColor: '#fff',
          transition: 'box-shadow 0.3s ease',
        }}
      >
        <h4 style={{ marginTop: 0 }}>{task.title}</h4>
        <p>{task.description}</p>
        {task.assignment_id && (
          <p><strong>Задание:</strong> {assignmentNames[task.assignment_id] || `Задание ${task.assignment_id}`}</p>
        )}
        <p><strong>Срок:</strong> {task.deadline ? formatDeadline(task.deadline) : 'Нет'}</p>
        <p><strong>Автор:</strong> {task.creator_email}</p>
        <p><strong>Статус:</strong> {task.status === 'new' ? 'Новая' : 
                                  task.status === 'in_progress' ? 'В работе' : 
                                  'Завершена'}</p>
        <p><strong>Приоритет:</strong> {task.priority === 'low' ? 'Низкий' : 
                                      task.priority === 'medium' ? 'Средний' : 
                                      task.priority === 'high' ? 'Высокий' : 
                                      task.priority}</p>
        <p><strong>Создана:</strong> {new Date(task.created_at).toLocaleString()}</p>
        <p><strong>Обновлена:</strong> {new Date(task.updated_at).toLocaleString()}</p>
        <p><strong>Время работы:</strong> {formatTime(timer.elapsedSeconds)}</p>
        
        {task.status === 'new' && (
          <button
            onClick={() => updateTaskStatus(task.id, 2, 'start')}
            disabled={updatingTaskId === task.id}
            className="task-button start-button"
          >
            {updatingTaskId === task.id ? 'Запуск...' : 'Начать работу'}
          </button>
        )}
        
        {isInProgress && (
          <div className="task-buttons-container">
            <button
              onClick={() => updateTaskStatus(task.id, 2, 'stop')}
              disabled={updatingTaskId === task.id}
              className="task-button stop-button"
            >
              {updatingTaskId === task.id ? 'Остановка...' : 'Остановить'}
            </button>
            <button
              onClick={() => updateTaskStatus(task.id, 2, 'resume')}
              disabled={updatingTaskId === task.id}
              className="task-button resume-button"
            >
              {updatingTaskId === task.id ? 'Возобновление...' : 'Продолжить'}
            </button>
            <button
              onClick={() => updateTaskStatus(task.id, 3, 'done')}
              disabled={updatingTaskId === task.id}
              className="task-button complete-button"
            >
              {updatingTaskId === task.id ? 'Завершение...' : 'Завершить'}
            </button>
          </div>
        )}
        
        {task.status === 'done' && (
          <p className="task-completed">
            Задача завершена. Общее время работы: {formatTime(timer.elapsedSeconds)}
          </p>
        )}
      </div>
    );
  }, [assignmentNames, formatTime, timers, updateTaskStatus, updatingTaskId]);

  if (loading) {
    return (
      <div className="page-container">
        <Header userEmail={userEmail} onNavigate={onNavigate} />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка задач...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <Header userEmail={userEmail} onNavigate={onNavigate} />
        <div className="error-container">
          <p>Ошибка: {error}</p>
          <button onClick={fetchTasks} className="retry-button">
            Повторить
          </button>
        </div>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="page-container">
        <Header userEmail={userEmail} onNavigate={onNavigate} />
        <div className="no-tasks-container">
          <button onClick={goBack} className="back-button">
            На главную
          </button>
          <p>Нет назначенных задач.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header userEmail={userEmail} onNavigate={onNavigate} />
      {showNotification && (
        <TaskNotification 
          tasks={tasks} 
          comments={comments}
          onClose={() => setShowNotification(false)}
          onTaskClick={handleNotificationClick}
          onCommentClick={handleCommentClick}
        />
      )}
      
      <div className="content-container" style={{ maxHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}>
        <div className="controls-container">
          <button
            onClick={() => setSortByAssignment(!sortByAssignment)}
            className="toggle-sort-button"
          >
            {sortByAssignment ? 'Сортировка по статусу' : 'Сортировка по заданиям'}
          </button>
          
          <button onClick={goBack} className="back-button">
            На главную
          </button>
        </div>

        {!sortByAssignment ? (
          <div className="status-columns-container">
            {Object.entries(tasksGroupedByStatus).map(([status, tasksList]) => (
              <div key={status} className="status-column">
                <h3 className="status-header">
                  {status === 'new' ? 'Новые' : 
                   status === 'in_progress' ? 'В работе' : 
                   'Завершённые'}
                </h3>
                {tasksList.length === 0 ? (
                  <p className="no-tasks-message">Нет задач в этой категории</p>
                ) : (
                  tasksList.map(renderTaskCard)
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="assignments-container">
            {Object.entries(tasksGroupedByAssignment).map(([assignmentId, group]) => (
              <div key={assignmentId} className="assignment-group">
                <h3 className="assignment-header">
                  {group.name}
                </h3>
                {group.tasks.length === 0 ? (
                  <p className="no-tasks-message">Нет задач в этом задании</p>
                ) : (
                  <div className="assignment-tasks-grid">
                    {group.tasks.map(renderTaskCard)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AssignedTasks;