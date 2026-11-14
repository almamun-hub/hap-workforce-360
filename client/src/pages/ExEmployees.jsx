import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export default function ExEmployees(){
  const [list,setList]=useState([]);
  useEffect(()=>{ api.get('/employees/ex').then(r=>setList(r.data.employees)); },[]);
  const rejoin = async (e)=>{
    const jd = prompt('Rejoining date (YYYY-MM-DD):', new Date().toISOString().slice(0,10));
    if(!jd) return;
    await api.post('/employees/'+e.id+'/rejoin', { joining_date:jd });
    api.get('/employees/ex').then(r=>setList(r.data.employees));
  };
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Ex-Employees</h1>
      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr><th>ID</th><th>Name</th><th>PG</th><th>Joining</th><th>Last Working</th><th>Actions</th></tr></thead>
          <tbody>{list.map(e=>(<tr key={e.id} className="border-t"><td className="p-2">{e.employee_id}</td><td className="p-2">{e.name}</td><td className="p-2">{e.pg}</td><td className="p-2">{e.current_joining_date}</td><td className="p-2">{e.last_working_date}</td><td className="p-2"><button className="text-purple-600 text-xs" onClick={()=>rejoin(e)}>Rejoin</button></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
