const express = require('express');
const { db } = require('../db');
const { authRequired } = require('../middleware/auth');
const H = require('../utils/helpers');
const router = express.Router();

router.get('/daily-overall', authRequired, async (req,res)=>{
  const date = req.query.date || H.today();
  const rElig = await db.query(`SELECT DISTINCT e.id FROM employees e JOIN employment_history eh ON eh.employee_fk=e.id WHERE e.is_deleted=0 AND eh.joining_date<=$1 AND (eh.last_working_date IS NULL OR eh.last_working_date>=$2)`, [date, date]);
  const elig = rElig.rows;
  const rRecs = await db.query('SELECT * FROM attendance_records WHERE attendance_date=$1', [date]);
  const recs = rRecs.rows;
  const present = recs.filter(r=>r.status==='P').length;
  const absent = recs.filter(r=>r.status==='A').length;
  const leave = recs.filter(r=>r.status==='L').length;
  const hol = recs.filter(r=>r.status==='H').length;
  const wo = recs.filter(r=>r.status==='WO').length;
  const wh = recs.reduce((s,r)=>s+(r.working_hours||0),0);
  const ot = recs.reduce((s,r)=>s+(r.ot_hours||0),0);
  const pct = elig.length>0 ? (present/elig.length*100) : 0;
  res.json({ date, totalEligible: elig.length, present, absent, leave, holiday: hol, weeklyOff: wo, workingHours: wh, otHours: ot, pct });
});

router.get('/monthly-overall', authRequired, async (req,res)=>{
  const y = Number(req.query.year) || new Date().getFullYear();
  const m = Number(req.query.month) || new Date().getMonth()+1;
  const start = H.firstDayOfMonth(y,m); const end = H.lastDayOfMonth(y,m);
  const rRecs = await db.query('SELECT * FROM attendance_records WHERE attendance_date>=$1 AND attendance_date<=$2', [start,end]);
  const recs = rRecs.rows;
  const present = recs.filter(r=>r.status==='P').length;
  const absent = recs.filter(r=>r.status==='A').length;
  const leave = recs.filter(r=>r.status==='L').length;
  const wh = recs.reduce((s,r)=>s+(r.working_hours||0),0);
  const ot = recs.reduce((s,r)=>s+(r.ot_hours||0),0);
  const activeEmps = new Set(recs.map(r=>r.employee_fk)).size;
  const days = H.enumerateDays(start,end);
  let pctSum=0, pctCount=0;
  for(const d of days){
    const rElig = await db.query(`SELECT DISTINCT e.id FROM employees e JOIN employment_history eh ON eh.employee_fk=e.id WHERE e.is_deleted=0 AND eh.joining_date<=$1 AND (eh.last_working_date IS NULL OR eh.last_working_date>=$2)`, [d, d]);
    const elig = rElig.rows;
    const r = await db.query(`SELECT status FROM attendance_records WHERE attendance_date=$1`, [d]);
    const p = r.rows.filter(x=>x.status==='P').length;
    if(elig.length>0){ pctSum += p/elig.length*100; pctCount++; }
  }
  const avgPct = pctCount>0 ? pctSum/pctCount : 0;
  const groups = (await db.query('SELECT name FROM production_groups ORDER BY name')).rows.map(r=>r.name);
  const pgSummary = groups.map(pg=>{
    const pgRecs = recs.filter(r=>{
      // need pg; fetch employee pg
      return false;
    });
    return { pg, present:0, absent:0, leave:0, workingHours:0, otHours:0 };
  });
  // properly compute pg-wise
  for (const pg of groups) {
    // get employee ids for pg
  }
  // simpler: join
  const pgRows = await db.query(`SELECT e.pg, 
    COUNT(*) FILTER (WHERE ar.status='P') as present,
    COUNT(*) FILTER (WHERE ar.status='A') as absent,
    COUNT(*) FILTER (WHERE ar.status='L') as leave,
    COALESCE(SUM(ar.working_hours),0) as wh,
    COALESCE(SUM(ar.ot_hours),0) as ot
    FROM attendance_records ar JOIN employees e ON e.id=ar.employee_fk
    WHERE ar.attendance_date>=$1 AND ar.attendance_date<=$2
    GROUP BY e.pg`, [start,end]);
  const pgMap = new Map(pgRows.rows.map(r=>[r.pg, r]));
  const pgSummary2 = groups.map(pg=>{
    const r = pgMap.get(pg);
    return { pg, present: parseInt(r?.present||0,10), absent: parseInt(r?.absent||0,10), leave: parseInt(r?.leave||0,10), workingHours: parseFloat(r?.wh||0), otHours: parseFloat(r?.ot||0) };
  });
  res.json({ year:y, month:m, totalActive: activeEmps, presentDays: present, absentDays: absent, leaveDays: leave, workingHours: wh, otHours: ot, avgPct, pgSummary: pgSummary2 });
});

