/**
 * Execute migration SQL and import zip codes
 * Uses Supabase service role key to bypass RLS
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

// Create client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

async function executeMigrationSQL() {
  console.log('📝 Executing migration SQL to create zip_codes table...')
  
  const migrationPath = path.join(__dirname, '../supabase/migration_zip_codes.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  
  // Split SQL into executable statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      const trimmed = s.trim()
      return trimmed.length > 0 && 
             !trimmed.startsWith('--') && 
             !trimmed.startsWith('COMMENT') &&
             trimmed !== ''
    })
  
  console.log(`   Found ${statements.length} SQL statements to execute`)
  
  // Execute each statement using Supabase REST API
  // We'll use the PostgREST endpoint with service role key
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (!statement) continue
    
    try {
      // Use Supabase's REST API to execute SQL
      // Note: Supabase doesn't have a direct SQL execution endpoint via REST
      // We need to use the SQL Editor API or create a function
      // For now, we'll show the SQL and wait for manual execution
      
      if (i === 0) {
        console.log('\n⚠️  Supabase JS client cannot execute raw SQL directly.')
        console.log('Please execute the migration SQL in Supabase SQL Editor:')
        console.log('='.repeat(60))
        console.log(migrationSQL)
        console.log('='.repeat(60))
        console.log('\nAfter executing, the import will continue automatically...\n')
        
        // Wait for table to be created
        let attempts = 0
        while (attempts < 12) { // Wait up to 60 seconds
          await new Promise(resolve => setTimeout(resolve, 5000))
          const { data, error } = await supabase
            .from('zip_codes')
            .select('count')
            .limit(1)
          
          if (!error) {
            console.log('✅ Table created! Proceeding with import...\n')
            return true
          }
          attempts++
          if (attempts % 2 === 0) {
            console.log(`⏳ Still waiting for table creation... (${attempts * 5}s)`)
          }
        }
        
        console.error('❌ Table was not created. Please execute the SQL manually.')
        return false
      }
    } catch (error) {
      console.error(`Error executing statement ${i + 1}:`, error.message)
      return false
    }
  }
  
  return true
}

async function importZipCodes(excelFilePath) {
  console.log('📖 Reading Excel file:', excelFilePath)
  
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
          // Count how many were actually inserted
          imported += batch.length
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
      } else {
        if (inserted) {
          imported += inserted.length
        } else {
          imported += batch.length
        }
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
  const { data: checkData, error: checkError } = await supabase
    .from('zip_codes')
    .select('count')
    .limit(1)
  
  if (checkError && checkError.code === '42P01') {
    console.log('❌ Table zip_codes does not exist\n')
    const created = await executeMigrationSQL()
    if (!created) {
      console.error('\n❌ Cannot proceed without the table. Please execute the SQL migration first.')
      process.exit(1)
    }
  } else if (checkError) {
    console.error('❌ Error checking table:', checkError.message)
    process.exit(1)
  } else {
    console.log('✅ Table zip_codes exists\n')
  }
  
  await importZipCodes(excelFile)
  console.log('\n✅ Import completed successfully!')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

