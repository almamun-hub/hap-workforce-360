import React, { useState } from 'react';
import api from '../lib/api';

export default function Reports(){
  const [tab,setTab]=useState('daily');
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [year,setYear]=useState(new Date().getFullYear());
  const [month,setMonth]=useState(new Date().getMonth()+1);
  const [empId,setEmpId]=useState('');
  const [pg,setPg]=useState('');
  const [groups,setGroups]=useState([]);
  const [absentByDate,setAbsentByDate]=useState(true);
  const [dailyAbsent,setDailyAbsent]=useState([]);
  const [dailyLeave,setDailyLeave]=useState([]);
  const [copied,setCopied]=useState(false);
  const [data,setData]=useState(null);
  React.useEffect(()=>{ api.get('/settings/production-groups').then(r=>setGroups(r.data.groups||[])); },[]);
  React.useEffect(()=>{ setData(null); },[tab]);

  const load = async ()=>{
    let r;
    if(tab==='daily') {
      r=await api.get('/reports/daily-overall',{params:{date}});
      const ar = await api.get('/reports/absent-list',{params:{date}});
      setDailyAbsent(ar.data.records);
      const lr = await api.get('/reports/leave-list',{params:{date}});
      setDailyLeave(lr.data.records);
    }
    else if(tab==='monthly') r=await api.get('/reports/monthly-overall',{params:{year,month}});
    else if(tab==='emp') r=await api.get('/reports/employee-monthly',{params:{employee_id:empId,month:`${year}-${String(month).padStart(2,'0')}`}}); 
    else if(tab==='dailyemp') r=await api.get('/reports/daily-employee',{params:{date,pg}});
    else if(tab==='absent') {
      if(absentByDate) r=await api.get('/reports/absent-list',{params:{date}});
      else r=await api.get('/reports/absent-list',{params:{month:`${year}-${String(month).padStart(2,'0')}`}});
    }
    else if(tab==='leave') {
      if(absentByDate) r=await api.get('/reports/leave-list',{params:{date}});
      else r=await api.get('/reports/leave-list',{params:{month:`${year}-${String(month).padStart(2,'0')}`}});
    }
    setData(r.data);
  };

  const exportXlsx = async (rows, name)=>{
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, name);
    XLSX.writeFile(wb, `${name}.xlsx`);
  };
  const exportPdf = async (title, headers, rows)=>{
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    autoTable(doc, { head:[headers], body:rows, startY:20 });
    doc.save(title+'.pdf');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Attendance Reports</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {['daily','monthly','emp','dailyemp','absent','leave'].map(t=>(<button key={t} onClick={()=>setTab(t)} className={`px-3 py-1 rounded ${tab===t?'bg-blue-600 text-white':'bg-gray-200'}`}>{t==='absent'?'Absent List':t==='leave'?'Leave List':t}</button>))}
      </div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {(tab==='daily'||tab==='dailyemp') && <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border p-2 rounded" />}
        {(tab==='monthly'||tab==='emp') && <>
          <input type="number" value={year} onChange={e=>setYear(e.target.value)} className="border p-2 rounded w-20" />
          <select value={month} onChange={e=>setMonth(e.target.value)} className="border p-2 rounded">{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>
        </>}
        {tab==='emp' && <input className="border p-2 rounded" placeholder="Employee ID" value={empId} onChange={e=>setEmpId(e.target.value)} />}
        {tab==='dailyemp' && <select value={pg} onChange={e=>setPg(e.target.value)} className="border p-2 rounded"><option value="">All PG</option>{groups.map(g=><option key={g}>{g}</option>)}</select>}
        {tab==='absent' && <div className="flex gap-1"><button onClick={()=>setAbsentByDate(true)} className={`px-2 py-1 rounded text-sm ${absentByDate?'bg-blue-600 text-white':'bg-gray-200'}`}>By Date</button><button onClick={()=>setAbsentByDate(false)} className={`px-2 py-1 rounded text-sm ${!absentByDate?'bg-blue-600 text-white':'bg-gray-200'}`}>By Month</button></div>}
        <button onClick={load} className="bg-blue-600 text-white px-4 py-2 rounded">Load</button>
      </div>

      {data && tab==='daily' && (
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-lg">Daily Attendance Report — {data.date}</h2>
            <button onClick={async ()=>{
              const { jsPDF } = await import('jspdf');
              const autoTable = (await import('jspdf-autotable')).default;
              const doc = new jsPDF();
              doc.setFontSize(14); doc.text('Daily Attendance Report', 14, 15);
              doc.setFontSize(10); doc.text('Date: '+data.date, 14, 22);
              autoTable(doc, { head:[['Item','Value']], body:[
                ['Total Manpower', data.totalEligible],
                ['Present', data.present],
                ['Absent', data.absent],
                ['Leave', data.leave],
              ], startY: 28, theme:'grid' });
              let y = doc.lastAutoTable.finalY + 8;
              doc.setFontSize(12); doc.text('Absent Employees', 14, y); y += 6;
              autoTable(doc, { head:[['Emp ID','Name','Department','PG','Remarks']], body: dailyAbsent.map(r=>[r.employee_id,r.name,r.department,r.pg,r.remarks || (r.absent_days+' days absent')]), startY: y, theme:'grid' });
              y = doc.lastAutoTable.finalY + 8;
              doc.setFontSize(12); doc.text('Leave Employees', 14, y); y += 6;
              autoTable(doc, { head:[['Emp ID','Name','Department','PG','Remarks']], body: dailyLeave.map(r=>[r.employee_id,r.name,r.department,r.pg,r.remarks||'']), startY: y, theme:'grid' });
              doc.save('daily_report_'+data.date+'.pdf');
            }} className="bg-red-600 text-white px-3 py-1 rounded text-sm">PDF</button>
            <button onClick={()=>{
              let msg = 'Daily Attendance Report - '+data.date+'\n\n';
              msg += 'Total Manpower: '+data.totalEligible+'\n';
              msg += 'Present: '+data.present+'\n';
              msg += 'Absent: '+data.absent+'\n';
              msg += 'Leave: '+data.leave+'\n';
              if(dailyAbsent.length){
                msg += '\nAbsent Employees:\n';
                dailyAbsent.forEach(r=>{ msg += r.employee_id+' - '+r.name+' - '+(r.department||'')+' - '+(r.remarks || (r.absent_days+' days absent'))+'\n'; });
              }
              if(dailyLeave.length){
                msg += '\nLeave Employees:\n';
                dailyLeave.forEach(r=>{ msg += r.employee_id+' - '+r.name+' - '+(r.department||'')+' - '+(r.remarks||'')+'\n'; });
              }
              const doCopy = async () => {
                try {
                  if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(msg);
                    setCopied(true); setTimeout(()=>setCopied(false),2000); return;
                  }
                } catch(e){}
                // fallback
                try {
                  const ta = document.createElement('textarea');
                  ta.value = msg;
                  ta.style.position = 'fixed'; ta.style.opacity = '0';
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand('copy');
                  document.body.removeChild(ta);
                  setCopied(true); setTimeout(()=>setCopied(false),2000);
                } catch(e) {
                  setCopied(false);
                  alert(msg);
                }
              };
              doCopy();
            }} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Copy Report</button>
            {copied && <span className="text-green-600 text-sm ml-2">Copied!</span>}
            <button onClick={()=>{
              let msg = 'Daily Attendance Report - '+data.date+'\n\n';
              msg += 'Total Manpower: '+data.totalEligible+'\n';
              msg += 'Present: '+data.present+'\n';
              msg += 'Absent: '+data.absent+'\n';
              msg += 'Leave: '+data.leave+'\n';
              if(dailyAbsent.length){
                msg += '\nAbsent Employees:\n';
                dailyAbsent.forEach(r=>{ msg += r.employee_id+' - '+r.name+' - '+(r.department||'')+' - '+(r.remarks || (r.absent_days+' days absent'))+'\n'; });
              }
              if(dailyLeave.length){
                msg += '\nLeave Employees:\n';
                dailyLeave.forEach(r=>{ msg += r.employee_id+' - '+r.name+' - '+(r.department||'')+' - '+(r.remarks||'')+'\n'; });
              }
              window.open('https://wa.me/?text='+encodeURIComponent(msg), '_blank');
            }} className="bg-green-700 text-white px-3 py-1 rounded text-sm ml-2">WhatsApp Share</button>
          </div>
          <div className="border rounded p-3 mb-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-semibold">Total Manpower</div><div>{data.totalEligible}</div>
              <div className="font-semibold">Present</div><div className="text-green-600 font-bold">{data.present}</div>
              <div className="font-semibold">Absent</div><div className="text-red-600 font-bold">{data.absent}</div>
              <div className="font-semibold">Leave</div><div>{data.leave}</div>
            </div>
          </div>
          <h3 className="font-semibold mb-2">Absent Employees (ID — Name — Remarks)</h3>
          <div className="overflow-auto mb-4">
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Emp ID</th><th>Name</th><th>Department</th><th>PG</th><th>Remarks</th></tr></thead>
            <tbody>{dailyAbsent.map((r,i)=>(<tr key={i} className="border-t"><td className="p-2 font-mono">{r.employee_id}</td><td className="p-2">{r.name}</td><td className="p-2">{r.department}</td><td className="p-2">{r.pg}</td><td className="p-2">{r.remarks || (r.absent_days+' days absent')}</td></tr>))}</tbody></table>
            {dailyAbsent.length===0 && <div className="text-sm text-gray-500 p-2">No absent employees.</div>}
          </div>
          <h3 className="font-semibold mb-2">Leave Employees (ID — Name — Remarks)</h3>
          <div className="overflow-auto">
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Emp ID</th><th>Name</th><th>Department</th><th>PG</th><th>Remarks</th></tr></thead>
            <tbody>{dailyLeave.map((r,i)=>(<tr key={i} className="border-t"><td className="p-2 font-mono">{r.employee_id}</td><td className="p-2">{r.name}</td><td className="p-2">{r.department}</td><td className="p-2">{r.pg}</td><td className="p-2">{r.remarks}</td></tr>))}</tbody></table>
            {dailyLeave.length===0 && <div className="text-sm text-gray-500 p-2">No leave employees.</div>}
          </div>
        </div>
      )}

      {data && tab==='monthly' && (
        <div className="bg-white p-4 rounded shadow">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
            {Object.entries(data).filter(([k])=>k!=='pgSummary'&&k!=='year'&&k!=='month').map(([k,v])=>(<div key={k} className="bg-gray-100 p-2 rounded">{k}: {typeof v==='number'?v.toFixed(2):v}</div>))}
          </div>
          <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>PG</th><th>Present</th><th>Absent</th><th>Leave</th><th>Work Hrs</th><th>OT</th></tr></thead>
          <tbody>{data.pgSummary.map(p=>(<tr key={p.pg} className="border-t"><td className="p-2">{p.pg}</td><td className="p-2 text-center">{p.present}</td><td className="p-2 text-center">{p.absent}</td><td className="p-2 text-center">{p.leave}</td><td className="p-2 text-center">{p.workingHours.toFixed(1)}</td><td className="p-2 text-center">{p.otHours.toFixed(1)}</td></tr>))}</tbody></table>
        </div>
      )}

      {data && tab==='emp' && (
        <div>
          <div className="bg-white p-4 rounded shadow mb-3 text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>Name: {data.employee.name}</div><div>Present: {data.present}</div><div>Absent: {data.absent}</div><div>Leave: {data.leave}</div>
            <div>Work: {data.workingHours.toFixed(2)}</div><div>OT: {data.otHours.toFixed(2)}</div><div>%: {data.pct.toFixed(1)}</div>
          </div>
          <div className="flex gap-2 mb-2">
            <button onClick={()=>exportXlsx(data.records.map(r=>({Date:r.attendance_date,Status:r.status,'Work Hrs':r.working_hours,OT:r.ot_hours,Remarks:r.remarks})),'emp_report')} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Excel</button>
            <button onClick={()=>exportPdf('Employee Report',['Date','Status','Work Hrs','OT','Remarks'], data.records.map(r=>[r.attendance_date,r.status,r.working_hours,r.ot_hours,r.remarks]))} className="bg-red-600 text-white px-3 py-1 rounded text-sm">PDF</button>
          </div>
          <div className="bg-white rounded shadow overflow-auto">
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Date</th><th>Status</th><th>Work</th><th>OT</th><th>Remarks</th></tr></thead>
            <tbody>{data.records.map(r=>(<tr key={r.id} className="border-t"><td className="p-2">{r.attendance_date}</td><td className="p-2">{r.status}</td><td className="p-2">{r.working_hours}</td><td className="p-2">{r.ot_hours}</td><td className="p-2">{r.remarks}</td></tr>))}</tbody></table>
          </div>
        </div>
      )}

      {data && tab==='dailyemp' && (
        <div>
          <div className="flex gap-2 mb-2">
            <button onClick={()=>exportXlsx(data.records.map(r=>({Date:r.attendance_date,'Emp ID':r.employee_id,Name:r.name,PG:r.pg,Status:r.status,'Work Hrs':r.working_hours,OT:r.ot_hours,Remarks:r.remarks})),'daily_emp')} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Excel</button>
            <button onClick={()=>exportPdf('Daily Employee Report',['Emp ID','Name','PG','Status','Work','OT'], data.records.map(r=>[r.employee_id,r.name,r.pg,r.status,r.working_hours,r.ot_hours]))} className="bg-red-600 text-white px-3 py-1 rounded text-sm">PDF</button>
          </div>
          <div className="bg-white rounded shadow overflow-auto">
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Emp ID</th><th>Name</th><th>PG</th><th>Status</th><th>Work</th><th>OT</th><th>Remarks</th></tr></thead>
            <tbody>{data.records.map(r=>(<tr key={r.id} className="border-t"><td className="p-2">{r.employee_id}</td><td className="p-2">{r.name}</td><td className="p-2">{r.pg}</td><td className="p-2">{r.status}</td><td className="p-2">{r.working_hours}</td><td className="p-2">{r.ot_hours}</td><td className="p-2">{r.remarks}</td></tr>))}</tbody></table>
          </div>
        </div>
      )}

      {data && tab==='leave' && (
        <div>
          <div className="flex gap-2 mb-2">
            <button onClick={()=>exportXlsx(data.records.map(r=>({'Date':r.attendance_date,'Emp ID':r.employee_id,'Name':r.name,'PG':r.pg,'Remarks':r.remarks})),'leave_list')} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Excel</button>
            <button onClick={()=>exportPdf('Leave Employees',['Date','Emp ID','Name','Department','PG','Remarks'], data.records.map(r=>[r.attendance_date,r.employee_id,r.name,r.department,r.pg,r.remarks]))} className="bg-red-600 text-white px-3 py-1 rounded text-sm">PDF</button>
          </div>
          <div className="bg-white rounded shadow overflow-auto">
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Date</th><th>Emp ID</th><th>Name</th><th>Department</th><th>PG</th><th>Remarks</th></tr></thead>
            <tbody>{data.records.map((r,i)=>(<tr key={i} className="border-t"><td className="p-2">{r.attendance_date}</td><td className="p-2">{r.employee_id}</td><td className="p-2">{r.name}</td><td className="p-2">{r.department}</td><td className="p-2">{r.pg}</td><td className="p-2">{r.remarks}</td></tr>))}</tbody></table>
          </div>
        </div>
      )}

      {data && tab==='absent' && (
        <div>
          <div className="flex gap-2 mb-2">
            <button onClick={()=>exportXlsx(data.records.map(r=>({'Date':r.attendance_date,'Emp ID':r.employee_id,'Name':r.name,'PG':r.pg,'Remarks':r.remarks})),'absent_list')} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Excel</button>
            <button onClick={()=>exportPdf('Absent Employees',['Date','Emp ID','Name','Department','PG','Remarks'], data.records.map(r=>[r.attendance_date,r.employee_id,r.name,r.department,r.pg,r.remarks]))} className="bg-red-600 text-white px-3 py-1 rounded text-sm">PDF</button>
          </div>
          <div className="bg-white rounded shadow overflow-auto">
            <table className="w-full text-sm"><thead className="bg-gray-100"><tr><th>Date</th><th>Emp ID</th><th>Name</th><th>Department</th><th>PG</th><th>Remarks</th></tr></thead>
            <tbody>{data.records.map((r,i)=>(<tr key={i} className="border-t"><td className="p-2">{r.attendance_date}</td><td className="p-2">{r.employee_id}</td><td className="p-2">{r.name}</td><td className="p-2">{r.department}</td><td className="p-2">{r.pg}</td><td className="p-2">{r.remarks}</td></tr>))}</tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}
