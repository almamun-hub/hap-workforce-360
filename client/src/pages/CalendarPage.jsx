import React, { useState } from 'react';
import api from '../lib/api';

export default function CalendarPage(){
  const [empId,setEmpId]=useState('');
  const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
  const [data,setData]=useState(null);
  const load = async ()=>{
    if(!empId) return;
    const r = await api.get('/reports/calendar', {params:{employee_id:empId, month}});
    setData(r.data);
  };
  const color = (st)=>{
    if(st==='P') return 'bg-green-200';
    if(st==='A') return 'bg-red-200';
    if(st==='L') return 'bg-yellow-200';
    if(st==='H') return 'bg-blue-200';
    if(st==='WO') return 'bg-gray-200';
    return 'bg-white';
  };
  const prevMonth = ()=>{
    const d=new Date(month+'-01'); d.setMonth(d.getMonth()-1);
    setMonth(d.toISOString().slice(0,7));
  };
  const nextMonth = ()=>{
    const d=new Date(month+'-01'); d.setMonth(d.getMonth()+1);
    setMonth(d.toISOString().slice(0,7));
  };
  const [selected,setSelected]=useState(null);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Attendance Calendar</h1>
      <div className="flex gap-2 mb-4">
        <input className="border p-2 rounded" placeholder="Employee ID" value={empId} onChange={e=>setEmpId(e.target.value)} />
        <button onClick={prevMonth} className="px-3 py-1 bg-gray-200 rounded">Prev</button>
        <span className="px-3 py-2">{month}</span>
        <button onClick={nextMonth} className="px-3 py-1 bg-gray-200 rounded">Next</button>
        <button onClick={load} className="bg-blue-600 text-white px-4 py-2 rounded">Load</button>
      </div>
      {data && (
        <div className="grid grid-cols-7 gap-1 max-w-md">
          {data.days.map(d=>{
            const st = d.record?.status;
            return (
              <button key={d.date} onClick={()=>setSelected(d)} className={`p-2 text-xs rounded ${color(st)} border`}>
                {d.date.slice(8)}
              </button>
            );
          })}
        </div>
      )}
      {selected && (
        <div className="mt-4 bg-white p-4 rounded shadow text-sm">
          <div><b>Date:</b> {selected.date}</div>
          <div><b>Status:</b> {selected.record?.status || '-'}</div>
          <div><b>Work Hrs:</b> {selected.record?.working_hours ?? '-'}</div>
          <div><b>OT:</b> {selected.record?.ot_hours ?? '-'}</div>
          <div><b>Remarks:</b> {selected.record?.remarks || '-'}</div>
        </div>
      )}
    </div>
  );
}
