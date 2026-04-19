INSERT INTO service_request_types (id, tenant_id, label, internal_name, description, is_active, is_default, sort_order)
VALUES
  (gen_random_uuid()::text, '34126643-2d36-4888-9062-24c89dc61612', 'Prayer',          'prayer',          'Prayer support request',                   true, true, 8),
  (gen_random_uuid()::text, '34126643-2d36-4888-9062-24c89dc61612', 'Counselling',     'counselling',     'Pastoral counselling session',              true, true, 9),
  (gen_random_uuid()::text, '34126643-2d36-4888-9062-24c89dc61612', 'Visitation',      'visitation',      'Home or hospital visitation request',       true, true, 10),
  (gen_random_uuid()::text, '34126643-2d36-4888-9062-24c89dc61612', 'Financial Aid',   'financial_aid',   'Request for financial assistance',          true, true, 11),
  (gen_random_uuid()::text, '34126643-2d36-4888-9062-24c89dc61612', 'Medical Support', 'medical_support', 'Request for medical support or assistance', true, true, 12),
  (gen_random_uuid()::text, '34126643-2d36-4888-9062-24c89dc61612', 'Bereavement',     'bereavement',     'Bereavement support and care',              true, true, 13),
  (gen_random_uuid()::text, '34126643-2d36-4888-9062-24c89dc61612', 'General',         'general',         'General service request',                  true, true, 14)
ON CONFLICT (tenant_id, internal_name) DO NOTHING;;
