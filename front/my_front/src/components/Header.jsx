import React from 'react';
import './Header.css';

function Header({ userEmail, onNavigate }) {
  console.log('Header userEmail prop:', userEmail);
  return (
    <header className="app-header">
      <div className="logo">
        <img src="/image/logo.png" alt="Logo" style={{ height: '40px' }} />
      </div>
      <nav className="nav-buttons">
        <button onClick={() => onNavigate('main')}>Главная</button>
        <button onClick={() => onNavigate('assignments')}>Задания</button>
        <button onClick={() => onNavigate('tasks')}>Задачи</button>
        <button onClick={() => onNavigate('profile')}>Профиль</button>
      </nav>
      <div className="user-email">{userEmail ? userEmail : 'Не авторизован'}</div>
    </header>
  );
}

export default Header;
