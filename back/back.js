const corsMiddleware = require('./middlewares/cors');
const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;
const moment = require('moment-timezone');
moment.tz.setDefault('Europe/Moscow');

// 1. Добавляем обработчики непредвиденных ошибок
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

console.log(moment().format());

// 2. Улучшенная настройка подключения к PostgreSQL
const pool = new Pool({
  user: 'democran',
  host: 'localhost',
  database: 'democran',
  password: 'qweasd-123',
  port: 5433,
  connectionTimeoutMillis: 2000, // Таймаут подключения 2 секунды
});

// 3. Проверка подключения к БД
async function checkDatabaseConnection() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ PostgreSQL connection successful');
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err.message);
    return false;
  } finally {
    if (client) client.release();
  }
}

// 4. Инициализация сервера
async function initializeServer() {
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    console.error('Fatal: Cannot connect to database');
    process.exit(1);
  }

  app.use(express.json());
  app.use(corsMiddleware);

  // 5. Безопасная загрузка роутов
  try {
    require('./routes/api')(app);
    console.log('✅ Routes initialized');
  } catch (err) {
    console.error('❌ Route initialization failed:', err);
    process.exit(1);
  }

  // 6. Базовый роут для проверки
  app.get('/', (req, res) => {
    res.json({ 
      status: 'running',
      timestamp: moment().format(),
      database: 'connected'
    });
  });

  // 7. Запуск сервера с обработкой ошибок
  const server = app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}

// 8. Запускаем инициализацию
initializeServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// 9. Обработка сигналов завершения
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  pool.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully');
  pool.end();
  process.exit(0);
});