const cors = require('cors');

const whitelist = [
  'http://localhost:5173' 
];

const corsOptions = {
  origin: (origin, callback) => {
    if (whitelist.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,POST,PUT,DELETE,PATCH',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // Кешировать preflight на 24 часа
};

const corsMiddleware = cors(corsOptions);
module.exports = corsMiddleware;