router.get('/employee-monthly', authRequired, async (req,res)=>{
  const empId = req.query.employee_id;
  const month = req.query.month || new Date().toISOString().slice(0,7);
  const [y,m] = month.split('-').map(Number);
  const start = H.firstDayOfMonth(y,m); const end = H.lastDayOfMonth(y,m);
  const rEmp = await db.query('SELECT * FROM employees WHERE employee_id=$1', [empId]);
  const emp = rEmp.rows[0];
  if(!emp) return res.status(404).json({error:'Not found'});
  const rRecs = await db.query('SELECT * FROM attendance_records WHERE employee_fk=$1 AND attendance_date>=$2 AND attendance_date<=$3 ORDER BY attendance_date', [emp.id,start,end]);
  const recs = rRecs.rows;
  const present = recs.filter(r=>r.status==='P').length;
  const absent = recs.filter(r=>r.status==='A').length;
  const leave = recs.filter(r=>r.status==='L').length;
  const hol = recs.filter(r=>r.status==='H').length;
  const wo = recs.filter(r=>r.status==='WO').length;
  const wh = recs.reduce((s,r)=>s+(r.working_hours||0),0);
  const ot = recs.reduce((s,r)=>s+(r.ot_hours||0),0);
  const rPer = await db.query('SELECT * FROM employment_history WHERE employee_fk=$1', [emp.id]);
  const periods = rPer.rows;
  let eligible=0;
  for(const d of H.enumerateDays(start,end)){
    const inPeriod = periods.some(p=>p.joining_date<=d && (p.last_working_date===null || p.last_working_date>=d));
    if(!inPeriod) continue;
    const woff = Number((await db.query("SELECT value FROM system_settings WHERE key='default_weekly_off_day'")).rows[0]?.value || 5);
    if(H.dayOfWeek(d)===woff) continue;
    const holG = await db.query('SELECT 1 FROM holidays WHERE holiday_date=$1', [d]);
    if(holG.rows[0]) continue;
    const rec = recs.find(r=>r.attendance_date===d);
    if(rec && rec.status==='H') continue;
    eligible++;
  }
  const pct = eligible>0 ? (present/eligible*100) : 0;
  res.json({ employee: emp, month, present, absent, leave, holiday: hol, weeklyOff: wo, workingHours: wh, otHours: ot, eligible, pct, records: recs });
});

router.get('/daily-employee', authRequired, async (req,res)=>{
  const date = req.query.date || H.today();
  const pg = req.query.pg;
  let sql = `SELECT ar.*, e.name, e.designation, e.pg FROM attendance_records ar JOIN employees e ON e.id=ar.employee_fk WHERE ar.attendance_date=$1`;
  const params=[date];
  if(pg){ sql+=' AND e.pg=$2'; params.push(pg); }
  sql+=' ORDER BY e.name';
  const r = await db.query(sql, params);
  res.json({ date, records: r.rows });
});

