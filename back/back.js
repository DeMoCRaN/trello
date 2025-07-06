const corsMiddleware = require('./middlewares/cors');
const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;

const statusPageHandler = require('./def/statusPage');

app.use(express.json());
app.use(corsMiddleware);

require('./routes/api')(app);

// PostgreSQL connection pool setup
const pool = new Pool({
  user: 'democran',
  host: 'localhost', 
  database: 'democran', 
  password: 'qweasd-123',
  port: 5433, 
});
// Root route
app.get('/', statusPageHandler);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

