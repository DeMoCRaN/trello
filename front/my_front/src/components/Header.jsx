import React from 'react';
import './Header.css';
import { Link, useNavigate } from 'react-router-dom';
import { FiInbox } from 'react-icons/fi';

function Header({ userEmail, onNavigate, unreadCommentsCount = 0, onCommentsClick }) {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div className="logo">
        <img src="/image/logo.png" alt="Логотип" style={{ height: '40px' }} />
      </div>

      <nav className="nav-buttons">
        <button onClick={() => onNavigate('main')}>Главная</button>
        <Link to="/tasks"><button>Задачи</button></Link>
        <Link to="/dashboard"><button>Дашборд</button></Link>
        <button onClick={() => navigate('/user-info')}>Профиль</button>
      </nav>

      <div className="header-right">
        {onCommentsClick && (
          <button
            className="notification-bell"
            onClick={onCommentsClick}
title="Центр уведомлений"
          >
            <FiInbox size={20} />
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
              navigate('/user-info');
            }
          }}
        >
          {userEmail || 'Не авторизован'}
        </div>
      </div>
    </header>
  );
}

export default Header;


