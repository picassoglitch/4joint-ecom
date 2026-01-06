-- Insert age_gate configuration into site_config table
-- This will eliminate the 406 error when fetching age_gate config
-- Run this in Supabase SQL Editor

INSERT INTO site_config (key, value, description) 
VALUES (
  'age_gate',
  '{
    "ageRequirement": 18,
    "enabled": true,
    "complianceNotice": "",
    "regionRestrictions": [],
    "disableStoreDiscovery": false
  }'::jsonb,
  'Age gate configuration - verifies users are 18+ before accessing the site'
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify the insert
SELECT key, value, description, created_at 
FROM site_config 
WHERE key = 'age_gate';





