import { useState, useEffect } from 'react';
import { parseJwt } from './utils/wt';
import MainPage from './MainPage';

export default function MainPageWrapper() {
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const tokenExpiry = localStorage.getItem('tokenExpiry');

    async function fetchUser() {
      try {
        // 1. Сначала проверяем токен локально
        if (!token || !tokenExpiry || new Date().getTime() > parseInt(tokenExpiry, 10)) {
          throw new Error('Токен недействителен или истёк');
        }

        // 2. Декодируем токен для получения userId
        const decoded = parseJwt(token);
        if (!decoded?.userId) {
          throw new Error('Неверный формат токена');
        }

        // 3. Запрашиваем данные пользователя
        const response = await fetch(`http://localhost:5000/api/users/${decoded.userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('tokenExpiry');
          throw new Error('Требуется повторная авторизация');
        }

        if (!response.ok) {
          throw new Error(`Ошибка сервера: ${response.status}`);
        }

        const userData = await response.json();
        setUserEmail(userData.email);
      } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
        setUserEmail('');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  if (loading) {
    return <div>Загрузка данных пользователя...</div>;
  }

  return <MainPage userEmail={userEmail} />;
}