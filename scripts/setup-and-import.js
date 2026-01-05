/**
 * Complete setup: Create table and import zip codes
 * This script provides instructions and then imports the data
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
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

async function createTable() {
  console.log('📝 Creating zip_codes table using Supabase REST API...')
  
  // Read migration SQL
  const migrationPath = path.join(__dirname, '../supabase/migration_zip_codes.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  
  // Split SQL into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  // Execute each statement using Supabase REST API
  // Note: We'll use the service role key to bypass RLS
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: migrationSQL })
  })
  
  // Alternative: Use pg REST API if available, or just show instructions
  console.log('\n⚠️  Automatic table creation requires Supabase SQL execution API.')
  console.log('Please execute the migration SQL manually in Supabase SQL Editor:\n')
  console.log('='.repeat(60))
  console.log(migrationSQL)
  console.log('='.repeat(60))
  console.log('\nAfter executing, press Enter to continue with import...')
  
  return false // Return false to indicate manual step needed
}

async function importZipCodes(excelFilePath) {
  console.log('\n📖 Reading Excel file:', excelFilePath)
  
  const workbook = XLSX.readFile(excelFilePath)
  const sheetName = workbook.SheetNames.find(name => name === 'Sheet2') || workbook.SheetNames[1] || workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  const data = XLSX.utils.sheet_to_json(worksheet, {
    header: ['codigo_postal', 'estado', 'municipio', 'ciudad', 'tipo_asentamiento', 'asentamiento', 'clave_oficina'],
    defval: ''
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

  console.log(`📦 Prepared ${zipCodes.length} unique zip codes for import`)

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
          console.log(`⚠️  Batch ${Math.floor(i / BATCH_SIZE) + 1}: Some duplicates skipped`)
        } else {
          console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message)
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

// Main execution
async function main() {
  const tableExists = await checkTableExists()
  
  if (!tableExists) {
    console.log('❌ Table zip_codes does not exist')
    await createTable()
    
    // Wait for user to execute SQL
    console.log('\n⏳ Waiting for you to execute the SQL migration...')
    console.log('Once done, the import will continue automatically.')
    console.log('(This script will check every 5 seconds)')
    
    // Poll until table exists
    let attempts = 0
    while (!(await checkTableExists()) && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++
      if (attempts % 6 === 0) {
        console.log('⏳ Still waiting... (checking every 5 seconds)')
      }
    }
    
    if (!(await checkTableExists())) {
      console.error('❌ Table was not created. Please execute the SQL and run this script again.')
      process.exit(1)
    }
    
    console.log('✅ Table created! Proceeding with import...\n')
  } else {
    console.log('✅ Table zip_codes already exists\n')
  }
  
  const excelFile = process.argv[2] || path.join(__dirname, '../CodigosPostales.xls')
  
  if (!excelFile || (!excelFile.endsWith('.xls') && !excelFile.endsWith('.xlsx'))) {
    console.error('❌ Please provide a valid Excel file path')
    process.exit(1)
  }
  
  await importZipCodes(excelFile)
  console.log('\n✅ Import completed successfully!')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

