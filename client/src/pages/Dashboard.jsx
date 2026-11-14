import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function Dashboard(){
  const [data,setData]=useState(null);
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  useEffect(()=>{ api.get('/dashboard', {params:{date}}).then(r=>setData(r.data)); },[date]);
  if(!data) return <div>Loading...</div>;
  const t = data.today; const mo = data.monthly;
  const cards = [
    ['Total Active Employees', t.totalActive],
    ["Today's Present", t.present],
    ["Today's Absent", t.absent],
    ["Today's Leave", t.leave],
    ["Today's Weekly Off", t.wo],
    ["Attendance %", t.pct.toFixed(1)+'%'],
    ["Today's Total OT", t.totalOT.toFixed(2)],
  ];
  const mCards = [
    ['Current Active Manpower', mo.closing],
    ['New Joining This Month', mo.newJoining],
    ['Employees Left This Month', mo.exits],
    ['Net Manpower Change', mo.net],
    ['Total Monthly Absent Days', mo.monthlyAbsent],
    ['Total Monthly OT Hours', mo.monthlyOT.toFixed(2)],
  ];
  const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#6b7280'];
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border p-1 rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {cards.map(([l,v])=>(<div key={l} className="bg-white p-4 rounded shadow"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold">{v}</div></div>))}
      </div>
      <h2 className="font-semibold mb-2">Monthly Manpower</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {mCards.map(([l,v])=>(<div key={l} className="bg-white p-4 rounded shadow"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold">{v}</div></div>))}
      </div>
      <h2 className="font-semibold mb-2">PG-wise Summary</h2>
      <div className="bg-white rounded shadow overflow-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr><th className="p-2 text-left">PG</th><th>Total</th><th>Present</th><th>Absent</th><th>Leave</th><th>WO</th><th>Work Hrs</th><th>OT Hrs</th></tr></thead>
          <tbody>{data.pgSummary.map(p=>(<tr key={p.pg} className="border-t"><td className="p-2">{p.pg}</td><td className="text-center">{p.total}</td><td className="text-center">{p.present}</td><td className="text-center">{p.absent}</td><td className="text-center">{p.leave}</td><td className="text-center">{p.wo}</td><td className="text-center">{p.workingHours.toFixed(1)}</td><td className="text-center">{p.otHours.toFixed(1)}</td></tr>))}</tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Daily Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={220}><LineChart data={data.trend}><XAxis dataKey="date" tick={{fontSize:10}} /><YAxis /><Tooltip /><Line type="monotone" dataKey="present" stroke="#10b981" /><Line type="monotone" dataKey="absent" stroke="#ef4444" /></LineChart></ResponsiveContainer>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">PG-wise Manpower</h3>
          <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={data.pgDist} dataKey="count" nameKey="pg" outerRadius={80} label>{data.pgDist.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}</Pie><Tooltip/></PieChart></ResponsiveContainer>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Monthly Attendance Comparison</h3>
          <ResponsiveContainer width="100%" height={220}><BarChart data={data.monthlyComp}><XAxis dataKey="label" tick={{fontSize:10}} /><YAxis /><Tooltip /><Bar dataKey="present" fill="#10b981" /><Bar dataKey="absent" fill="#ef4444" /><Bar dataKey="leave" fill="#f59e0b" /></BarChart></ResponsiveContainer>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Monthly Joining vs Exit</h3>
          <ResponsiveContainer width="100%" height={220}><BarChart data={data.joinExit}><XAxis dataKey="label" tick={{fontSize:10}} /><YAxis /><Tooltip /><Bar dataKey="joining" fill="#3b82f6" /><Bar dataKey="exit" fill="#ef4444" /></BarChart></ResponsiveContainer>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Monthly OT Comparison</h3>
          <ResponsiveContainer width="100%" height={220}><BarChart data={data.otComp}><XAxis dataKey="label" tick={{fontSize:10}} /><YAxis /><Tooltip /><Bar dataKey="ot" fill="#8b5cf6" /></BarChart></ResponsiveContainer>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Absenteeism Summary (Top)</h3>
          <ul className="text-sm">{data.absSummary.map(a=>(<li key={a.employee_id} className="flex justify-between border-b py-1"><span>{a.name} ({a.pg})</span><span className="font-bold">{a.c}</span></li>))}</ul>
        </div>
      </div>
    </div>
  );
}
