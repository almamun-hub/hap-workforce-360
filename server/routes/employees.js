const express = require('express');
const { db } = require('../db');
const { authRequired, adminOnly } = require('../middleware/auth');
const H = require('../utils/helpers');
const router = express.Router();

router.get('/', authRequired, async (req,res)=>{
  const { search, pg, designation, status } = req.query;
  let sql = `SELECT * FROM employees WHERE is_deleted=0`;
  const params = [];
  let i = 1;
  if (status) { sql += ` AND employment_status=$${i++}`; params.push(status); }
  if (pg) { sql += ` AND pg=$${i++}`; params.push(pg); }
  if (designation) { sql += ` AND designation=$${i++}`; params.push(designation); }
  if (search) { sql += ` AND (name ILIKE $${i} OR employee_id ILIKE $${i+1})`; params.push('%'+search+'%','%'+search+'%'); i+=2; }
  sql += ' ORDER BY name';
  const r = await db.query(sql, params);
  res.json({ employees: r.rows });
});

router.get('/ex', authRequired, async (req,res)=>{
  const r = await db.query(`SELECT * FROM employees WHERE employment_status='Inactive' AND is_deleted=0 ORDER BY name`);
  res.json({ employees: r.rows });
});

router.get('/:id', authRequired, async (req,res)=>{
  const r = await db.query('SELECT * FROM employees WHERE id=$1', [req.params.id]);
  const emp = r.rows[0];
  if(!emp) return res.status(404).json({error:'Not found'});
  const r2 = await db.query('SELECT * FROM employment_history WHERE employee_fk=$1 ORDER BY joining_date', [emp.id]);
  res.json({ employee: emp, periods: r2.rows });
});

