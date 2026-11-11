/**
 * Database Seeder Script
 * Populates SQLite with realistic fictional healthcare data for evaluation and demo purposes.
 * Run with: npm run seed
 */

const { initDb, closeDb } = require('../src/config/database');
const logger = require('../src/utils/logger');

function seedDatabase() {
  console.log('🌱 Starting database seeding with fictional patient data...\n');
  const db = initDb();

  const seed = db.transaction(() => {
    // 1. Clear existing evaluation data
    db.exec('DELETE FROM messages;');
    db.exec('DELETE FROM followups;');
    db.exec('DELETE FROM appointments;');

    // Reset autoincrement sequence
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('appointments', 'messages', 'followups');");

    // 2. Insert Fictional Appointments
    const insertApt = db.prepare(`
      INSERT INTO appointments (name, phone, date)
      VALUES (?, ?, ?)
    `);

    const apt1 = insertApt.run('Eleanor Vance', '9876543210', '2026-11-20');
    const apt2 = insertApt.run('Sarah Connor', '+14155552671', '2026-11-21');
    const apt3 = insertApt.run('Bruce Wayne', '9123456780', '2026-11-22');
    const apt4 = insertApt.run('Diana Prince', '9898989898', '2026-11-25');
    const apt5 = insertApt.run('Arthur Dent', '9765432100', '2026-11-28');

    console.log(`✅ Seeded 5 appointments:`);
    console.log(`   - #${apt1.lastInsertRowid}: Eleanor Vance (2026-11-20)`);
    console.log(`   - #${apt2.lastInsertRowid}: Sarah Connor (2026-11-21)`);
    console.log(`   - #${apt3.lastInsertRowid}: Bruce Wayne (2026-11-22)`);
    console.log(`   - #${apt4.lastInsertRowid}: Diana Prince (2026-11-25)`);
    console.log(`   - #${apt5.lastInsertRowid}: Arthur Dent (2026-11-28)`);

    // 3. Insert Simulated WhatsApp Messages
    const insertMsg = db.prepare(`
      INSERT INTO messages (appointment_id, phone, message, status, provider_message_id, error_code, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertMsg.run(
      apt1.lastInsertRowid,
      '9876543210',
      'Reminder: Your consultation with Dr. Sharma is scheduled for tomorrow at 10:00 AM.',
      'sent',
      'SIM-10482',
      null,
      null
    );

    insertMsg.run(
      apt3.lastInsertRowid,
      '9123456780',
      'Reminder: Your cardiology checkup is scheduled for tomorrow.',
      'failed',
      null,
      190,
      'Invalid OAuth access token'
    );

    insertMsg.run(
      apt2.lastInsertRowid,
      '+14155552671',
      'Reminder: Orthopedic post-consultation review tomorrow at 2:00 PM.',
      'sent',
      'SIM-83921',
      null,
      null
    );

    console.log(`✅ Seeded 3 WhatsApp message tracking logs (2 sent, 1 simulated OAuth 190 failure).`);

    // 4. Insert CRM Follow-ups
    const insertFu = db.prepare(`
      INSERT INTO followups (appointment_id, followup_date, status, notes)
      VALUES (?, ?, ?, ?)
    `);

    insertFu.run(
      apt1.lastInsertRowid,
      '2026-11-22',
      'pending',
      'Verify patient pain level and medication compliance'
    );

    insertFu.run(
      apt2.lastInsertRowid,
      '2026-11-23',
      'pending',
      'Check surgical dressing and schedule physical therapy referral'
    );

    insertFu.run(
      apt3.lastInsertRowid,
      '2026-11-15',
      'completed',
      'Routine vitals review completed via phone by care nurse'
    );

    console.log(`✅ Seeded 3 CRM follow-ups (2 pending, 1 completed).`);
  });

  seed();
  closeDb();
  console.log('\n🎉 Database seeding completed successfully!\n');
}

seedDatabase();

