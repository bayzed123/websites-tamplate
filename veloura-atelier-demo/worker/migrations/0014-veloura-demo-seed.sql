-- Veloura Atelier demo-only seed. All records are fictional and safe to delete.
INSERT OR IGNORE INTO customers(name, phone, email, district, upazila, address) VALUES
  ('Mira Rahman', '8801700000001', 'mira@example.test', 'Dhaka', 'Dhanmondi', 'Demo address, Dhanmondi'),
  ('Nabil Karim', '8801700000002', 'nabil@example.test', 'Dhaka', 'Uttara', 'Demo address, Uttara'),
  ('Tania Sultana', '8801700000003', 'tania@example.test', 'Tangail', 'Tangail Sadar', 'Demo address, Tangail');

INSERT OR IGNORE INTO orders(order_code, customer_id, subtotal, delivery_fee, delivery_zone, payment_method, trx_id, status, payment_status, courier_status, admin_note)
SELECT 'VA-DEMO-1001', id, 1780, 90, 'dhaka', 'cod', NULL, 'delivered', 'paid', 'delivered', 'Fictional completed demo order'
FROM customers WHERE phone = '8801700000001';
INSERT OR IGNORE INTO orders(order_code, customer_id, subtotal, delivery_fee, delivery_zone, payment_method, trx_id, status, payment_status, courier_status, admin_note)
SELECT 'VA-DEMO-1002', id, 1210, 90, 'dhaka', 'bkash', 'DEMO-TRX-1002', 'processing', 'verified', 'in_transit', 'Fictional fulfilment demo order'
FROM customers WHERE phone = '8801700000002';
INSERT OR IGNORE INTO orders(order_code, customer_id, subtotal, delivery_fee, delivery_zone, payment_method, trx_id, status, payment_status, courier_status, admin_note)
SELECT 'VA-DEMO-1003', id, 520, 150, 'outside-dhaka', 'cod', NULL, 'pending', 'unpaid', 'not_booked', 'Fictional new order for workflow testing'
FROM customers WHERE phone = '8801700000003';

INSERT OR IGNORE INTO order_items(order_id, product_id, product_name, quantity, unit_price)
SELECT o.id, p.id, p.name, 2, 890 FROM orders o JOIN products p ON p.slug = 'lumen-dew-barrier-serum' WHERE o.order_code = 'VA-DEMO-1001';
INSERT OR IGNORE INTO order_items(order_id, product_id, product_name, quantity, unit_price)
SELECT o.id, p.id, p.name, 1, 760 FROM orders o JOIN products p ON p.slug = 'ritual-amber-body-oil' WHERE o.order_code = 'VA-DEMO-1002';
INSERT OR IGNORE INTO order_items(order_id, product_id, product_name, quantity, unit_price)
SELECT o.id, p.id, p.name, 1, 520 FROM orders o JOIN products p ON p.slug = 'afterglow-face-mist' WHERE o.order_code = 'VA-DEMO-1003';

INSERT OR IGNORE INTO order_status_history(order_id, from_status, to_status, reason)
SELECT id, NULL, 'pending', 'Demo seed' FROM orders WHERE order_code IN ('VA-DEMO-1001','VA-DEMO-1002','VA-DEMO-1003');
INSERT OR IGNORE INTO order_status_history(order_id, from_status, to_status, reason)
SELECT id, 'pending', 'confirmed', 'Demo seed' FROM orders WHERE order_code IN ('VA-DEMO-1001','VA-DEMO-1002');
INSERT OR IGNORE INTO order_status_history(order_id, from_status, to_status, reason)
SELECT id, 'confirmed', 'processing', 'Demo seed' FROM orders WHERE order_code = 'VA-DEMO-1002';
INSERT OR IGNORE INTO order_status_history(order_id, from_status, to_status, reason)
SELECT id, 'processing', 'delivered', 'Demo seed' FROM orders WHERE order_code = 'VA-DEMO-1001';
