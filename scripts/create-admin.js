/**
 * Create the first admin user
 * Usage: node scripts/create-admin.js
 */

const readline = require('readline');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config();

// Initialize database (creates tables if needed)
const { db } = require('../db/init.cjs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  // Check if any user already exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    console.log(`There are already ${userCount} user(s) in the database.`);
    const proceed = await question('Create another admin anyway? (yes/no): ');
    if (proceed.toLowerCase() !== 'yes') {
      console.log('Cancelled.');
      rl.close();
      process.exit(0);
    }
  }

  console.log('');
  console.log('=== Create Admin User ===');
  console.log('');

  const email = await question('Email: ');
  const name = await question('Name: ');

  let password;
  let passwordConfirm;

  do {
    password = await question('Password (min 8 chars): ');
    if (password.length < 8) {
      console.log('Password must be at least 8 characters.');
      continue;
    }
    passwordConfirm = await question('Confirm password: ');
    if (password !== passwordConfirm) {
      console.log('Passwords do not match.');
    }
  } while (password !== passwordConfirm || password.length < 8);

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = crypto.randomUUID();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, created_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(userId, email.toLowerCase(), passwordHash, name, 'admin', new Date().toISOString());

  console.log('');
  console.log(`Admin created: ${name} (${email})`);
  console.log('You can now login at your app URL.');

  rl.close();
}

createAdmin().catch((err) => {
  console.error('Error:', err.message);
  rl.close();
  process.exit(1);
});
