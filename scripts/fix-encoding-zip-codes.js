/**
 * Fix encoding issues in zip_codes table
 * Replaces malformed characters with correct UTF-8 characters
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

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

// Common encoding fixes for Mexican place names
const encodingFixes = {
  // Estado fixes
  'Ciudad de Mxico': 'Ciudad de México',
  'Ciudad de Mxico': 'Ciudad de México',
  
  // Delegación fixes
  'lvaro Obregn': 'Álvaro Obregón',
  'lvaro Obregn': 'Álvaro Obregón',
  'Benito Jurez': 'Benito Juárez',
  'Benito Jurez': 'Benito Juárez',
  'Coyoacn': 'Coyoacán',
  'Coyoacn': 'Coyoacán',
  'Cuauhtmoc': 'Cuauhtémoc',
  'Cuauhtmoc': 'Cuauhtémoc',
  'Gustavo A. Madero': 'Gustavo A. Madero', // Usually fine
  'Iztacalco': 'Iztacalco',
  'Iztapalapa': 'Iztapalapa',
  'La Magdalena Contreras': 'La Magdalena Contreras',
  'Miguel Hidalgo': 'Miguel Hidalgo',
  'Milpa Alta': 'Milpa Alta',
  'Tlhuac': 'Tláhuac',
  'Tlhuac': 'Tláhuac',
  'Tlalpan': 'Tlalpan',
  'Venustiano Carranza': 'Venustiano Carranza',
  'Xochimilco': 'Xochimilco',
}

// Function to fix encoding in a string
function fixEncoding(text) {
  if (!text || typeof text !== 'string') return text
  
  // Try to fix common encoding issues
  let fixed = text
  
  // Replace common malformed characters (using Unicode escape sequences)
  // Replace replacement character (U+FFFD) and similar with correct characters
  fixed = fixed.replace(/\uFFFD/g, 'á') // Replacement character -> á
  fixed = fixed.replace(/[^\x00-\x7F]/g, (char) => {
    // Try to map common malformed characters
    const charCode = char.charCodeAt(0)
    // Map common Windows-1252 to UTF-8 issues
    if (charCode === 0xE1) return 'á'
    if (charCode === 0xE9) return 'é'
    if (charCode === 0xED) return 'í'
    if (charCode === 0xF3) return 'ó'
    if (charCode === 0xFA) return 'ú'
    if (charCode === 0xF1) return 'ñ'
    if (charCode === 0xC1) return 'Á'
    if (charCode === 0xC9) return 'É'
    if (charCode === 0xCD) return 'Í'
    if (charCode === 0xD3) return 'Ó'
    if (charCode === 0xDA) return 'Ú'
    if (charCode === 0xD1) return 'Ñ'
    return char
  })
  
  // Apply known fixes
  if (encodingFixes[text]) {
    fixed = encodingFixes[text]
  }
  
  // Try to detect and fix common patterns using regex
  // "Ju?rez" or "Jurez" -> "Juárez"
  fixed = fixed.replace(/Ju[^\w]rez/gi, 'Juárez')
  // "Coyoac?n" or "Coyoacn" -> "Coyoacán"
  fixed = fixed.replace(/Coyoac[^\w]n/gi, 'Coyoacán')
  // "Cuauht?moc" or "Cuauhtmoc" -> "Cuauhtémoc"
  fixed = fixed.replace(/Cuauht[^\w]moc/gi, 'Cuauhtémoc')
  // "Tl?huac" or "Tlhuac" -> "Tláhuac"
  fixed = fixed.replace(/Tl[^\w]huac/gi, 'Tláhuac')
  // "?lvaro" or "lvaro" -> "Álvaro"
  fixed = fixed.replace(/[^\w]lvaro/gi, 'Álvaro')
  
  return fixed
}

async function fixEncodingInDatabase() {
  console.log('🔍 Fetching all zip codes to fix encoding...\n')
  
  // Fetch all records (no limit to get all)
  let allRecords = []
  let offset = 0
  const pageSize = 1000
  
  while (true) {
    const { data: batch, error: fetchError } = await supabase
      .from('zip_codes')
      .select('*')
      .range(offset, offset + pageSize - 1)
    
    if (fetchError) {
      console.error('❌ Error fetching records:', fetchError)
      process.exit(1)
    }
  
  if (!batch || batch.length === 0) break
  
  allRecords = allRecords.concat(batch)
  offset += pageSize
  
  if (batch.length < pageSize) break
}
  
  console.log(`📦 Found ${allRecords.length} records to check\n`)
  
  let updated = 0
  let errors = 0
  
  // Process in batches
  const BATCH_SIZE = 100
  for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
    const batch = allRecords.slice(i, i + BATCH_SIZE)
    const updates = []
    
    for (const record of batch) {
      const fixedColonia = fixEncoding(record.colonia)
      const fixedDelegacion = fixEncoding(record.delegacion_municipio)
      const fixedEstado = fixEncoding(record.estado)
      const fixedCiudad = record.ciudad ? fixEncoding(record.ciudad) : null
      
      // Check if any field needs updating
      if (
        fixedColonia !== record.colonia ||
        fixedDelegacion !== record.delegacion_municipio ||
        fixedEstado !== record.estado ||
        fixedCiudad !== record.ciudad
      ) {
        updates.push({
          id: record.id,
          colonia: fixedColonia,
          delegacion_municipio: fixedDelegacion,
          estado: fixedEstado,
          ciudad: fixedCiudad
        })
      }
    }
    
    // Update records that need fixing
    if (updates.length > 0) {
      for (const update of updates) {
        try {
          const { error: updateError } = await supabase
            .from('zip_codes')
            .update({
              colonia: update.colonia,
              delegacion_municipio: update.delegacion_municipio,
              estado: update.estado,
              ciudad: update.ciudad
            })
            .eq('id', update.id)
          
          if (updateError) {
            console.error(`❌ Error updating record ${update.id}:`, updateError.message)
            errors++
          } else {
            updated++
            if (updated % 50 === 0) {
              console.log(`✅ Updated ${updated} records...`)
            }
          }
        } catch (error) {
          console.error(`❌ Exception updating record ${update.id}:`, error.message)
          errors++
        }
      }
    }
    
    const progress = ((i + batch.length) / allRecords.length * 100).toFixed(1)
    console.log(`📊 Progress: ${progress}% (${updated} updated, ${errors} errors)`)
  }
  
  console.log('\n📊 Fix Summary:')
  console.log(`   Total records checked: ${allRecords.length}`)
  console.log(`   Records updated: ${updated}`)
  console.log(`   Errors: ${errors}`)
}

// Main
fixEncodingInDatabase()
  .then(() => {
    console.log('\n✅ Encoding fix completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

