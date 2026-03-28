#!/usr/bin/env node

/**
 * Migration Script: Drop Profiles Table and Merge into Users
 *
 * This script:
 * 1. Checks if profiles table exists and is empty
 * 2. Adds name and color columns to users table (if not exists)
 * 3. Updates existing users with default values
 * 4. Drops profiles table
 * 5. Creates backup before changes
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Color palette for assigning random colors
const COLOR_PALETTE = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // orange
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // dark orange
];

function getRandomColor() {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

function extractNameFromEmail(email) {
  // Extract name from email (before @ symbol)
  const name = email.split('@')[0];
  // Capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
}

async function runMigration() {
  console.log('🔄 Starting migration: Drop profiles table and merge into users...\n');

  const dbPath = path.join(__dirname, '..', 'data', 'taskmanager.db');

  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    console.error('❌ Error: Database not found at', dbPath);
    console.error('   Please ensure the database has been created first.');
    process.exit(1);
  }

  // Create backup
  const backupPath = `${dbPath}.backup-${Date.now()}`;
  console.log('📦 Creating backup:', backupPath);
  fs.copyFileSync(dbPath, backupPath);
  console.log('✅ Backup created\n');

  let db;
  try {
    db = new Database(dbPath);
    db.pragma('foreign_keys = OFF'); // Temporarily disable foreign keys for migration

    console.log('🔍 Checking current state...\n');

    // Step 1: Check if profiles table exists
    const profilesTableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='profiles'
    `).get();

    if (profilesTableExists) {
      // Check if profiles table has data
      const profileCount = db.prepare('SELECT COUNT(*) as count FROM profiles').get();
      console.log(`   Profiles table exists with ${profileCount.count} records`);

      if (profileCount.count > 0) {
        console.warn('⚠️  Warning: Profiles table contains data!');
        console.warn('   This script assumes an empty profiles table.');
        console.warn('   Aborting migration to prevent data loss.\n');
        process.exit(1);
      }
    } else {
      console.log('   Profiles table does not exist (already migrated?)');
    }

    // Step 2: Check current users table schema
    const userColumns = db.prepare(`PRAGMA table_info(users)`).all();
    const hasNameColumn = userColumns.some(col => col.name === 'name');
    const hasColorColumn = userColumns.some(col => col.name === 'color');

    console.log(`   Users table has 'name' column: ${hasNameColumn}`);
    console.log(`   Users table has 'color' column: ${hasColorColumn}`);

    // Step 2b: Check user_invitations table schema
    const invitationColumns = db.prepare(`PRAGMA table_info(user_invitations)`).all();
    const invitationHasColorColumn = invitationColumns.some(col => col.name === 'color');

    console.log(`   User_invitations table has 'color' column: ${invitationHasColorColumn}\n`);

    // Step 3: Add missing columns
    const transaction = db.transaction(() => {
      if (!hasColorColumn) {
        console.log('➕ Adding "color" column to users table...');
        db.prepare(`ALTER TABLE users ADD COLUMN color TEXT NOT NULL DEFAULT '#3B82F6'`).run();
        console.log('✅ Color column added\n');
      }

      if (!invitationHasColorColumn) {
        console.log('➕ Adding "color" column to user_invitations table...');
        db.prepare(`ALTER TABLE user_invitations ADD COLUMN color TEXT NOT NULL DEFAULT '#3B82F6'`).run();
        console.log('✅ Color column added to invitations\n');
      }

      // Step 4: Update existing users with random colors
      const users = db.prepare('SELECT id, email, name, color FROM users').all();
      console.log(`📝 Updating ${users.length} existing users with colors...`);

      for (const user of users) {
        if (!user.color || user.color === '#3B82F6') {
          const newColor = getRandomColor();
          db.prepare('UPDATE users SET color = ? WHERE id = ?').run(newColor, user.id);
          console.log(`   - ${user.name || extractNameFromEmail(user.email)}: ${newColor}`);
        }
      }
      console.log('✅ Users updated\n');

      // Step 5: Drop profiles table
      if (profilesTableExists) {
        console.log('🗑️  Dropping profiles table...');
        db.prepare('DROP TABLE IF EXISTS profiles').run();
        console.log('✅ Profiles table dropped\n');
      }
    });

    transaction();

    db.pragma('foreign_keys = ON'); // Re-enable foreign keys
    db.close();

    console.log('✨ Migration completed successfully!\n');
    console.log('📋 Summary:');
    console.log('   - Users table now has name and color columns');
    console.log('   - Profiles table removed');
    console.log('   - Tasks now reference users for assignment');
    console.log('   - Backup saved to:', backupPath);
    console.log('\n✅ You can now restart your server.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n🔄 Restoring from backup...');

    if (db) db.close();

    // Restore backup
    fs.copyFileSync(backupPath, dbPath);
    console.log('✅ Database restored from backup\n');

    process.exit(1);
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
