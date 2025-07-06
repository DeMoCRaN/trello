const corsMiddleware = require('./middlewares/cors');
const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;

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

