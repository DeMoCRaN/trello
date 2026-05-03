import React, { useEffect, useState, useCallback, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiX } from 'react-icons/fi';
import './MainPageNewStyles.css';
import Header from './components/Header';
import AssignmentsList from './components/AssignmentsList';
import SelectedAssignmentDetails from './components/SelectedAssignmentDetails';
import TaskCreationForm from './components/TaskCreationForm';
import TaskDetailsForm from './components/TaskDetailsForm';
import AssignmentCreationForm from './components/AssignmentCreationForm';
import FloatingButton from './components/FloatingButton';
import TeamMembersPanel from './components/TeamMembersPanel';
import UserProfileForm from './components/UserProfileForm';
import TaskNotification from './components/TaskNotification';
import InvitationResponseForm from './components/InvitationResponseForm';
import SideToast from './components/SideToast';

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
  const [showAssignmentCreationForm, setShowAssignmentCreationForm] = useState(false);
  const [showTeamMembersPanel, setShowTeamMembersPanel] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [statusChangeLoading, setStatusChangeLoading] = useState({});
  const [comments, setComments] = useState([]);
  const [unreadCommentsCount, setUnreadCommentsCount] = useState(0);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [timers, setTimers] = useState({});
  const [invitations, setInvitations] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [showInvitationForm, setShowInvitationForm] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [sideToast, setSideToast] = useState({ message: '', type: 'error' });
  const lastNotificationCountRef = useRef(0);

  const showSideToast = useCallback((message, type = 'error') => {
    setSideToast({ message, type });
  }, []);

  const mappedAssignedTasks = assignedTasks.map(task => ({
    ...task,
    status: typeof task.status === 'number' ? 
      statuses.find(s => s.id === task.status)?.name || 'new' : task.status
  }));

// eslint-disable-next-line no-unused-vars
  const newTasks = mappedAssignedTasks.filter(task => task.status === 'new');
