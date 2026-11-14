import React, { useState } from 'react';
import api from '../lib/api';

export default function Movement(){
  const [year,setYear]=useState(new Date().getFullYear());
  const [month,setMonth]=useState(new Date().getMonth()+1);
  const [data,setData]=useState(null);
  const [pgData,setPgData]=useState(null);
  const [hist,setHist]=useState(null);
  const load = async ()=>{
    const r = await api.get('/movement/monthly', {params:{year,month}});
    setData(r.data);
    const p = await api.get('/movement/pg-wise', {params:{year,month}});
    setPgData(p.data);
    const h = await api.get('/movement/history', {params:{months:6}});
    setHist(h.data);
  };
  React.useEffect(()=>{ load(); },[year,month]);

  const exportXlsx = async (rows, name)=>{
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, name);
    XLSX.writeFile(wb, `${name}.xlsx`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Employee Movement</h1>
      <div className="flex gap-2 mb-4">
        <input type="number" value={year} onChange={e=>setYear(e.target.value)} className="border p-2 rounded w-20" />
        <select value={month} onChange={e=>setMonth(e.target.value)} className="border p-2 rounded">{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>
      </div>
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[
            ['Opening Manpower', data.opening],
            ['New Joined', data.newJoining],
            ['Left', data.exits],
            ['Closing Manpower', data.closing],
            ['Net Change', data.net],
          ].map(([l,v])=>(<div key={l} className="bg-white p-4 rounded shadow"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold">{v}</div></div>))}
        </div>
      )}
      {pgData && (
        <div className="bg-white rounded shadow overflow-auto mb-4">
          <h3 className="p-3 font-semibold">PG-wise Movement</h3>
          <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>PG</th><th>Opening</th><th>New</th><th>Left</th><th>Closing</th></tr></thead>
          <tbody>{pgData.groups.map(g=>(<tr key={g.pg} className="border-t"><td className="p-2">{g.pg}</td><td className="p-2 text-center">{g.opening}</td><td className="p-2 text-center">{g.newJoining}</td><td className="p-2 text-center">{g.exits}</td><td className="p-2 text-center">{g.closing}</td></tr>))}</tbody></table>
        </div>
      )}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded shadow overflow-auto">
            <div className="p-3 flex justify-between"><h3 className="font-semibold">New Joining</h3>
              <button onClick={()=>exportXlsx(data.newJoiningList.map((r,i)=>({SL:i+1,Name:r.name,'Emp ID':r.employee_id,Designation:r.designation,PG:r.pg,'Joining Date':r.joining_date,Type:r.employment_type})),'new_joining')} className="text-xs text-blue-600">Excel</button>
            </div>
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Name</th><th>ID</th><th>PG</th><th>Joining</th></tr></thead>
            <tbody>{data.newJoiningList.map(r=>(<tr key={r.id} className="border-t"><td className="p-2">{r.name}</td><td className="p-2">{r.employee_id}</td><td className="p-2">{r.pg}</td><td className="p-2">{r.joining_date}</td></tr>))}</tbody></table>
          </div>
          <div className="bg-white rounded shadow overflow-auto">
            <div className="p-3 flex justify-between"><h3 className="font-semibold">Exits</h3>
              <button onClick={()=>exportXlsx(data.exitList.map((r,i)=>({SL:i+1,Name:r.name,'Emp ID':r.employee_id,Designation:r.designation,PG:r.pg,'Joining':r.joining_date,'Last Working':r.last_working_date,Reason:r.exit_reason,Remarks:r.exit_remarks})),'exits')} className="text-xs text-blue-600">Excel</button>
            </div>
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Name</th><th>ID</th><th>PG</th><th>Last Working</th><th>Reason</th></tr></thead>
            <tbody>{data.exitList.map(r=>(<tr key={r.id} className="border-t"><td className="p-2">{r.name}</td><td className="p-2">{r.employee_id}</td><td className="p-2">{r.pg}</td><td className="p-2">{r.last_working_date}</td><td className="p-2">{r.exit_reason}</td></tr>))}</tbody></table>
          </div>
        </div>
      )}
      {hist && (
        <div className="bg-white rounded shadow overflow-auto">
          <h3 className="p-3 font-semibold">Historical Comparison (last 6 months)</h3>
          <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Month</th><th>Opening</th><th>New</th><th>Left</th><th>Closing</th><th>Net</th></tr></thead>
          <tbody>{hist.months.map(m=>(<tr key={m.label} className="border-t"><td className="p-2">{m.label}</td><td className="p-2 text-center">{m.opening}</td><td className="p-2 text-center">{m.newJoining}</td><td className="p-2 text-center">{m.exits}</td><td className="p-2 text-center">{m.closing}</td><td className="p-2 text-center">{m.newJoining-m.exits}</td></tr>))}</tbody></table>
        </div>
      )}
    </div>
  );
}
