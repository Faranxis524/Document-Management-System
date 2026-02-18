#!/usr/bin/env node
/**
 * Quick Test Runner
 * Convenience script to run different test suites
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0] || 'help';

const commands = {
  // Backend tests
  'backend': {
    cmd: 'npm',
    args: ['test'],
    cwd: path.join(__dirname, 'server'),
    desc: 'Run all backend tests'
  },
  'backend:watch': {
    cmd: 'npm',
    args: ['run', 'test:watch'],
    cwd: path.join(__dirname, 'server'),
    desc: 'Run backend tests in watch mode'
  },
  'backend:coverage': {
    cmd: 'npm',
    args: ['run', 'test:coverage'],
    cwd: path.join(__dirname, 'server'),
    desc: 'Run backend tests with coverage'
  },
  
  // Frontend tests
  'frontend': {
    cmd: 'npm',
    args: ['test', '--', '--watchAll=false'],
    cwd: __dirname,
    desc: 'Run all frontend tests'
  },
  'frontend:watch': {
    cmd: 'npm',
    args: ['test'],
    cwd: __dirname,
    desc: 'Run frontend tests in watch mode'
  },
  'frontend:coverage': {
    cmd: 'npm',
    args: ['test', '--', '--coverage', '--watchAll=false'],
    cwd: __dirname,
    desc: 'Run frontend tests with coverage'
  },
  
  // All tests
  'all': {
    desc: 'Run all tests (backend + frontend)',
    custom: async () => {
      console.log('\n🧪 Running Backend Tests...\n');
      await runCommand('backend');
      console.log('\n🧪 Running Frontend Tests...\n');
      await runCommand('frontend');
    }
  },
  'all:coverage': {
    desc: 'Run all tests with coverage',
    custom: async () => {
      console.log('\n📊 Backend Coverage...\n');
      await runCommand('backend:coverage');
      console.log('\n📊 Frontend Coverage...\n');
      await runCommand('frontend:coverage');
    }
  },
  
  // Specific test files
  'auth': {
    cmd: 'npx',
    args: ['jest', 'auth.test.js'],
    cwd: path.join(__dirname, 'server'),
    desc: 'Run authentication tests only'
  },
  'records': {
    cmd: 'npx',
    args: ['jest', 'records.test.js'],
    cwd: path.join(__dirname, 'server'),
    desc: 'Run records tests only'
  },
  'users': {
    cmd: 'npx',
    args: ['jest', 'users.test.js'],
    cwd: path.join(__dirname, 'server'),
    desc: 'Run users tests only'
  },
  'security': {
    cmd: 'npx',
    args: ['jest', 'security.test.js'],
    cwd: path.join(__dirname, 'server'),
    desc: 'Run security tests only'
  },
  
  // Help
  'help': {
    desc: 'Show this help message',
    custom: () => {
      console.log('\n📋 DMS Test Runner\n');
      console.log('Usage: node run-tests.js [command]\n');
      console.log('Commands:');
      Object.keys(commands).forEach(cmd => {
        const padding = ' '.repeat(Math.max(0, 20 - cmd.length));
        console.log(`  ${cmd}${padding}${commands[cmd].desc}`);
      });
      console.log('\nExamples:');
      console.log('  node run-tests.js backend');
      console.log('  node run-tests.js all:coverage');
      console.log('  node run-tests.js auth\n');
    }
  }
};

function runCommand(cmdName) {
  return new Promise((resolve, reject) => {
    const config = commands[cmdName];
    
    if (!config) {
      console.error(`❌ Unknown command: ${cmdName}`);
      console.log('Run "node run-tests.js help" for available commands');
      return reject(new Error('Unknown command'));
    }
    
    if (config.custom) {
      config.custom().then(resolve).catch(reject);
      return;
    }
    
    const proc = spawn(config.cmd, config.args, {
      cwd: config.cwd,
      stdio: 'inherit',
      shell: true
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

// Run the command
if (commands[command].custom) {
  commands[command].custom().catch(err => {
    console.error('\n❌ Test execution failed:', err.message);
    process.exit(1);
  });
} else {
  runCommand(command).catch(err => {
    console.error('\n❌ Test execution failed:', err.message);
    process.exit(1);
  });
}
