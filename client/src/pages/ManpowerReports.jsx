import React, { useState } from 'react';
import api from '../lib/api';

export default function ManpowerReports(){
  const [year,setYear]=useState(new Date().getFullYear());
  const [month,setMonth]=useState(new Date().getMonth()+1);
  const [data,setData]=useState(null);
  const load = async ()=>{
    const y = await api.get('/movement/yearly', {params:{year}});
    const m = await api.get('/movement/monthly', {params:{year,month}});
    const p = await api.get('/movement/pg-wise', {params:{year,month}});
    setData({yearly:y.data, monthly:m.data, pg:p.data});
  };
  React.useEffect(()=>{ load(); },[year,month]);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Manpower Reports</h1>
      <div className="flex gap-2 mb-4">
        <input type="number" value={year} onChange={e=>setYear(e.target.value)} className="border p-2 rounded w-20" />
        <select value={month} onChange={e=>setMonth(e.target.value)} className="border p-2 rounded">{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>
        <button onClick={load} className="bg-blue-600 text-white px-4 py-2 rounded">Load</button>
      </div>
      {data && (
        <>
          <div className="bg-white rounded shadow overflow-auto mb-4">
            <h3 className="p-3 font-semibold">Yearly Movement {year}</h3>
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Month</th><th>Opening</th><th>New</th><th>Left</th><th>Closing</th></tr></thead>
            <tbody>{data.yearly.months.map(m=>(<tr key={m.month} className="border-t"><td className="p-2">{m.month}</td><td className="p-2 text-center">{m.opening}</td><td className="p-2 text-center">{m.newJoining}</td><td className="p-2 text-center">{m.exits}</td><td className="p-2 text-center">{m.closing}</td></tr>))}</tbody></table>
          </div>
          <div className="bg-white rounded shadow overflow-auto mb-4">
            <h3 className="p-3 font-semibold">PG-wise Movement {year}-{month}</h3>
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>PG</th><th>Opening</th><th>New</th><th>Left</th><th>Closing</th></tr></thead>
            <tbody>{data.pg.groups.map(g=>(<tr key={g.pg} className="border-t"><td className="p-2">{g.pg}</td><td className="p-2 text-center">{g.opening}</td><td className="p-2 text-center">{g.newJoining}</td><td className="p-2 text-center">{g.exits}</td><td className="p-2 text-center">{g.closing}</td></tr>))}</tbody></table>
          </div>
        </>
      )}
    </div>
  );
}
