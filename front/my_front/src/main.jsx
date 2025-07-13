import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import LoginForm from './LoginForm/LoginForm.jsx'
import MainPage from './MainPage.jsx'
import AssignedTasksPage from './AssignedTasksPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/tasks" element={<AssignedTasksPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
