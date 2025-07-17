// src/MainPageWrapper.jsx
import { useState, useEffect } from 'react'
import { parseJwt } from './utils/wt'
import MainPage from './MainPage' // Импортируем MainPage напрямую
import AssignedTasks from './AssignedTasks' // Импорт AssignedTasks

export default function MainPageWrapper() {
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const tokenExpiry = localStorage.getItem('tokenExpiry')
    const now = new Date().getTime()

    async function fetchUserEmail(userId) {
      try {
        const response = await fetch(`http://localhost:3000/api/users/${userId}`)
        if (!response.ok) {
          throw new Error('Ошибка при получении данных пользователя')
        }
        const userData = await response.json()
        setUserEmail(userData.email || '')
      } catch (error) {
        console.error('Error fetching user email:', error)
        setUserEmail('')
      }
    }

    if (token && tokenExpiry && now < parseInt(tokenExpiry, 10)) {
      const decoded = parseJwt(token)
      if (decoded) {
        if (decoded.userId) {
          fetchUserEmail(decoded.userId)
        }
      }
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('tokenExpiry')
      setUserEmail('')
    }
  }, [])

  if (!userEmail) {
    return <div>Loading user data...</div>;
  }

  return (
    <>
      <MainPage userEmail={userEmail} />
    </>
  )
  
}
