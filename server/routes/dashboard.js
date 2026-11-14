const express = require('express');
const { db } = require('../db');
const { authRequired } = require('../middleware/auth');
const H = require('../utils/helpers');
const router = express.Router();

router.get('/', authRequired, async (req,res)=>{
  const date = req.query.date || H.today();
  const ym = date.slice(0,7);
  const [y,m] = ym.split('-').map(Number);
  const start = H.firstDayOfMonth(y,m);
  const end = H.lastDayOfMonth(y,m);
  const rElig = await db.query(`SELECT DISTINCT e.id, e.employee_id, e.name, e.pg
    FROM employees e JOIN employment_history eh ON eh.employee_fk=e.id
    WHERE e.is_deleted=0 AND eh.joining_date<=$1 AND (eh.last_working_date IS NULL OR eh.last_working_date>=$2)`, [date, date]);
  const elig = rElig.rows;
  const rRecs = await db.query('SELECT * FROM attendance_records WHERE attendance_date=$1', [date]);
  const recs = rRecs.rows;
  const present = recs.filter(r=>r.status==='P').length;
  const absent = recs.filter(r=>r.status==='A').length;
  const leave = recs.filter(r=>r.status==='L').length;
  const wo = recs.filter(r=>r.status==='WO').length;
  const hol = recs.filter(r=>r.status==='H').length;
  const totalOT = recs.reduce((s,r)=>s+(r.ot_hours||0),0);
  const eligibleCount = elig.length;
  const pct = eligibleCount>0 ? (present/eligibleCount*100) : 0;

  const prevDay = H.addDays(start,-1);
  const rOpen = await db.query(`SELECT DISTINCT e.id FROM employees e JOIN employment_history eh ON eh.employee_fk=e.id WHERE e.is_deleted=0 AND eh.joining_date<=$1 AND (eh.last_working_date IS NULL OR eh.last_working_date>=$2)`, [prevDay, prevDay]);
  const openingList = rOpen.rows;
  const rClose = await db.query(`SELECT DISTINCT e.id FROM employees e JOIN employment_history eh ON eh.employee_fk=e.id WHERE e.is_deleted=0 AND eh.joining_date<=$1 AND (eh.last_working_date IS NULL OR eh.last_working_date>=$2)`, [end, end]);
  const closingList = rClose.rows;
  const rNJ = await db.query('SELECT COUNT(DISTINCT employee_fk) c FROM employment_history WHERE joining_date>=$1 AND joining_date<=$2', [start,end]);
  const newJoining = parseInt(rNJ.rows[0].c,10);
  const rEx = await db.query('SELECT COUNT(DISTINCT employee_fk) c FROM employment_history WHERE last_working_date>=$1 AND last_working_date<=$2', [start,end]);
  const exits = parseInt(rEx.rows[0].c,10);
  const rMA = await db.query(`SELECT COUNT(*) c FROM attendance_records WHERE attendance_date>=$1 AND attendance_date<=$2 AND status='A'`, [start,end]);
  const monthlyAbsent = parseInt(rMA.rows[0].c,10);
  const rMO = await db.query(`SELECT COALESCE(SUM(ot_hours),0) s FROM attendance_records WHERE attendance_date>=$1 AND attendance_date<=$2`, [start,end]);
  const monthlyOT = parseFloat(rMO.rows[0].s);

  const groups = (await db.query('SELECT name FROM production_groups ORDER BY name')).rows.map(r=>r.name);
  const pgSummary = groups.map(pg=>{
    const emps = elig.filter(e=>e.pg===pg);
    const recByEmp = new Map(recs.map(r=>[r.employee_fk,r]));
    const presentC = emps.filter(e=>recByEmp.get(e.id)?.status==='P').length;
    const absentC = emps.filter(e=>recByEmp.get(e.id)?.status==='A').length;
    const leaveC = emps.filter(e=>recByEmp.get(e.id)?.status==='L').length;
    const woC = emps.filter(e=>recByEmp.get(e.id)?.status==='WO').length;
    const wh = emps.reduce((s,e)=>s+(recByEmp.get(e.id)?.working_hours||0),0);
    const ot = emps.reduce((s,e)=>s+(recByEmp.get(e.id)?.ot_hours||0),0);
    return { pg, total: emps.length, present: presentC, absent: absentC, leave: leaveC, wo: woC, workingHours: wh, otHours: ot };
  });

  const trend = [];
  const todayStr = H.today();
  const trendEnd = todayStr < end ? todayStr : end;
  for (const d of H.enumerateDays(start, trendEnd)) {
    const r = await db.query(`SELECT status FROM attendance_records WHERE attendance_date=$1`, [d]);
    const rows = r.rows;
    trend.push({ date: d, present: rows.filter(x=>x.status==='P').length, absent: rows.filter(x=>x.status==='A').length });
  }

  const monthlyComp = [];
  for(let i=5;i>=0;i--){
    const dd = new Date(y, m-1-i, 1);
    const yy=dd.getFullYear(); const mm=dd.getMonth()+1;
    const s=H.firstDayOfMonth(yy,mm); const e2=H.lastDayOfMonth(yy,mm);
    const r = await db.query(`SELECT status FROM attendance_records WHERE attendance_date>=$1 AND attendance_date<=$2`, [s,e2]);
    const c = r.rows;
    monthlyComp.push({ label:`${yy}-${String(mm).padStart(2,'0')}`, present:c.filter(x=>x.status==='P').length, absent:c.filter(x=>x.status==='A').length, leave:c.filter(x=>x.status==='L').length });
  }

  const pgDist = groups.map(pg=>({ pg, count: elig.filter(e=>e.pg===pg).length }));

  const joinExit = [];
  for(let i=5;i>=0;i--){
    const dd = new Date(y, m-1-i, 1);
    const yy=dd.getFullYear(); const mm=dd.getMonth()+1;
    const s=H.firstDayOfMonth(yy,mm); const e2=H.lastDayOfMonth(yy,mm);
    const rj = await db.query('SELECT COUNT(DISTINCT employee_fk) c FROM employment_history WHERE joining_date>=$1 AND joining_date<=$2', [s,e2]);
    const nj = parseInt(rj.rows[0].c,10);
    const re = await db.query('SELECT COUNT(DISTINCT employee_fk) c FROM employment_history WHERE last_working_date>=$1 AND last_working_date<=$2', [s,e2]);
    const ex = parseInt(re.rows[0].c,10);
    joinExit.push({ label:`${yy}-${String(mm).padStart(2,'0')}`, joining:nj, exit:ex });
  }

  const otComp = [];
  for(let i=5;i>=0;i--){
    const dd = new Date(y, m-1-i, 1);
    const yy=dd.getFullYear(); const mm=dd.getMonth()+1;
    const s=H.firstDayOfMonth(yy,mm); const e2=H.lastDayOfMonth(yy,mm);
    const r = await db.query('SELECT COALESCE(SUM(ot_hours),0) s FROM attendance_records WHERE attendance_date>=$1 AND attendance_date<=$2', [s,e2]);
    otComp.push({ label:`${yy}-${String(mm).padStart(2,'0')}`, ot: parseFloat(r.rows[0].s) });
  }

  const absSummary = (await db.query(`SELECT e.name,e.employee_id,e.pg, COUNT(*) c FROM attendance_records ar JOIN employees e ON e.id=ar.employee_fk
    WHERE ar.attendance_date>=$1 AND ar.attendance_date<=$2 AND ar.status='A' GROUP BY e.id, e.name, e.employee_id, e.pg ORDER BY c DESC LIMIT 10`, [start,end])).rows;

  res.json({
    date, today: { totalActive: eligibleCount, present, absent, leave, wo, holiday: hol, pct, totalOT },
    monthly: { opening: openingList.length, newJoining, exits, closing: closingList.length, net: newJoining-exits, monthlyAbsent, monthlyOT },
    pgSummary, trend, monthlyComp, pgDist, joinExit, otComp, absSummary
  });
});

module.exports = router;
