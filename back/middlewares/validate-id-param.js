const validateIdParam = (req, res, next) => {
  const id = req.params.id;
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Неверный формат ID' });
  }
  next();
};

module.exports = {
  validateIdParam,
};
