-- Seed categorías del sistema (idempotente)
INSERT INTO "categories" ("id", "groupId", "name", "emoji", "color", "createdAt")
VALUES
  ('system_comida_y_bebida',            NULL, 'Comida y bebida',          '🍽️', '#FF6B6B', NOW()),
  ('system_alojamiento',                NULL, 'Alojamiento',              '🏠', '#4ECDC4', NOW()),
  ('system_transporte',                 NULL, 'Transporte',               '🚗', '#45B7D1', NOW()),
  ('system_ocio_y_entretenimiento',     NULL, 'Ocio y entretenimiento',   '🎉', '#96CEB4', NOW()),
  ('system_compras',                    NULL, 'Compras',                  '🛒', '#FFEAA7', NOW()),
  ('system_salud',                      NULL, 'Salud',                    '🏥', '#DDA0DD', NOW()),
  ('system_servicios',                  NULL, 'Servicios',                '💡', '#98D8C8', NOW()),
  ('system_otros',                      NULL, 'Otros',                    '📦', '#B8B8B8', NOW())
ON CONFLICT ("id") DO NOTHING;
