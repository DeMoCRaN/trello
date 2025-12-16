import React from 'react';
import './Header.css';
import { Link } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';

// eslint-disable-next-line no-unused-vars
function Header({ userEmail, onNavigate, unreadCommentsCount = 0, onCommentsClick, totalNotifications = 0 }) {
  // console.log('Header userEmail prop:', userEmail);
  return (
    <header className="app-header">
      <div className="logo">
        <img src="/image/logo.png" alt="Logo" style={{ height: '40px' }} />
      </div>
      <nav className="nav-buttons">
        <button onClick={() => onNavigate('main')}>Главная</button>
        <Link to="/tasks"><button>Задачи</button></Link>
        <Link to="/dashboard"><button>Дешборд</button></Link>
        <button onClick={() => onNavigate('user-info')}>Профиль</button>
      </nav>
      <div className="header-right">
        {/* Notification Bell */}
        {onCommentsClick && (
          <button
            className="notification-bell"
            onClick={onCommentsClick}
            title="Уведомления"
          >
            <FiBell size={20} />
            {unreadCommentsCount > 0 && (
              <span className="notification-badge">{unreadCommentsCount}</span>
            )}
          </button>
        )}

        <div
          className="user-email"
          style={{ cursor: userEmail ? 'pointer' : 'default', textDecoration: userEmail ? 'underline' : 'none' }}
          onClick={() => {
            if (userEmail) {
              alert('не работает временно');
            }
          }}
        >
          {userEmail ? userEmail : 'Не авторизован'}
        </div>
      </div>
    </header>
  );
}

export default Header;
