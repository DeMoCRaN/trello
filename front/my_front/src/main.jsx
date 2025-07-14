// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import LoginForm from './LoginForm/LoginForm.jsx'
import AssignedTasks from './AssignedTasks.jsx'
import MainPageWrapper from './MainPageWrapper'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/main" element={<MainPageWrapper />} />
        <Route path="/tasks" element={<AssignedTasks />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)