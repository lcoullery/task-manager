import bcrypt from 'bcrypt'

const password = process.argv[2]

if (!password) {
  console.log('Usage: node scripts/hash-password.js <your-password>')
  console.log('Example: node scripts/hash-password.js MySecretPassword123')
  process.exit(1)
}

const hash = await bcrypt.hash(password, 10)
console.log('\nYour bcrypt hash:')
console.log(hash)
console.log('\nCopy this hash into your .env file as AUTH_PASSWORD_HASH')
