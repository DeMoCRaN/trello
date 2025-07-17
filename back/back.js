const corsMiddleware = require('./middlewares/cors');
const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;
const moment = require('moment-timezone');
moment.tz.setDefault('Europe/Moscow');


console.log(moment().format()); // 2025-07-07T14:30:00+03:00

const statusPageHandler = require('./def/statusPage');

// PostgreSQL connection pool setup
const pool = new Pool({
  user: 'democran',
  host: 'localhost', 
  database: 'democran', 
  password: 'qweasd-123',
  port: 5433, 
});

app.use(express.json());
app.use(corsMiddleware);

app.locals.pool = pool; // Сохраняем пул в app.locals для передачи в роуты

require('./routes/api')(app);

// Root route
app.get('/', statusPageHandler);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

