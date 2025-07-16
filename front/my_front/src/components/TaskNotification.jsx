import React, { useEffect, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import './TaskNotification.css';

function TaskNotification({ tasks = [], onClose, onTaskClick }) {
  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [isBellRinging, setIsBellRinging] = useState(false);
  const newTasks = tasks?.filter(task => task?.status === 'new') || [];

  useEffect(() => {
    if (newTasks.length > 0) {
      setVisible(true);
      setIsBellRinging(true);
      
      // Автоматически остановить анимацию через 2 секунды
      const timer = setTimeout(() => setIsBellRinging(false), 2000);
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`New tasks assigned`, {
          body: `You have ${newTasks.length} new task${newTasks.length > 1 ? 's' : ''} to complete`,
          icon: '/notification-icon.png'
        });
      }
      
      return () => clearTimeout(timer);
    }
  }, [tasks, newTasks.length]);

  const handleClose = (e) => {
    e.stopPropagation();
    setVisible(false);
    onClose?.();
  };

  const handleTaskClick = (e, taskId) => {
    e.stopPropagation();
    onTaskClick?.(taskId);
  };

  if (!visible || newTasks.length === 0) return null;

  const priorityClass = newTasks.some(t => t.priority === 'high') ? 'notification-high' : 
                       newTasks.some(t => t.priority === 'medium') ? 'notification-medium' : 'notification-low';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        onClick={() => setExpanded(!expanded)}
        className={`notification ${priorityClass}`}
      >
        <div className="notification-header">
          <div className="notification-content">
            <motion.div
              animate={isBellRinging ? {
                rotate: [0, 15, -15, 15, -15, 0],
                transition: { duration: 0.5, repeat: 2 }
              } : {}}
              onHoverStart={() => setIsBellRinging(true)}
              onHoverEnd={() => setIsBellRinging(false)}
            >
              <FiBell size={20} className={`notification-priority-${newTasks[0]?.priority || 'low'}`} />
            </motion.div>
            <div>
              <h4 className="notification-title">New Tasks Assigned</h4>
              <p className="notification-subtitle">
                {newTasks.length} new task{newTasks.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              {expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
            </motion.button>
            <motion.button 
              onClick={handleClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="notification-close-btn"
            >
              <FiX size={18} />
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="notification-body"
            >
              <ul className="notification-list">
                {newTasks.map((task, index) => (
                  <motion.li
                    key={task.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={(e) => handleTaskClick(e, task.id)}
                    className="notification-item"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="notification-task-title">{task.title}</span>
                      <span className={`notification-priority notification-priority-${task.priority}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.dueDate && (
                      <p className="notification-due-date">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

export default TaskNotification;