import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './components/Header';
import TaskNotification from './components/TaskNotification';
import './components/Components.css';

function AssignedTasks({ userEmail }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [timers, setTimers] = useState({});
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
    fetchTasks();
  }, []);

  // Add event listener for real-time updates
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
    // Start timers for tasks that are in progress and have in_progress_since
    const intervalIds = {};
    Object.entries(timers).forEach(([taskId, timer]) => {
      if (timer.isRunning) {
        intervalIds[taskId] = setInterval(() => {
          setTimers(prevTimers => {
            const newTimers = { ...prevTimers };
            newTimers[taskId].elapsedSeconds += 1;
            return newTimers;
          });
        }, 1000);
      }
    });
    return () => {
      Object.values(intervalIds).forEach(clearInterval);
    };
  }, [timers]);

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

      // Initialize timers for tasks
      const newTimers = {};
      data.forEach(task => {
        let elapsedSeconds = task.work_duration || 0;
        if (task.in_progress_since) {
          const inProgressSince = new Date(task.in_progress_since);
          const now = new Date();
          elapsedSeconds += Math.floor((now - inProgressSince) / 1000);
        }
        newTimers[task.id] = {
          elapsedSeconds,
          isRunning: !!task.in_progress_since,
        };
      });
      setTimers(newTimers);

      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
      // Dispatch event for real-time update
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

  if (loading) {
    return (
      <>
        <Header userEmail={userEmail} onNavigate={onNavigate} />
        <div>Loading tasks...</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header userEmail={userEmail} onNavigate={onNavigate} />
        <div>Error: {error}</div>
      </>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <>
        <Header userEmail={userEmail} onNavigate={onNavigate} />
        <div>
          <button onClick={goBack} style={{ marginBottom: '16px' }}>Back</button>
          <div>No tasks assigned to you.</div>
        </div>
      </>
    );
  }

  const tasksByStatus = {
    new: [],
    in_progress: [],
    done: [],
  };

  tasks.forEach(task => {
    tasksByStatus[task.status]?.push(task);
  });

  return (
    <>
      <Header userEmail={userEmail} onNavigate={onNavigate} />
      <TaskNotification tasks={tasks} />
      <div className="tasks-columns-container" style={{ display: 'flex', gap: '16px' }}>
        <button onClick={goBack} style={{ marginBottom: '16px' }}>Back</button>
        {Object.entries(tasksByStatus).map(([status, tasksList]) => (
          <div key={status} className="tasks-column" style={{ flex: 1 }}>
            <h3>{status.replace('_', ' ').toUpperCase()}</h3>
            {tasksList.length === 0 ? (
              <p>No tasks in this category.</p>
            ) : (
              tasksList.map(task => {
                const timer = timers[task.id] || { elapsedSeconds: 0, isRunning: false };
                const isInProgress = task.status === 'in_progress' || timer.isRunning;
                return (
                  <div key={task.id} className="task-card">
                    <h4>{task.title}</h4>
                    <p>{task.description}</p>
                    <p><strong>Deadline:</strong> {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Creator:</strong> {task.creator_email}</p>
                    <p><strong>Status:</strong> {task.status}</p>
                    <p><strong>Priority:</strong> {task.priority}</p>
                    <p><strong>Created At:</strong> {new Date(task.created_at).toLocaleString()}</p>
                    <p><strong>Updated At:</strong> {new Date(task.updated_at).toLocaleString()}</p>
                    <p><strong>Work Time:</strong> {formatTime(timer.elapsedSeconds)}</p>
                    {task.status === 'new' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 2, 'start')}
                        disabled={updatingTaskId === task.id}
                        style={{
                          backgroundColor: '#3f51b5',
                          color: 'white',
                          border: 'none',
                          borderRadius: '24px',
                          padding: '8px 16px',
                          cursor: updatingTaskId === task.id ? 'wait' : 'pointer',
                          fontWeight: '600',
                          fontSize: '14px',
                          marginTop: '12px',
                        }}
                      >
                        {updatingTaskId === task.id ? 'Starting...' : 'Start Work'}
                      </button>
                    )}
                    {isInProgress && (
                      <>
                        <button
                          onClick={() => updateTaskStatus(task.id, 2, 'stop')}
                          disabled={updatingTaskId === task.id}
                          style={{
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '24px',
                            padding: '8px 16px',
                            cursor: updatingTaskId === task.id ? 'wait' : 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            marginTop: '12px',
                            marginRight: '8px',
                          }}
                        >
                          {updatingTaskId === task.id ? 'Stopping...' : 'Stop Work'}
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 2, 'resume')}
                          disabled={updatingTaskId === task.id}
                          style={{
                            backgroundColor: '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '24px',
                            padding: '8px 16px',
                            cursor: updatingTaskId === task.id ? 'wait' : 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            marginTop: '12px',
                            marginRight: '8px',
                          }}
                        >
                          {updatingTaskId === task.id ? 'Resuming...' : 'Resume Work'}
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 3, 'done')}
                          disabled={updatingTaskId === task.id}
                          style={{
                            backgroundColor: '#2196f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '24px',
                            padding: '8px 16px',
                            cursor: updatingTaskId === task.id ? 'wait' : 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            marginTop: '12px',
                          }}
                        >
                          {updatingTaskId === task.id ? 'Completing...' : 'Done'}
                        </button>
                      </>
                    )}
                    {task.status === 'done' && (
                      <p>Task completed. Total work time: {formatTime(timer.elapsedSeconds)}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export default AssignedTasks;
