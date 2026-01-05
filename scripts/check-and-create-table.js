/**
 * Quick script to check if zip_codes table exists and create it if needed
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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAndCreateTable() {
  console.log('🔍 Checking if zip_codes table exists...')
  
  // Try to query the table
  const { data, error } = await supabase
    .from('zip_codes')
    .select('count')
    .limit(1)

  if (error && error.code === '42P01') {
    console.log('❌ Table does not exist. Creating it now...')
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migration_zip_codes.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📝 Please execute this SQL in Supabase SQL Editor:')
    console.log('='.repeat(60))
    console.log(migrationSQL)
    console.log('='.repeat(60))
    console.log('\n⚠️  After executing the migration, run the import script again.')
    
  } else if (error) {
    console.error('❌ Error checking table:', error.message)
  } else {
    console.log('✅ Table zip_codes exists!')
    const { count } = await supabase
      .from('zip_codes')
      .select('*', { count: 'exact', head: true })
    console.log(`   Current records: ${count || 0}`)
  }
}

checkAndCreateTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

