const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// Создаем пул подключения к базе с теми же параметрами, что и в back.js
const pool = new Pool({
  user: 'democran',
  host: 'localhost',
  database: 'democran',
  password: 'qweasd-123',
  port: 5433,
});

// Секретный ключ для JWT (в реальном проекте храните в .env)
const JWT_SECRET = 'your_jwt_secret_key';

// Тестовый маршрут
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Маршрут для логина
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Ищем пользователя по email
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const user = userResult.rows[0];

    // Сравниваем пароль с хэшем из базы
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id, roleId: user.role_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Отправляем токен клиенту
    res.json({ token });
  } catch (error) {
    console.error('Ошибка при логине:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router; // Export the router to use in the main application
module.exports = (app) => {
  app.use('/api', router);
};
