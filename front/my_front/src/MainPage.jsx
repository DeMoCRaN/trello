import React, { useEffect, useState, useCallback } from 'react';
import './MainPageNewStyles.css';
import Header from './components/Header';
import AssignmentsList from './components/AssignmentsList';
import SelectedAssignmentDetails from './components/SelectedAssignmentDetails';
import TaskCreationForm from './components/TaskCreationForm';
import FloatingButton from './components/FloatingButton';
import UserInfo from './components/UserInfo';

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

import TaskDetailsModal from './components/TaskDetailsModal';

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

  // Removed unused states to fix ESLint warnings
  // const [selectedTask, setSelectedTask] = useState(null);
  // const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  // Removed unused variable to fix ESLint warning
  // const isLoadingDetails = false;

  // New states for details form without overlay
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [detailsFormTask, setDetailsFormTask] = useState(null);

  const handleShowDetails = (task) => {
    // Open details form without overlay
    setDetailsFormTask(task);
    setShowDetailsForm(true);
  };

  const handleCloseDetails = () => {
    // Close details form
    setShowDetailsForm(false);
    setDetailsFormTask(null);
  };

  const fetchAssignedTasks = useCallback(async () => {
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAssignedTasks(false);
    }
  }, []);

  useEffect(() => {
    if (currentTab === 'assigned') {
      fetchAssignedTasks();
    }
  }, [currentTab, fetchAssignedTasks]);

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

  useEffect(() => {
    fetchStatuses();
    fetchPriorities();
    fetchAssignments();
  }, [fetchStatuses, fetchPriorities, fetchAssignments]);

  const handleAssignmentSelect = useCallback((assignment) => {
    setSelectedAssignment(assignment);
  }, []);

  useEffect(() => {
    if (!assignments.length) return;
    const token = localStorage.getItem('token');
    assignments.forEach(async (assignment) => {
      if (assignment.tasks) {
        for (const task of assignment.tasks) {
          if (!task.seen_at) {
            try {
              await fetch(`http://localhost:3000/api/tasks/${task.id}/seen`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
            } catch (error) {
              console.error(`Error marking task ${task.id} as seen:`, error);
            }
          }
        }
      }
    });
  }, [assignments]);

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
          created_at: new Date().toISOString(),
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
      <Header userEmail={userEmail} onNavigate={setCurrentPage} />
      <main className="dashboard">
        {currentPage === 'main' && (
          <>
            <AssignmentsList
              assignments={assignments}
              selectedAssignment={selectedAssignment}
              onSelect={handleAssignmentSelect}
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
                    } catch (err) {
                      alert(err.message);
                    }
                  }}
                  onStopWork={async (taskId) => {
                    try {
                      const token = localStorage.getItem('token');
                      if (!token) throw new Error('User not logged in');
                  const response = await fetch(`http://localhost:3000/api/tasks/${taskId}/status`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: 'Bearer ' + token,
                    },
                    body: JSON.stringify({ status_id: 2, action: 'stop' }),
                  });
                      if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error('Failed to stop work: ' + errorText);
                      }
                      await fetchAssignments();
                    } catch (err) {
                      alert(err.message);
                    }
                  }}
                  onResumeWork={async (taskId) => {
                    try {
                      const token = localStorage.getItem('token');
                      if (!token) throw new Error('User not logged in');
                  const response = await fetch(`http://localhost:3000/api/tasks/${taskId}/status`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: 'Bearer ' + token,
                    },
                    body: JSON.stringify({ status_id: 2, action: 'resume' }),
                  });
                      if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error('Failed to resume work: ' + errorText);
                      }
                      await fetchAssignments();
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
                    } catch (err) {
                      alert(err.message);
                    }
                  }}
                />
                {/* Remove TaskDetailsModal usage */}
                {/* Render details form without overlay */}
                {showDetailsForm && detailsFormTask && (
                  <div className="details-form-container">
                    <TaskCreationForm
                      onCreateTask={() => {}}
                      statuses={statuses}
                      priorities={priorities}
                      onClose={handleCloseDetails}
                      initialCreatorEmail={userEmail}
                      initialAssigneeEmail={detailsFormTask.assignee_email || ''}
                      task={detailsFormTask}
                      isDetailsView={true}
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
        {currentPage === 'user-info' && <UserInfo userEmail={userEmail} onBack={() => setCurrentPage('main')} />}
      </main>
    </div>
  );
}

export default MainPage;