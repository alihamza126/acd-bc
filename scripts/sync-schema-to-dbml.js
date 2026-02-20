#!/usr/bin/env node

/**
 * Sync Prisma Schema to DBML File
 * 
 * This script ensures the DBML file stays in sync with Prisma schema changes.
 * Run this after making changes to prisma/schema.prisma
 * 
 * Usage: node scripts/sync-schema-to-dbml.js
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');
const DBML_PATH = path.join(__dirname, '../docs/DB_SCHEMA_BASE_DESIGN.dbml');

console.log('⚠️  Manual sync required:');
console.log('   After changing prisma/schema.prisma, update docs/DB_SCHEMA_BASE_DESIGN.dbml');
console.log('   This script serves as a reminder.');
console.log('');
console.log('📝 Current schema location:', SCHEMA_PATH);
console.log('📝 DBML file location:', DBML_PATH);
console.log('');
console.log('✅ Please manually update the DBML file to match schema changes.');
console.log('   Key areas to check:');
console.log('   - Table definitions');
console.log('   - Field types and constraints');
console.log('   - Indexes');
console.log('   - Relationships');
