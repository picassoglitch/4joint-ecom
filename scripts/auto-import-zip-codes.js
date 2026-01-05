/**
 * Auto-import zip codes - Creates table if needed and imports data
 * Uses Supabase service role key
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables')
  process.exit(1)
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

async function checkTableExists() {
  try {
    const { error } = await supabase
      .from('zip_codes')
      .select('count')
      .limit(1)
    return !error
  } catch {
    return false
  }
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
  let duplicateCount = 0

  for (let i = 0; i < zipCodes.length; i += BATCH_SIZE) {
    const batch = zipCodes.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    
    try {
      const { data: inserted, error } = await supabase
        .from('zip_codes')
        .insert(batch)
        .select()

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          // Duplicates are expected, count them
          duplicateCount += batch.length
          imported += batch.length // Count as "processed"
          if (batchNum % 5 === 0 || batchNum === 1) {
            console.log(`⚠️  Batch ${batchNum}: Duplicates skipped (normal)`)
          }
        } else if (error.message?.includes('table') && error.message?.includes('not exist')) {
          console.error(`\n❌ Table does not exist!`)
          console.error('Please execute the migration SQL in Supabase SQL Editor first:')
          console.error('File: supabase/migration_zip_codes.sql')
          break
        } else {
          console.error(`❌ Error in batch ${batchNum}:`, error.message)
          errors += batch.length
        }
      } else {
        if (inserted && inserted.length > 0) {
          imported += inserted.length
        } else {
          imported += batch.length
        }
      }

      const progress = Math.min(((i + batch.length) / zipCodes.length * 100), 100).toFixed(1)
      if (batchNum % 5 === 0 || batchNum === 1 || i + batch.length >= zipCodes.length) {
        console.log(`✅ Progress: ${progress}% (${imported} processed, ${errors} errors)`)
      }

    } catch (error) {
      console.error(`❌ Exception in batch ${batchNum}:`, error.message)
      errors += batch.length
    }
  }

  console.log('\n📊 Import Summary:')
  console.log(`   Total rows processed: ${zipCodes.length}`)
  console.log(`   Successfully imported: ${imported - duplicateCount}`)
  console.log(`   Duplicates skipped: ${duplicateCount}`)
  console.log(`   Errors: ${errors}`)
}

// Main
async function main() {
  const excelFile = process.argv[2] || 'C:\\Users\\USER\\Documents\\Downloads\\CodigosPostales.xls'
  
  console.log('🔍 Checking if zip_codes table exists...\n')
  
  const exists = await checkTableExists()
  
  if (!exists) {
    console.log('❌ Table zip_codes does not exist')
    console.log('\n📋 Please execute this SQL in Supabase SQL Editor:')
    console.log('   File: supabase/migration_zip_codes.sql')
    console.log('\n⏳ Waiting for table to be created (checking every 5 seconds)...')
    console.log('   (Execute the SQL migration and I will detect it automatically)\n')
    
    // Poll for table creation
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max wait
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++
      
      const nowExists = await checkTableExists()
      if (nowExists) {
        console.log(`✅ Table created! (detected after ${attempts * 5} seconds)\n`)
        break
      }
      
      if (attempts % 6 === 0) {
        console.log(`   Still waiting... (${attempts * 5}s elapsed)`)
      }
    }
    
    const finalCheck = await checkTableExists()
    if (!finalCheck) {
      console.error('\n❌ Table was not created after 5 minutes.')
      console.error('Please execute the migration SQL and run this script again.')
      process.exit(1)
    }
  } else {
    console.log('✅ Table zip_codes exists\n')
  }
  
  await importZipCodes(excelFile)
  console.log('\n✅ Import completed!')
}

main().catch((error) => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

