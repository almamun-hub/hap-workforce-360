const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, initPromise } = require('./db');

const authRoutes = require('./routes/auth');
const empRoutes = require('./routes/employees');
const attRoutes = require('./routes/attendance');
const movRoutes = require('./routes/movement');
const dashRoutes = require('./routes/dashboard');
const repRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const setRoutes = require('./routes/settings');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/employees', empRoutes);
app.use('/api/attendance', attRoutes);
app.use('/api/movement', movRoutes);
app.use('/api/dashboard', dashRoutes);
app.use('/api/reports', repRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', setRoutes);

// serve client build if exists
const clientDist = path.join(__dirname, '..', 'client', 'dist');
const fs = require('fs');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req,res)=> res.sendFile(path.join(clientDist,'index.html')));
}

const PORT = process.env.PORT || 3001;
initPromise.then(() => {
  app.listen(PORT, '0.0.0.0', ()=> console.log(`HAP Workforce 360 server running on 0.0.0.0:${PORT}`));
}).catch(e => { console.error(e); process.exit(1); });
