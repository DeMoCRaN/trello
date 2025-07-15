import React, { useEffect, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';  // Добавлен motion
import { FiBell, FiX } from 'react-icons/fi';

function TaskNotification({ tasks = [], onClose, onTaskClick }) {  // Добавлено значение по умолчанию для tasks
  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const newTasks = tasks?.filter(task => task?.status === 'new') || [];  // Защита от undefined

  useEffect(() => {
    if (newTasks.length > 0) {
      setVisible(true);
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`New tasks assigned`, {
          body: `You have ${newTasks.length} new task${newTasks.length > 1 ? 's' : ''} to complete`,
          icon: '/notification-icon.png'
        });
      }
    }
  }, [tasks, newTasks.length]);

  // eslint-disable-next-line no-unused-vars
  const handleClose = (e) => {
    e.stopPropagation();
    setVisible(false);
    onClose?.();
  };

  // eslint-disable-next-line no-unused-vars
  const handleTaskClick = (e, taskId) => {
    e.stopPropagation();
    onTaskClick?.(taskId);
  };

  if (!visible || newTasks.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        onClick={() => setExpanded(!expanded)}
        className={`notification ${newTasks.some(t => t.priority === 'high') ? 'notification-high' : 
                   newTasks.some(t => t.priority === 'medium') ? 'notification-medium' : 'notification-low'}`}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          color: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          maxWidth: '350px',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        {/* Остальной код остается без изменений */}
      </motion.div>
    </AnimatePresence>
  );
}

export default TaskNotification;