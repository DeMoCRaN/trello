import React, { useEffect, useState, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiX } from 'react-icons/fi';
import './MainPageNewStyles.css';
import Header from './components/Header';
import AssignmentsList from './components/AssignmentsList';
import SelectedAssignmentDetails from './components/SelectedAssignmentDetails';
import TaskCreationForm from './components/TaskCreationForm';
import TaskDetailsForm from './components/TaskDetailsForm';
import FloatingButton from './components/FloatingButton';
import UserProfileForm from './components/UserProfileForm';
import TaskNotification from './components/TaskNotification';

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function MainPage({ userEmail }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [userId, setUserId] = useState(null);
  const [currentPage, setCurrentPage] = useState('main');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [loadingAssignedTasks, setLoadingAssignedTasks] = useState(false);
  const [currentTab, setCurrentTab] = useState('assignments');
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [detailsFormTask, setDetailsFormTask] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [statusChangeLoading, setStatusChangeLoading] = useState({});
  const [comments, setComments] = useState([]);
  const [unreadCommentsCount, setUnreadCommentsCount] = useState(0);
  const [showNotification, setShowNotification] = useState(true);
  const [timers, setTimers] = useState({});

  const fetchAssignments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/assignments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Ошибка при загрузке заданий');
      }
      const data = await response.json();

      const enrichedData = data.map(assignment => {
        if (assignment.tasks) {
          assignment.tasks = assignment.tasks.map(task => ({
            ...task,
            creator_name: task.creator_name || 'Неизвестно',
            assignee_name: task.assignee_name || 'Неизвестно',
            created_at: task.created_at || new Date().toISOString(),
            createdAt: task.created_at || task.createdAt || new Date().toISOString(),
          }));
        }
        return assignment;
      });

      setAssignments(enrichedData);
      if (enrichedData.length > 0 && !selectedAssignment) {
        setSelectedAssignment(enrichedData[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedAssignment]);

  const fetchAssignedTasks = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchTime < 5000) return;
    
    setLoadingAssignedTasks(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/tasks/assigned', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Ошибка при загрузке задач по исполнителю');
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
      
      setTimers(newTimers);
      setAssignedTasks(data);
      setLastFetchTime(now);
      window.dispatchEvent(new Event('taskUpdated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAssignedTasks(false);
    }
  }, [lastFetchTime]);

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
      
      const filteredComments = data.filter(comment => 
        comment.author_email !== userEmail
      ).map(comment => ({
        ...comment,
        is_new: true
      }));

      if (filteredComments.length > 0 && unreadCommentsCount !== filteredComments.length) {
        setUnreadCommentsCount(filteredComments.length);
        
        if (Notification.permission === 'granted') {
          new Notification('Новые комментарии', {
            body: `У вас ${filteredComments.length} новых комментариев`,
            icon: '/favicon.ico'
          });
        }
        
        playNotificationSound();
      }

      setComments(filteredComments);
    } catch (error) {
      console.error('Ошибка загрузки комментариев:', error);
    }
  }, [userEmail, unreadCommentsCount]);

  const playNotificationSound = () => {
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
  };

  const fetchStatuses = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/task_statuses');
      if (!response.ok) {
        throw new Error('Ошибка при загрузке статусов');
      }
      const data = await response.json();
      setStatuses(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchPriorities = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/task_priorities');
      if (!response.ok) {
        throw new Error('Ошибка при загрузке приоритетов');
      }
      const data = await response.json();
      setPriorities(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    const now = new Date().getTime();

    if (token && tokenExpiry && now < parseInt(tokenExpiry, 10)) {
      const decoded = parseJwt(token);
      if (decoded) {
        setUserId(decoded.userId || null);
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiry');
      setUserId(null);
    }
  }, []);

  useEffect(() => {
    const handleTaskUpdate = () => {
      fetchAssignedTasks();
      fetchAssignments();
      fetchComments();
    };

    window.addEventListener('taskUpdated', handleTaskUpdate);
    const intervalId = setInterval(handleTaskUpdate, 30000);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
      clearInterval(intervalId);
    };
  }, [fetchAssignedTasks, fetchAssignments, fetchComments]);

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchStatuses(),
        fetchPriorities(),
        fetchAssignments(),
        fetchAssignedTasks(),
        fetchComments()
      ]);
    };
    
    loadInitialData();
  }, []);

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

  const handleCreateAssignment = async (assignmentData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(assignmentData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при создании задания');
      }
      
      await fetchAssignments();
      return true;
    } catch (error) {
      console.error('Ошибка при создании задания:', error);
      alert(error.message);
      return false;
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Ошибка при удалении задания');
      }
      await fetchAssignments();
    } catch (error) {
      console.error('Ошибка при удалении задания:', error);
    }
  };

  const handleShowDetails = (task) => {
    setDetailsFormTask({
      ...task,
      created_at: task.created_at || task.createdAt || new Date().toISOString()
    });
    setShowDetailsForm(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsForm(false);
    setDetailsFormTask(null);
  };

  const handleAssignmentSelect = useCallback((assignment) => {
    setSelectedAssignment(assignment);
  }, []);

  const handleCreateTask = useCallback(async (taskData) => {
    if (!taskData.title.trim()) {
      alert('Введите название задачи');
      return;
    }
    if (!selectedAssignment) {
      alert('Выберите задание для создания задачи');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Необходимо авторизоваться');
      }

      const assigneeResponse = await fetch(
        `http://localhost:3000/api/users/email/${encodeURIComponent(taskData.assigneeEmail)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!assigneeResponse.ok) {
        throw new Error('Ошибка при получении ID исполнителя');
      }
      const assigneeData = await assigneeResponse.json();
      const assigneeId = assigneeData.id;

      const deadline = taskData.deadline ? new Date(taskData.deadline).toISOString() : null;
      const createdAt = new Date().toISOString();

      const response = await fetch(
        `http://localhost:3000/api/assignments/${selectedAssignment.id}/tasks`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: taskData.title,
            description: taskData.description,
            deadline: deadline,
            created_at: createdAt,
            creator_id: userId,
            assignee_id: assigneeId,
            status_id: parseInt(taskData.statusId, 10),
            priority_id: parseInt(taskData.priorityId, 10),
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Ошибка при создании задачи');
      }
      
      // Обновляем данные после создания задачи
      await Promise.all([
        fetchAssignments(),
        fetchAssignedTasks()
      ]);
      window.dispatchEvent(new Event('taskUpdated'));
      setShowTaskForm(false);
    } catch (err) {
      alert(err.message);
    }
  }, [selectedAssignment, userId, fetchAssignments, fetchAssignedTasks]);

  const handleDeleteTask = useCallback(async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Ошибка при удалении задачи');
      }
      
      // Обновляем данные после удаления задачи
      await Promise.all([
        fetchAssignments(),
        fetchAssignedTasks()
      ]);
      window.dispatchEvent(new Event('taskUpdated'));
    } catch (err) {
      alert(err.message);
    }
  }, [fetchAssignments, fetchAssignedTasks]);

  const handleStatusChange = useCallback(async (taskId, newStatusId) => {
    setStatusChangeLoading(prev => ({ ...prev, [taskId]: true }));
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status_id: newStatusId }),
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при обновлении статуса задачи');
      }
      
      // Обновляем данные после изменения статуса
      await Promise.all([
        fetchAssignments(),
        fetchAssignedTasks()
      ]);
      window.dispatchEvent(new Event('taskUpdated'));
      
    } catch (err) {
      console.error('Error updating task status:', err);
      alert(err.message);
    } finally {
      setStatusChangeLoading(prev => ({ ...prev, [taskId]: false }));
    }
  }, [fetchAssignments, fetchAssignedTasks]);

  const formatTime = useCallback((seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

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
      setDetailsFormTask(taskData);
      setShowDetailsForm(true);
    } catch (error) {
      console.error('Error handling comment click:', error);
    }
  }, []);

  if (loading) {
    return <div className="loading-container">Загрузка заданий...</div>;
  }

  if (error) {
    return <div className="error-container">Ошибка: {error}</div>;
  }

  return (
    <div className="app-container">
      <Header 
        userEmail={userEmail} 
        onNavigate={(page) => setCurrentPage(page)} 
        hideAssignmentsAndProfile={true}
        unreadCommentsCount={unreadCommentsCount}
        onCommentsClick={() => setShowNotification(true)}
      />
      
      {showNotification && (
        <TaskNotification 
          tasks={assignedTasks} 
          comments={comments}
          onClose={() => setShowNotification(false)}
          onTaskClick={handleNotificationClick}
          onCommentClick={handleCommentClick}
        />
      )}

      <main className="dashboard">
        {currentPage === 'main' && (
          <>
            <AssignmentsList
              key={`${assignments.length}-${selectedAssignment?.id}`}
              assignments={assignments}
              selectedAssignment={selectedAssignment}
              onSelect={handleAssignmentSelect}
              onDelete={handleDeleteAssignment}
              onCreate={handleCreateAssignment}
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
            />
            {selectedAssignment && (
              <>
                <SelectedAssignmentDetails
                  selectedAssignment={selectedAssignment}
                  statuses={statuses}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteTask}
                  onDetails={handleShowDetails}
                  assignedTasks={assignedTasks}
                  loadingAssignedTasks={loadingAssignedTasks}
                  currentTab={currentTab}
                  statusChangeLoading={statusChangeLoading}
                  timers={timers}
                  formatTime={formatTime}
                  onStartWork={async (taskId) => {
                    try {
                      const token = localStorage.getItem('token');
                      if (!token) throw new Error('User not logged in');
                      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}/status`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: 'Bearer ' + token,
                        },
                        body: JSON.stringify({ status_id: 2, action: 'start' }),
                      });
                      if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error('Failed to start work: ' + errorText);
                      }
                      await Promise.all([
                        fetchAssignments(),
                        fetchAssignedTasks()
                      ]);
                      window.dispatchEvent(new Event('taskUpdated'));
                    } catch (err) {
                      alert(err.message);
                    }
                  }}
                  onCompleteWork={async (taskId) => {
                    try {
                      const token = localStorage.getItem('token');
                      if (!token) throw new Error('User not logged in');
                      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}/status`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: 'Bearer ' + token,
                        },
                        body: JSON.stringify({ status_id: 3, action: 'done' }),
                      });
                      if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error('Failed to complete work: ' + errorText);
                      }
                      await Promise.all([
                        fetchAssignments(),
                        fetchAssignedTasks()
                      ]);
                      window.dispatchEvent(new Event('taskUpdated'));
                    } catch (err) {
                      alert(err.message);
                    }
                  }}
                />
                {showDetailsForm && detailsFormTask && (
                  <div className="details-form-container">
                    <TaskDetailsForm
                      task={detailsFormTask}
                      onClose={handleCloseDetails}
                      token={localStorage.getItem('token')}
                    />
                  </div>
                )}
              </>
            )}
            <FloatingButton onClick={() => setShowTaskForm(true)} />
            <div className={`task-form-overlay ${showTaskForm ? '' : 'hidden'}`}>
              <TaskCreationForm
                onCreateTask={handleCreateTask}
                statuses={statuses}
                priorities={priorities}
                onClose={() => setShowTaskForm(false)}
                initialCreatorEmail={userEmail}
              />
            </div>
          </>
        )}
        {currentPage === 'user-info' && (
          <UserProfileForm
            userEmail={userEmail}
            onClose={() => setCurrentPage('main')}
          />
        )}
      </main>
    </div>
  );
}

export default MainPage;