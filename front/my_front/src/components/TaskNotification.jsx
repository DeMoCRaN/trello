import React, { useEffect, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiX, FiChevronDown, FiChevronUp, FiMessageSquare } from 'react-icons/fi';
import './TaskNotification.css';

function TaskNotification({
  tasks = [],
  comments = [],
  invitations = [],
  onClose,
  onTaskClick,
  onCommentClick,
  onInvitationClick
}) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isBellRinging, setIsBellRinging] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');

  const newTasks = tasks?.filter(task => task?.status === 'new') || [];
  const newComments = comments?.filter(comment => comment?.is_new) || [];
  const pendingInvitations = invitations?.filter(inv => inv?.status === 'pending') || [];

  useEffect(() => {
    if (pendingInvitations.length > 0) {
      setActiveTab('invitations');
    } else if (newComments.length > 0) {
      setActiveTab('comments');
    } else if (newTasks.length > 0) {
      setActiveTab('tasks');
    }
  }, [pendingInvitations.length, newComments.length, newTasks.length]);

  const hasNotifications = newTasks.length > 0 || newComments.length > 0 || pendingInvitations.length > 0;

  const notificationPriority = () => {
    if (newTasks.some(t => t.priority === 'high')) return 'high';
    if (newComments.length > 0) return 'medium';
    if (newTasks.some(t => t.priority === 'medium')) return 'medium';
    return 'low';
  };

  useEffect(() => {
    setVisible(hasNotifications);
    if (hasNotifications && !isBellRinging) {
      setIsBellRinging(true);

      // Stop bell animation after 5 seconds
      const timer = setTimeout(() => setIsBellRinging(false), 5000);

      return () => clearTimeout(timer);
    } else if (!hasNotifications) {
      setIsBellRinging(false);
    }
  }, [hasNotifications, isBellRinging]);

  const handleClose = (e) => {
    e.stopPropagation();
    setVisible(false);
    onClose?.();
  };

  const handleTaskClick = (e, taskId) => {
    e.stopPropagation();
    onTaskClick?.(taskId);
  };

  const handleCommentClick = (e, comment) => {
    e.stopPropagation();
    onCommentClick?.(comment);
  };

  if (!visible || !hasNotifications) return null;

  const priority = notificationPriority();
  const priorityClass = `notification-${priority}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={`notification ${priorityClass}`}
      >
        <div className="notification-header" onClick={() => setExpanded(!expanded)}>
          <div className="notification-content">
            <motion.div
              animate={isBellRinging ? {
                rotate: [0, 15, -15, 15, -15, 0],
                transition: { duration: 0.5, repeat: 2 }
              } : {}}
              onHoverStart={() => setIsBellRinging(true)}
              onHoverEnd={() => setIsBellRinging(false)}
            >
              <FiBell size={20} className={`notification-priority-${priority}`} />
            </motion.div>
            <div>
              <h4 className="notification-title">
                {newTasks.length > 0 && newComments.length > 0 && pendingInvitations.length > 0 ? 'New Tasks, Comments & Invitations' :
                 newTasks.length > 0 && newComments.length > 0 ? 'New Tasks & Comments' :
                 newTasks.length > 0 && pendingInvitations.length > 0 ? 'New Tasks & Invitations' :
                 newComments.length > 0 && pendingInvitations.length > 0 ? 'New Comments & Invitations' :
                 newTasks.length > 0 ? 'New Tasks Assigned' :
                 newComments.length > 0 ? 'New Comments' : 'New Invitations'}
              </h4>
              <p className="notification-subtitle">
                {newTasks.length > 0 && `${newTasks.length} new task${newTasks.length > 1 ? 's' : ''}`}
                {(newTasks.length > 0 && (newComments.length > 0 || pendingInvitations.length > 0)) ? ', ' : ''}
                {newComments.length > 0 && `${newComments.length} new comment${newComments.length > 1 ? 's' : ''}`}
                {(newComments.length > 0 && pendingInvitations.length > 0) ? ', ' : ''}
                {pendingInvitations.length > 0 && `${pendingInvitations.length} new invitation${pendingInvitations.length > 1 ? 's' : ''}`}
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
              {/* Tabs for switching between tasks, comments, and invitations */}
              <div className="notification-tabs">
                <button
                  className={`notification-tab ${activeTab === 'tasks' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('tasks');
                  }}
                  disabled={newTasks.length === 0}
                >
                  Tasks ({newTasks.length})
                </button>
                <button
                  className={`notification-tab ${activeTab === 'comments' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('comments');
                  }}
                  disabled={newComments.length === 0}
                >
                  Comments ({newComments.length})
                </button>
                <button
                  className={`notification-tab ${activeTab === 'invitations' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('invitations');
                  }}
                  disabled={pendingInvitations.length === 0}
                >
                  Invitations ({pendingInvitations.length})
                </button>
              </div>

              {/* Tasks list */}
              {activeTab === 'tasks' && newTasks.length > 0 && (
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
              )}

              {/* Comments list */}
              {activeTab === 'comments' && newComments.length > 0 && (
                <ul className="notification-list">
                  {newComments.map((comment, index) => (
                    <motion.li
                      key={comment.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={(e) => handleCommentClick(e, comment)}
                      className="notification-item"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiMessageSquare size={16} />
                        <span className="notification-comment-text">
                          New comment on task: {comment.task_title || `Task ${comment.task_id}`}
                        </span>
                      </div>
                      <p className="notification-comment-preview">
                        {comment.text.length > 50
                          ? `${comment.text.substring(0, 50)}...`
                          : comment.text}
                      </p>
                      <p className="notification-comment-meta">
                        By {comment.author_name} • {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </motion.li>
                  ))}
                </ul>
              )}

              {/* Invitations list */}
              {activeTab === 'invitations' && pendingInvitations.length > 0 && (
                <ul className="notification-list">
                  {pendingInvitations.map((invitation, index) => (
                    <motion.li
                      key={invitation.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onInvitationClick?.(invitation);
                      }}
                      className="notification-item"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiBell size={16} />
                        <span className="notification-invitation-text">
                          Invitation to project: {invitation.assignment_title}
                        </span>
                      </div>
                      <p className="notification-invitation-preview">
                        {invitation.assignment_description
                          ? (invitation.assignment_description.length > 50
                            ? `${invitation.assignment_description.substring(0, 50)}...`
                            : invitation.assignment_description)
                          : 'No description available'}
                      </p>
                      <p className="notification-invitation-meta">
                        Invited by {invitation.invited_by_name} • {new Date(invitation.invited_at).toLocaleString()}
                      </p>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

export default TaskNotification;