import React, { useState } from 'react';
import api from '../lib/api';

export default function Overtime(){
  const [mode,setMode]=useState('daily');
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [year,setYear]=useState(new Date().getFullYear());
  const [month,setMonth]=useState(new Date().getMonth()+1);
  const [pg,setPg]=useState('');
  const [groups,setGroups]=useState([]);
  const [data,setData]=useState(null);
  React.useEffect(()=>{ api.get('/settings/production-groups').then(r=>setGroups(r.data.groups||[])); },[]);

  const load = async ()=>{
    let r;
    if(mode==='daily') r=await api.get('/reports/ot-daily',{params:{date}});
    else if(mode==='monthly') r=await api.get('/reports/ot-monthly',{params:{year,month,pg}});
    else if(mode==='pg') r=await api.get('/reports/ot-pg',{params:{year,month}});
    else r=await api.get('/reports/ot-yearly',{params:{year}});
    setData(r.data);
  };
  React.useEffect(()=>{ load(); },[mode,date,year,month,pg]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Overtime Management</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={mode} onChange={e=>setMode(e.target.value)} className="border p-2 rounded">
          <option value="daily">Daily OT</option>
          <option value="monthly">Monthly OT</option>
          <option value="pg">PG-wise OT</option>
          <option value="yearly">Yearly OT</option>
        </select>
        {mode==='daily' && <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border p-2 rounded" />}
        {mode!=='daily' && <>
          <input type="number" value={year} onChange={e=>setYear(e.target.value)} className="border p-2 rounded w-20" />
          <select value={month} onChange={e=>setMonth(e.target.value)} className="border p-2 rounded">{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>
        </>}
        {mode==='monthly' && <select value={pg} onChange={e=>setPg(e.target.value)} className="border p-2 rounded"><option value="">All PG</option>{groups.map(g=><option key={g}>{g}</option>)}</select>}
      </div>
      {data && (
        <div className="bg-white rounded shadow overflow-auto">
          {mode==='daily' && <>
            <div className="p-3 font-semibold">Total OT: {data.total.toFixed(2)}</div>
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Emp ID</th><th>Name</th><th>PG</th><th>OT</th><th>Work Hrs</th></tr></thead>
            <tbody>{data.records.map(r=>(<tr key={r.employee_id} className="border-t"><td className="p-2">{r.employee_id}</td><td className="p-2">{r.name}</td><td className="p-2">{r.pg}</td><td className="p-2">{r.ot_hours}</td><td className="p-2">{r.working_hours}</td></tr>))}</tbody></table>
          </>}
          {mode==='monthly' && <>
            <div className="p-3 font-semibold">Total OT: {data.total.toFixed(2)}</div>
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Emp ID</th><th>Name</th><th>PG</th><th>OT</th><th>Work Hrs</th></tr></thead>
            <tbody>{data.records.map(r=>(<tr key={r.employee_id} className="border-t"><td className="p-2">{r.employee_id}</td><td className="p-2">{r.name}</td><td className="p-2">{r.pg}</td><td className="p-2">{r.ot_hours?.toFixed? r.ot_hours.toFixed(2):r.ot_hours}</td><td className="p-2">{r.working_hours?.toFixed? r.working_hours.toFixed(2):r.working_hours}</td></tr>))}</tbody></table>
          </>}
          {mode==='pg' && <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>PG</th><th>Emp Count</th><th>OT</th><th>Work Hrs</th></tr></thead>
            <tbody>{data.records.map(r=>(<tr key={r.pg} className="border-t"><td className="p-2">{r.pg}</td><td className="p-2">{r.emp_count}</td><td className="p-2">{r.ot_hours?.toFixed?r.ot_hours.toFixed(2):r.ot_hours}</td><td className="p-2">{r.working_hours?.toFixed?r.working_hours.toFixed(2):r.working_hours}</td></tr>))}</tbody></table>}
          {mode==='yearly' && <>
            <div className="p-3 font-semibold">Total OT: {data.total.toFixed(2)}</div>
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Emp ID</th><th>Name</th><th>PG</th><th>OT</th></tr></thead>
            <tbody>{data.records.map(r=>(<tr key={r.employee_id} className="border-t"><td className="p-2">{r.employee_id}</td><td className="p-2">{r.name}</td><td className="p-2">{r.pg}</td><td className="p-2">{r.ot_hours?.toFixed?r.ot_hours.toFixed(2):r.ot_hours}</td></tr>))}</tbody></table>
          </>}
        </div>
      )}
    </div>
  );
}
