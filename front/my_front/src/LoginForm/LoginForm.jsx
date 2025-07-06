import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './LoginForm.css';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Ошибка при авторизации');
        return;
      }

      const data = await response.json();
      // Сохраняем токен в localStorage
      localStorage.setItem('token', data.token);
      // Сохраняем время истечения сессии (через 1 час)
      const expiryTime = new Date().getTime() + 60 * 60 * 1000;
      localStorage.setItem('tokenExpiry', expiryTime);
      // Перенаправляем на главную страницу
      navigate('/main');
    } catch {
      setError('Ошибка сети');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Вход</h2>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Пароль:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit">Войти</button>
    </form>
  );
}

export default LoginForm;