router.post('/', authRequired, adminOnly, async (req,res)=>{
  const b = req.body || {};
  if(!b.employee_id || !b.name) return res.status(400).json({error:'employee_id and name required'});
  const ex = await db.query('SELECT id FROM employees WHERE employee_id=$1', [b.employee_id]);
  if(ex.rows[0]) return res.status(400).json({error:'Employee ID already exists'});
  try {
    const r = await db.transaction(async (q) => {
      const info = await q(`INSERT INTO employees (employee_id,name,designation,department,pg,contact_number,employment_type,employment_status,current_joining_date,remarks,created_by,updated_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [b.employee_id, b.name, b.designation||'', b.department||'', b.pg||'Other', b.contact_number||'', b.employment_type||'Permanent', b.employment_status||'Active', b.joining_date, b.remarks||'', req.user.id, req.user.id]);
      const empId = info.rows[0].id;
      await q(`INSERT INTO employment_history (employee_fk,employee_id,joining_date,is_current,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$6)`,
        [empId, b.employee_id, b.joining_date, 1, req.user.id, req.user.id]);
      await q('INSERT INTO production_groups (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [b.pg||'Other']);
      return empId;
    });
    res.json({ id: r, ok:true });
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.put('/:id', authRequired, adminOnly, async (req,res)=>{
  const b = req.body || {};
  const r = await db.query('SELECT * FROM employees WHERE id=$1', [req.params.id]);
  const emp = r.rows[0];
  if(!emp) return res.status(404).json({error:'Not found'});
  // handle employee_id change
  if (b.employee_id && b.employee_id !== emp.employee_id) {
    const ex = await db.query('SELECT id FROM employees WHERE employee_id=$1', [b.employee_id]);
    if (ex.rows[0]) return res.status(400).json({error:'Employee ID already exists'});
    await db.query('UPDATE employees SET employee_id=$1 WHERE id=$2', [b.employee_id, emp.id]);
    await db.query('UPDATE employment_history SET employee_id=$1 WHERE employee_fk=$2', [b.employee_id, emp.id]);
    await db.query('UPDATE attendance_records SET employee_id=$1 WHERE employee_fk=$2', [b.employee_id, emp.id]);
  }
  await db.query(`UPDATE employees SET name=$1,designation=$2,department=$3,pg=$4,contact_number=$5,employment_type=$6,employment_status=$7,remarks=$8,updated_by=$9,updated_at=NOW() WHERE id=$10`,
    [b.name||emp.name, b.designation??emp.designation, b.department??emp.department, b.pg??emp.pg, b.contact_number??emp.contact_number, b.employment_type??emp.employment_type, b.employment_status??emp.employment_status, b.remarks??emp.remarks, req.user.id, req.params.id]);
  if(b.pg) await db.query('INSERT INTO production_groups (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [b.pg]);
  res.json({ ok:true });
});

router.post('/:id/exit', authRequired, adminOnly, async (req,res)=>{
  const b = req.body || {};
  const r = await db.query('SELECT * FROM employees WHERE id=$1', [req.params.id]);
  const emp = r.rows[0];
  if(!emp) return res.status(404).json({error:'Not found'});
  const lwd = b.last_working_date;
  if(!lwd) return res.status(400).json({error:'last_working_date required'});
  await db.transaction(async (q) => {
    await q(`UPDATE employment_history SET last_working_date=$1, exit_reason=$2, exit_remarks=$3, is_current=0, updated_by=$4, updated_at=NOW()
      WHERE employee_fk=$5 AND is_current=1`, [lwd, b.exit_reason||'Resignation', b.exit_remarks||'', req.user.id, emp.id]);
    await q(`UPDATE employees SET employment_status='Inactive', last_working_date=$1, updated_by=$2, updated_at=NOW() WHERE id=$3`,
      [lwd, req.user.id, emp.id]);
  });
  res.json({ ok:true });
});

router.post('/:id/rejoin', authRequired, adminOnly, async (req,res)=>{
  const b = req.body || {};
  const r = await db.query('SELECT * FROM employees WHERE id=$1', [req.params.id]);
  const emp = r.rows[0];
  if(!emp) return res.status(404).json({error:'Not found'});
  const jd = b.joining_date;
  if(!jd) return res.status(400).json({error:'joining_date required'});
  await db.transaction(async (q) => {
    await q(`INSERT INTO employment_history (employee_fk,employee_id,joining_date,is_current,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$6)`,
      [emp.id, emp.employee_id, jd, 1, req.user.id, req.user.id]);
    await q(`UPDATE employees SET employment_status='Active', current_joining_date=$1, last_working_date=NULL, employment_type=$2, updated_by=$3, updated_at=NOW() WHERE id=$4`,
      [jd, b.employment_type||emp.employment_type, req.user.id, emp.id]);
  });
  res.json({ ok:true });
});

router.get('/:id/profile', authRequired, async (req,res)=>{
  const r = await db.query('SELECT * FROM employees WHERE id=$1', [req.params.id]);
  const emp = r.rows[0];
  if(!emp) return res.status(404).json({error:'Not found'});
  const month = req.query.month || new Date().toISOString().slice(0,7);
  const [y,m] = month.split('-').map(Number);
  const start = H.firstDayOfMonth(y,m);
  const end = H.lastDayOfMonth(y,m);
  const r2 = await db.query(`SELECT * FROM attendance_records WHERE employee_fk=$1 AND attendance_date>=$2 AND attendance_date<=$3 ORDER BY attendance_date`, [emp.id,start,end]);
  const recs = r2.rows;
  const present = recs.filter(r=>r.status==='P').length;
  const absent = recs.filter(r=>r.status==='A').length;
  const leave = recs.filter(r=>r.status==='L').length;
  const holiday = recs.filter(r=>r.status==='H').length;
  const wo = recs.filter(r=>r.status==='WO').length;
  const workingHours = recs.reduce((s,r)=>s+(r.working_hours||0),0);
  const otHours = recs.reduce((s,r)=>s+(r.ot_hours||0),0);
  const r3 = await db.query('SELECT * FROM employment_history WHERE employee_fk=$1', [emp.id]);
  const periods = r3.rows;
  const woffSetting = await db.query("SELECT value FROM system_settings WHERE key='default_weekly_off_day'");
  const woff = Number((woffSetting.rows[0] && woffSetting.rows[0].value) || 5);
  let eligible = 0;
  for (const d of H.enumerateDays(start,end)) {
    const inPeriod = periods.some(p => p.joining_date <= d && (p.last_working_date===null || p.last_working_date >= d));
    if(!inPeriod) continue;
    if(H.dayOfWeek(d) === woff) continue;
    const hol = await db.query('SELECT 1 FROM holidays WHERE holiday_date=$1', [d]);
    if(hol.rows[0]) continue;
    const rec = recs.find(r=>r.attendance_date===d);
    if(rec && rec.status==='H') continue;
    eligible++;
  }
  const pct = eligible>0 ? (present/eligible*100) : 0;
  res.json({ employee: emp, month, stats: { present, absent, leave, holiday, wo, workingHours, otHours, eligible, pct }, records: recs });
});

router.get('/meta/production-groups', authRequired, async (req,res)=>{
  const r = await db.query('SELECT name FROM production_groups ORDER BY name');
  res.json({ groups: r.rows.map(x=>x.name) });
});
router.post('/meta/production-groups', authRequired, adminOnly, async (req,res)=>{
  const { name } = req.body || {};
  if(!name) return res.status(400).json({error:'name required'});
  await db.query('INSERT INTO production_groups (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
  res.json({ ok:true });
});

module.exports = router;
