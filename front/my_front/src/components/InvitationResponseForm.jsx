import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { FiX, FiCheck } from 'react-icons/fi';
import './InvitationResponseForm.css';

function InvitationResponseForm({ invitation, onClose, onRespond }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRespond = async (status) => {
    setIsSubmitting(true);
    try {
      await onRespond(invitation.id, status);
      onClose();
    } catch (error) {
      console.error('Ошибка при ответе на приглашение:', error);
      alert('Ошибка при ответе на приглашение');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="invitation-response-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="invitation-response-form"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="invitation-response-header">
          <h3>Приглашение в проект</h3>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="invitation-response-close-btn"
          >
            <FiX size={20} />
          </motion.button>
        </div>

        <div className="invitation-response-content">
          <div className="invitation-details">
            <h4>{invitation.assignment_title}</h4>
            <p className="invitation-description">
              {invitation.assignment_description || 'Описание отсутствует'}
            </p>
            <div className="invitation-meta">
              <p><strong>Пригласил:</strong> {invitation.invited_by_name}</p>
              <p><strong>Email пригласившего:</strong> {invitation.invited_by_email}</p>
              <p><strong>Дата приглашения:</strong> {new Date(invitation.invited_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="invitation-actions">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleRespond('accepted')}
              disabled={isSubmitting}
              className="invitation-accept-btn"
            >
              <FiCheck size={18} />
              Принять приглашение
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleRespond('rejected')}
              disabled={isSubmitting}
              className="invitation-reject-btn"
            >
              <FiX size={18} />
              Отклонить приглашение
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default InvitationResponseForm;