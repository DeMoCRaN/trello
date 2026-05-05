import React, { useEffect, useMemo, useState } from 'react';
import {  motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiX, FiChevronDown, FiChevronUp, FiMessageSquare } from 'react-icons/fi';
import './TaskNotification.css';

function getCountLabel(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} ${one}`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} ${few}`;
  }

  return `${count} ${many}`;
}

function TaskNotification({
  tasks = [],
  comments = [],
  invitations = [],
  onClose,
  onTaskClick,
  onCommentClick,
  onInvitationClick,
}) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isBellRinging, setIsBellRinging] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');

  const newTasks = tasks?.filter((task) => task?.status === 'new') || [];
  const newComments = comments || [];
  const pendingInvitations = invitations?.filter((invitation) => invitation?.status === 'pending') || [];

  const invitationFeed = useMemo(() => {
    const inviteItems = pendingInvitations.map((item) => ({
      ...item,
      __kind: 'invite',
    }));

    return [...inviteItems].sort((a, b) => {
      const da = new Date(a.created_at || a.invited_at || 0).getTime();
      const db = new Date(b.created_at || b.invited_at || 0).getTime();
      return db - da;
    });
  }, [pendingInvitations]);

  useEffect(() => {
    if (invitationFeed.length > 0) {
      setActiveTab('invitations');
    } else if (newComments.length > 0) {
      setActiveTab('comments');
    } else if (newTasks.length > 0) {
      setActiveTab('tasks');
    }
  }, [invitationFeed.length, newComments.length, newTasks.length]);

  const hasNotifications = newTasks.length > 0 || newComments.length > 0 || invitationFeed.length > 0;

  const notificationPriority = () => {
    if (newTasks.some((task) => task.priority === 'high')) {
      return 'high';
    }

    if (newComments.length > 0 || invitationFeed.length > 0) {
      return 'medium';
    }

    if (newTasks.some((task) => task.priority === 'medium')) {
      return 'medium';
    }

    return 'low';
  };

  useEffect(() => {
    setVisible(hasNotifications);

    if (hasNotifications && !isBellRinging) {
      setIsBellRinging(true);
      const timer = setTimeout(() => setIsBellRinging(false), 10000);
      return () => clearTimeout(timer);
    }

    if (!hasNotifications) {
      setIsBellRinging(false);
    }

    return undefined;
  }, [hasNotifications, isBellRinging]);

  if (!visible || !hasNotifications) {
    return null;
  }

  const priority = notificationPriority();
  const priorityClass = `notification-${priority}`;
  const tasksLabel = getCountLabel(newTasks.length, 'новая задача', 'новые задачи', 'новых задач');
  const commentsLabel = getCountLabel(newComments.length, 'новый комментарий', 'новые комментарии', 'новых комментариев');
  const invitationsLabel = getCountLabel(invitationFeed.length, 'новое приглашение/событие', 'новые приглашения/события', 'новых приглашений/событий');

  const title = (() => {
    if (invitationFeed.length > 0 && newTasks.length === 0 && newComments.length === 0) {
      return 'Новые приглашения и события команды';
    }

    if (newTasks.length > 0 && newComments.length > 0 && invitationFeed.length > 0) {
      return 'Новые задачи, комментарии и приглашения';
    }

    if (newTasks.length > 0 && newComments.length > 0) {
      return 'Новые задачи и комментарии';
    }

    if (newTasks.length > 0 && invitationFeed.length > 0) {
      return 'Новые задачи и приглашения';
    }

    if (newComments.length > 0 && invitationFeed.length > 0) {
      return 'Новые комментарии и приглашения';
    }

    if (newTasks.length > 0) {
      return 'Новые назначенные задачи';
    }

    if (newComments.length > 0) {
      return 'Новые комментарии';
    }

    return 'Новые приглашения';
  })();

  const subtitle = [
    newTasks.length > 0 ? tasksLabel : null,
    newComments.length > 0 ? commentsLabel : null,
    invitationFeed.length > 0 ? invitationsLabel : null,
  ].filter(Boolean).join(', ');

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
                transition: { duration: 0.5, repeat: 2 },
              } : {}}
              onHoverStart={() => setIsBellRinging(true)}
              onHoverEnd={() => setIsBellRinging(false)}
            >
              <FiBell size={20} className={`notification-priority-${priority}`} />
            </motion.div>
            <div>
              <h4 className="notification-title">{title}</h4>
              <p className="notification-subtitle">{subtitle}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(event) => {
                event.stopPropagation();
                setExpanded(!expanded);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              {expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
            </motion.button>

            <motion.button
              onClick={(event) => {
                event.stopPropagation();
                setVisible(false);
                onClose?.();
              }}
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
              <div className="notification-tabs">
                <button
                  className={`notification-tab ${activeTab === 'tasks' ? 'active' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveTab('tasks');
                  }}
                  disabled={newTasks.length === 0}
                >
                  Задачи ({newTasks.length})
                </button>

                <button
                  className={`notification-tab ${activeTab === 'comments' ? 'active' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveTab('comments');
                  }}
                  disabled={newComments.length === 0}
                >
                  Комментарии ({newComments.length})
                </button>

                <button
                  className={`notification-tab ${activeTab === 'invitations' ? 'active' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveTab('invitations');
                  }}
                  disabled={invitationFeed.length === 0}
                >
                  Приглашения ({invitationFeed.length})
                </button>
              </div>

              {activeTab === 'tasks' && newTasks.length > 0 && (
                <ul className="notification-list">
                  {newTasks.map((task, index) => (
                    <motion.li
                      key={task.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        onTaskClick?.(task.id);
                      }}
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
                          Срок: {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                        </p>
                      )}
                    </motion.li>
                  ))}
                </ul>
              )}

              {activeTab === 'comments' && newComments.length > 0 && (
                <ul className="notification-list">
                  {newComments.map((comment, index) => (
                    <motion.li
                      key={comment.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        onCommentClick?.(comment);
                      }}
                      className="notification-item"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiMessageSquare size={16} />
                        <span className="notification-comment-text">
                          Новый комментарий к задаче: {comment.task_title || `Задача ${comment.task_id}`}
                        </span>
                      </div>
                      <p className="notification-comment-preview">
                        {comment.text?.length > 50 ? `${comment.text.substring(0, 50)}...` : comment.text}
                      </p>
                      <p className="notification-comment-meta">
                        {comment.author_name || comment.author_email || 'Пользователь'} • {new Date(comment.created_at).toLocaleString('ru-RU')}
                      </p>
                    </motion.li>
                  ))}
                </ul>
              )}

              {activeTab === 'invitations' && invitationFeed.length > 0 && (
                <ul className="notification-list">
                  {invitationFeed.map((item, index) => (
                    <motion.li
                      key={`${item.__kind}-${item.id || index}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        onInvitationClick?.(item);
                      }}
                      className="notification-item"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiBell size={16} />
                        <span className="notification-invitation-text">
                          {`Приглашение в проект: ${item.assignment_title}`}
                        </span>
                      </div>

                      <p className="notification-invitation-preview">
                        {item.assignment_description
                          ? (item.assignment_description.length > 70
                            ? `${item.assignment_description.substring(0, 70)}...`
                            : item.assignment_description)
                          : 'Описание отсутствует'}
                      </p>

                      <p className="notification-invitation-meta">
                        {`Пригласил: ${item.invited_by_name || item.invited_by_email || 'пользователь'}`} •{' '}
                        {new Date(item.invited_at || item.created_at).toLocaleString('ru-RU')}
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
