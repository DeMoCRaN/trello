import React, { useEffect, useMemo, useState } from 'react';
import BaseModal from './BaseModal';
import './TeamMembersPanel.css';

function TeamMembersPanel({ assignmentId, onClose }) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [feedback, setFeedback] = useState(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState(null);
  const [removingMemberId, setRemovingMemberId] = useState(null);

  useEffect(() => {
    if (assignmentId) {
      fetchTeamMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const acceptedMembersCount = useMemo(
    () => teamMembers.filter((member) => member.status === 'accepted').length,
    [teamMembers]
  );

  const pendingMembersCount = useMemo(
    () => teamMembers.filter((member) => member.status === 'pending').length,
    [teamMembers]
  );

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/assignments/${assignmentId}/team`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Не удалось загрузить состав команды');
      }

      const data = await response.json();
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (event) => {
    event.preventDefault();

    const email = inviteEmail.trim();
    if (!email) {
      setFeedback({ type: 'error', text: 'Введите email пользователя.' });
      return;
    }

    try {
      setInviting(true);
      setFeedback(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/assignments/${assignmentId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_email: email }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Не удалось отправить приглашение');
      }

      setFeedback({ type: 'success', text: `Приглашение отправлено: ${email}` });
      setInviteEmail('');
      setShowInviteModal(false);
      await fetchTeamMembers();
      window.dispatchEvent(new Event('taskUpdated'));
    } catch (inviteError) {
      setFeedback({ type: 'error', text: inviteError.message });
    } finally {
      setInviting(false);
    }
  };

  const askRemoveMember = (member) => {
    setConfirmRemoveMember(member);
  };

  const handleRemoveMemberConfirmed = async () => {
    if (!confirmRemoveMember) {
      return;
    }

    try {
      setRemovingMemberId(confirmRemoveMember.user_id);
      setFeedback(null);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/assignments/${assignmentId}/team/${confirmRemoveMember.user_id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Не удалось удалить участника из команды');
      }

      setFeedback({
        type: 'success',
        text: `Участник удалён: ${confirmRemoveMember.user_name || confirmRemoveMember.user_email}`,
      });

      setConfirmRemoveMember(null);
      await fetchTeamMembers();
      window.dispatchEvent(new Event('taskUpdated'));
    } catch (removeError) {
      setFeedback({ type: 'error', text: removeError.message });
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Ожидает ответа';
      case 'accepted':
        return 'В команде';
      case 'rejected':
        return 'Отклонено';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'accepted':
        return '#16a34a';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <BaseModal onClose={onClose} title="Состав команды" size="md" panelClassName="task-creation-form team-members-panel">
        <div className="loading-container">Загрузка состава команды...</div>
      </BaseModal>
    );
  }

  if (error) {
    return (
      <BaseModal onClose={onClose} title="Ошибка" size="md" panelClassName="task-creation-form team-members-panel">
        <p>{error}</p>
        <button type="button" className="submit-button" onClick={onClose}>
          Закрыть
        </button>
      </BaseModal>
    );
  }

  return (
    <>
      <BaseModal onClose={onClose} title="Состав команды" size="md" panelClassName="task-creation-form team-members-panel">
        <div className="team-stats">
          <p>Участников в команде: {acceptedMembersCount}</p>
          <p>Приглашений ожидают ответа: {pendingMembersCount}</p>
        </div>

        {feedback && (
          <div className={`panel-feedback panel-feedback--${feedback.type}`}>
            {feedback.text}
          </div>
        )}

        <div className="invite-section">
          <button
            type="button"
            className="submit-button"
            onClick={() => {
              setShowInviteModal(true);
              setInviteEmail('');
              setFeedback(null);
            }}
          >
            Пригласить участника
          </button>
        </div>

        <div className="team-members-list">
          <h4>Участники и приглашения</h4>

          {teamMembers.length === 0 ? (
            <p>Пока никого не приглашали.</p>
          ) : (
            <ul>
              {teamMembers.map((member) => {
                const canRemove = member.status !== 'rejected';
                const removeLabel = member.status === 'pending' ? 'Отменить приглашение' : 'Удалить из команды';

                return (
                  <li key={member.id} className="team-member-item">
                    <div className="member-main-row">
                      <div className="member-info">
                        <strong>{member.user_name || member.user_email}</strong>
                        <span className="member-email">{member.user_email}</span>
                      </div>

                      <div className="member-actions">
                        <span
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(member.status) }}
                        >
                          {getStatusText(member.status)}
                        </span>

                        {canRemove && (
                          <button
                            type="button"
                            className="remove-member-button"
                            onClick={() => askRemoveMember(member)}
                            disabled={removingMemberId === member.user_id}
                          >
                            {removingMemberId === member.user_id ? 'Удаление...' : removeLabel}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="member-invited-by">
                      Пригласил: {member.invited_by_name || member.invited_by_email || 'неизвестно'}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button type="button" className="submit-button" onClick={onClose}>
          Закрыть
        </button>
      </BaseModal>

      {confirmRemoveMember && (
        <BaseModal
          onClose={() => setConfirmRemoveMember(null)}
          title="Подтверждение удаления"
          size="sm"
          panelClassName="task-creation-form team-members-confirm-modal"
        >
          <p className="confirm-text">
            Удалить участника
            {' '}
            <strong>{confirmRemoveMember.user_name || confirmRemoveMember.user_email}</strong>
            {' '}
            из команды?
          </p>
          <div className="confirm-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={() => setConfirmRemoveMember(null)}
              disabled={removingMemberId === confirmRemoveMember.user_id}
            >
              Отмена
            </button>
            <button
              type="button"
              className="remove-member-button"
              onClick={handleRemoveMemberConfirmed}
              disabled={removingMemberId === confirmRemoveMember.user_id}
            >
              {removingMemberId === confirmRemoveMember.user_id ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </BaseModal>
      )}

      {showInviteModal && (
        <BaseModal
          onClose={() => {
            setShowInviteModal(false);
            setInviteEmail('');
          }}
          title="Пригласить участника"
          size="sm"
          panelClassName="task-creation-form team-members-invite-modal"
        >
          <div className="invite-form">
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
                    setShowInviteModal(false);
                    setInviteEmail('');
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </BaseModal>
      )}
    </>
  );
}

export default TeamMembersPanel;
