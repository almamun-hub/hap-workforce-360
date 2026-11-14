const jwt = require('jsonwebtoken');
const { db } = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'hap-workforce-360-secret-change-me';

async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const r = await db.query('SELECT id,username,full_name,role,is_active FROM users WHERE id=$1', [payload.id]);
    const user = r.rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

module.exports = { authRequired, adminOnly, JWT_SECRET };
