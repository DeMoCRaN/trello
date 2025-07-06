import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import LoginForm from './LoginForm/LoginForm.jsx'
import MainPage from './MainPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/main" element={<MainPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
