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
    // Делаем запрос не чаще чем раз в 5 секунд
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
      setAssignedTasks(data);
      setLastFetchTime(now);
      window.dispatchEvent(new Event('taskUpdated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAssignedTasks(false);
    }
  }, [lastFetchTime]);

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
    };

    window.addEventListener('taskUpdated', handleTaskUpdate);
    const intervalId = setInterval(handleTaskUpdate, 30000);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
      clearInterval(intervalId);
    };
  }, [fetchAssignedTasks, fetchAssignments]);

  useEffect(() => {
    // Загружаем данные только один раз при монтировании
    const loadInitialData = async () => {
      await Promise.all([
        fetchStatuses(),
        fetchPriorities(),
        fetchAssignments(),
        fetchAssignedTasks()
      ]);
    };
    
    loadInitialData();
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
    
    await fetchAssignments(); // Refresh the assignments list
    return true; // Indicate success
  } catch (error) {
    console.error('Ошибка при создании задания:', error);
    alert(error.message);
    return false; // Indicate failure
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
      await fetchAssignments(); // Обновляем список заданий
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
      const assigneeResponse = await fetch(`http://localhost:3000/api/users/email/${encodeURIComponent(taskData.assigneeEmail)}`);
      if (!assigneeResponse.ok) {
        throw new Error('Ошибка при получении ID исполнителя');
      }
      const assigneeData = await assigneeResponse.json();
      const assigneeId = assigneeData.id;

      const deadline = taskData.deadline ? new Date(taskData.deadline).toISOString() : null;
      const createdAt = new Date().toISOString();

      const response = await fetch(`http://localhost:3000/api/assignments/${selectedAssignment.id}/tasks`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при создании задачи');
      }
      
      await fetchAssignments();
      setShowTaskForm(false);
      window.dispatchEvent(new Event('taskUpdated'));
    } catch (err) {
      alert(err.message);
    }
  }, [selectedAssignment, userId, fetchAssignments]);

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
      await fetchAssignments();
      window.dispatchEvent(new Event('taskUpdated'));
    } catch (err) {
      alert(err.message);
    }
  }, [fetchAssignments]);

  const handleStatusChange = useCallback(async (taskId, newStatusId) => {
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
      await fetchAssignments();
      window.dispatchEvent(new Event('taskUpdated'));
    } catch (err) {
      console.error('Error updating task status:', err);
      alert(err.message);
    }
  }, [fetchAssignments]);

  if (loading) {
    return <div className="loading-container">Загрузка заданий...</div>;
  }

  if (error) {
    return <div className="error-container">Ошибка: {error}</div>;
  }

  return (
    <div className="app-container">
      <Header userEmail={userEmail} onNavigate={(page) => setCurrentPage(page)} hideAssignmentsAndProfile={true} />
      
      <TaskNotification 
        tasks={assignedTasks} 
        onClose={() => {}} 
        onTaskClick={(taskId) => {
          const task = assignedTasks.find(t => t.id === taskId);
          if (task) handleShowDetails(task);
        }}
      />

      <main className="dashboard">
        {currentPage === 'main' && (
          <>
            <AssignmentsList
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
                      await fetchAssignments();
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
                      await fetchAssignments();
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