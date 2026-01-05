# Importar Códigos Postales de México a Supabase

## Opciones para obtener los datos

### Opción 1: SEPOMEX (Servicio Postal Mexicano)
El gobierno de México proporciona un archivo CSV con todos los códigos postales:
- URL: https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/CodigoPostal_Exportar.aspx
- Formato: CSV con columnas: d_codigo, d_asenta, d_tipo_asenta, D_mnpio, d_estado, d_ciudad

### Opción 2: API de códigos postales
- https://api-codigos-postales.herokuapp.com/v2/codigo_postal/
- https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/Descarga.aspx

## Script de importación (Node.js)

```javascript
// scripts/import-zip-codes.js
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const csv = require('csv-parser')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function importZipCodes(csvFilePath) {
  const batchSize = 1000
  let batch = []
  let totalImported = 0

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv({
        separator: '|', // SEPOMEX uses | as separator
        headers: ['d_codigo', 'd_asenta', 'd_tipo_asenta', 'D_mnpio', 'd_estado', 'd_ciudad', 'd_CP', 'c_estado', 'c_oficina', 'c_CP', 'c_tipo_asenta', 'c_mnpio', 'id_asenta_cpcons', 'd_zona', 'c_cve_ciudad']
      }))
      .on('data', async (row) => {
        const zipCode = {
          zip_code: row.d_codigo,
          colonia: row.d_asenta,
          delegacion_municipio: row.D_mnpio,
          estado: row.d_estado,
          ciudad: row.d_ciudad || null
        }

        batch.push(zipCode)

        if (batch.length >= batchSize) {
          await insertBatch([...batch])
          totalImported += batch.length
          console.log(`Imported ${totalImported} zip codes...`)
          batch = []
        }
      })
      .on('end', async () => {
        if (batch.length > 0) {
          await insertBatch(batch)
          totalImported += batch.length
        }
        console.log(`Total imported: ${totalImported} zip codes`)
        resolve()
      })
      .on('error', reject)
  })

  async function insertBatch(batch) {
    const { error } = await supabase
      .from('zip_codes')
      .insert(batch)

    if (error) {
      console.error('Error inserting batch:', error)
      throw error
    }
  }
}

// Run import
const csvFile = process.argv[2] || 'CPdescarga.txt'
importZipCodes(csvFile)
  .then(() => {
    console.log('Import completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Import failed:', error)
    process.exit(1)
  })
```

## Uso

1. Descarga el archivo de códigos postales de SEPOMEX
2. Instala dependencias:
   ```bash
   npm install csv-parser @supabase/supabase-js
   ```
3. Configura las variables de entorno:
   ```bash
   export NEXT_PUBLIC_SUPABASE_URL=your_url
   export SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ```
4. Ejecuta el script:
   ```bash
   node scripts/import-zip-codes.js CPdescarga.txt
   ```

## Nota
El archivo de SEPOMEX puede tener más de 100,000 registros. El script procesa en lotes de 1000 para evitar problemas de memoria.

