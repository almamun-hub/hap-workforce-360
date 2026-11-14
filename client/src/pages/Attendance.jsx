import React, { useEffect, useState } from 'react';
import api from '../lib/api';

const STATUSES = ['P','A','L','H','WO'];

export default function Attendance(){
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [pg,setPg]=useState('');
  const [search,setSearch]=useState('');
  const [emps,setEmps]=useState([]);
  const [entries,setEntries]=useState({}); // employee_id -> {status,working_hours,ot_hours,remarks}
  const [groups,setGroups]=useState([]);
  const [progress,setProgress]=useState(null);
  const [msg,setMsg]=useState('');

  const load = async ()=>{
    const r = await api.get('/attendance/eligible', {params:{date,pg,search}});
    setEmps(r.data.employees);
    const init={};
    r.data.employees.forEach(e=>{
      const rec = e.record;
      init[e.employee_id] = {
        status: rec? rec.status : 'P',
        working_hours: rec? rec.working_hours : (localStorage.getItem('defaultWH')||'8'),
        ot_hours: rec? rec.ot_hours : '0',
        remarks: rec? (rec.remarks||'') : ''
      };
    });
    setEntries(init);
    const pr = await api.get('/attendance/progress', {params:{date}});
    setProgress(pr.data);
  };
  useEffect(()=>{ load(); },[date,pg,search]);
  useEffect(()=>{ api.get('/settings/production-groups').then(r=>setGroups(r.data.groups||[])); },[]);

  const setField = (id, field, val) => setEntries(prev=>({...prev, [id]: {...prev[id], [field]: val}}));
  const selectAllPresent = ()=>{
    setEntries(prev=>{
      const next={...prev};
      Object.keys(next).forEach(k=> next[k].status='P');
      return next;
    });
  };

  const submit = async ()=>{
    const entriesArr = emps.map(e=>({ employee_id:e.employee_id, ...entries[e.employee_id] }));
    await api.post('/attendance/bulk', { date, entries: entriesArr });
    setMsg('Submitted successfully');
    setTimeout(()=>setMsg(''),3000);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Daily Attendance</h1>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border p-2 rounded" />
        <select className="border p-2 rounded" value={pg} onChange={e=>setPg(e.target.value)}><option value="">All PG</option>{groups.map(g=><option key={g}>{g}</option>)}</select>
        <input className="border p-2 rounded" placeholder="Search" value={search} onChange={e=>setSearch(e.target.value)} />
        <button onClick={selectAllPresent} className="bg-gray-200 px-3 py-2 rounded text-sm">Select All Present</button>
        <button onClick={submit} className="bg-blue-600 text-white px-4 py-2 rounded">Submit</button>
      </div>
      {progress && <div className="mb-3 text-sm">Progress: {progress.submitted}/{progress.total} submitted. Missing: {progress.missing.length}</div>}
      {msg && <div className="mb-3 text-green-600 text-sm">{msg}</div>}
      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr><th className="p-2">SL</th><th>Emp ID</th><th>Name</th><th>PG</th><th>Status</th><th>Work Hrs</th><th>OT Hrs</th><th>Remarks</th></tr></thead>
          <tbody>{emps.map((e,i)=>{
            const en = entries[e.employee_id]||{};
            return (
              <tr key={e.id} className="border-t">
                <td className="p-2 text-center">{i+1}</td>
                <td className="p-2">{e.employee_id}</td>
                <td className="p-2">{e.name}</td>
                <td className="p-2">{e.pg}</td>
                <td className="p-2">
                  <select value={en.status} onChange={ev=>setField(e.employee_id,'status',ev.target.value)} className="border p-1 rounded">
                    {STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-2"><input type="number" step="0.5" value={en.working_hours} onChange={ev=>setField(e.employee_id,'working_hours',ev.target.value)} className="border p-1 w-16 rounded" /></td>
                <td className="p-2"><input type="number" step="0.5" value={en.ot_hours} onChange={ev=>setField(e.employee_id,'ot_hours',ev.target.value)} className="border p-1 w-16 rounded" /></td>
                <td className="p-2"><input value={en.remarks} onChange={ev=>setField(e.employee_id,'remarks',ev.target.value)} className="border p-1 w-40 rounded" /></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {progress && progress.missing.length>0 && (
        <div className="mt-4 bg-yellow-50 p-3 rounded">
          <div className="font-semibold text-sm mb-1">Not submitted:</div>
          <ul className="text-xs">{progress.missing.map(m=><li key={m.employee_id}>{m.employee_id} - {m.name}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
