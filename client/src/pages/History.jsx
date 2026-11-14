import React, { useState } from 'react';
import api from '../lib/api';

export default function History(){
  const [empId,setEmpId]=useState('');
  const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
  const [data,setData]=useState(null);
  const search = async ()=>{
    const r = await api.get('/reports/employee-monthly', {params:{employee_id:empId, month}});
    setData(r.data);
  };
  const exportXlsx = async ()=>{
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(data.records.map(r=>({Date:r.attendance_date,Status:r.status,'Work Hrs':r.working_hours,'OT':r.ot_hours,Remarks:r.remarks})));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'History');
    XLSX.writeFile(wb, `attendance_${empId}_${month}.xlsx`);
  };
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Employee Attendance History</h1>
      <div className="flex gap-2 mb-4">
        <input className="border p-2 rounded" placeholder="Employee ID" value={empId} onChange={e=>setEmpId(e.target.value)} />
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="border p-2 rounded" />
        <button onClick={search} className="bg-blue-600 text-white px-4 py-2 rounded">Search</button>
        {data && <button onClick={exportXlsx} className="bg-green-600 text-white px-4 py-2 rounded">Excel</button>}
      </div>
      {data && (
        <div>
          <div className="bg-white p-4 rounded shadow mb-3 text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><b>Name:</b> {data.employee.name}</div>
            <div><b>PG:</b> {data.employee.pg}</div>
            <div><b>Present:</b> {data.present}</div>
            <div><b>Absent:</b> {data.absent}</div>
            <div><b>Leave:</b> {data.leave}</div>
            <div><b>Holiday:</b> {data.holiday}</div>
            <div><b>WO:</b> {data.weeklyOff}</div>
            <div><b>Work Hrs:</b> {data.workingHours.toFixed(2)}</div>
            <div><b>OT:</b> {data.otHours.toFixed(2)}</div>
            <div><b>Attendance %:</b> {data.pct.toFixed(1)}</div>
          </div>
          <div className="bg-white rounded shadow overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100"><tr><th>Date</th><th>Status</th><th>Work Hrs</th><th>OT</th><th>Remarks</th></tr></thead>
              <tbody>{data.records.map(r=>(<tr key={r.id} className="border-t"><td className="p-2">{r.attendance_date}</td><td className="p-2">{r.status}</td><td className="p-2">{r.working_hours}</td><td className="p-2">{r.ot_hours}</td><td className="p-2">{r.remarks}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
