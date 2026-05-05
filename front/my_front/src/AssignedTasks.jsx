import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import Header from './components/Header';
import TaskNotification from './components/TaskNotification';
import TaskDetailsForm from './components/TaskDetailsForm';
import InvitationResponseForm from './components/InvitationResponseForm';
import './AssignedTasks.css';

function AssignedTasks({ userEmail }) {
  const [tasks, setTasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [timers, setTimers] = useState({});
  const [taskViewMode, setTaskViewMode] = useState('execution');
  const [assignmentNames, setAssignmentNames] = useState({});
  const [showNotification, setShowNotification] = useState(true);
  const [unreadCommentsCount, setUnreadCommentsCount] = useState(0);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showInvitationForm, setShowInvitationForm] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);

  const navigate = useNavigate();
  // const statusLabels = {
  //   new: 'Новые',
  //   in_progress: 'В работе',
  //   rew: 'На ревью',
  //   done: 'Завершено',
  // };
  const priorityLabels = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
  };

  const debouncedFetchTasks = useCallback(() => {
    let timeoutId;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchTasks();
      }, 500);
    };
  }, []);

  // Навигация
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

  // Получение задач с сервера
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

  // Получение названий заданий
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
        namesMap[assignment.id] = assignment.title || assignment.name || `Задание ${assignment.id}`;
      });
      setAssignmentNames(namesMap);
    } catch (err) {
      console.error('Ошибка загрузки заданий:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Токен авторизации не найден');
      }
      const response = await fetch('http://localhost:3000/api/notifications/summary', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch notifications: ' + response.status);
      }
      const data = await response.json();
      setComments(Array.isArray(data.comments) ? data.comments : []);
      setInvitations(Array.isArray(data.invitations) ? data.invitations : []);
      setSystemNotifications(Array.isArray(data.systemNotifications) ? data.systemNotifications : []);
      setUnreadCommentsCount(Number(data?.counts?.total) || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  const fetchComments = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const fetchInvitations = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const markSystemNotificationsAsRead = useCallback(async (ids = []) => {
    const notificationIds = ids
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (notificationIds.length === 0) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:3000/api/notifications/system/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ notificationIds }),
      });

      setSystemNotifications((prev) => prev.filter((item) => !notificationIds.includes(Number(item.id))));
      setUnreadCommentsCount((prev) => Math.max(0, prev - notificationIds.length));
    } catch (error) {
      console.error('Ошибка при отметке системных уведомлений как прочитанных:', error);
    }
  }, []);

  useEffect(() => {

    fetchTasks();
    fetchAssignmentNames();
    fetchComments();
    fetchInvitations();

    const tasksInterval = setInterval(fetchTasks, 60000);
    const commentsInterval = setInterval(fetchComments, 30000);

    return () => {
      clearInterval(tasksInterval);
      clearInterval(commentsInterval);
    };
  }, [fetchTasks, fetchAssignmentNames, fetchComments, fetchInvitations]);

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
        // 
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

  // Группировка задач по статусу
  const tasksGroupedByStatus = React.useMemo(() => {
    const groups = {
      new: [],
      in_progress: [],
      rew: [],
      done: [],
    };

    tasks.forEach(task => {
      groups[task.status]?.push(task);
    });

    return groups;
  }, [tasks]);

  const filteredTasks = React.useMemo(() => (
    tasks.filter((task) => (
      taskViewMode === 'execution'
        ? ['new', 'in_progress'].includes(task.status)
        : ['rew', 'done'].includes(task.status)
    ))
  ), [tasks, taskViewMode]);

  // Группировка задач по заданиям
  const tasksGroupedByAssignment = React.useMemo(() => {
    const groups = {};
    
    groups['none'] = {
      name: taskViewMode === 'execution' ? 'Все задачи для выполнения' : 'Задачи на ревью и завершённые',
      tasks: []
    };

    filteredTasks.forEach(task => {
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
  }, [filteredTasks, assignmentNames, taskViewMode]);

  const taskSummary = React.useMemo(() => ({
    total: filteredTasks.length,
    new: tasksGroupedByStatus.new.length,
    inProgress: tasksGroupedByStatus.in_progress.length,
    review: tasksGroupedByStatus.rew.length,
    done: tasksGroupedByStatus.done.length,
  }), [filteredTasks.length, tasksGroupedByStatus]);

  const visibleStatusColumns = React.useMemo(() => (
    taskViewMode === 'execution'
      ? ['new', 'in_progress']
      : ['rew', 'done']
  ), [taskViewMode]);

  // Получение деталей задачи
  const fetchTaskDetails = useCallback(async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Пользователь не авторизован');
        return null;
      }
      
      console.log('Fetching task details for taskId:', taskId);
      
      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Ошибка загрузки деталей задачи: ' + errorText);
      }
      
      const taskData = await response.json();
      console.log('Task details fetched:', taskData);
      return taskData;
    } catch (err) {
      console.error('Error fetching task details:', err);
      setError(err.message);
      return null;
    }
  }, []);

  // Обновление статуса задачи
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
        body: JSON.stringify(
          statusId
            ? { status_id: statusId, action }
            : { status_name: action, action }
        ),
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

  // Форматирование времени
  const formatTime = useCallback((seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Обработчик клика по уведомлению
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

  // Обработчик клика по комментарию
  const handleCommentClick = useCallback(async (comment) => {
    try {
      const token = localStorage.getItem('token');

      await fetch('http://localhost:3000/api/comments/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ commentIds: [comment.id] }),
      });

      setComments(prev => prev.filter(c => c.id !== comment.id));
      setUnreadCommentsCount(prev => prev - 1);

      const taskResponse = await fetch(`http://localhost:3000/api/tasks/${comment.task_id}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });

      if (!taskResponse.ok) {
        throw new Error('Failed to fetch task details');
      }

      const taskData = await taskResponse.json();
      setSelectedTask(taskData);
      setShowTaskModal(true);

      if (comment.id) {
        setHighlightedCommentId(comment.id);
      }
    } catch (error) {
      console.error('Error handling comment click:', error);
    }
  }, []);

  // Обработчик клика по приглашению
  const handleInvitationClick = useCallback((invitation) => {
    setSelectedInvitation(invitation);
    setShowInvitationForm(true);
  }, []);

  // Обработчик ответа на приглашение
  const handleRespondToInvitation = useCallback(async (invitationId, status) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Токен авторизации не найден');
      }

      // Получаем assignmentId из selectedInvitation
      const assignmentId = selectedInvitation?.assignment_id;
      if (!assignmentId) {
        console.error('selectedInvitation:', selectedInvitation);
        throw new Error('Не удалось получить ID задания для приглашения. Проверьте, что приглашение выбрано правильно.');
      }

      console.log('Отправка ответа на приглашение:', {
        invitationId,
        assignmentId,
        status,
        selectedInvitation
      });

      const response = await fetch(`http://localhost:3000/api/assignments/${assignmentId}/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ошибка сервера при ответе на приглашение:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const result = await response.json();
      console.log('Успешный ответ на приглашение:', result);

      // Обновляем список приглашений
      await fetchInvitations();
      setShowInvitationForm(false);
      setSelectedInvitation(null);
    } catch (error) {
      console.error('Ошибка при ответе на приглашение:', error);
      setError(`Ошибка при ответе на приглашение: ${error.message}`);
      throw error;
    }
  }, [selectedInvitation, fetchInvitations]);

  // Форматирование дедлайна
  const formatDeadline = useCallback((deadline) => {
    const date = new Date(deadline);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  }, []);

  // Рендер карточки задачи
// Рендер карточки задачи
const renderTaskCard = useCallback((task) => {
  const timer = timers[task.id] || { elapsedSeconds: 0, isRunning: false };
  
  // Новая логика определения состояний
  const isNew = task.status === 'new';
  const isInProgress = task.status === 'in_progress';
  const isReview = task.status === 'rew';
  const isDone = task.status === 'done';
  const isRunning = timer.isRunning;  // true только когда in_progress_since не null
  const isPaused = isInProgress && !timer.isRunning;
  
  return (
    <div
      id={`task-${task.id}`}
      key={task.id}
      className="task-card"
      style={{
        borderLeft: '4px solid ' + (
          task.priority?.toLowerCase() === 'low' ? '#4caf50' :
          task.priority?.toLowerCase() === 'medium' ? '#ff9800' :
          task.priority?.toLowerCase() === 'high' ? '#f44336' :
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
        <p><strong>Проект:</strong> {assignmentNames[task.assignment_id] || `Задание ${task.assignment_id}`}</p>
      )}
      <p><strong>Срок:</strong> {task.deadline ? formatDeadline(task.deadline) : 'Нет'}</p>
      <p><strong>Автор:</strong> {task.creator_email}</p>
      <p><strong>Статус:</strong> {
        isNew ? 'Новая' :
        isInProgress ? (isRunning ? 'В работе' : 'На паузе') :
        isReview ? 'На ревью' :
        isDone ? 'Завершена' : task.status
      }</p>
      <p><strong>Приоритет:</strong> {priorityLabels[task.priority] || task.priority}</p>
      <p><strong>Создана:</strong> {new Date(task.created_at).toLocaleString()}</p>
      <p><strong>Обновлена:</strong> {new Date(task.updated_at).toLocaleString()}</p>
      <p><strong>Время работы:</strong> {formatTime(timer.elapsedSeconds)}</p>
      
      <div className="task-buttons-wrapper" style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '8px', 
        marginTop: '12px',
        alignItems: 'center'
      }}>
        {/* Новая задача - только кнопка "Начать работу" */}
        {isNew && (
          <button
            onClick={() => updateTaskStatus(task.id, 2, 'start')}
            disabled={updatingTaskId === task.id}
            className="task-button start-button"
            style={{ order: 1 }}
          >
            {updatingTaskId === task.id ? 'Запуск...' : 'Начать работу'}
          </button>
        )}
        
        {/* Задача в работе и таймер идет - показываем Остановить и На ревью */}
        {isRunning && (
          <>
            <button
              onClick={() => updateTaskStatus(task.id, 2, 'stop')}
              disabled={updatingTaskId === task.id}
              className="task-button stop-button"
              style={{ order: 2 }}
            >
              {updatingTaskId === task.id ? 'Остановка...' : 'Остановить'}
            </button>
            <button
              onClick={() => updateTaskStatus(task.id, 5, 'rew')}
              disabled={updatingTaskId === task.id}
              className="task-button complete-button"
              style={{ order: 4 }}
            >
              {updatingTaskId === task.id ? 'Отправка...' : 'На ревью'}
            </button>
          </>
        )}
        
        {/* Задача на паузе - показываем только Продолжить */}
        {isPaused && (
          <button
            onClick={() => updateTaskStatus(task.id, 2, 'resume')}
            disabled={updatingTaskId === task.id}
            className="task-button resume-button"
            style={{ order: 3 }}
          >
            {updatingTaskId === task.id ? 'Возобновление...' : 'Продолжить'}
          </button>
        )}
        
        {/* Кнопка Подробнее - всегда доступна */}
        <button
          onClick={async () => {
            console.log('Подробнее clicked for task:', task.id);
            const taskDetails = await fetchTaskDetails(task.id);
            if (taskDetails) {
              setSelectedTask(taskDetails);
              setShowTaskModal(true);
            }
          }}
          className="task-button details-button"
          style={{ 
            order: 5,
            marginLeft: 'auto',
            backgroundColor: '#1976d2',
            color: 'white'
          }}
        >
          Подробнее
        </button>
      </div>
      
      {isDone && (
        <p className="task-completed" style={{ marginTop: '8px', color: '#4caf50' }}>
          Задача завершена. Общее время работы: {formatTime(timer.elapsedSeconds)}
        </p>
      )}
    </div>
  );
}, [assignmentNames, formatTime, timers, updateTaskStatus, updatingTaskId, formatDeadline, fetchTaskDetails]);


  // Состояния загрузки
  if (loading) {
    return (
      <div className="page-container">
        <Header userEmail={userEmail} onNavigate={onNavigate} unreadCommentsCount={unreadCommentsCount} />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка задач...</p>
        </div>
      </div>
    );
  }

  // Ошибка
  if (error) {
    return (
      <div className="page-container">
        <Header userEmail={userEmail} onNavigate={onNavigate} unreadCommentsCount={unreadCommentsCount} />
        <div className="error-container">
          <p>Ошибка: {error}</p>
          <button onClick={fetchTasks} className="retry-button">
            Повторить
          </button>
        </div>
      </div>
    );
  }

  // Нет задач
  if (!tasks || tasks.length === 0) {
    return (
      <div className="page-container">
        <Header userEmail={userEmail} onNavigate={onNavigate} unreadCommentsCount={unreadCommentsCount} />
        <div className="no-tasks-container">
          <p>Нет назначенных задач.</p>
        </div>
      </div>
    );
  }

  // Основной рендер
  return (
    <div className="page-container">
      <Header 
        userEmail={userEmail} 
        onNavigate={onNavigate} 
        unreadCommentsCount={unreadCommentsCount}
        onCommentsClick={() => setShowNotification(true)}
      />
      
      {showNotification && (
        <TaskNotification
          tasks={tasks}
          comments={comments}
          invitations={invitations}
          systemNotifications={systemNotifications}
          onClose={() => {
            markSystemNotificationsAsRead(systemNotifications.map((item) => item.id));
            setShowNotification(false);
          }}
          onTaskClick={handleNotificationClick}
          onCommentClick={handleCommentClick}
          onInvitationClick={handleInvitationClick}
          onSystemNotificationClick={(item) => {
            markSystemNotificationsAsRead([item.id]);
          }}
        />
      )}
      
      <div className="content-container" style={{ maxHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}>
        <div className="controls-container">
          <div className="view-toggle-group">
            <button
              onClick={() => setTaskViewMode('execution')}
              className={`toggle-sort-button ${taskViewMode === 'execution' ? 'active-toggle' : ''}`}
            >
              К выполнению
            </button>
            <button
              onClick={() => setTaskViewMode('review')}
              className={`toggle-sort-button ${taskViewMode === 'review' ? 'active-toggle' : ''}`}
            >
              Ревью и завершённые
            </button>
          </div>
        </div>

        <div className="tasks-summary">
          <div className="summary-pill summary-total">Всего: {taskSummary.total}</div>
          {taskViewMode === 'execution' ? (
            <>
              <div className="summary-pill summary-new">Новые: {taskSummary.new}</div>
              <div className="summary-pill summary-progress">В работе: {taskSummary.inProgress}</div>
            </>
          ) : (
            <>
              <div className="summary-pill summary-review">На ревью: {taskSummary.review}</div>
              <div className="summary-pill summary-done">Завершённые: {taskSummary.done}</div>
            </>
          )}
        </div>

        <div className="assignments-container">
          {Object.entries(tasksGroupedByAssignment).map(([assignmentId, group]) => {
            const groupedTasksByStatus = visibleStatusColumns.reduce((acc, status) => {
              acc[status] = group.tasks.filter((task) => task.status === status);
              return acc;
            }, {});

            return (
              <div key={assignmentId} className="assignment-group">
                <h3 className="assignment-header">
                  {group.name}
                </h3>
                <div className="status-columns-container assignment-status-columns">
                  {visibleStatusColumns.map((status) => (
                    <div key={`${assignmentId}-${status}`} className="status-column">
                      <h3 className="status-header">
                        {status === 'new' ? 'Новые' :
                         status === 'in_progress' ? 'В работе' :
                         status === 'rew' ? 'На ревью' :
                         'Завершённые'}
                      </h3>
                      {groupedTasksByStatus[status].length === 0 ? (
                        <p className="no-tasks-message">Нет задач в этой категории</p>
                      ) : (
                        groupedTasksByStatus[status].map(renderTaskCard)
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showTaskModal && (
        <TaskDetailsForm
          task={selectedTask}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
            setHighlightedCommentId(null);
          }}
          token={localStorage.getItem('token')}
        />
      )}

      {/* Форма ответа на приглашение */}
      {showInvitationForm && selectedInvitation && (
        <InvitationResponseForm
          invitation={selectedInvitation}
          onClose={() => {
            setShowInvitationForm(false);
            setSelectedInvitation(null);
          }}
          onRespond={handleRespondToInvitation}
        />
      )}
    </div>
  );
}

export default AssignedTasks;




