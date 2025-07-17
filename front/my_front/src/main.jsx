import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import LoginForm from './LoginForm/LoginForm.jsx'
import MainPage from './MainPage.jsx'
import AssignedTasksWrapper from './AssignedTasksWrapper.jsx'
import Dashboard from '../src/components/Dashboard.jsx'

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        })
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

// eslint-disable-next-line react-refresh/only-export-components
const MainPageWrapper = () => {
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const tokenExpiry = localStorage.getItem('tokenExpiry')
    const now = new Date().getTime()

    async function fetchUserEmail(userId) {
      try {
        const response = await fetch("http://localhost:3000/api/users/" + userId)
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

  return <MainPage userEmail={userEmail} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/main" element={<MainPageWrapper />} />
        <Route path="/tasks" element={<AssignedTasksWrapper />} />
        <Route path="/dashboard" element={<Dashboard/>}/>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
