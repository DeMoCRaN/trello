const express = require('express');
const router = express.Router();

// Пример базового маршрута
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Здесь можно добавить другие маршруты API

module.exports = (app) => {
  app.use('/api', router);
};
