import React, { useEffect, useState } from 'react';
import api from '../lib/api';
const PG_FALLBACK = ['Gas Stove','Rice Cooker','Electric Cooker','Iron','Kettle','Other'];

export default function Employees(){
  const [list,setList]=useState([]);
  const [groups,setGroups]=useState(PG_FALLBACK);
  const [search,setSearch]=useState('');
  const [pg,setPg]=useState('');
  const [status,setStatus]=useState('');
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState(null);
  const [profile,setProfile]=useState(null);
  const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
  const [msg,setMsg]=useState('');

  const load = ()=> api.get('/employees', {params:{search,pg,status}}).then(r=>setList(r.data.employees));
  useEffect(()=>{ load(); },[search,pg,status]);
  useEffect(()=>{ api.get('/settings/production-groups').then(r=>setGroups(r.data.groups||PG_FALLBACK)); },[]);

  const empty = { employee_id:'', name:'', designation:'', department:'', pg:'Gas Stove', contact_number:'', employment_type:'Permanent', employment_status:'Active', joining_date:new Date().toISOString().slice(0,10), remarks:'' };
  const [form,setForm]=useState(empty);

  const openAdd = ()=>{ setEditing(null); setForm(empty); setShowForm(true); };
  const openEdit = (e)=>{ setEditing(e); setForm({...empty,...e, joining_date: e.current_joining_date || empty.joining_date}); setShowForm(true); };

  const save = async ()=>{
    if(editing){ await api.put('/employees/'+editing.id, form); setMsg('Employee updated successfully'); }
    else { await api.post('/employees', form); setMsg('Employee added successfully'); }
    setShowForm(false); load();
    setTimeout(()=>setMsg(''),3000);
  };

  const markLeft = async (e)=>{
    const lwd = prompt('Last working date (YYYY-MM-DD):', new Date().toISOString().slice(0,10));
    if(!lwd) return;
    const reason = prompt('Exit reason: Resignation/Termination/Contract End/Personal Reason/Other','Resignation');
    const remarks = prompt('Exit remarks:','')||'';
    await api.post('/employees/'+e.id+'/exit', { last_working_date:lwd, exit_reason:reason, exit_remarks:remarks });
    setMsg('Employee marked as left'); setTimeout(()=>setMsg(''),3000); load();
  };

  const rejoin = async (e)=>{
    const jd = prompt('Rejoining date (YYYY-MM-DD):', new Date().toISOString().slice(0,10));
    if(!jd) return;
    await api.post('/employees/'+e.id+'/rejoin', { joining_date:jd });
    setMsg('Employee rejoined'); setTimeout(()=>setMsg(''),3000); load();
  };

  const viewProfile = async (e)=>{
    const r = await api.get('/employees/'+e.id+'/profile', {params:{month}});
    setProfile(r.data);
  };

  return (
    <div>
      {msg && <div className="mb-3 text-green-600 text-sm bg-green-50 p-2 rounded">{msg}</div>}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Employee Management</h1>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded">Add Employee</button>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input className="border p-2 rounded" placeholder="Search name/ID" value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="border p-2 rounded" value={pg} onChange={e=>setPg(e.target.value)}><option value="">All PG</option>{groups.map(g=><option key={g}>{g}</option>)}</select>
        <select className="border p-2 rounded" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All Status</option><option>Active</option><option>Inactive</option></select>
      </div>

      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr><th className="p-2">ID</th><th>Name</th><th>Designation</th><th>PG</th><th>Joining</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{list.map(e=>(
            <tr key={e.id} className="border-t">
              <td className="p-2">{e.employee_id}</td>
              <td className="p-2">{e.name}</td>
              <td className="p-2">{e.designation}</td>
              <td className="p-2">{e.pg}</td>
              <td className="p-2">{e.current_joining_date}</td>
              <td className="p-2">{e.employment_status}</td>
              <td className="p-2 space-x-1">
                <button className="text-blue-600 text-xs" onClick={()=>openEdit(e)}>Edit</button>
                <button className="text-green-600 text-xs" onClick={()=>viewProfile(e)}>Profile</button>
                {e.employment_status==='Active' ? <button className="text-red-600 text-xs" onClick={()=>markLeft(e)}>Mark Left</button> : <button className="text-purple-600 text-xs" onClick={()=>rejoin(e)}>Rejoin</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-lg max-h-[90vh] overflow-auto">
            <h2 className="font-bold mb-3">{editing?'Edit Employee':'Add Employee'}</h2>
            <div className="grid grid-cols-2 gap-2">
              <input className="border p-2" placeholder="Employee ID" value={form.employee_id} onChange={e=>setForm({...form,employee_id:e.target.value})} />
              <input className="border p-2" placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
              <input className="border p-2" placeholder="Designation" value={form.designation} onChange={e=>setForm({...form,designation:e.target.value})} />
              <input className="border p-2" placeholder="Department" value={form.department} onChange={e=>setForm({...form,department:e.target.value})} />
              <select className="border p-2" value={form.pg} onChange={e=>setForm({...form,pg:e.target.value})}>{groups.map(g=><option key={g}>{g}</option>)}</select>
              <input className="border p-2" placeholder="Contact" value={form.contact_number} onChange={e=>setForm({...form,contact_number:e.target.value})} />
              <select className="border p-2" value={form.employment_type} onChange={e=>setForm({...form,employment_type:e.target.value})}><option>Permanent</option><option>Contractual</option><option>Other</option></select>
              <select className="border p-2" value={form.employment_status} onChange={e=>setForm({...form,employment_status:e.target.value})}><option>Active</option><option>Inactive</option></select>
              <input className="border p-2" type="date" value={form.joining_date} onChange={e=>setForm({...form,joining_date:e.target.value})} />
              <input className="border p-2 col-span-2" placeholder="Remarks" value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={save} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 border rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {profile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between mb-3"><h2 className="font-bold">Employee Profile</h2><button onClick={()=>setProfile(null)}>X</button></div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div><b>Name:</b> {profile.employee.name}</div>
              <div><b>ID:</b> {profile.employee.employee_id}</div>
              <div><b>Designation:</b> {profile.employee.designation}</div>
              <div><b>PG:</b> {profile.employee.pg}</div>
              <div><b>Joining:</b> {profile.employee.current_joining_date}</div>
              <div><b>Type:</b> {profile.employee.employment_type}</div>
              <div><b>Status:</b> {profile.employee.employment_status}</div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <label>Month</label>
              <input type="month" value={month} onChange={async e=>{ setMonth(e.target.value); const r=await api.get('/employees/'+profile.employee.id+'/profile',{params:{month:e.target.value}}); setProfile(r.data); }} className="border p-1 rounded" />
            </div>
            <div className="grid grid-cols-4 gap-2 text-sm mb-3">
              <div className="bg-gray-100 p-2 rounded">Present: {profile.stats.present}</div>
              <div className="bg-gray-100 p-2 rounded">Absent: {profile.stats.absent}</div>
              <div className="bg-gray-100 p-2 rounded">Leave: {profile.stats.leave}</div>
              <div className="bg-gray-100 p-2 rounded">OT: {profile.stats.otHours.toFixed(2)}</div>
              <div className="bg-gray-100 p-2 rounded">Work Hrs: {profile.stats.workingHours.toFixed(2)}</div>
              <div className="bg-gray-100 p-2 rounded">Attendance %: {profile.stats.pct.toFixed(1)}</div>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-100"><tr><th>Date</th><th>Status</th><th>Work Hrs</th><th>OT</th><th>Remarks</th></tr></thead>
              <tbody>{profile.records.map(r=>(<tr key={r.id} className="border-t"><td>{r.attendance_date}</td><td>{r.status}</td><td>{r.working_hours}</td><td>{r.ot_hours}</td><td>{r.remarks}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
