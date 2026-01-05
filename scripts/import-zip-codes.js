/**
 * Import Zip Codes from Excel file to Supabase
 * Uses existing Supabase environment variables
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')
const path = require('path')

// Use existing Supabase variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Configuration
const BATCH_SIZE = 1000
const MAX_ROWS = null // Set to number to limit rows, or null for all

async function importZipCodes(excelFilePath) {
  console.log('📖 Reading Excel file:', excelFilePath)
  
  // Read Excel file
  const workbook = XLSX.readFile(excelFilePath)
  
  // Use Sheet2 (Sheet1 is just a disclaimer)
  const sheetName = workbook.SheetNames.find(name => name === 'Sheet2') || workbook.SheetNames[1] || workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  // Read with header row - the Excel has headers in row 1
  const data = XLSX.utils.sheet_to_json(worksheet, {
    header: ['codigo_postal', 'estado', 'municipio', 'ciudad', 'tipo_asentamiento', 'asentamiento', 'clave_oficina'],
    defval: '',
    range: 1 // Start from row 1 (skip header row 0)
  })

  console.log(`✅ Found ${data.length} rows in Excel file`)

  // Map Excel columns to our database columns
  const zipCodes = []
  const seen = new Set() // Track duplicates by zip_code + colonia

  for (let i = 0; i < (MAX_ROWS || data.length); i++) {
    const row = data[i]
    
    // Extract and normalize data
    let zipCode = String(row['codigo_postal'] || row['Código Postal'] || '').trim()
    const colonia = String(row['asentamiento'] || row['Asentamiento'] || '').trim()
    const delegacion = String(row['municipio'] || row['Municipio'] || '').trim()
    const estado = String(row['estado'] || row['Estado'] || '').trim()
    const ciudad = String(row['ciudad'] || row['Ciudad'] || '').trim() || null

    // Convert zip code to 5-digit string (pad with zeros if needed)
    if (zipCode) {
      zipCode = String(parseInt(zipCode)).padStart(5, '0')
    }

    // Validate required fields
    if (!zipCode || zipCode.length !== 5 || !/^\d{5}$/.test(zipCode)) {
      continue // Skip invalid zip codes
    }

    if (!colonia || !delegacion || !estado) {
      continue // Skip rows with missing required data
    }

    // Create unique key to avoid duplicates
    const uniqueKey = `${zipCode}-${colonia}-${delegacion}`
    if (seen.has(uniqueKey)) {
      continue // Skip duplicates
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

  // Import in batches
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
        // Check if it's a duplicate key error (expected for some rows)
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          console.log(`⚠️  Batch ${Math.floor(i / BATCH_SIZE) + 1}: Some duplicates skipped (this is normal)`)
        } else {
          console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message)
          errors += batch.length
          continue
        }
      }

      if (inserted) {
        imported += inserted.length
      } else {
        // If no data returned but no error, assume all were inserted
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
const excelFile = process.argv[2] || path.join(__dirname, '../CodigosPostales.xls')

if (!excelFile || !excelFile.endsWith('.xls') && !excelFile.endsWith('.xlsx')) {
  console.error('❌ Please provide a valid Excel file path (.xls or .xlsx)')
  console.error('Usage: node scripts/import-zip-codes.js <path-to-excel-file>')
  process.exit(1)
}

importZipCodes(excelFile)
  .then(() => {
    console.log('\n✅ Import completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error)
    process.exit(1)
  })

