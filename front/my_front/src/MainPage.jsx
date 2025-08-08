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
  const [showNotification, setShowNotification] = useState(false);
  const [timers, setTimers] = useState({});

  const processTasks = (tasks) => {
    return tasks.map(task => ({
      ...task,
      status: statuses.find(s => s.id === task.status_id)?.name || 'new',
      priority: priorities.find(p => p.id === task.priority_id)?.name || 'medium',
      work_duration: Number(task.work_duration) || 0,
      due_date: task.deadline || new Date().toISOString(),
      isArchived: !!task.deleted_at,
      creator_name: task.creator_name || 'Неизвестно',
      assignee_name: task.assignee_name || 'Неизвестно',
      created_at: task.created_at || new Date().toISOString(),
      createdAt: task.created_at || task.createdAt || new Date().toISOString()
    }));
  };

  const fetchAssignments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/assignments?include_archived=true', {
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
            isArchived: !!task.deleted_at || task.is_archived === true
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
  }, [selectedAssignment, statuses, priorities]);

  const fetchAssignedTasks = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchTime < 30000) return; // Увеличили минимальный интервал между запросами
    
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
      
      const processedTasks = processTasks(data);
      
      const newTimers = {};
      processedTasks.forEach(task => {
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
      setAssignedTasks(processedTasks);
      setLastFetchTime(now);
      window.dispatchEvent(new Event('taskUpdated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAssignedTasks(false);
    }
  }, [lastFetchTime, statuses, priorities]);

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
      );

      setUnreadCommentsCount(filteredComments.length);
      
      if (filteredComments.length > 0) {
        if (Notification.permission === 'granted') {
          new Notification('Новые комментарии', {
            body: `У вас ${filteredComments.length} новых комментариев`,
            icon: '/favicon.ico'
          });
        }
        
      }

      setComments(filteredComments);
    } catch (error) {
      console.error('Ошибка загрузки комментариев:', error);
    }
  }, [userEmail]);


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
      if (!response.ok) throw new Error('Ошибка при загрузке приоритетов');
      const data = await response.json();
      setPriorities(data);
      return data;
    } catch (err) {
      console.error(err);
      return [];
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
    // Увеличили интервал опроса до 2 минут (120000 мс)
    const intervalId = setInterval(handleTaskUpdate, 120000);

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
        onCommentsClick={() => setShowNotification(!showNotification)}
      />
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="notification-container"
          >
            <TaskNotification 
              tasks={assignedTasks} 
              comments={comments}
              onClose={() => setShowNotification(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
                  activeTasks={selectedAssignment?.tasks?.filter(task => !task.isArchived) || []}
                  archivedTasks={selectedAssignment?.tasks?.filter(task => task.isArchived) || []}
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