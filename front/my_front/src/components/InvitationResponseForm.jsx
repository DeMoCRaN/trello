import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiX, FiCheck } from 'react-icons/fi';
import BaseModal from './BaseModal';
import './InvitationResponseForm.css';

function InvitationResponseForm({ invitation, onClose, onRespond, onNotify }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRespond = async (status) => {
    setIsSubmitting(true);

    try {
      await onRespond(invitation.id, status);
      onClose();
    } catch (error) {
      console.error('Ошибка при ответе на приглашение:', error);
      onNotify('Ошибка при ответе на приглашение', 'error');
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

InvitationResponseForm.propTypes = {
  invitation: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    assignment_title: PropTypes.string,
    assignment_description: PropTypes.string,
    invited_by_name: PropTypes.string,
    invited_by_email: PropTypes.string,
    invited_at: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onRespond: PropTypes.func.isRequired,
  onNotify: PropTypes.func,
};

InvitationResponseForm.defaultProps = {
  onNotify: () => {},
};

export default InvitationResponseForm;
