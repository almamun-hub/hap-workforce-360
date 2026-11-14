import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
export default function Login(){
  const { login } = useAuth();
  const nav = useNavigate();
  const [u,setU]=useState('admin'); const [p,setP]=useState('admin123'); const [err,setErr]=useState('');
  const submit = async (e)=>{ e.preventDefault(); try { await login(u,p); nav('/'); } catch(e){ setErr('Login failed'); } };
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <form onSubmit={submit} className="bg-white p-8 rounded shadow w-80">
        <h1 className="text-xl font-bold mb-4 text-blue-700">HAP Workforce 360</h1>
        <input className="border p-2 w-full mb-2" placeholder="Username" value={u} onChange={e=>setU(e.target.value)} />
        <input className="border p-2 w-full mb-2" type="password" placeholder="Password" value={p} onChange={e=>setP(e.target.value)} />
        {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
        <button className="bg-blue-600 text-white w-full py-2 rounded">Login</button>
        <div className="text-xs text-gray-400 mt-3">Default: admin / admin123</div>
      </form>
    </div>
  );
}
