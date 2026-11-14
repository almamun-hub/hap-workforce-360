const express = require('express');
const { db } = require('../db');
const { authRequired, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', authRequired, async (req,res)=>{
  const r = await db.query('SELECT key,value FROM system_settings');
  const obj = {}; for(const row of r.rows) obj[row.key]=row.value;
  res.json({ settings: obj });
});

router.put('/', authRequired, adminOnly, async (req,res)=>{
  const b = req.body || {};
  for(const [k,v] of Object.entries(b)){
    await db.query('INSERT INTO system_settings (key,value,updated_by) VALUES ($1,$2,$3) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW(), updated_by=EXCLUDED.updated_by', [k, String(v), req.user.id]);
  }
  res.json({ ok:true });
});

router.get('/production-groups', authRequired, async (req,res)=>{
  const r = await db.query('SELECT name FROM production_groups ORDER BY name');
  res.json({ groups: r.rows.map(x=>x.name) });
});
router.post('/production-groups', authRequired, adminOnly, async (req,res)=>{
  const { name } = req.body || {};
  if(!name) return res.status(400).json({error:'name required'});
  await db.query('INSERT INTO production_groups (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
  res.json({ ok:true });
});
router.delete('/production-groups/:name', authRequired, adminOnly, async (req,res)=>{
  await db.query('DELETE FROM production_groups WHERE name=$1', [req.params.name]);
  res.json({ ok:true });
});

router.get('/holidays', authRequired, async (req,res)=>{
  const r = await db.query('SELECT * FROM holidays ORDER BY holiday_date');
  res.json({ holidays: r.rows });
});
router.post('/holidays', authRequired, adminOnly, async (req,res)=>{
  const { date, name } = req.body || {};
  if(!date) return res.status(400).json({error:'date required'});
  await db.query('INSERT INTO holidays (holiday_date,name) VALUES ($1,$2) ON CONFLICT (holiday_date) DO UPDATE SET name=EXCLUDED.name', [date,name||'']);
  res.json({ ok:true });
});
router.delete('/holidays/:date', authRequired, adminOnly, async (req,res)=>{
  await db.query('DELETE FROM holidays WHERE holiday_date=$1', [req.params.date]);
  res.json({ ok:true });
});

module.exports = router;
