# Configuración del Dashboard Especial para GreenBoy

## Descripción

El dashboard de GreenBoy tiene cálculos de ganancias diferentes al resto de las tiendas. En lugar de usar una comisión del 15%, GreenBoy tiene un sistema de división 50/50 del sobrante después de descontar el costo de proveedor.

## Cálculo de Ganancias para GreenBoy

1. **Ingresos Totales**: Suma de todos los totales de las órdenes
2. **Costo de Proveedor**: Suma de (provider_cost × quantity) de todos los productos vendidos en todas las órdenes
3. **Sobrante**: Ingresos Totales - Costo de Proveedor
4. **Ganancias GreenBoy**: 50% del Sobrante
5. **Ganancias Plataforma**: 50% del Sobrante

## Configuración

### 1. Ejecutar la Migración

Primero, ejecuta la migración para agregar el campo `provider_cost` a la tabla de productos:

```sql
-- Ejecutar en Supabase SQL Editor
-- Ver archivo: supabase/migration_provider_cost.sql
```

### 2. Configurar el Costo de Proveedor en los Productos

Para cada producto de GreenBoy, necesitas establecer el campo `provider_cost`. Reemplaza los valores según corresponda:

#### Opción A: Actualizar un producto específico

```sql
-- Ejemplo: Actualizar el costo de proveedor de un producto específico
-- Reemplaza 'product-uuid-here' con el UUID real del producto
-- Reemplaza 100.00 con el costo real del proveedor
UPDATE products
SET provider_cost = 100.00
WHERE id = 'product-uuid-here'
  AND vendor_id = 'f64fcf18-037f-47d8-b58a-9365cb62caf2';
```

#### Opción B: Actualizar todos los productos de GreenBoy con el mismo costo

```sql
-- Ejemplo: Establecer el mismo costo de proveedor para todos los productos de GreenBoy
-- Reemplaza 100.00 con el costo real del proveedor
UPDATE products
SET provider_cost = 100.00
WHERE vendor_id = 'f64fcf18-037f-47d8-b58a-9365cb62caf2';
```

#### Opción C: Ver productos de GreenBoy para obtener sus IDs

```sql
-- Primero, lista los productos de GreenBoy para ver sus IDs y precios actuales
SELECT id, name, price, provider_cost
FROM products
WHERE vendor_id = 'f64fcf18-037f-47d8-b58a-9365cb62caf2'
ORDER BY name;
```

#### Opción D: Actualizar múltiples productos con diferentes costos

```sql
-- Ejemplo: Actualizar varios productos con sus costos específicos
UPDATE products
SET provider_cost = CASE
  WHEN id = 'product-uuid-1' THEN 50.00
  WHEN id = 'product-uuid-2' THEN 75.00
  WHEN id = 'product-uuid-3' THEN 100.00
  ELSE provider_cost
END
WHERE vendor_id = 'f64fcf18-037f-47d8-b58a-9365cb62caf2';
```

### 3. Verificar el Dashboard

Una vez configurado:
1. Inicia sesión como vendedor de GreenBoy
2. Ve al dashboard (`/store`)
3. Deberías ver la calculadora especial con 5 campos:
   - Ingresos Totales
   - Costo de Proveedor
   - Sobrante
   - Ganancias Plataforma (50%)
   - Tus Ganancias (50%)

## Notas Importantes

- El campo `provider_cost` solo se usa para GreenBoy
- Para otras tiendas, el sistema sigue usando la comisión del 15%
- Si un producto no tiene `provider_cost` configurado, se asume 0
- El cálculo se hace en tiempo real basado en todas las órdenes del vendedor

## ID de GreenBoy

- **Store ID**: `f64fcf18-037f-47d8-b58a-9365cb62caf2`

