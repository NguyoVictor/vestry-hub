-- Backfill staff directory tile names so member portal shows real names (e.g. "Victor")
UPDATE conversations c
SET name = COALESCE(NULLIF(TRIM(u.first_name), ''), TRIM(CONCAT(u.first_name, ' ', u.last_name)))
FROM users u
WHERE c.staff_user_id = u.id
  AND c.is_staff_directory = true
  AND (c.name IS NULL OR TRIM(c.name) = '');
