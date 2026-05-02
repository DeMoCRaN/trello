import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import '../components/Components.css';

function UserProfileForm({ userEmail, onClose }) {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, [userEmail]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/auth/github/disconnect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setUserProfile(result.user);
        setMessage('GitHub успешно отключен');
        localStorage.removeItem('githubConnected');
      } else {
        setMessage('Ошибка при отключении GitHub');
      }
    } catch (error) {
      console.error('Disconnect github error:', error);
      setMessage('Ошибка сети');
    }
  };

  const handleConnectGitHub = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/github');
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error('Connect github error:', error);
      setMessage('Ошибка при подключении к GitHub');
    }
  };

  if (!userEmail) return null;

  if (isLoading) {
    return (
      <BaseModal onClose={onClose} title="Профиль пользователя" size="sm" panelClassName="profile-modal">
        <div className="loading">Загрузка...</div>
      </BaseModal>
    );
  }

  return (
    <BaseModal onClose={onClose} title="Профиль пользователя" size="sm" panelClassName="profile-modal">
      {message && (
        <div className={`message ${message.includes('Ошибка') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="profile-details">
        <div className="detail-section">
          <h3>Основная информация</h3>
          <div className="detail-item">
<span className="detail-label">Электронная почта:</span>
            <span className="detail-value email">{userProfile?.email}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Имя:</span>
            <span className="detail-value">{userProfile?.name || 'Не указано'}</span>
          </div>
        </div>

        <div className="detail-section">
          <h3>Интеграция с GitHub</h3>
          <div className="detail-item">
            <span className="detail-label">Статус:</span>
            <span className={`detail-value ${userProfile?.github_connected ? 'connected' : 'disconnected'}`}>
              {userProfile?.github_connected ? 'Подключен' : 'Не подключен'}
            </span>
          </div>

          {userProfile?.github_connected ? (
            <>
              <div className="detail-item">
                <span className="detail-label">Имя пользователя GitHub:</span>
                <span className="detail-value github-username">
                  {userProfile?.github_username}
                </span>
              </div>
              <button onClick={handleDisconnectGitHub} className="github-button disconnect" type="button">
                Отключить GitHub
              </button>
            </>
          ) : (
            <button onClick={handleConnectGitHub} className="github-button connect" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Подключить GitHub
            </button>
          )}
        </div>

        {userProfile?.github_connected && (
          <div className="detail-section">
            <h3>Преимущества интеграции</h3>
            <ul className="benefits-list">
              <li>Автоматическая синхронизация репозиториев</li>
              <li>Отслеживание коммитов в реальном времени</li>
              <li>Автоматическое связывание задач с коммитами</li>
              <li>Доступ к приватным репозиториям</li>
            </ul>
          </div>
        )}
      </div>
    </BaseModal>
  );
}

export default UserProfileForm;
