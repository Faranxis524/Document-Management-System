const bcrypt = require('bcryptjs');
const { db } = require('./db');

const DEFAULT_USERS = [
  // Add admin user for testing
  { username: 'admin', password: 'admin123', role: 'MC', section: null },
  { username: 'NUP Tala', password: 'password', role: 'MC', section: null },
  { username: 'PMSG Foncardas', password: 'password', role: 'MC', section: null },
  { username: 'NUP Tala - INVES', password: 'password', role: 'SECTION', section: 'INVES' },
  { username: 'NUP San Pedro', password: 'password', role: 'SECTION', section: 'ADM' },
  { username: 'PMSG Foncardas - ADM', password: 'password', role: 'SECTION', section: 'ADM' },
  { username: 'NUP Aldrin', password: 'password', role: 'SECTION', section: 'OPN' },
  { username: 'PCPL Bueno', password: 'password', role: 'SECTION', section: 'OPN' },
  { username: 'PAT Duyag', password: 'password', role: 'SECTION', section: 'OPN' },
  { username: 'NUP Joyce', password: 'password', role: 'SECTION', section: 'INTEL' },
  { username: 'PCPL Jose', password: 'password', role: 'SECTION', section: 'INTEL' },
];

async function seedUsers() {
  console.log('Seeding users...');
  
  for (const user of DEFAULT_USERS) {
    try {
      const existing = await db.getUserByUsername(user.username);
      if (!existing) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await db.createUser({
          username: user.username,
          password: hashedPassword,
          role: user.role,
          section: user.section,
        });
        console.log(`✓ Created user: ${user.username}`);
      } else {
        console.log(`- User already exists: ${user.username}`);
      }
    } catch (error) {
      console.error(`✗ Failed to create user ${user.username}:`, error.message);
    }
  }
  
  console.log('User seeding complete!');
}

module.exports = { seedUsers };
