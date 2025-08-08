const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (stack) {
    msg += `\n${stack}`;
  }
  
  if (Object.keys(metadata).length > 0) {
    try {
      msg += `\n${JSON.stringify(metadata, null, 2)}`;
    } catch (e) {
      msg += `\n[Non-serializable metadata]`;
    }
  }
  
  return msg;
});

// Настройки ротации файлов
const rotateTransport = new DailyRotateFile({
  filename: path.join(logDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    format.json()
  )
});

// Основной логгер
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Консольный вывод (только для разработки)
    new transports.Console({
      level: 'debug',
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      )
    }),
    rotateTransport,
    // Отдельный файл для ошибок
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        format.json()
      )
    })
  ],
  exceptionHandlers: [
    new transports.File({
      filename: path.join(logDir, 'exceptions.log')
    })
  ],
  rejectionHandlers: [
    new transports.File({
      filename: path.join(logDir, 'rejections.log')
    })
  ]
});

// Моргание логов для HTTP запросов
logger.morganStream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Функция для логирования SQL-запросов
logger.sql = (query, params, duration) => {
  const truncatedQuery = query.length > 500 ? query.substring(0, 500) + '...' : query;
  
  logger.debug('SQL Query', {
    type: 'SQL',
    query: truncatedQuery,
    params: params,
    duration: `${duration}ms`
  });
};

// Функция для логирования ошибок валидации
logger.validationError = (error, data) => {
  logger.warn('Validation Error', {
    type: 'VALIDATION',
    error: error.message,
    input: data
  });
};

// Функция для логирования безопасности
logger.security = (message, meta = {}) => {
  logger.warn(`SECURITY: ${message}`, {
    type: 'SECURITY',
    ...meta
  });
};

module.exports = logger;