router.get('/absenteeism', authRequired, async (req,res)=>{
  const y = Number(req.query.year) || new Date().getFullYear();
  const m = Number(req.query.month) || new Date().getMonth()+1;
  const start = H.firstDayOfMonth(y,m); const end = H.lastDayOfMonth(y,m);
  const pg = req.query.pg;
  let sql = `SELECT e.id,e.employee_id,e.name,e.pg, COUNT(*) as absent_days
    FROM attendance_records ar JOIN employees e ON e.id=ar.employee_fk
    WHERE ar.attendance_date>=$1 AND ar.attendance_date<=$2 AND ar.status='A'`;
  const params=[start,end];
  if(pg){ sql+=' AND e.pg=$3'; params.push(pg); }
  sql += ' GROUP BY e.id,e.employee_id,e.name,e.pg ORDER BY absent_days DESC';
  const rows = (await db.query(sql, params)).rows;
  const pgTotals = (await db.query(`SELECT e.pg, COUNT(*) c FROM attendance_records ar JOIN employees e ON e.id=ar.employee_fk WHERE ar.attendance_date>=$1 AND ar.attendance_date<=$2 AND ar.status='A' GROUP BY e.pg`, [start,end])).rows;
  res.json({ year:y, month:m, employees: rows, pgTotals });
});

router.get('/absence-history', authRequired, async (req,res)=>{
  const empId = req.query.employee_id;
  const r0 = await db.query('SELECT id FROM employees WHERE employee_id=$1', [empId]);
  const emp = r0.rows[0];
  if(!emp) return res.status(404).json({error:'Not found'});
  const r = await db.query(`SELECT attendance_date, remarks FROM attendance_records WHERE employee_fk=$1 AND status='A' ORDER BY attendance_date DESC`, [emp.id]);
  res.json({ employee_id: empId, absences: r.rows });
});

router.get('/ot-daily', authRequired, async (req,res)=>{
  const date = req.query.date || H.today();
  const r = await db.query(`SELECT ar.employee_id, e.name, e.pg, ar.ot_hours, ar.working_hours FROM attendance_records ar JOIN employees e ON e.id=ar.employee_fk WHERE ar.attendance_date=$1 AND ar.ot_hours>0 ORDER BY e.name`, [date]);
  const rows = r.rows;
  const total = rows.reduce((s,r)=>s+(r.ot_hours||0),0);
  res.json({ date, records: rows, total });
});

router.get('/ot-monthly', authRequired, async (req,res)=>{
  const y = Number(req.query.year) || new Date().getFullYear();
  const m = Number(req.query.month) || new Date().getMonth()+1;
  const start = H.firstDayOfMonth(y,m); const end = H.lastDayOfMonth(y,m);
  const pg = req.query.pg;
  let sql = `SELECT e.employee_id, e.name, e.pg, COALESCE(SUM(ar.ot_hours),0) as ot_hours, COALESCE(SUM(ar.working_hours),0) as working_hours
    FROM employees e LEFT JOIN attendance_records ar ON ar.employee_fk=e.id AND ar.attendance_date>=$1 AND ar.attendance_date<=$2
    WHERE e.is_deleted=0`;
  const params=[start,end];
  if(pg){ sql+=' AND e.pg=$3'; params.push(pg); }
  sql += ' GROUP BY e.id, e.employee_id, e.name, e.pg ORDER BY e.name';
  const rows = (await db.query(sql, params)).rows;
  const total = rows.reduce((s,r)=>s+(parseFloat(r.ot_hours)||0),0);
  res.json({ year:y, month:m, records: rows, total });
});

router.get('/ot-pg', authRequired, async (req,res)=>{
  const y = Number(req.query.year) || new Date().getFullYear();
  const m = Number(req.query.month) || new Date().getMonth()+1;
  const start = H.firstDayOfMonth(y,m); const end = H.lastDayOfMonth(y,m);
  const rows = (await db.query(`SELECT e.pg, COALESCE(SUM(ar.ot_hours),0) as ot_hours, COALESCE(SUM(ar.working_hours),0) as working_hours, COUNT(DISTINCT e.id) as emp_count
    FROM employees e LEFT JOIN attendance_records ar ON ar.employee_fk=e.id AND ar.attendance_date>=$1 AND ar.attendance_date<=$2
    WHERE e.is_deleted=0 GROUP BY e.pg ORDER BY e.pg`, [start,end])).rows;
  res.json({ year:y, month:m, records: rows });
});

