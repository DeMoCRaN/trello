import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginForm.css';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

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
      localStorage.setItem('token', data.token);
      const expiryTime = new Date().getTime() + 60 * 60 * 1000;
      localStorage.setItem('tokenExpiry', expiryTime);
      navigate('/main');
    } catch {
      setError('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3000/api/auth/github');
      const data = await response.json();
      
      // Перенаправляем на GitHub OAuth
      window.location.href = data.url;
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      setError('Ошибка при подключении к GitHub');
      setIsLoading(false);
    }
  };

  // Обработка успешной OAuth авторизации (вызывается после редиректа)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const githubConnected = urlParams.get('githubConnected');

    if (token) {
      localStorage.setItem('token', token);
      const expiryTime = new Date().getTime() + 60 * 60 * 1000;
      localStorage.setItem('tokenExpiry', expiryTime);
      
      if (githubConnected) {
        localStorage.setItem('githubConnected', 'true');
      }
      
      navigate('/main');
    }
  }, [navigate]);

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Вход</h2>
        <h4>Войдите для использования</h4>
        
        <div className="input-container">
          <label>Электронная почта:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className="input-container">
          <label>Пароль:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          type="submit" 
          disabled={isLoading}
          className="login-button"
        >
          {isLoading ? 'Вход...' : 'Войти'}
        </button>

        <div className="divider">
          <span>или</span>
        </div>

        <button 
          type="button"
          onClick={handleGitHubLogin}
          disabled={isLoading}
          className="github-login-button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          Войти через GitHub
        </button>
      </form>
    </div>
  );
}

export default LoginForm;