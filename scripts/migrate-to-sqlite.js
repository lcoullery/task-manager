/**
 * Migration Script: tasks.json → SQLite Database
 *
 * This script:
 * 1. Reads your existing tasks.json file
 * 2. Creates SQLite database with schema
 * 3. Migrates all data (tasks, profiles, labels, columns, etc.)
 * 4. Creates the first admin user (you!)
 * 5. Backs up the original tasks.json file
 *
 * IMPORTANT:
 * - All profiles (team members) remain unchanged
 * - All task assignments stay intact (tasks → profiles)
 * - Only creates 1 user account (admin)
 * - Later, invite team members to create their login accounts
 *
 * Usage:
 *   node scripts/migrate-to-sqlite.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Database = require('better-sqlite3');

// Load environment variables
require('dotenv').config();

const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../data/taskmanager.db');
const TASKS_JSON_PATH = path.join(__dirname, '../data/tasks.json');
const BACKUP_PATH = path.join(__dirname, '../data/tasks.json.backup');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Hide password input (simple version)
function questionHidden(prompt) {
  return new Promise((resolve) => {
    // In Windows, this won't actually hide the input, but it works in Linux
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    process.stdout.write(prompt);

    let password = '';
    stdin.on('data', function onData(char) {
      char = char.toString('utf8');

      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl-C
          process.exit();
          break;
        case '\u007f': // Backspace
          password = password.slice(0, -1);
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write(prompt + '*'.repeat(password.length));
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

// Main migration function
async function migrate() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Task Manager Migration: tasks.json → SQLite Database    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Step 1: Check if database already exists
  if (fs.existsSync(DATABASE_PATH)) {
    console.log('⚠️  WARNING: Database already exists!');
    console.log(`   Path: ${DATABASE_PATH}`);
    console.log('');
    const overwrite = await question('   Overwrite existing database? (yes/no): ');

    if (overwrite.toLowerCase() !== 'yes') {
      console.log('❌ Migration cancelled.');
      rl.close();
      process.exit(0);
    }

    // Backup existing database
    const dbBackupPath = DATABASE_PATH + '.backup.' + Date.now();
    fs.copyFileSync(DATABASE_PATH, dbBackupPath);
    console.log(`✓ Existing database backed up to: ${dbBackupPath}`);
    fs.unlinkSync(DATABASE_PATH);
  }

  // Step 2: Read tasks.json
  console.log('');
  console.log('📖 Step 1: Reading tasks.json...');

  if (!fs.existsSync(TASKS_JSON_PATH)) {
    console.log(`❌ Error: tasks.json not found at ${TASKS_JSON_PATH}`);
    console.log('   Make sure your tasks.json file exists before migrating.');
    rl.close();
    process.exit(1);
  }

  let data;
  try {
    const rawData = fs.readFileSync(TASKS_JSON_PATH, 'utf-8');
    data = JSON.parse(rawData);
    console.log(`✓ Loaded tasks.json (${(rawData.length / 1024).toFixed(2)} KB)`);
    console.log(`  - Profiles: ${data.profiles?.length || 0}`);
    console.log(`  - Tasks: ${data.tasks?.length || 0}`);
    console.log(`  - Labels: ${data.labels?.length || 0}`);
    console.log(`  - Columns: ${data.columns?.length || 0}`);
  } catch (error) {
    console.log(`❌ Error reading tasks.json: ${error.message}`);
    rl.close();
    process.exit(1);
  }

  // Step 3: Create database
  console.log('');
  console.log('🗄️  Step 2: Creating SQLite database...');

  // Ensure data directory exists
  const dataDir = path.dirname(DATABASE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(DATABASE_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  console.log(`✓ Database created at: ${DATABASE_PATH}`);

  // Step 4: Load and execute schema
  console.log('');
  console.log('📝 Step 3: Creating tables...');

  const schemaPath = path.join(__dirname, '../db/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.log(`❌ Error: schema.sql not found at ${schemaPath}`);
    db.close();
    rl.close();
    process.exit(1);
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  console.log('✓ Tables created successfully');

  // Step 5: Migrate profiles
  console.log('');
  console.log('👥 Step 4: Migrating profiles...');
  console.log('   (These are team members - NOT user accounts)');

  const insertProfile = db.prepare(`
    INSERT INTO profiles (id, name, color, created_at)
    VALUES (?, ?, ?, ?)
  `);

  let profileCount = 0;
  const profileNames = [];
  if (data.profiles && Array.isArray(data.profiles)) {
    for (const profile of data.profiles) {
      insertProfile.run(
        profile.id,
        profile.name,
        profile.color,
        new Date().toISOString()
      );
      profileNames.push(profile.name);
      profileCount++;
    }
  }

  console.log(`✓ Migrated ${profileCount} profiles: ${profileNames.join(', ')}`);

  // Step 6: Migrate labels
  console.log('');
  console.log('🏷️  Step 5: Migrating labels...');

  const insertLabel = db.prepare(`
    INSERT INTO labels (id, name, color, created_at)
    VALUES (?, ?, ?, ?)
  `);

  let labelCount = 0;
  if (data.labels && Array.isArray(data.labels)) {
    for (const label of data.labels) {
      insertLabel.run(
        label.id,
        label.name,
        label.color,
        new Date().toISOString()
      );
      labelCount++;
    }
  }

  console.log(`✓ Migrated ${labelCount} labels`);

  // Step 7: Migrate columns
  console.log('');
  console.log('📋 Step 6: Migrating columns...');

  const insertColumn = db.prepare(`
    INSERT INTO columns (id, name, color, order_index, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  let columnCount = 0;
  if (data.columns && Array.isArray(data.columns)) {
    for (const column of data.columns) {
      insertColumn.run(
        column.id,
        column.name,
        column.color || null,
        column.order || 0,
        new Date().toISOString()
      );
      columnCount++;
    }
  }

  console.log(`✓ Migrated ${columnCount} columns`);

  // Step 8: Migrate tasks
  console.log('');
  console.log('📝 Step 7: Migrating tasks...');
  console.log('   (Task assignments to profiles remain intact)');

  const insertTask = db.prepare(`
    INSERT INTO tasks (
      id, title, description, status, priority,
      assigned_to, start_date, end_date,
      workload_hours, weekend_task, archived, order_index,
      created_at, updated_at, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTaskLabel = db.prepare(`
    INSERT INTO task_labels (task_id, label_id)
    VALUES (?, ?)
  `);

  let taskCount = 0;
  let assignedTaskCount = 0;
  if (data.tasks && Array.isArray(data.tasks)) {
    for (const task of data.tasks) {
      const now = new Date().toISOString();

      insertTask.run(
        task.id,
        task.title,
        task.description || null,
        task.status,
        task.priority || 'medium',
        task.assignedTo || null,  // This references profile.id, NOT user.id
        task.startDate || null,
        task.endDate || null,
        task.workloadHours || 0,
        task.weekendTask ? 1 : 0,
        task.archived ? 1 : 0,
        task.order || 0,
        now,
        now,
        null // created_by is null for migrated tasks (no users existed before)
      );

      if (task.assignedTo) {
        assignedTaskCount++;
      }

      // Migrate task labels
      if (task.labelIds && Array.isArray(task.labelIds)) {
        for (const labelId of task.labelIds) {
          try {
            insertTaskLabel.run(task.id, labelId);
          } catch (err) {
            // Ignore if label doesn't exist
          }
        }
      }

      taskCount++;
    }
  }

  console.log(`✓ Migrated ${taskCount} tasks (${assignedTaskCount} assigned to profiles)`);

  // Step 9: Migrate connections (task dependencies)
  console.log('');
  console.log('🔗 Step 8: Migrating task connections...');

  const insertConnection = db.prepare(`
    INSERT INTO connections (id, source_id, target_id, type, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  let connectionCount = 0;
  if (data.connections && Array.isArray(data.connections)) {
    for (const conn of data.connections) {
      insertConnection.run(
        conn.id || crypto.randomUUID(),
        conn.sourceId,
        conn.targetId,
        conn.type || 'finish_to_start',
        new Date().toISOString()
      );
      connectionCount++;
    }
  }

  console.log(`✓ Migrated ${connectionCount} connections`);

  // Step 10: Migrate settings
  console.log('');
  console.log('⚙️  Step 9: Migrating settings...');

  const insertSetting = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `);

  let settingCount = 0;
  if (data.settings && typeof data.settings === 'object') {
    for (const [key, value] of Object.entries(data.settings)) {
      insertSetting.run(
        key,
        JSON.stringify(value),
        new Date().toISOString()
      );
      settingCount++;
    }
  }

  console.log(`✓ Migrated ${settingCount} settings`);

  // Step 11: Create first admin user
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              Create First Admin User                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('This will be YOUR LOGIN ACCOUNT to access the system.');
  console.log('(Profiles remain separate - you can invite team members later)');
  console.log('');

  const email = await question('Admin email [ludovic.coullery@lodjx.ch]: ') || 'ludovic.coullery@lodjx.ch';
  const name = await question('Admin name [Ludovic Coullery]: ') || 'Ludovic Coullery';

  let password;
  let passwordConfirm;

  do {
    password = await questionHidden('Admin password (min 8 chars): ');

    if (password.length < 8) {
      console.log('❌ Password must be at least 8 characters. Try again.');
      continue;
    }

    passwordConfirm = await questionHidden('Confirm password: ');

    if (password !== passwordConfirm) {
      console.log('❌ Passwords do not match. Try again.');
    }
  } while (password !== passwordConfirm || password.length < 8);

  // Hash password
  console.log('');
  console.log('🔐 Hashing password...');
  const passwordHash = await bcrypt.hash(password, 10);

  // Create admin user
  const userId = crypto.randomUUID();
  const createUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, created_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  createUser.run(
    userId,
    email.toLowerCase(),
    passwordHash,
    name,
    'admin',
    new Date().toISOString()
  );

  console.log(`✓ Admin user created: ${email}`);

  // Step 12: Backup original tasks.json
  console.log('');
  console.log('💾 Step 10: Backing up original tasks.json...');

  if (fs.existsSync(BACKUP_PATH)) {
    const timestamp = Date.now();
    const timestampedBackup = BACKUP_PATH.replace('.backup', `.backup.${timestamp}`);
    fs.renameSync(BACKUP_PATH, timestampedBackup);
    console.log(`   Old backup renamed to: ${timestampedBackup}`);
  }

  fs.copyFileSync(TASKS_JSON_PATH, BACKUP_PATH);
  console.log(`✓ Backup created: ${BACKUP_PATH}`);

  // Close database
  db.close();
  rl.close();

  // Final summary
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                   Migration Complete! ✅                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Migration Summary:');
  console.log(`  ✓ Profiles:     ${profileCount} (${profileNames.join(', ')})`);
  console.log(`  ✓ Tasks:        ${taskCount} (${assignedTaskCount} assigned)`);
  console.log(`  ✓ Labels:       ${labelCount}`);
  console.log(`  ✓ Columns:      ${columnCount}`);
  console.log(`  ✓ Connections:  ${connectionCount}`);
  console.log(`  ✓ Settings:     ${settingCount}`);
  console.log(`  ✓ Admin user:   ${email}`);
  console.log('');
  console.log('Database created at:');
  console.log(`  ${DATABASE_PATH}`);
  console.log('');
  console.log('Original data backed up to:');
  console.log(`  ${BACKUP_PATH}`);
  console.log('');
  console.log('IMPORTANT: Profiles vs Users');
  console.log('  • Profiles (${profileNames.join(', ')}): Team members for task assignment');
  console.log('  • Users (${email}): Login accounts for system access');
  console.log('  • Later: Invite team members to create their login accounts');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Rename server-new.js to server.js:');
  console.log('     (Windows) ren server.js server-old.js && ren server-new.js server.js');
  console.log('     (Linux/Mac) mv server.js server-old.js && mv server-new.js server.js');
  console.log('');
  console.log('  2. Restart the server:');
  console.log('     npm start');
  console.log('');
  console.log('  3. Visit http://localhost:4173/login');
  console.log('');
  console.log('  4. Login with your admin credentials');
  console.log('');
}

// Run migration
migrate().catch((error) => {
  console.error('');
  console.error('❌ Migration failed:', error);
  console.error('');
  console.error('Stack trace:');
  console.error(error.stack);
  rl.close();
  process.exit(1);
});
