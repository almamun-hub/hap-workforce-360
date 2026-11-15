import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export default function Settings(){
  const [settings,setSettings]=useState({});
  const [groups,setGroups]=useState([]);
  const [newGroup,setNewGroup]=useState('');
  const [holidays,setHolidays]=useState([]);
  const [hDate,setHDate]=useState('');
  const [hName,setHName]=useState('');
  const [msg,setMsg]=useState('');
  const load = async ()=>{
    const s = await api.get('/settings'); setSettings(s.data.settings);
    const g = await api.get('/settings/production-groups'); setGroups(g.data.groups);
    const h = await api.get('/settings/holidays'); setHolidays(h.data.holidays);
  };
  useEffect(()=>{ load(); },[]);
  const saveSettings = async ()=>{
    await api.put('/settings', settings);
    setMsg('Settings saved'); setTimeout(()=>setMsg(''),3000);
  };
  const addGroup = async ()=>{ if(!newGroup) return; await api.post('/settings/production-groups',{name:newGroup}); setNewGroup(''); setMsg('Group added'); setTimeout(()=>setMsg(''),3000); load(); };
  const delGroup = async (g)=>{ await api.delete('/settings/production-groups/'+encodeURIComponent(g)); setMsg('Group deleted'); setTimeout(()=>setMsg(''),3000); load(); };
  const addHoliday = async ()=>{ if(!hDate) return; await api.post('/settings/holidays',{date:hDate,name:hName}); setHDate(''); setHName(''); setMsg('Holiday added'); setTimeout(()=>setMsg(''),3000); load(); };
  const delHoliday = async (d)=>{ await api.delete('/settings/holidays/'+d); setMsg('Holiday deleted'); setTimeout(()=>setMsg(''),3000); load(); };

  return (
    <div>
      {msg && <div className="mb-3 text-green-600 text-sm bg-green-50 p-2 rounded">{msg}</div>}
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="bg-white p-4 rounded shadow mb-4">
        <h3 className="font-semibold mb-2">Configuration</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(settings).map(([k,v])=>(
            <div key={k}><label className="text-xs text-gray-500">{k}</label>
              <input className="border p-2 w-full rounded" value={v} onChange={e=>setSettings({...settings,[k]:e.target.value})} />
            </div>
          ))}
        </div>
        <button onClick={saveSettings} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded">Save</button>
      </div>
      <div className="bg-white p-4 rounded shadow mb-4">
        <h3 className="font-semibold mb-2">Production Groups</h3>
        <div className="flex gap-2 mb-2">
          <input className="border p-2 rounded" placeholder="New group" value={newGroup} onChange={e=>setNewGroup(e.target.value)} />
          <button onClick={addGroup} className="bg-blue-600 text-white px-3 py-1 rounded">Add</button>
        </div>
        <ul className="text-sm">{groups.map(g=>(<li key={g} className="flex justify-between border-b py-1"><span>{g}</span><button onClick={()=>delGroup(g)} className="text-red-600 text-xs">Delete</button></li>))}</ul>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Holidays</h3>
        <div className="flex gap-2 mb-2">
          <input type="date" className="border p-2 rounded" value={hDate} onChange={e=>setHDate(e.target.value)} />
          <input className="border p-2 rounded" placeholder="Name" value={hName} onChange={e=>setHName(e.target.value)} />
          <button onClick={addHoliday} className="bg-blue-600 text-white px-3 py-1 rounded">Add</button>
        </div>
        <ul className="text-sm">{holidays.map(h=>(<li key={h.holiday_date} className="flex justify-between border-b py-1"><span>{h.holiday_date} {h.name}</span><button onClick={()=>delHoliday(h.holiday_date)} className="text-red-600 text-xs">Delete</button></li>))}</ul>
      </div>
    </div>
  );
}
