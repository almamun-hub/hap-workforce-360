const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const router = express.Router();

router.post('/login', async (req,res)=>{
  const { username, password } = req.body || {};
  if(!username || !password) return res.status(400).json({error:'username and password required'});
  const r = await db.query('SELECT * FROM users WHERE username=$1', [username]);
  const user = r.rows[0];
  if(!user || !user.is_active) return res.status(401).json({error:'Invalid credentials'});
  if(!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({error:'Invalid credentials'});
  await db.query("UPDATE users SET last_login=NOW() WHERE id=$1", [user.id]);
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id:user.id, username:user.username, full_name:user.full_name, role:user.role } });
});

router.get('/me', require('../middleware/auth').authRequired, (req,res)=>{
  res.json({ user: req.user });
});

router.post('/change-password', require('../middleware/auth').authRequired, async (req,res)=>{
  const { oldPassword, newPassword } = req.body || {};
  const r = await db.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
  const user = r.rows[0];
  if(!bcrypt.compareSync(oldPassword, user.password_hash)) return res.status(400).json({error:'Old password wrong'});
  const hash = bcrypt.hashSync(newPassword, 10);
  await db.query("UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2", [hash, user.id]);
  res.json({ ok:true });
});

module.exports = router;
