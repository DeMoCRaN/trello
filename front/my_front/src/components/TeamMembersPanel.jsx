import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import './TeamMembersPanel.css';

function TeamMembersPanel({ assignmentId, onClose }) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    if (assignmentId) {
      fetchTeamMembers();
    }
  }, [assignmentId]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/assignments/${assignmentId}/team`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Ошибка при загрузке состава команды');
      }

      const data = await response.json();
      setTeamMembers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (event) => {
    event.preventDefault();
    if (!inviteEmail.trim()) {
      alert('Введите email пользователя');
      return;
    }

    try {
      setInviting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/assignments/${assignmentId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_email: inviteEmail.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при приглашении пользователя');
      }

      alert('Приглашение отправлено успешно');
      setInviteEmail('');
      setShowInviteForm(false);
      fetchTeamMembers();

      const inviteEvent = new CustomEvent('teamInvitationSent', {
        detail: { assignmentId, invitedEmail: inviteEmail.trim() },
      });
      window.dispatchEvent(inviteEvent);
    } catch (err) {
      alert(err.message);
    } finally {
      setInviting(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Ожидает';
      case 'accepted':
        return 'Принят';
      case 'rejected':
        return 'Отклонен';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'accepted':
        return '#22c55e';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <BaseModal onClose={onClose} title="Состав команды" size="sm" panelClassName="task-creation-form team-members-panel">
        <div className="loading-container">Загрузка состава команды...</div>
      </BaseModal>
    );
  }

  if (error) {
    return (
      <BaseModal onClose={onClose} title="Ошибка" size="sm" panelClassName="task-creation-form team-members-panel">
        <p>{error}</p>
        <button type="button" className="submit-button" onClick={onClose}>
          Закрыть
        </button>
      </BaseModal>
    );
  }

  return (
    <BaseModal onClose={onClose} title="Состав команды" size="sm" panelClassName="task-creation-form team-members-panel">
      <div className="team-stats">
        <p>Всего участников: {teamMembers.length}</p>
      </div>

      <div className="invite-section">
        {!showInviteForm ? (
          <button
            type="button"
            className="submit-button"
            onClick={() => setShowInviteForm(true)}
          >
            Пригласить нового участника
          </button>
        ) : (
          <div className="invite-form">
            <h4>Пригласить нового участника</h4>
            <form onSubmit={handleInvite}>
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Введите email пользователя"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  required
                  className="email-input"
                />
              </div>
              <div className="invite-buttons">
                <button type="submit" className="submit-button" disabled={inviting}>
                  {inviting ? 'Отправка...' : 'Пригласить'}
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteEmail('');
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="team-members-list">
        <h4>Участники команды</h4>
        {teamMembers.length === 0 ? (
          <p>В команде пока нет участников</p>
        ) : (
          <ul>
            {teamMembers.map((member) => (
              <li key={member.id} className="team-member-item">
                <div className="member-info">
                  <strong>{member.user_name || member.user_email}</strong>
                  <span className="member-email">({member.user_email})</span>
                </div>
                <div className="member-status">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(member.status) }}
                  >
                    {getStatusText(member.status)}
                  </span>
                </div>
                <div className="member-invited-by">
                  Приглашен: {member.invited_by_name || member.invited_by_email}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" className="submit-button" onClick={onClose}>
        Закрыть
      </button>
    </BaseModal>
  );
}

export default TeamMembersPanel;
