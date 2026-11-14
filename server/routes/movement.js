const express = require('express');
const { db } = require('../db');
const { authRequired } = require('../middleware/auth');
const H = require('../utils/helpers');
const router = express.Router();

async function activeOnDate(dateStr){
  const r = await db.query(`SELECT DISTINCT e.id,e.employee_id,e.name,e.designation,e.pg,e.employment_type
    FROM employees e JOIN employment_history eh ON eh.employee_fk=e.id
    WHERE e.is_deleted=0 AND eh.joining_date<=$1 AND (eh.last_working_date IS NULL OR eh.last_working_date>=$2)`, [dateStr, dateStr]);
  return r.rows;
}
async function periodsStartingInRange(start,end){
  const r = await db.query(`SELECT eh.*, e.name,e.designation,e.pg,e.employment_type,e.employee_id
    FROM employment_history eh JOIN employees e ON e.id=eh.employee_fk
    WHERE eh.joining_date>=$1 AND eh.joining_date<=$2 ORDER BY eh.joining_date`, [start,end]);
  return r.rows;
}
async function periodsEndingInRange(start,end){
  const r = await db.query(`SELECT eh.*, e.name,e.designation,e.pg,e.employee_id
    FROM employment_history eh JOIN employees e ON e.id=eh.employee_fk
    WHERE eh.last_working_date>=$1 AND eh.last_working_date<=$2 ORDER BY eh.last_working_date`, [start,end]);
  return r.rows;
}

router.get('/monthly', authRequired, async (req,res)=>{
  const y = Number(req.query.year) || new Date().getFullYear();
  const m = Number(req.query.month) || new Date().getMonth()+1;
  const start = H.firstDayOfMonth(y,m);
  const end = H.lastDayOfMonth(y,m);
  const prevDay = H.addDays(start,-1);
  const openingList = await activeOnDate(prevDay);
  const closingList = await activeOnDate(end);
  const newJoining = await periodsStartingInRange(start,end);
  const exits = await periodsEndingInRange(start,end);
  const newDistinct = new Set(newJoining.map(e=>e.employee_fk)).size;
  const exitDistinct = new Set(exits.map(e=>e.employee_fk)).size;
  res.json({
    year:y, month:m, start, end,
    opening: new Set(openingList.map(e=>e.id)).size,
    newJoining: newDistinct,
    exits: exitDistinct,
    closing: new Set(closingList.map(e=>e.id)).size,
    net: newDistinct - exitDistinct,
    openingList, closingList, newJoiningList: newJoining, exitList: exits
  });
});

router.get('/pg-wise', authRequired, async (req,res)=>{
  const y = Number(req.query.year) || new Date().getFullYear();
  const m = Number(req.query.month) || new Date().getMonth()+1;
  const start = H.firstDayOfMonth(y,m);
  const end = H.lastDayOfMonth(y,m);
  const prevDay = H.addDays(start,-1);
  const openingList = await activeOnDate(prevDay);
  const closingList = await activeOnDate(end);
  const newJoining = await periodsStartingInRange(start,end);
  const exits = await periodsEndingInRange(start,end);
  const groups = (await db.query('SELECT name FROM production_groups ORDER BY name')).rows.map(r=>r.name);
  const result = groups.map(pg=>({
    pg,
    opening: openingList.filter(e=>e.pg===pg).length,
    newJoining: new Set(newJoining.filter(e=>e.pg===pg).map(e=>e.employee_fk)).size,
    exits: new Set(exits.filter(e=>e.pg===pg).map(e=>e.employee_fk)).size,
    closing: closingList.filter(e=>e.pg===pg).length
  }));
  res.json({ year:y, month:m, groups: result });
});

router.get('/history', authRequired, async (req,res)=>{
  const months = Number(req.query.months) || 6;
  const now = new Date();
  const out = [];
  for(let i=months-1;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const y=d.getFullYear(); const m=d.getMonth()+1;
    const start = H.firstDayOfMonth(y,m);
    const end = H.lastDayOfMonth(y,m);
    const prevDay = H.addDays(start,-1);
    const openingList = await activeOnDate(prevDay);
    const closingList = await activeOnDate(end);
    const newJoining = await periodsStartingInRange(start,end);
    const exits = await periodsEndingInRange(start,end);
    out.push({
      year:y, month:m, label:`${y}-${String(m).padStart(2,'0')}`,
      opening: new Set(openingList.map(e=>e.id)).size,
      newJoining: new Set(newJoining.map(e=>e.employee_fk)).size,
      exits: new Set(exits.map(e=>e.employee_fk)).size,
      closing: new Set(closingList.map(e=>e.id)).size
    });
  }
  res.json({ months: out });
});

router.get('/yearly', authRequired, async (req,res)=>{
  const y = Number(req.query.year) || new Date().getFullYear();
  const months = [];
  for(let m=1;m<=12;m++){
    const start = H.firstDayOfMonth(y,m);
    const end = H.lastDayOfMonth(y,m);
    const prevDay = H.addDays(start,-1);
    const openingList = await activeOnDate(prevDay);
    const closingList = await activeOnDate(end);
    const newJoining = await periodsStartingInRange(start,end);
    const exits = await periodsEndingInRange(start,end);
    months.push({
      month:m,
      opening: new Set(openingList.map(e=>e.id)).size,
      newJoining: new Set(newJoining.map(e=>e.employee_fk)).size,
      exits: new Set(exits.map(e=>e.employee_fk)).size,
      closing: new Set(closingList.map(e=>e.id)).size
    });
  }
  res.json({ year:y, months });
});

module.exports = router;
