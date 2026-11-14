function pad(n){ return String(n).padStart(2,'0'); }
function today(){ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function monthDays(y,m){ return new Date(y,m,0).getDate(); }
function firstDayOfMonth(y,m){ return `${y}-${pad(m)}-01`; }
function lastDayOfMonth(y,m){ const d=monthDays(y,m); return `${y}-${pad(m)}-${pad(d)}`; }
function addDays(dateStr,n){
  const d=new Date(dateStr+'T00:00:00'); d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function dayOfWeek(dateStr){ return new Date(dateStr+'T00:00:00').getDay(); }
function cmpDate(a,b){ return a < b ? -1 : a > b ? 1 : 0; }
function inRange(d,start,end){ return d >= start && d <= end; }
function enumerateDays(start,end){
  const out=[]; let cur=start;
  while(cur <= end){ out.push(cur); cur=addDays(cur,1); }
  return out;
}

module.exports = { pad, today, monthDays, firstDayOfMonth, lastDayOfMonth, addDays, dayOfWeek, cmpDate, inRange, enumerateDays };
