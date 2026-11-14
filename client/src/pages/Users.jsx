import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export default function Users(){
  const [list,setList]=useState([]);
  const [form,setForm]=useState({username:'',password:'',full_name:'',role:'operator'});
  const load = ()=> api.get('/users').then(r=>setList(r.data.users));
  useEffect(()=>{ load(); },[]);
  const create = async ()=>{
    await api.post('/users', form);
    setForm({username:'',password:'',full_name:'',role:'operator'});
    load();
  };
  const reset = async (u)=>{
    const pw = prompt('New password:'); if(!pw) return;
    await api.post('/users/'+u.id+'/reset-password', {password:pw});
    alert('Reset done');
  };
  const toggle = async (u)=>{
    await api.put('/users/'+u.id, {is_active: !u.is_active});
    load();
  };
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      <div className="bg-white p-4 rounded shadow mb-4">
        <h3 className="font-semibold mb-2">Create User</h3>
        <div className="flex gap-2 flex-wrap">
          <input className="border p-2 rounded" placeholder="Username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} />
          <input className="border p-2 rounded" type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
          <input className="border p-2 rounded" placeholder="Full Name" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} />
          <select className="border p-2 rounded" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="operator">operator</option><option value="admin">admin</option></select>
          <button onClick={create} className="bg-blue-600 text-white px-4 py-2 rounded">Create</button>
        </div>
      </div>
      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr><th>Username</th><th>Name</th><th>Role</th><th>Active</th><th>Last Login</th><th>Actions</th></tr></thead>
          <tbody>{list.map(u=>(<tr key={u.id} className="border-t"><td className="p-2">{u.username}</td><td className="p-2">{u.full_name}</td><td className="p-2">{u.role}</td><td className="p-2">{u.is_active?'Yes':'No'}</td><td className="p-2">{u.last_login}</td><td className="p-2 space-x-1"><button className="text-blue-600 text-xs" onClick={()=>reset(u)}>Reset PW</button><button className="text-red-600 text-xs" onClick={()=>toggle(u)}>{u.is_active?'Deactivate':'Activate'}</button></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
