/**
 * Delegaciones y Colonias de CDMX
 * Estructura de datos para selección de zonas de servicio
 */

export const DELEGACIONES = [
  { id: 'alvaro-obregon', name: 'Álvaro Obregón', colonias: [
    { id: 'san-angel', name: 'San Ángel', zip: '01000' },
    { id: 'tlacopac', name: 'Tlacopac', zip: '01020' },
    { id: 'guadalupe-inn', name: 'Guadalupe Inn', zip: '01020' },
    { id: 'florida', name: 'Florida', zip: '01030' },
    { id: 'campestre', name: 'Campestre', zip: '01040' },
    { id: 'lomas-de-plateros', name: 'Lomas de Plateros', zip: '01480' },
  ]},
  { id: 'azcapotzalco', name: 'Azcapotzalco', colonias: [
    { id: 'centro', name: 'Centro', zip: '02000' },
    { id: 'san-miguel', name: 'San Miguel', zip: '02010' },
    { id: 'nueva-azcapotzalco', name: 'Nueva Azcapotzalco', zip: '02050' },
    { id: 'claveria', name: 'Clavería', zip: '02080' },
  ]},
  { id: 'benito-juarez', name: 'Benito Juárez', colonias: [
    { id: 'del-valle', name: 'Del Valle', zip: '03100' },
    { id: 'narvarte', name: 'Narvarte', zip: '03020' },
    { id: 'portales', name: 'Portales', zip: '03300' },
    { id: 'xoco', name: 'Xoco', zip: '03330' },
    { id: 'mixcoac', name: 'Mixcoac', zip: '03910' },
  ]},
  { id: 'coyoacan', name: 'Coyoacán', colonias: [
    { id: 'coyoacan-centro', name: 'Coyoacán Centro', zip: '04000' },
    { id: 'villa-coyoacan', name: 'Villa Coyoacán', zip: '04000' },
    { id: 'del-carmen', name: 'Del Carmen', zip: '04100' },
    { id: 'santa-catarina', name: 'Santa Catarina', zip: '04010' },
    { id: 'churubusco', name: 'Churubusco', zip: '04220' },
  ]},
  { id: 'cuajimalpa', name: 'Cuajimalpa', colonias: [
    { id: 'cuajimalpa-centro', name: 'Cuajimalpa Centro', zip: '05000' },
    { id: 'san-pablo-chimalpa', name: 'San Pablo Chimalpa', zip: '05010' },
  ]},
  { id: 'cuauhtemoc', name: 'Cuauhtémoc', colonias: [
    { id: 'centro-historico', name: 'Centro Histórico', zip: '06000' },
    { id: 'roma-norte', name: 'Roma Norte', zip: '06700' },
    { id: 'roma-sur', name: 'Roma Sur', zip: '06760' },
    { id: 'condesa', name: 'Condesa', zip: '06140' },
    { id: 'juarez', name: 'Juárez', zip: '06600' },
    { id: 'doctores', name: 'Doctores', zip: '06720' },
  ]},
  { id: 'gustavo-a-madero', name: 'Gustavo A. Madero', colonias: [
    { id: 'lindavista', name: 'Lindavista', zip: '07300' },
    { id: 'vallejo', name: 'Vallejo', zip: '07870' },
    { id: 'tacuba', name: 'Tacuba', zip: '11410' },
  ]},
  { id: 'iztacalco', name: 'Iztacalco', colonias: [
    { id: 'agraria', name: 'Agraria', zip: '08000' },
    { id: 'vietnam', name: 'Vietnam', zip: '08800' },
  ]},
  { id: 'iztapalapa', name: 'Iztapalapa', colonias: [
    { id: 'santa-martha-acatitla', name: 'Santa Martha Acatitla', zip: '09500' },
    { id: 'san-miguel-teotongo', name: 'San Miguel Teotongo', zip: '09800' },
  ]},
  { id: 'magdalena-contreras', name: 'Magdalena Contreras', colonias: [
    { id: 'magdalena-contreras-centro', name: 'Magdalena Contreras Centro', zip: '10000' },
  ]},
  { id: 'miguel-hidalgo', name: 'Miguel Hidalgo', colonias: [
    { id: 'polanco', name: 'Polanco', zip: '11510' },
    { id: 'lomas-de-chapultepec', name: 'Lomas de Chapultepec', zip: '11000' },
    { id: 'anahuac', name: 'Anáhuac', zip: '11320' },
    { id: 'tacubaya', name: 'Tacubaya', zip: '11870' },
  ]},
  { id: 'milpa-alta', name: 'Milpa Alta', colonias: [
    { id: 'villa-milpa-alta', name: 'Villa Milpa Alta', zip: '12000' },
  ]},
  { id: 'tlahuac', name: 'Tláhuac', colonias: [
    { id: 'tlahuac-centro', name: 'Tláhuac Centro', zip: '13000' },
  ]},
  { id: 'tlalpan', name: 'Tlalpan', colonias: [
    { id: 'tlalpan-centro', name: 'Tlalpan Centro', zip: '14000' },
    { id: 'pedregal', name: 'Pedregal', zip: '14100' },
  ]},
  { id: 'venustiano-carranza', name: 'Venustiano Carranza', colonias: [
    { id: 'moctezuma', name: 'Moctezuma', zip: '15500' },
    { id: 'romero-rubio', name: 'Romero Rubio', zip: '15400' },
  ]},
  { id: 'xochimilco', name: 'Xochimilco', colonias: [
    { id: 'xochimilco-centro', name: 'Xochimilco Centro', zip: '16000' },
    { id: 'santa-cruz-xochitepec', name: 'Santa Cruz Xochitepec', zip: '16030' },
  ]},
]

/**
 * Get all colonias for a delegacion
 */
export function getColoniasByDelegacion(delegacionId) {
  const delegacion = DELEGACIONES.find(d => d.id === delegacionId)
  return delegacion ? delegacion.colonias : []
}

/**
 * Get delegacion by colonia ID
 */
export function getDelegacionByColonia(coloniaId) {
  for (const delegacion of DELEGACIONES) {
    const colonia = delegacion.colonias.find(c => c.id === coloniaId)
    if (colonia) {
      return delegacion
    }
  }
  return null
}

/**
 * Get colonia by ID
 */
export function getColoniaById(coloniaId) {
  for (const delegacion of DELEGACIONES) {
    const colonia = delegacion.colonias.find(c => c.id === coloniaId)
    if (colonia) {
      return colonia
    }
  }
  return null
}

/**
 * Check if a zip code is in the service area
 */
export function isZipInServiceArea(zipCode, selectedColonias) {
  if (!selectedColonias || selectedColonias.length === 0) {
    return false
  }
  
  // Check if zip matches any selected colonia
  for (const coloniaId of selectedColonias) {
    const colonia = getColoniaById(coloniaId)
    if (colonia && colonia.zip === zipCode) {
      return true
    }
  }
  
  return false
}

