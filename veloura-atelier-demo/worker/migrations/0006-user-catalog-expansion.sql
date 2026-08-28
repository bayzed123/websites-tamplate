-- Veloura Atelier demo catalogue expansion. All records are fictional.
UPDATE products SET category_id = 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1 AND category_id IS NULL;
UPDATE products SET category_id = 2, updated_at = CURRENT_TIMESTAMP WHERE id = 2 AND category_id IS NULL;
UPDATE products SET category_id = 1, updated_at = CURRENT_TIMESTAMP WHERE id = 3 AND category_id IS NULL;
UPDATE products SET category_id = 5, updated_at = CURRENT_TIMESTAMP WHERE id = 4 AND category_id IS NULL;

INSERT OR IGNORE INTO products(category_id, name, slug, sku, description, short_description, price, compare_at_price, cost_price, image_url, barcode, weight_grams, stock, low_stock_threshold, min_order_qty, status, tags_json, specs_json, volume_tiers_json, featured, active, updated_at) VALUES
(1, 'Lumen Dew Travel Serum', 'lumen-dew-travel-serum', 'VA-SK-001', 'A compact serum edit for a calm, hydrated-looking routine on the go.', 'Travel-ready daily hydration.', 490, 590, 260, '/manus-storage/veloura-lumen-serum_7770ea4d.png', 'VA-SK-001', 60, 42, 8, 1, 'active', '["serum","travel","hydration"]', '[]', '[]', 1, 1, CURRENT_TIMESTAMP),
(2, 'Cloud Veil Hand & Body Cream', 'cloud-veil-hand-body-cream', 'VA-BC-001', 'A soft, everyday cream for hands and body with a comfortable finish.', 'Everyday comfort care.', 560, 680, 300, '/manus-storage/veloura-cloud-cream_14cf7d84.png', 'VA-BC-001', 180, 36, 6, 1, 'active', '["cream","body care","daily"]', '[]', '[]', 1, 1, CURRENT_TIMESTAMP),
(5, 'Ritual Amber Mini Oil', 'ritual-amber-mini-oil', 'VA-BO-001', 'A small-format body oil for a warm evening ritual wherever the day takes you.', 'A warm pocket-sized ritual.', 390, 470, 210, '/manus-storage/veloura-ritual-oil_5e40ea12.png', 'VA-BO-001', 55, 28, 5, 1, 'active', '["body oil","mini","ritual"]', '[]', '[]', 0, 1, CURRENT_TIMESTAMP),
(2, 'Afterglow Cooling Mist', 'afterglow-cooling-mist', 'VA-FC-001', 'A refreshing face mist for a quick reset between routines.', 'A quick refreshing reset.', 430, 520, 230, '/manus-storage/veloura-night-mist_60a09ac9.png', 'VA-FC-001', 100, 20, 5, 1, 'active', '["mist","refresh","face care"]', '[]', '[]', 0, 1, CURRENT_TIMESTAMP);
