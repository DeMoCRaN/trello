import React from 'react';

function TaskNotification({ tasks }) {
  // Filter new tasks that need to be executed
  const newTasks = tasks.filter(task => task.status === 'new');

  if (newTasks.length === 0) {
    return null; // No new tasks, no notification
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: '#ff9800',
      color: 'white',
      padding: '10px 20px',
      borderRadius: '8px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      zIndex: 1000,
      maxWidth: '300px',
      fontWeight: 'bold',
      cursor: 'pointer',
    }}>
      You have {newTasks.length} new task{newTasks.length > 1 ? 's' : ''} to execute.
    </div>
  );
}

export default TaskNotification;
