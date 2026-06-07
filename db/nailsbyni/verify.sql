SELECT 'legacy_id_mappings' AS table_name, COUNT(*)::int AS rows FROM legacy_id_mappings
UNION ALL SELECT 'salons', COUNT(*)::int FROM salons
UNION ALL SELECT 'business_settings', COUNT(*)::int FROM business_settings
UNION ALL SELECT 'categories', COUNT(*)::int FROM categories
UNION ALL SELECT 'services', COUNT(*)::int FROM services
UNION ALL SELECT 'employees', COUNT(*)::int FROM employees
UNION ALL SELECT 'employee_services', COUNT(*)::int FROM employee_services
UNION ALL SELECT 'customers', COUNT(*)::int FROM customers
UNION ALL SELECT 'bookings', COUNT(*)::int FROM bookings
UNION ALL SELECT 'booking_services', COUNT(*)::int FROM booking_services
UNION ALL SELECT 'booking_assignments', COUNT(*)::int FROM booking_assignments
UNION ALL SELECT 'gallery_photos', COUNT(*)::int FROM gallery_photos
UNION ALL SELECT 'salon_booking_blocks', COUNT(*)::int FROM salon_booking_blocks
UNION ALL SELECT 'sms_logs', COUNT(*)::int FROM sms_logs
UNION ALL SELECT 'payments', COUNT(*)::int FROM payments
UNION ALL SELECT 'gift_cards', COUNT(*)::int FROM gift_cards
UNION ALL SELECT 'loyalty_accounts', COUNT(*)::int FROM loyalty_accounts;

\dt
