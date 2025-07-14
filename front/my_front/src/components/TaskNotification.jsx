import React, { useEffect, useState } from 'react';

function TaskNotification({ tasks }) {
  const [newTaskCount, setNewTaskCount] = useState(0);

  useEffect(() => {
    if (tasks && tasks.length > 0) {
      const newTasks = tasks.filter(task => task.status === 'new');
      setNewTaskCount(newTasks.length);
    } else {
      setNewTaskCount(0);
    }
  }, [tasks]);

  if (newTaskCount === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: '#ff9800',
      color: 'white',
      padding: '10px 20px',
      borderRadius: '5px',
      zIndex: 1000,
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
    }}>
      У вас {newTaskCount} новых задач
    </div>
  );
}

export default TaskNotification;
