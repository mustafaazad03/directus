-- SQL script to update additional fields to be hidden
-- This script updates the directus_fields table to ensure proper hidden property
-- Note: 'system' property is handled by system data files, not stored in database

-- Update directus_roles additional fields
UPDATE directus_fields 
SET meta = '{"hidden": true, "system": true}' 
WHERE collection = 'directus_roles' AND field IN ('sort', 'parent', 'collapse', 'color', 'hidden', 'folder_at');

-- Update directus_policies additional fields
UPDATE directus_fields 
SET meta = '{"hidden": true, "system": true}' 
WHERE collection = 'directus_policies' AND field IN ('sort', 'parent', 'collapse', 'color', 'hidden', 'folder_at');

-- Update directus_flows additional fields
UPDATE directus_fields 
SET meta = '{"hidden": true, "system": true}' 
WHERE collection = 'directus_flows' AND field IN ('sort', 'parent', 'collapse', 'color', 'hidden', 'folder_at');

-- Verify the updates
SELECT 
    collection, 
    field, 
    hidden
FROM directus_fields 
WHERE collection IN ('directus_roles', 'directus_policies', 'directus_flows') 
    AND field IN ('sort', 'parent', 'collapse', 'color', 'hidden', 'folder_at')
ORDER BY collection, field;
