const bcrypt = require('bcryptjs');
const { db } = require('./db');
// create admin if none
const count = db.prepare('SELECT COUNT(*) c FROM users').get().c;
if (count === 0) {
  const adminHash = bcrypt.hashSync('admin123', 10);
  const opHash = bcrypt.hashSync('operator123', 10);
  db.prepare('INSERT INTO users (username,password_hash,full_name,role) VALUES (?,?,?,?)').run('admin', adminHash, 'System Administrator', 'admin');
  db.prepare('INSERT INTO users (username,password_hash,full_name,role) VALUES (?,?,?,?)').run('operator', opHash, 'Attendance Operator', 'operator');
  console.log('Seeded users: admin/admin123, operator/operator123');
} else {
  console.log('Users already exist, skipping seed.');
}
