import { useState, useEffect } from 'react'
import { parseJwt } from './utils/wt'
import AssignedTasks from './AssignedTasks'

const AssignedTasksWrapper = () => {
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const tokenExpiry = localStorage.getItem('tokenExpiry')
    const now = new Date().getTime()

    async function fetchUserEmail(userId) {
      try {
        const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}` // Добавляем токен в заголовки
          }
        })

        if (response.status === 401) {
          // Если токен недействителен, очищаем хранилище
          localStorage.removeItem('token')
          localStorage.removeItem('tokenExpiry')
          throw new Error('Требуется повторная авторизация')
        }

        if (!response.ok) {
          throw new Error(`Ошибка сервера: ${response.status}`)
        }

        const userData = await response.json()
        setUserEmail(userData.email || '')
      } catch (error) {
        console.error('Error fetching user email:', error)
        setUserEmail('')
      } finally {
        setLoading(false)
      }
    }

    if (token && tokenExpiry && now < parseInt(tokenExpiry, 10)) {
      const decoded = parseJwt(token)
      if (decoded?.userId) {
        fetchUserEmail(decoded.userId)
        return
      }
    }
    
    localStorage.removeItem('token')
    localStorage.removeItem('tokenExpiry')
    setUserEmail('')
    setLoading(false)
  }, [])

  if (loading) {
    return <div>Загрузка данных пользователя...</div>
  }

  return <AssignedTasks userEmail={userEmail} />
}

export default AssignedTasksWrapper