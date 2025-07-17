import React from 'react';
import './Header.css';

import { Link } from 'react-router-dom';

function Header({ userEmail, onNavigate,  }) {
  console.log('Header userEmail prop:', userEmail);
  return (
    <header className="app-header">
      <div className="logo">
        <img src="/image/logo.png" alt="Logo" style={{ height: '40px' }} />
      </div>
      <nav className="nav-buttons">
        <button onClick={() => onNavigate('main')}>Главная</button>
        <Link to="/tasks"><button>Задачи</button></Link>
        <Link to="/dashboard"><button>Дешборд</button></Link>
      </nav>
      <div
        className="user-email"
        style={{ cursor: userEmail ? 'pointer' : 'default', textDecoration: userEmail ? 'underline' : 'none' }}
        onClick={() => {
          if (userEmail) {
            onNavigate('user-info');
          }
        }}
      >
        {userEmail ? userEmail : 'Не авторизован'}
      </div>
    </header>
  );
}

export default Header;
