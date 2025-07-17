import React, { useEffect, useState } from 'react';

function UserInfo({ userEmail, onBack }) {
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const response = await fetch(`http://localhost:3000/api/users/email/${encodeURIComponent(userEmail)}`);
        if (!response.ok) {
          throw new Error('Ошибка при загрузке информации о пользователе');
        }
        const data = await response.json();
        setUserInfo(data);
      } catch (err) {
        setError(err.message);
      }
    }
    if (userEmail) {
      fetchUserInfo();
    }
  }, [userEmail]);

  if (error) {
    return <div>Ошибка: {error}</div>;
  }

  if (!userInfo) {
    return <div>Загрузка информации о пользователе...</div>;
  }

  return (
    <div>
      <h2>Информация о пользователе</h2>
      <p><strong>ID:</strong> {userInfo.id}</p>
      <p><strong>Email:</strong> {userInfo.email}</p>
      <p><strong>Роль:</strong> {userInfo.role_id}</p>
      <button onClick={onBack}>Назад</button>
    </div>
  );
}

export default UserInfo;