router.get('/ot-yearly', authRequired, async (req,res)=>{
  const y = Number(req.query.year) || new Date().getFullYear();
  const start = `${y}-01-01`; const end = `${y}-12-31`;
  const rows = (await db.query(`SELECT e.employee_id, e.name, e.pg, COALESCE(SUM(ar.ot_hours),0) as ot_hours FROM employees e LEFT JOIN attendance_records ar ON ar.employee_fk=e.id AND ar.attendance_date>=$1 AND ar.attendance_date<=$2 WHERE e.is_deleted=0 GROUP BY e.id, e.employee_id, e.name, e.pg ORDER BY e.name`, [start,end])).rows;
  const total = rows.reduce((s,r)=>s+(parseFloat(r.ot_hours)||0),0);
  const monthly = [];
  for(let m=1;m<=12;m++){
    const s=H.firstDayOfMonth(y,m); const e2=H.lastDayOfMonth(y,m);
    const r = await db.query('SELECT COALESCE(SUM(ot_hours),0) s FROM attendance_records WHERE attendance_date>=$1 AND attendance_date<=$2', [s,e2]);
    monthly.push({ month:m, ot: parseFloat(r.rows[0].s) });
  }
  res.json({ year:y, records: rows, total, monthly });
});

router.get('/calendar', authRequired, async (req,res)=>{
  const empId = req.query.employee_id;
  const month = req.query.month || new Date().toISOString().slice(0,7);
  const [y,m] = month.split('-').map(Number);
  const start = H.firstDayOfMonth(y,m); const end = H.lastDayOfMonth(y,m);
  const r0 = await db.query('SELECT id FROM employees WHERE employee_id=$1', [empId]);
  const emp = r0.rows[0];
  if(!emp) return res.status(404).json({error:'Not found'});
  const r = await db.query('SELECT * FROM attendance_records WHERE employee_fk=$1 AND attendance_date>=$2 AND attendance_date<=$3', [emp.id,start,end]);
  const recs = r.rows;
  const map = new Map(recs.map(x=>[x.attendance_date,x]));
  const days = H.enumerateDays(start,end).map(d=>({ date:d, record: map.get(d)||null }));
  res.json({ employee_id: empId, month, days });
});

router.get('/absent-list', authRequired, async (req,res)=>{
  const date = req.query.date;
  const month = req.query.month;
  let ms, me;
  if (date) { const [y,m]=date.slice(0,7).split('-').map(Number); ms=H.firstDayOfMonth(y,m); me=H.lastDayOfMonth(y,m); }
  else if (month) { const [y,m]=month.split('-').map(Number); ms=H.firstDayOfMonth(y,m); me=H.lastDayOfMonth(y,m); }
  let sql = `SELECT ar.attendance_date, ar.employee_id, e.name, e.department, e.pg, ar.remarks,
    (SELECT COUNT(*) FROM attendance_records ar2 WHERE ar2.employee_fk=e.id AND ar2.status='A' AND ar2.attendance_date>=$1 AND ar2.attendance_date<=$2) AS absent_days
    FROM attendance_records ar JOIN employees e ON e.id=ar.employee_fk WHERE ar.status='A'`;
  const params = [ms, me];
  if (date) { sql += ' AND ar.attendance_date=$3'; params.push(date); }
  else if (month) {
    const [y,m] = month.split('-').map(Number);
    const start = H.firstDayOfMonth(y,m); const end = H.lastDayOfMonth(y,m);
    sql += ' AND ar.attendance_date>=$3 AND ar.attendance_date<=$4'; params.push(start,end);
  }
  sql += ' ORDER BY ar.attendance_date, e.name';
  const r = await db.query(sql, params);
  res.json({ records: r.rows });
});

router.get('/leave-list', authRequired, async (req,res)=>{
  const date = req.query.date;
  const month = req.query.month;
  let sql = `SELECT ar.attendance_date, ar.employee_id, e.name, e.department, e.pg, ar.remarks FROM attendance_records ar JOIN employees e ON e.id=ar.employee_fk WHERE ar.status='L'`;
  const params = [];
  if (date) { sql += ' AND ar.attendance_date=$1'; params.push(date); }
  else if (month) {
    const [y,m] = month.split('-').map(Number);
    const start = H.firstDayOfMonth(y,m); const end = H.lastDayOfMonth(y,m);
    sql += ' AND ar.attendance_date>=$1 AND ar.attendance_date<=$2'; params.push(start,end);
  }
  sql += ' ORDER BY ar.attendance_date, e.name';
  const r = await db.query(sql, params);
  res.json({ records: r.rows });
});

module.exports = router;
