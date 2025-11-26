const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

// Генерация JWT токена
function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// OAuth авторизация через GitHub
router.get('/github', (req, res) => {
  const redirectUri = `${process.env.BASE_URL}/api/auth/github/callback`;
  const githubAuthUrl = `https://github.com/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email,repo`;
  
  res.json({ url: githubAuthUrl });
});

// Callback обработчик для GitHub OAuth
router.get('/github/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ message: 'Authorization code not provided' });
    }

    // Обмен code на access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }, {
      headers: { Accept: 'application/json' }
    });

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({ message: 'Failed to get access token' });
    }

    // Получение информации о пользователе GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const githubUser = userResponse.data;

    // Поиск пользователя по GitHub ID или email
    let user = await User.findByGitHubId(githubUser.id);
    
    if (!user) {
      // Попытка найти по email
      const emailResponse = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      
      const primaryEmail = emailResponse.data.find(email => email.primary)?.email;
      
      if (primaryEmail) {
        user = await User.findByEmail(primaryEmail);
      }
    }

    if (!user) {
      // Создание нового пользователя
      user = await User.create({
        email: githubUser.email || `${githubUser.id}@github.com`,
        password: null, // Пароль не требуется для OAuth пользователей
        name: githubUser.name || githubUser.login
      });
    }

    // Обновление GitHub информации
    await User.updateGitHubInfo(user.id, {
      github_id: githubUser.id,
      github_username: githubUser.login,
      github_token: access_token
    });

    // Генерация JWT токена
    const token = generateToken(user);

    // Перенаправление на фронтенд с токеном
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}&githubConnected=true`);

  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Authentication failed`);
  }
});

// Отключение GitHub
router.post('/github/disconnect', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.disconnectGitHub(decoded.userId);

    res.json({ 
      message: 'GitHub disconnected successfully',
      user 
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Получение профиля пользователя
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Не возвращаем пароль и токен
    const { password, github_token, ...userProfile } = user;
    
    res.json(userProfile);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;