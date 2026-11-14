const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { authRequired, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', authRequired, adminOnly, async (req,res)=>{
  const r = await db.query('SELECT id,username,full_name,role,is_active,created_at,last_login FROM users ORDER BY username');
  res.json({ users: r.rows });
});

router.post('/', authRequired, adminOnly, async (req,res)=>{
  const b = req.body || {};
  if(!b.username || !b.password) return res.status(400).json({error:'username and password required'});
  const ex = await db.query('SELECT id FROM users WHERE username=$1', [b.username]);
  if(ex.rows[0]) return res.status(400).json({error:'Username exists'});
  const hash = bcrypt.hashSync(b.password, 10);
  const r = await db.query('INSERT INTO users (username,password_hash,full_name,role,is_active) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [b.username, hash, b.full_name||'', b.role||'operator', b.is_active===false?0:1]);
  res.json({ id: r.rows[0].id, ok:true });
});

router.put('/:id', authRequired, adminOnly, async (req,res)=>{
  const b = req.body || {};
  const r = await db.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
  const u = r.rows[0];
  if(!u) return res.status(404).json({error:'Not found'});
  await db.query('UPDATE users SET full_name=$1, role=$2, is_active=$3, updated_at=NOW() WHERE id=$4',
    [b.full_name??u.full_name, b.role??u.role, b.is_active===undefined?u.is_active:(b.is_active?1:0), req.params.id]);
  if(b.password){ const hash=bcrypt.hashSync(b.password,10); await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.params.id]); }
  res.json({ ok:true });
});

router.post('/:id/reset-password', authRequired, adminOnly, async (req,res)=>{
  const { password } = req.body || {};
  if(!password) return res.status(400).json({error:'password required'});
  const hash = bcrypt.hashSync(password,10);
  await db.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.params.id]);
  res.json({ ok:true });
});

router.delete('/:id', authRequired, adminOnly, async (req,res)=>{
  if(Number(req.params.id)===req.user.id) return res.status(400).json({error:'Cannot deactivate self'});
  await db.query('UPDATE users SET is_active=0 WHERE id=$1', [req.params.id]);
  res.json({ ok:true });
});

module.exports = router;
