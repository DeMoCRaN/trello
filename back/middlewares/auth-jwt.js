const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  jwt.verify(token, 'your_jwt_secret_key', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Неверный токен' });
    }
    req.user = decoded;
    next();
  });
};

module.exports = {
  authenticateToken,
};
