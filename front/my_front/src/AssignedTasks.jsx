import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './components/Header';
import './components/Components.css';

function AssignedTasks({ userEmail }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [timers, setTimers] = useState({});
  const [sortByAssignment, setSortByAssignment] = useState(false);
  const [assignmentNames, setAssignmentNames] = useState({});
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
    if (tasks.length > 0) {
      const newTasks = tasks.filter(task => task.status === 'new');
      if (newTasks.length > 0) {
        alert(`You have ${newTasks.length} new task${newTasks.length > 1 ? 's' : ''} to execute.`);
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

  function renderTaskCard(task) {
    const timer = timers[task.id] || { elapsedSeconds: 0, isRunning: false };
    const isInProgress = task.status === 'in_progress' || timer.isRunning;
    
    return (
      <div
        key={task.id}
        className="task-card"
        style={{
          borderLeft: '4px solid ' + (
            task.priority.toLowerCase() === 'low' ? '#9e9e9e' :
            task.priority.toLowerCase() === 'medium' ? '#ff9800' :
            task.priority.toLowerCase() === 'high' ? '#f44336' :
            '#9e9e9e'
          ),
          marginBottom: '16px',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          backgroundColor: '#fff',
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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
              {updatingTaskId === task.id ? 'Completing...' : 'Mark as Done'}
            </button>
          </div>
        )}
        
        {task.status === 'done' && (
          <p style={{ color: '#4caf50', fontWeight: 'bold' }}>
            Task completed. Total work time: {formatTime(timer.elapsedSeconds)}
          </p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <Header userEmail={userEmail} onNavigate={onNavigate} />
        <div style={{ padding: '20px', textAlign: 'center' }}>Loading tasks...</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header userEmail={userEmail} onNavigate={onNavigate} />
        <div style={{ padding: '20px', color: '#f44336' }}>Error: {error}</div>
      </>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <>
        <Header userEmail={userEmail} onNavigate={onNavigate} />
        <div style={{ padding: '20px' }}>
          <button 
            onClick={goBack} 
            style={{ 
              marginBottom: '16px',
              padding: '8px 16px',
              backgroundColor: '#3f51b5',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Back to Main
          </button>
          <div>No tasks assigned to you.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header userEmail={userEmail} onNavigate={onNavigate} />
      <div style={{ padding: '20px', paddingTop: '80px' }}>
        <button
          onClick={() => setSortByAssignment(!sortByAssignment)}
          className="cool-button"
        >
          {sortByAssignment ? 'Показать по статусу' : 'Группировать по назначению'}
        </button>
        
        <button 
          onClick={goBack} 
          className="cool-button"
          style={{ backgroundColor: '#9e9e9e' }}
        >
          Назад на главную
        </button>

        {!sortByAssignment ? (
          <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
            {Object.entries(tasksGroupedByStatus).map(([status, tasksList]) => (
              <div key={status} style={{ flex: 1 }}>
                <h3 style={{
                  padding: '10px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  textAlign: 'center',
                  textTransform: 'capitalize',
                }}>
                  {status.replace('_', ' ')}
                </h3>
                {tasksList.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#9e9e9e' }}>No tasks in this category</p>
                ) : (
                  tasksList.map(renderTaskCard)
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: '20px' }}>
            {Object.entries(tasksGroupedByAssignment).map(([assignmentId, group]) => (
              <div key={assignmentId} style={{ marginBottom: '30px' }}>
                <h3 style={{
                  padding: '10px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                }}>
                  {group.name}
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '20px',
                  marginTop: '10px'
                }}>
                  {group.tasks.map(renderTaskCard)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default AssignedTasks;