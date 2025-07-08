import React, { useEffect, useState } from 'react';
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

function MainPage() {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState(null);
  const [currentPage, setCurrentPage] = useState('main');
  const [showTaskForm, setShowTaskForm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    const now = new Date().getTime();

    async function fetchUserEmail(userId) {
      try {
        const response = await fetch(`http://localhost:3000/api/users/${userId}`);
        console.log('Fetch user info response status:', response.status);
        if (!response.ok) {
          throw new Error('Ошибка при получении данных пользователя');
        }
        const userData = await response.json();
        console.log('User data fetched:', userData);
        setUserEmail(userData.email || '');
      } catch (error) {
        console.error('Error fetching user email:', error);
        setUserEmail('');
      }
    }

    if (token && tokenExpiry && now < parseInt(tokenExpiry, 10)) {
      const decoded = parseJwt(token);
      console.log('Decoded JWT:', decoded);
      if (decoded) {
        setUserId(decoded.userId || null);
        console.log('User ID:', decoded.userId);
        if (decoded.userId) {
          fetchUserEmail(decoded.userId);
        }
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiry');
      setUserEmail('');
      setUserId(null);
      console.log('Token expired or missing');
    }
  }, []);

  const fetchStatuses = async () => {
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
  };

  const fetchPriorities = async () => {
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
  };

  const fetchAssignments = async () => {
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
      if (enrichedData.length > 0) {
        setSelectedAssignment(enrichedData[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
    fetchPriorities();
    fetchAssignments();
  }, []);

  const handleAssignmentSelect = (assignment) => {
    setSelectedAssignment(assignment);
  };

  const handleCreateTask = async (taskData) => {
    if (!taskData.title.trim()) {
      alert('Введите название задачи');
      return;
    }
    try {
      const assigneeResponse = await fetch(`http://localhost:3000/api/users/email/${encodeURIComponent(taskData.assigneeEmail)}`);
      if (!assigneeResponse.ok) {
        throw new Error('Ошибка при получении ID исполнителя');
      }
      const assigneeData = await assigneeResponse.json();
      const assigneeId = assigneeData.id;

      const response = await fetch(`http://localhost:3000/api/assignments/${selectedAssignment.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description,
          deadline: taskData.deadline ? (() => {
            const [datePart, timePart] = taskData.deadline.split('T');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour, minute] = timePart.split(':').map(Number);
            const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
            return date.toISOString();
          })() : null,
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
      await response.json();
      await fetchAssignments();
      setShowTaskForm(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Ошибка при удалении задачи');
      }
      await fetchAssignments();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (taskId, newStatusId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: newStatusId }),
      });
      if (!response.ok) {
        throw new Error('Ошибка при обновлении статуса задачи');
      }
      setSelectedAssignment((prev) => {
        const updatedTasks = prev.tasks.map((task) =>
          task.id === taskId ? { ...task, status: statuses.find(s => s.id === newStatusId).name } : task
        );
        return { ...prev, tasks: updatedTasks };
      });
    } catch (err) {
      console.error('Error updating task status:', err);
      alert(err.message);
    }
  };

  if (loading) {
    return <p>Загрузка заданий...</p>;
  }

  if (error) {
    return <p>Ошибка: {error}</p>;
  }

  return (
    <>
      <Header userEmail={userEmail} onNavigate={setCurrentPage} />
      <main className="dashboard">
        {currentPage === 'main' && (
          <>
            <AssignmentsList
              assignments={assignments}
              selectedAssignment={selectedAssignment}
              onSelect={handleAssignmentSelect}
            />
            {selectedAssignment && (
              <SelectedAssignmentDetails
                selectedAssignment={selectedAssignment}
                statuses={statuses}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteTask}
              />
            )}
            <FloatingButton onClick={() => setShowTaskForm(true)} />
            <div className={`task-form-overlay ${showTaskForm ? '' : 'hidden'}`}>
              <TaskCreationForm
                onCreateTask={handleCreateTask}
                statuses={statuses}
                priorities={priorities}
                onClose={() => setShowTaskForm(false)}
                initialCreatorEmail={userEmail}
                className={showTaskForm ? '' : 'hidden'}
              />
            </div>
          </>
        )}
        {currentPage === 'user-info' && <UserInfo userEmail={userEmail} onBack={() => setCurrentPage('main')} />}
      </main>
    </>
  );
}

export default MainPage;