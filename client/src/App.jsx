import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import api, { setToken, clearToken, getToken } from './lib/api';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import History from './pages/History';
import Overtime from './pages/Overtime';
import Movement from './pages/Movement';
import Reports from './pages/Reports';
import ManpowerReports from './pages/ManpowerReports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Absenteeism from './pages/Absenteeism';
import CalendarPage from './pages/CalendarPage';
import ExEmployees from './pages/ExEmployees';

function AuthProvider({children}){
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    const t = getToken();
    if(t){ api.get('/auth/me').then(r=>setUser(r.data.user)).catch(()=>clearToken()).finally(()=>setLoading(false)); }
    else setLoading(false);
  },[]);
  const login = async (username,password) => {
    const r = await api.post('/auth/login', {username,password});
    setToken(r.data.token); setUser(r.data.user);
  };
  const logout = ()=>{ clearToken(); setUser(null); };
  if(loading) return <div className="p-8">Loading...</div>;
  return <AuthContext.Provider value={{user,login,logout}}>{children}</AuthContext.Provider>;
}
export const AuthContext = React.createContext(null);
export function useAuth(){ return React.useContext(AuthContext); }

function Layout({children}){
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = [
    ['/', 'Dashboard'],
    ['/employees', 'Employee Management'],
    ['/attendance', 'Daily Attendance'],
    ['/history', 'Attendance History'],
    ['/overtime', 'Overtime Management'],
    ['/movement', 'Employee Movement'],
    ['/reports', 'Attendance Reports'],
    ['/manpower', 'Manpower Reports'],
    ['/absenteeism', 'Absenteeism'],
    ['/calendar', 'Attendance Calendar'],
    ['/exemployees', 'Ex-Employees'],
  ];
  if(user.role==='admin'){
    nav.push(['/users','User Management']);
    nav.push(['/settings','Settings']);
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="md:hidden bg-white border-b p-3 flex items-center justify-between">
        <div className="font-bold text-blue-700">HAP Workforce 360</div>
        <button onClick={()=>setOpen(!open)} className="text-sm border px-2 py-1 rounded">Menu</button>
      </div>
      {open && (
        <div className="md:hidden bg-white border-b p-2 space-y-1">
          {nav.map(([p,l])=>(<Link key={p} to={p} onClick={()=>setOpen(false)} className="block px-3 py-2 rounded hover:bg-blue-50 text-sm">{l}</Link>))}
          <button onClick={logout} className="block w-full text-left px-3 py-2 text-sm text-red-600">Logout</button>
        </div>
      )}
      <div className="flex">
        <aside className="w-64 bg-white border-r hidden md:block min-h-screen">
          <div className="p-4 border-b">
            <div className="font-bold text-blue-700">HAP Workforce 360</div>
            <div className="text-xs text-gray-500">AKIJ Light Engineering Ltd.</div>
          </div>
          <nav className="p-2 space-y-1">
            {nav.map(([p,l])=>(
              <Link key={p} to={p} className="block px-3 py-2 rounded hover:bg-blue-50 text-sm">{l}</Link>
            ))}
          </nav>
          <div className="p-4 border-t mt-auto">
            <div className="text-xs text-gray-500">{user.full_name} ({user.role})</div>
            <button onClick={logout} className="mt-2 text-sm text-red-600">Logout</button>
          </div>
        </aside>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function Protected({children}){
  const { user } = useAuth();
  if(!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App(){
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Dashboard/></Protected>} />
          <Route path="/employees" element={<Protected><Employees/></Protected>} />
          <Route path="/attendance" element={<Protected><Attendance/></Protected>} />
          <Route path="/history" element={<Protected><History/></Protected>} />
          <Route path="/overtime" element={<Protected><Overtime/></Protected>} />
          <Route path="/movement" element={<Protected><Movement/></Protected>} />
          <Route path="/reports" element={<Protected><Reports/></Protected>} />
          <Route path="/manpower" element={<Protected><ManpowerReports/></Protected>} />
          <Route path="/absenteeism" element={<Protected><Absenteeism/></Protected>} />
          <Route path="/calendar" element={<Protected><CalendarPage/></Protected>} />
          <Route path="/exemployees" element={<Protected><ExEmployees/></Protected>} />
          <Route path="/users" element={<Protected><Users/></Protected>} />
          <Route path="/settings" element={<Protected><Settings/></Protected>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
