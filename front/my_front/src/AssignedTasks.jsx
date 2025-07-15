import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './components/Header';
import TaskNotification from './components/TaskNotification';
import './AssignedTasks.css';

function AssignedTasks({ userEmail }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [timers, setTimers] = useState({});
  const [sortByAssignment, setSortByAssignment] = useState(false);
  const [assignmentNames, setAssignmentNames] = useState({});
  const [showNotification, setShowNotification] = useState(true);
  const navigate = useNavigate();

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

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    fetchTasks();
    fetchAssignmentNames();
  }, []);

  useEffect(() => {
    const handleTaskUpdate = () => {
      fetchTasks();
    };

    window.addEventListener('taskUpdated', handleTaskUpdate);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
    };
  }, []);

  useEffect(() => {
    // Play sound for new tasks
    if (tasks.length > 0) {
      const newTasks = tasks.filter(task => task.status === 'new');
      if (newTasks.length > 0) {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Audio play failed:', e));
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

  async function fetchAssignmentNames() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/assignments', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch assignments');
      const assignments = await response.json();
      
      const namesMap = {};
      assignments.forEach(assignment => {
        namesMap[assignment.id] = assignment.name || `Assignment ${assignment.id}`;
      });
      setAssignmentNames(namesMap);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  }

  async function fetchTasks() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('User not logged in');
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
        throw new Error('Failed to fetch tasks: ' + errorText);
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
  }

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
    
    tasks.forEach(task => {
      const assignmentId = task.assignment_id || 'none';
      if (!groups[assignmentId]) {
        groups[assignmentId] = {
          name: assignmentNames[assignmentId] || `Assignment ${assignmentId}`,
          tasks: []
        };
      }
      groups[assignmentId].tasks.push(task);
    });
    
    return groups;
  }, [tasks, assignmentNames]);

  async function updateTaskStatus(taskId, statusId, action) {
    setUpdatingTaskId(taskId);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('User not logged in');
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
        throw new Error('Failed to update task status: ' + errorText);
      }
      await fetchTasks();
      window.dispatchEvent(new Event('taskUpdated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function goBack() {
    navigate('/main');
  }

  const handleNotificationClick = (taskId) => {
    const element = document.getElementById(`task-${taskId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.style.boxShadow = '0 0 0 3px rgba(67, 97, 238, 0.5)';
      setTimeout(() => {
        element.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }, 2000);
    }
  };

  function renderTaskCard(task) {
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
          <p><strong>Assignment:</strong> {assignmentNames[task.assignment_id] || `Assignment ${task.assignment_id}`}</p>
        )}
        <p><strong>Deadline:</strong> {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Creator:</strong> {task.creator_email}</p>
        <p><strong>Status:</strong> {task.status.replace('_', ' ')}</p>
        <p><strong>Priority:</strong> {task.priority}</p>
        <p><strong>Created At:</strong> {new Date(task.created_at).toLocaleString()}</p>
        <p><strong>Updated At:</strong> {new Date(task.updated_at).toLocaleString()}</p>
        <p><strong>Work Time:</strong> {formatTime(timer.elapsedSeconds)}</p>
        
        {task.status === 'new' && (
          <button
            onClick={() => updateTaskStatus(task.id, 2, 'start')}
            disabled={updatingTaskId === task.id}
            className="task-button start-button"
          >
            {updatingTaskId === task.id ? 'Starting...' : 'Start Work'}
          </button>
        )}
        
        {isInProgress && (
          <div className="task-buttons-container">
            <button
              onClick={() => updateTaskStatus(task.id, 2, 'stop')}
              disabled={updatingTaskId === task.id}
              className="task-button stop-button"
            >
              {updatingTaskId === task.id ? 'Stopping...' : 'Stop Work'}
            </button>
            <button
              onClick={() => updateTaskStatus(task.id, 2, 'resume')}
              disabled={updatingTaskId === task.id}
              className="task-button resume-button"
            >
              {updatingTaskId === task.id ? 'Resuming...' : 'Resume Work'}
            </button>
            <button
              onClick={() => updateTaskStatus(task.id, 3, 'done')}
              disabled={updatingTaskId === task.id}
              className="task-button complete-button"
            >
              {updatingTaskId === task.id ? 'Completing...' : 'Mark as Done'}
            </button>
          </div>
        )}
        
        {task.status === 'done' && (
          <p className="task-completed">
            Task completed. Total work time: {formatTime(timer.elapsedSeconds)}
          </p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <Header userEmail={userEmail} onNavigate={onNavigate} />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <Header userEmail={userEmail} onNavigate={onNavigate} />
        <div className="error-container">
          <p>Error: {error}</p>
          <button onClick={fetchTasks} className="retry-button">
            Retry
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
            Back to Main
          </button>
          <p>No tasks assigned to you.</p>
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
          onClose={() => setShowNotification(false)}
          onTaskClick={handleNotificationClick}
        />
      )}
      
      <div className="content-container" style={{ maxHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}>
        <div className="controls-container">
          <button
            onClick={() => setSortByAssignment(!sortByAssignment)}
            className="toggle-sort-button"
          >
            {sortByAssignment ? 'Show by Status' : 'Group by Assignment'}
          </button>
          
          <button onClick={goBack} className="back-button">
            Back to Main
          </button>
        </div>

        {!sortByAssignment ? (
          <div className="status-columns-container">
            {Object.entries(tasksGroupedByStatus).map(([status, tasksList]) => (
              <div key={status} className="status-column">
                <h3 className="status-header">
                  {status.replace('_', ' ')}
                </h3>
                {tasksList.length === 0 ? (
                  <p className="no-tasks-message">No tasks in this category</p>
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
                <div className="assignment-tasks-grid">
                  {group.tasks.map(renderTaskCard)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AssignedTasks;