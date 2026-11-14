const express = require('express');
const { db } = require('../db');
const { authRequired, adminOnly } = require('../middleware/auth');
const H = require('../utils/helpers');
const router = express.Router();

router.get('/eligible', authRequired, async (req,res)=>{
  const date = req.query.date || H.today();
  const pg = req.query.pg;
  const search = req.query.search;
  let rows = H.eligibleActiveOn(db, date);
  // eligibleActiveOn uses db.prepare (sync) -> need async version. Rewrite inline.
  const r = await db.query(`SELECT DISTINCT e.id, e.employee_id, e.name, e.pg, e.designation, e.employment_type
    FROM employees e JOIN employment_history eh ON eh.employee_fk = e.id
    WHERE e.is_deleted=0 AND eh.joining_date<=$1 AND (eh.last_working_date IS NULL OR eh.last_working_date>=$2)`, [date, date]);
  rows = r.rows;
  if(pg) rows = rows.filter(x=>x.pg===pg);
  if(search){ const s=search.toLowerCase(); rows = rows.filter(x=>x.name.toLowerCase().includes(s) || x.employee_id.toLowerCase().includes(s)); }
  const r2 = await db.query('SELECT * FROM attendance_records WHERE attendance_date=$1', [date]);
  const recs = r2.rows;
  const map = new Map(recs.map(x=>[x.employee_fk,x]));
  rows = rows.map(x=>({ ...x, record: map.get(x.id) || null }));
  res.json({ date, employees: rows });
});

router.get('/progress', authRequired, async (req,res)=>{
  const date = req.query.date || H.today();
  const r = await db.query(`SELECT DISTINCT e.id, e.employee_id, e.name, e.pg
    FROM employees e JOIN employment_history eh ON eh.employee_fk = e.id
    WHERE e.is_deleted=0 AND eh.joining_date<=$1 AND (eh.last_working_date IS NULL OR eh.last_working_date>=$2)`, [date, date]);
  const elig = r.rows;
  const r2 = await db.query('SELECT employee_fk FROM attendance_records WHERE attendance_date=$1', [date]);
  const done = new Set(r2.rows.map(x=>x.employee_fk));
  const missing = elig.filter(e=>!done.has(e.id));
  res.json({ date, total: elig.length, submitted: done.size, missing: missing.map(e=>({id:e.id,employee_id:e.employee_id,name:e.name,pg:e.pg})) });
});

router.post('/bulk', authRequired, async (req,res)=>{
  const { date, entries } = req.body || {};
  if(!date || !Array.isArray(entries)) return res.status(400).json({error:'date and entries required'});
  await db.transaction(async (q) => {
    for(const e of entries){
      const r = await q('SELECT id FROM employees WHERE employee_id=$1 AND is_deleted=0', [e.employee_id]);
      const emp = r.rows[0];
      if(!emp) continue;
      const r2 = await q('SELECT 1 FROM employment_history WHERE employee_fk=$1 AND joining_date<=$2 AND (last_working_date IS NULL OR last_working_date>=$3)', [emp.id, date, date]);
      if(!r2.rows[0]) continue;
      const r3 = await q('SELECT id FROM attendance_records WHERE employee_fk=$1 AND attendance_date=$2', [emp.id, date]);
      const existing = r3.rows[0];
      const vals = { status: e.status, working_hours: Number(e.working_hours)||0, ot_hours: Number(e.ot_hours)||0, remarks: e.remarks||'' };
      if(existing){
        const r4 = await q('SELECT * FROM attendance_records WHERE id=$1', [existing.id]);
        const old = r4.rows[0];
        await q(`UPDATE attendance_records SET status=$1,working_hours=$2,ot_hours=$3,remarks=$4,updated_by=$5,updated_at=NOW() WHERE id=$6`,
          [vals.status, vals.working_hours, vals.ot_hours, vals.remarks, req.user.id, existing.id]);
        await q(`INSERT INTO attendance_audit_logs (attendance_record_id,employee_id,attendance_date,action,old_values,new_values,performed_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [existing.id, e.employee_id, date, 'update', JSON.stringify(old), JSON.stringify(vals), req.user.id]);
      } else {
        const info = await q(`INSERT INTO attendance_records (employee_fk,employee_id,attendance_date,status,working_hours,ot_hours,remarks,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [emp.id, e.employee_id, date, vals.status, vals.working_hours, vals.ot_hours, vals.remarks, req.user.id, req.user.id]);
        await q(`INSERT INTO attendance_audit_logs (attendance_record_id,employee_id,attendance_date,action,new_values,performed_by) VALUES ($1,$2,$3,$4,$5,$6)`,
          [info.rows[0].id, e.employee_id, date, 'insert', JSON.stringify(vals), req.user.id]);
      }
    }
  });
  res.json({ ok:true });
});

router.put('/:id', authRequired, adminOnly, async (req,res)=>{
  const r = await db.query('SELECT * FROM attendance_records WHERE id=$1', [req.params.id]);
  const rec = r.rows[0];
  if(!rec) return res.status(404).json({error:'Not found'});
  const b = req.body || {};
  await db.query(`UPDATE attendance_records SET status=$1,working_hours=$2,ot_hours=$3,remarks=$4,updated_by=$5,updated_at=NOW() WHERE id=$6`,
    [b.status??rec.status, Number(b.working_hours??rec.working_hours), Number(b.ot_hours??rec.ot_hours), b.remarks??rec.remarks, req.user.id, rec.id]);
  await db.query(`INSERT INTO attendance_audit_logs (attendance_record_id,employee_id,attendance_date,action,old_values,new_values,performed_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [rec.id, rec.employee_id, rec.attendance_date, 'update', JSON.stringify(rec), JSON.stringify(b), req.user.id]);
  res.json({ ok:true });
});

router.get('/by-date', authRequired, async (req,res)=>{
  const date = req.query.date;
  const pg = req.query.pg;
  let sql = `SELECT ar.*, e.name, e.pg FROM attendance_records ar JOIN employees e ON e.id=ar.employee_fk WHERE ar.attendance_date=$1`;
  const params=[date];
  if(pg){ sql+=' AND e.pg=$2'; params.push(pg); }
  sql+=' ORDER BY e.name';
  const r = await db.query(sql, params);
  res.json({ records: r.rows });
});

router.get('/employee/:employeeId', authRequired, async (req,res)=>{
  const r0 = await db.query('SELECT id FROM employees WHERE employee_id=$1', [req.params.employeeId]);
  const emp = r0.rows[0];
  if(!emp) return res.status(404).json({error:'Not found'});
  let sql = `SELECT * FROM attendance_records WHERE employee_fk=$1`;
  const params=[emp.id];
  let i = 2;
  if(req.query.start){ sql+=` AND attendance_date>=$${i++}`; params.push(req.query.start); }
  if(req.query.end){ sql+=` AND attendance_date<=$${i++}`; params.push(req.query.end); }
  sql+=' ORDER BY attendance_date';
  const r = await db.query(sql, params);
  res.json({ records: r.rows });
});

module.exports = router;
