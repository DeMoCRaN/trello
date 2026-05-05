import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import LoginForm from './LoginForm/LoginForm.jsx';
import MainPage from './MainPage.jsx';
import AssignedTasksWrapper from './AssignedTasksWrapper.jsx';
import Dashboard from '../src/components/Dashboard.jsx';
import UserProfileForm from './components/UserProfileForm.jsx';
import UserInfoPage from './pages/UserInfoPage.jsx';


function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
const MainPageWrapper = () => {
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    const now = new Date().getTime();

    async function fetchUserEmail(userId) {
      try {
        const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}` // Добавляем токен в заголовки
          }
        });

        if (response.status === 401) {
          // Если 401 - удаляем недействительный токен
          localStorage.removeItem('token');
          localStorage.removeItem('tokenExpiry');
          throw new Error('Требуется повторная авторизация');
        }

        if (!response.ok) {
          throw new Error(`Ошибка сервера: ${response.status}`);
        }

        const userData = await response.json();
        setUserEmail(userData.email || '');
      } catch (error) {
        console.error('Error fetching user email:', error);
        setUserEmail('');
      } finally {
        setLoading(false);
      }
    }

    if (token && tokenExpiry && now < parseInt(tokenExpiry, 10)) {
      const decoded = parseJwt(token);
      if (decoded?.userId) {
        fetchUserEmail(decoded.userId);
        return;
      }
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiry');
    setUserEmail('');
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Загрузка данных пользователя...</div>;
  }

  return <MainPage userEmail={userEmail} />;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/main" element={<MainPageWrapper />} />
        <Route path="/tasks" element={<AssignedTasksWrapper />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<UserProfileForm/>} />
        <Route path="/user-info" element={<UserInfoPage />} />
      </Routes>

    </BrowserRouter>
  </StrictMode>
);
