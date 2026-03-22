import React, { useState } from 'react';
import { FiX, FiCheck } from 'react-icons/fi';
import BaseModal from './BaseModal';
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
    <BaseModal onClose={onClose} title="Приглашение в проект" size="sm" panelClassName="invitation-response-form">
      <div className="invitation-response-content">
        <div className="invitation-details">
          <h4>{invitation.assignment_title}</h4>
          <p className="invitation-description">
            {invitation.assignment_description || 'Описание отсутствует'}
          </p>
          <div className="invitation-meta">
            <p><strong>Пригласил:</strong> {invitation.invited_by_name}</p>
            <p><strong>Email пригласившего:</strong> {invitation.invited_by_email}</p>
            <p><strong>Дата приглашения:</strong> {new Date(invitation.invited_at).toLocaleString('ru-RU')}</p>
          </div>
        </div>

        <div className="invitation-actions">
          <button
            onClick={() => handleRespond('accepted')}
            disabled={isSubmitting}
            className="invitation-accept-btn"
            type="button"
          >
            <FiCheck size={18} />
            Принять приглашение
          </button>

          <button
            onClick={() => handleRespond('rejected')}
            disabled={isSubmitting}
            className="invitation-reject-btn"
            type="button"
          >
            <FiX size={18} />
            Отклонить приглашение
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

export default InvitationResponseForm;