// eslint-disable-next-line no-unused-vars  
  const failedTasks = mappedAssignedTasks.filter(task => task.status === 'failed');
  // eslint-disable-next-line no-unused-vars
  const newComments = comments.filter(comment => comment.is_new);
  // eslint-disable-next-line no-unused-vars  
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  // eslint-disable-next-line no-unused-vars
  const failedInvitations = invitations.filter(inv => inv.status === 'failed');
  const notificationTotal = newTasks.length + comments.length + pendingInvitations.length;

  const processTasks = useCallback((tasks) => {
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
  }, [statuses, priorities]);

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
      setSelectedAssignment((prevSelectedAssignment) => {
        if (!enrichedData.length) {
          return null;
        }

        if (!prevSelectedAssignment) {
          return enrichedData[0];
        }

        const refreshedSelectedAssignment = enrichedData.find(
          (assignment) => assignment.id === prevSelectedAssignment.id
        );

        return refreshedSelectedAssignment || enrichedData[0];
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssignedTasks = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchTime < 30000) return; 
    
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
  }, [lastFetchTime, processTasks]);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No auth token found');
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

  const fetchTeamMembers = useCallback(async (assignmentId) => {
    if (!assignmentId) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No auth token found');
      }
      const response = await fetch(`http://localhost:3000/api/assignments/${assignmentId}/team`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch team members: ' + response.status);
      }
      const data = await response.json();
      setTeamMembers(data);
    } catch (error) {
      console.error('Ошибка загрузки состава команды:', error);
      setTeamMembers([]);
    }
  }, []);

  const fetchStatuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/task_statuses', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Ошибка при загрузке статусов');
      
      const data = await response.json();
      setStatuses(data);
    } catch (err) {
      console.error(err);
      setError('Ошибка при загрузке статусов');
    }
  };

  const fetchPriorities = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/task_priorities', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
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
      fetchInvitations();
    };

    window.addEventListener('taskUpdated', handleTaskUpdate);

    const intervalId = setInterval(handleTaskUpdate, 30000);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
      clearInterval(intervalId);
    };
  }, [fetchAssignedTasks, fetchAssignments, fetchComments, fetchInvitations]);

  useEffect(() => {
    if (selectedAssignment) {
      fetchTeamMembers(selectedAssignment.id);
    }
  }, [selectedAssignment, fetchTeamMembers]);

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchStatuses(),
        fetchPriorities(),
        fetchAssignments(),
        fetchAssignedTasks(),
        fetchComments(),
        fetchInvitations()
      ]);
    };

    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (notificationTotal > 0 && notificationTotal > lastNotificationCountRef.current) {
      setShowNotification(true);
    }
    lastNotificationCountRef.current = notificationTotal;
  }, [notificationTotal]);

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
      showSideToast(error.message);
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
        const errorData = await response.json();
        
        if (response.status === 409 || errorData.error?.includes('foreign key constraint')) {
          showSideToast('Невозможно удалить задание: сначала удалите все задачи, связанные с этим заданием');
          return;
        }
        
        throw new Error(errorData.message || 'Ошибка при удалении задания');
      }
      
      await fetchAssignments();
      showSideToast('Задание успешно удалено', 'success');
    } catch (error) {
      console.error('Ошибка при удалении задания:', error);
      
      if (error.message?.includes('foreign key') || error.message?.includes('referenced')) {
        showSideToast('Невозможно удалить задание. Сначала удалите все задачи, связанные с этим заданием');
      } else {
        showSideToast('Невозможно удалить задание. Сначала удалите все задачи, связанные с этим заданием');
      }
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
      showSideToast('Введите название задачи');
      return;
    }
    if (!selectedAssignment) {
      showSideToast('Выберите задание для создания задачи');
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
      showSideToast(err.message);
    }
  }, [selectedAssignment, userId, fetchAssignments, fetchAssignedTasks, showSideToast]);

  const handleDeleteTask = useCallback(async (taskId, permanent = false) => {
    try {
      const token = localStorage.getItem('token');
      const url = `http://localhost:3000/api/tasks/${taskId}${permanent ? '?permanent=true' : ''}`;
      const response = await fetch(url, {
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
      showSideToast(err.message);
    }
  }, [fetchAssignments, fetchAssignedTasks, showSideToast]);

  const handleStatusChange = useCallback(async (taskId, statusPayload) => {
    setStatusChangeLoading(prev => ({ ...prev, [taskId]: true }));
    
    try {
      const token = localStorage.getItem('token');
      const requestBody = typeof statusPayload === 'object'
        ? statusPayload
        : { status_id: statusPayload };
      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody),
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
      showSideToast(err.message);
    } finally {
      setStatusChangeLoading(prev => ({ ...prev, [taskId]: false }));
    }
  }, [fetchAssignments, fetchAssignedTasks, showSideToast]);

  const formatTime = useCallback((seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleInvitationClick = useCallback((invitation) => {
    setSelectedInvitation(invitation);
    setShowInvitationForm(true);
  }, []);

  const handleRespondToInvitation = useCallback(async (invitationId, status) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Токен авторизации не найден');
      }

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

      await fetchInvitations();
      setShowInvitationForm(false);
      setSelectedInvitation(null);
      window.dispatchEvent(new Event('taskUpdated'));
    } catch (error) {
      console.error('Ошибка при ответе на приглашение:', error);
      showSideToast(`Ошибка при ответе на приглашение: ${error.message}`);
      throw error;
    }
  }, [selectedInvitation, fetchInvitations, showSideToast]);

  if (loading) {
    return <div className="loading-container">Загрузка заданий...</div>;
  }

  if (error) {
    return <div className="error-container">Ошибка: {error}</div>;
  }

  return (
    <div className="app-container">
      <SideToast
        message={sideToast.message}
        type={sideToast.type}
        onClose={() => setSideToast({ message: '', type: 'error' })}
        duration={60000}
      />

      <Header 
        userEmail={userEmail} 
        onNavigate={(page) => setCurrentPage(page)} 
        hideAssignmentsAndProfile={true}
        unreadCommentsCount={unreadCommentsCount}
        onCommentsClick={() => setShowNotification(!showNotification)}
      />
      
      {showNotification && (
        <TaskNotification
          tasks={assignedTasks}
          comments={comments}
          invitations={invitations}
          systemNotifications={systemNotifications}
          onClose={() => {
            markSystemNotificationsAsRead(systemNotifications.map((item) => item.id));
            setShowNotification(false);
          }}
          onInvitationClick={handleInvitationClick}
          onSystemNotificationClick={(item) => {
            markSystemNotificationsAsRead([item.id]);
          }}
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
              onShowCreateForm={() => setShowAssignmentCreationForm(true)}
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
            />
            
            {/* Заглушка, если нет проектов */}
            {assignments.length === 0 ? (
              <div className="empty-assignments-placeholder">
                <div className="placeholder-content">
                  <div className="placeholder-icon">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="#0026ff" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5Z" stroke="#0026ff" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M9 12H15" stroke="#0026ff" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M9 16H15" stroke="#0026ff" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h2>У вас пока нет проектов</h2>
                  <p>Создайте свой первый проект, чтобы начать работу</p>
                  <button 
                    className="create-first-assignment-btn"
                    onClick={() => setShowAssignmentCreationForm(true)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Создать проект
                  </button>
                </div>
              </div>
            ) : !selectedAssignment ? (
              <div className="empty-assignments-placeholder">
                <div className="placeholder-content">
                  <div className="placeholder-icon">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 6H21" stroke="#0026ff" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6" stroke="#0026ff" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M10 11V17" stroke="#0026ff" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M14 11V17" stroke="#0026ff" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M18 6V20C18 21 17 22 16 22H8C7 22 6 21 6 20V6" stroke="#0026ff" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h2>Выберите проект</h2>
                  <p>Нажмите на проект слева, чтобы увидеть его задачи</p>
                </div>
              </div>
            ) : (
              <>
                <SelectedAssignmentDetails
                  selectedAssignment={selectedAssignment}
                  statuses={statuses}
                  onNotify={showSideToast}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteTask}
                  onDetails={handleShowDetails}
                  assignedTasks={assignedTasks}
                  loadingAssignedTasks={loadingAssignedTasks}
                  currentTab={currentTab}
                  statusChangeLoading={statusChangeLoading}
                  timers={timers}
                  formatTime={formatTime}
                  activeTasks={selectedAssignment?.tasks?.filter(task => !task.isArchived && task.status !== 'failed' && task.status !== 'rew') || []}
                  reviewTasks={selectedAssignment?.tasks?.filter(task => !task.isArchived && task.status === 'rew') || []}
                  archivedTasks={selectedAssignment?.tasks?.filter(task => task.isArchived) || []}
                  failedTasks={selectedAssignment?.tasks?.filter(task => !task.isArchived && task.status === 'failed') || []}
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
                      showSideToast(err.message);
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
                      showSideToast(err.message);
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
            
            <div className="floating-buttons-group">
              <button
                className="floating-button team-button"
                onClick={() => setShowTeamMembersPanel(true)}
                aria-label="Управление командой"
                title="Состав команды"
              >
                👥
              </button>
              <FloatingButton onClick={() => setShowTaskForm(true)} />
            </div>
            
            {showTaskForm && (
              <TaskCreationForm
                onCreateTask={handleCreateTask}
                statuses={statuses}
                priorities={priorities}
                onClose={() => setShowTaskForm(false)}
                initialCreatorEmail={userEmail}
                teamMembers={teamMembers}
              />
            )}
            {showTeamMembersPanel && (
              <TeamMembersPanel
                assignmentId={selectedAssignment?.id}
                onClose={() => setShowTeamMembersPanel(false)}
              />
            )}
            {showAssignmentCreationForm && (
              <AssignmentCreationForm
                onCreateAssignment={handleCreateAssignment}
                onClose={() => setShowAssignmentCreationForm(false)}
              />
            )}
          </>
        )}
        {currentPage === 'user-info' && (
          <UserProfileForm
            userEmail={userEmail}
            onClose={() => setCurrentPage('main')}
          />
        )}

        {showInvitationForm && selectedInvitation && (
          <InvitationResponseForm
            invitation={selectedInvitation}
            onNotify={showSideToast}
            onClose={() => {
              setShowInvitationForm(false);
              setSelectedInvitation(null);
            }}
            onRespond={handleRespondToInvitation}
          />
        )}
      </main>
    </div>
  );
}

export default MainPage;


