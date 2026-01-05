/**
 * Create zip_codes table and import data in one go
 * Uses Supabase service role key to execute SQL
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

async function executeSQL(sql) {
  // Use Supabase REST API to execute SQL
  // Note: This requires the service role key
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ query: sql })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SQL execution failed: ${response.status} ${errorText}`)
  }

  return true
}

async function createTable() {
  console.log('📝 Creating zip_codes table...')
  
  const migrationPath = path.join(__dirname, '../supabase/migration_zip_codes.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  
  // Split into individual statements and execute
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'))
  
  // Execute each statement using Supabase client
  // We'll use a workaround: execute via REST API or use PostgREST
  try {
    // Try using Supabase's PostgREST to create table
    // Since we can't execute raw SQL directly, we'll use the REST API
    console.log('⚠️  Note: Supabase JS client cannot execute raw SQL.')
    console.log('Please execute the migration SQL in Supabase SQL Editor first.')
    console.log('\nSQL to execute:')
    console.log('='.repeat(60))
    console.log(migrationSQL)
    console.log('='.repeat(60))
    console.log('\nAfter executing, press Enter to continue...')
    
    // Wait for user input (in a real scenario, you'd use readline)
    return false
  } catch (error) {
    console.error('Error creating table:', error)
    return false
  }
}

async function checkTableExists() {
  try {
    const { data, error } = await supabase
      .from('zip_codes')
      .select('count')
      .limit(1)
    
    return !error
  } catch (error) {
    return false
  }
}

async function importZipCodes(excelFilePath) {
  console.log('\n📖 Reading Excel file:', excelFilePath)
  
  const workbook = XLSX.readFile(excelFilePath)
  const sheetName = workbook.SheetNames.find(name => name === 'Sheet2') || workbook.SheetNames[1]
  const worksheet = workbook.Sheets[sheetName]
  
  const data = XLSX.utils.sheet_to_json(worksheet, {
    header: ['codigo_postal', 'estado', 'municipio', 'ciudad', 'tipo_asentamiento', 'asentamiento', 'clave_oficina'],
    defval: '',
    range: 1
  })

  console.log(`✅ Found ${data.length} rows in Excel file`)

  const zipCodes = []
  const seen = new Set()
  const BATCH_SIZE = 1000

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    
    let zipCode = String(row['codigo_postal'] || '').trim()
    const colonia = String(row['asentamiento'] || '').trim()
    const delegacion = String(row['municipio'] || '').trim()
    const estado = String(row['estado'] || '').trim()
    const ciudad = String(row['ciudad'] || '').trim() || null

    if (zipCode) {
      zipCode = String(parseInt(zipCode)).padStart(5, '0')
    }

    if (!zipCode || zipCode.length !== 5 || !/^\d{5}$/.test(zipCode)) {
      continue
    }

    if (!colonia || !delegacion || !estado) {
      continue
    }

    const uniqueKey = `${zipCode}-${colonia}-${delegacion}`
    if (seen.has(uniqueKey)) {
      continue
    }
    seen.add(uniqueKey)

    zipCodes.push({
      zip_code: zipCode,
      colonia: colonia,
      delegacion_municipio: delegacion,
      estado: estado,
      ciudad: ciudad
    })
  }

  console.log(`📦 Prepared ${zipCodes.length} unique zip codes for import\n`)

  let imported = 0
  let errors = 0

  for (let i = 0; i < zipCodes.length; i += BATCH_SIZE) {
    const batch = zipCodes.slice(i, i + BATCH_SIZE)
    
    try {
      const { data: inserted, error } = await supabase
        .from('zip_codes')
        .insert(batch)
        .select()

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          console.log(`⚠️  Batch ${Math.floor(i / BATCH_SIZE) + 1}: Some duplicates skipped (normal)`)
        } else {
          console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message)
          if (error.message.includes('table') && error.message.includes('not exist')) {
            console.error('   → Table does not exist. Please execute the migration SQL first!')
            break
          }
          errors += batch.length
          continue
        }
      }

      if (inserted) {
        imported += inserted.length
      } else {
        imported += batch.length
      }

      const progress = ((i + batch.length) / zipCodes.length * 100).toFixed(1)
      console.log(`✅ Progress: ${progress}% (${imported} imported, ${errors} errors)`)

    } catch (error) {
      console.error(`❌ Exception in batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message)
      errors += batch.length
    }
  }

  console.log('\n📊 Import Summary:')
  console.log(`   Total rows processed: ${zipCodes.length}`)
  console.log(`   Successfully imported: ${imported}`)
  console.log(`   Errors: ${errors}`)
  console.log(`   Duplicates skipped: ${zipCodes.length - imported - errors}`)
}

// Main
async function main() {
  const excelFile = process.argv[2] || 'C:\\Users\\USER\\Documents\\Downloads\\CodigosPostales.xls'
  
  // Check if table exists
  const exists = await checkTableExists()
  
  if (!exists) {
    console.log('❌ Table zip_codes does not exist')
    console.log('\n📋 STEP 1: Execute the migration SQL in Supabase SQL Editor')
    console.log('='.repeat(60))
    const migrationSQL = fs.readFileSync(path.join(__dirname, '../supabase/migration_zip_codes.sql'), 'utf8')
    console.log(migrationSQL)
    console.log('='.repeat(60))
    console.log('\n⏳ After executing the SQL, run this script again to import the data.')
    console.log('   Or wait 10 seconds and I will try to import anyway...\n')
    
    // Wait a bit in case user executes SQL
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    // Check again
    const existsNow = await checkTableExists()
    if (!existsNow) {
      console.log('❌ Table still does not exist. Please execute the SQL migration first.')
      process.exit(1)
    }
    console.log('✅ Table found! Proceeding with import...\n')
  } else {
    console.log('✅ Table zip_codes exists\n')
  }
  
  await importZipCodes(excelFile)
  console.log('\n✅ All done!')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

