import React, { useState } from 'react';
import api from '../lib/api';

export default function Absenteeism(){
  const [year,setYear]=useState(new Date().getFullYear());
  const [month,setMonth]=useState(new Date().getMonth()+1);
  const [pg,setPg]=useState('');
  const [groups,setGroups]=useState([]);
  const [data,setData]=useState(null);
  const [empId,setEmpId]=useState('');
  const [hist,setHist]=useState(null);
  React.useEffect(()=>{ api.get('/settings/production-groups').then(r=>setGroups(r.data.groups||[])); },[]);
  const load = async ()=>{
    const r = await api.get('/reports/absenteeism', {params:{year,month,pg}});
    setData(r.data);
  };
  React.useEffect(()=>{ load(); },[year,month,pg]);
  const loadHist = async ()=>{
    if(!empId) return;
    const r = await api.get('/reports/absence-history', {params:{employee_id:empId}});
    setHist(r.data);
  };
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Absenteeism Monitoring</h1>
      <div className="flex gap-2 mb-4">
        <input type="number" value={year} onChange={e=>setYear(e.target.value)} className="border p-2 rounded w-20" />
        <select value={month} onChange={e=>setMonth(e.target.value)} className="border p-2 rounded">{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>
        <select value={pg} onChange={e=>setPg(e.target.value)} className="border p-2 rounded"><option value="">All PG</option>{groups.map(g=><option key={g}>{g}</option>)}</select>
      </div>
      {data && (
        <>
          <div className="bg-white rounded shadow overflow-auto mb-4">
            <h3 className="p-3 font-semibold">Employee Absenteeism Ranking</h3>
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Emp ID</th><th>Name</th><th>PG</th><th>Absent Days</th></tr></thead>
            <tbody>{data.employees.map(e=>(<tr key={e.employee_id} className="border-t"><td className="p-2">{e.employee_id}</td><td className="p-2">{e.name}</td><td className="p-2">{e.pg}</td><td className="p-2 text-center font-bold">{e.absent_days}</td></tr>))}</tbody></table>
          </div>
          <div className="bg-white rounded shadow overflow-auto mb-4">
            <h3 className="p-3 font-semibold">PG-wise Absent Days</h3>
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>PG</th><th>Absent Days</th></tr></thead>
            <tbody>{data.pgTotals.map(p=>(<tr key={p.pg} className="border-t"><td className="p-2">{p.pg}</td><td className="p-2 text-center">{p.c}</td></tr>))}</tbody></table>
          </div>
        </>
      )}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Date-wise Absence History</h3>
        <div className="flex gap-2 mb-2">
          <input className="border p-2 rounded" placeholder="Employee ID" value={empId} onChange={e=>setEmpId(e.target.value)} />
          <button onClick={loadHist} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Load</button>
        </div>
        {hist && <ul className="text-sm">{hist.absences.map(a=>(<li key={a.attendance_date} className="border-b py-1">{a.attendance_date} - {a.remarks}</li>))}</ul>}
      </div>
    </div>
  );
}
