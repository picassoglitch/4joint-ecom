/**
 * Create zip_codes table in Supabase
 * Uses existing Supabase environment variables
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables')
  process.exit(1)
}

// Use REST API directly for SQL execution (Supabase JS client doesn't support raw SQL)
const migrationSQL = fs.readFileSync(path.join(__dirname, '../supabase/migration_zip_codes.sql'), 'utf8')

console.log('📝 Creating zip_codes table...')
console.log('⚠️  Note: You need to execute the SQL migration manually in Supabase SQL Editor')
console.log('\n' + '='.repeat(60))
console.log('Copy and paste this SQL into Supabase SQL Editor:')
console.log('='.repeat(60))
console.log(migrationSQL)
console.log('='.repeat(60))
console.log('\nAfter executing the SQL, run: node scripts/import-zip-codes.js')

