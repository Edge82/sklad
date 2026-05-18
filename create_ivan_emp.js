const db = require('better-sqlite3')('.data/app.db');
const crypto = require('crypto');

const user = db.prepare('SELECT id, login, full_name, role FROM users WHERE login = ?').get('ivan');
console.log('Ivan user:', user);

if(user) {
  const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(user.id.toString());
  
  if(!emp) {
    const employeeId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO employees (
        id, user_id, name, email, phone, photo, avatar,
        position, department, role, status, salary,
        hire_date, birth_date, address, skills, notes,
        created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      employeeId, user.id.toString(), user.full_name, 'ivan@example.com', '+7-900-111-11-11',
      null, null, 'Комплектовщик', 'Цех', user.role, 'active', 50000,
      now, null, null, null, null, now, now, 'System'
    );
    
    console.log('Employee created for ivan, ID:', employeeId);
    
    const tool = db.prepare('SELECT id, name FROM tools WHERE status = ?').get('in_stock');
    if(tool) {
      db.prepare('UPDATE tools SET status = ?, issued_to = ?, issued_to_name = ?, issued_at = ?, updated_at = ? WHERE id = ?').run(
        'issued', employeeId, user.full_name, now, now, tool.id
      );
      console.log('Tool issued:', tool.name);
    }
  } else {
    console.log('Employee already exists for ivan');
  }
}
