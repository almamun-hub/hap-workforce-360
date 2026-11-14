const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required. Set it to your Postgres connection string.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Convert ? placeholders to $1, $2, ...
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => '$' + (++i));
}

function convertSql(sql) {
  let s = convertPlaceholders(sql);
  s = s.replace(/datetime\('now'\)/g, 'NOW()');
  return s;
}

async function query(sql, params) {
  const res = await pool.query(convertSql(sql), params || []);
  return res;
}

async function exec(sql) {
  await pool.query(convertSql(sql));
}

async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // provide a query function bound to client
    const q = async (sql, params) => client.query(convertSql(sql), params || []);
    const result = await fn(q);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function initSchema() {
  await exec(`
    CREATE TABLE IF NOT EXISTS production_groups (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      employee_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      designation TEXT,
      department TEXT,
      pg TEXT,
      contact_number TEXT,
      employment_type TEXT DEFAULT 'Permanent',
      employment_status TEXT DEFAULT 'Active',
      current_joining_date TEXT,
      last_working_date TEXT,
      remarks TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by INTEGER,
      updated_by INTEGER
    );
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS employment_history (
      id SERIAL PRIMARY KEY,
      employee_fk INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL,
      joining_date TEXT NOT NULL,
      last_working_date TEXT,
      exit_reason TEXT,
      exit_remarks TEXT,
      is_current INTEGER DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by INTEGER,
      updated_by INTEGER
    );
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id SERIAL PRIMARY KEY,
      employee_fk INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL,
      attendance_date TEXT NOT NULL,
      status TEXT NOT NULL,
      working_hours REAL DEFAULT 0,
      ot_hours REAL DEFAULT 0,
      remarks TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by INTEGER,
      updated_by INTEGER,
      UNIQUE(employee_fk, attendance_date)
    );
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS attendance_audit_logs (
      id SERIAL PRIMARY KEY,
      attendance_record_id INTEGER,
      employee_id TEXT,
      attendance_date TEXT,
      action TEXT,
      old_values TEXT,
      new_values TEXT,
      performed_by INTEGER,
      performed_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'operator',
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_login TIMESTAMP
    );
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id SERIAL PRIMARY KEY,
      role_name TEXT NOT NULL UNIQUE,
      description TEXT,
      permissions TEXT
    );
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_by INTEGER
    );
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS holidays (
      id SERIAL PRIMARY KEY,
      holiday_date TEXT NOT NULL UNIQUE,
      name TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await exec(`
    CREATE OR REPLACE VIEW overtime_records AS
      SELECT ar.id, ar.employee_fk, ar.employee_id, ar.attendance_date, ar.ot_hours, ar.created_at, ar.updated_at
      FROM attendance_records ar WHERE ar.ot_hours > 0;
  `);
  await exec(`
    CREATE OR REPLACE VIEW employee_joining_history AS
      SELECT eh.id, eh.employee_fk, eh.employee_id, e.name, e.designation, e.pg, eh.joining_date, e.employment_type, eh.created_at, eh.created_by
      FROM employment_history eh JOIN employees e ON e.id = eh.employee_fk;
  `);
  await exec(`
    CREATE OR REPLACE VIEW employee_exit_history AS
      SELECT eh.id, eh.employee_fk, eh.employee_id, e.name, e.designation, e.pg, eh.joining_date, eh.last_working_date, eh.exit_reason, eh.exit_remarks, eh.created_at
      FROM employment_history eh JOIN employees e ON e.id = eh.employee_fk
      WHERE eh.last_working_date IS NOT NULL;
  `);

  // seed production groups
  const pgs = ['Gas Stove','Rice Cooker','Electric Cooker','Iron','Kettle','Other'];
  for (const p of pgs) {
    await query('INSERT INTO production_groups (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [p]);
  }
  // seed roles
  await query("INSERT INTO user_roles (role_name,description,permissions) VALUES ($1,$2,$3) ON CONFLICT (role_name) DO NOTHING", ['admin','Full control','{"all":true}']);
  await query("INSERT INTO user_roles (role_name,description,permissions) VALUES ($1,$2,$3) ON CONFLICT (role_name) DO NOTHING", ['operator','Attendance operator','{"attendance":true,"view":true}']);
  // seed settings
  const settings = [
    ['company_name','AKIJ Light Engineering Ltd.'],
    ['application_name','HAP Workforce 360'],
    ['department_name','Home Appliance Production (HAP)'],
    ['default_working_hours','8'],
    ['default_weekly_off_day','5'],
    ['attendance_rules','Standard'],
    ['ot_entry','hours_decimal']
  ];
  for (const [k,v] of settings) {
    await query('INSERT INTO system_settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING', [k,v]);
  }
}

// Need schema init before seed; run async
const initPromise = initSchema().then(async () => {
  const bcrypt = require('bcryptjs');
  const countRes = await query('SELECT COUNT(*) c FROM users');
  const count = parseInt(countRes.rows[0].c, 10);
  if (count === 0) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    const opHash = bcrypt.hashSync('operator123', 10);
    await query('INSERT INTO users (username,password_hash,full_name,role) VALUES ($1,$2,$3,$4)', ['admin', adminHash, 'System Administrator', 'admin']);
    await query('INSERT INTO users (username,password_hash,full_name,role) VALUES ($1,$2,$3,$4)', ['operator', opHash, 'Attendance Operator', 'operator']);
    console.log('Seeded users: admin/admin123, operator/operator123');
  }
}).catch(e => { console.error('init error', e); throw e; });

module.exports = { db: { query, exec, transaction }, initSchema, initPromise };
