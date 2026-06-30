-- Seed data for Garage Finder Sri Lanka

-- 1. Insert Users
-- Default Admin (password: admin)
-- SHA-256 of 'admin': 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
INSERT INTO users (id, username, password, full_name, email, phone, role, is_active) 
VALUES (1, 'admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'System Administrator', 'admin@garagefinder.lk', '0771234567', 'ADMIN', true)
ON DUPLICATE KEY UPDATE username=username, full_name=VALUES(full_name);

-- Customer 1: Amal Perera (password: password123)
-- SHA-256 of 'password123': ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f
INSERT INTO users (id, username, password, full_name, email, phone, role, is_active) 
VALUES (2, 'amal', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Amal Perera', 'amal@gmail.com', '0711122334', 'CUSTOMER', true)
ON DUPLICATE KEY UPDATE username=username, full_name=VALUES(full_name);

-- Customer 2: Nimal Silva (password: password123)
INSERT INTO users (id, username, password, full_name, email, phone, role, is_active) 
VALUES (3, 'nimal', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Nimal Silva', 'nimal@gmail.com', '0722233445', 'CUSTOMER', true)
ON DUPLICATE KEY UPDATE username=username, full_name=VALUES(full_name);

-- Garage Owner 1: Colombo Hybrid Motors (password: password123)
INSERT INTO users (id, username, password, full_name, email, phone, role, is_active) 
VALUES (4, 'colombohybrid', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Colombo Hybrid Motors Owner', 'info@colombohybrid.lk', '0112233445', 'GARAGE_OWNER', true)
ON DUPLICATE KEY UPDATE username=username, full_name=VALUES(full_name);

-- Garage Owner 2: Kandy Auto Care (password: password123)
INSERT INTO users (id, username, password, full_name, email, phone, role, is_active) 
VALUES (5, 'kandycare', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Kandy Auto Care Owner', 'contact@kandycare.lk', '0812233445', 'GARAGE_OWNER', true)
ON DUPLICATE KEY UPDATE username=username, full_name=VALUES(full_name);

-- Garage Owner 3: Galle Tire Shop (password: password123)
INSERT INTO users (id, username, password, full_name, email, phone, role, is_active) 
VALUES (6, 'galletire', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Galle Tire Shop Owner', 'galletire@gmail.com', '0912233445', 'GARAGE_OWNER', true)
ON DUPLICATE KEY UPDATE username=username, full_name=VALUES(full_name);

-- Garage Owner 4: Lanka Diesel (password: password123) -- PENDING approval
INSERT INTO users (id, username, password, full_name, email, phone, role, is_active) 
VALUES (7, 'lankadiesel', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Lanka Diesel Owner', 'lankadiesel@gmail.com', '0777665544', 'GARAGE_OWNER', true)
ON DUPLICATE KEY UPDATE username=username, full_name=VALUES(full_name);


-- 2. Insert Customers
INSERT INTO customers (id, user_id, vehicle_no, vehicle_type, fuel_type)
VALUES (1, 2, 'WP CAD-4321', 'Toyota Prius (Hybrid)', 'Hybrid')
ON DUPLICATE KEY UPDATE vehicle_no=vehicle_no;

INSERT INTO customers (id, user_id, vehicle_no, vehicle_type, fuel_type)
VALUES (2, 3, 'CP LG-8899', 'Honda Vezel (Hybrid)', 'Hybrid')
ON DUPLICATE KEY UPDATE vehicle_no=vehicle_no;


-- 3. Insert Garages (with vehicle_types, engine_types, phone, email, and business_reg_no)
-- Garage 1: Colombo Hybrid Motors
INSERT INTO garages (id, user_id, garage_name, owner_name, description, address, city, district, status, latitude, longitude, vehicle_types, engine_types, phone, email, business_reg_no, open_time, close_time, open_days, open_today)
VALUES (1, 4, 'Colombo Hybrid Motors', 'Priyantha De Silva', 'Specialized hybrid vehicle maintenance, battery testing, scan reports, and general servicing for Toyota and Honda models.', '142, Baseline Road, Borella', 'Colombo 08', 'Colombo', 'APPROVED', 6.9242, 79.8732, 'Car,Van', 'Hybrid,Petrol', '0112233445', 'info@colombohybrid.lk', 'BR-10001', '08:00', '17:30', 'Monday - Saturday', true)
ON DUPLICATE KEY UPDATE vehicle_types='Car,Van', engine_types='Hybrid,Petrol', phone='0112233445', email='info@colombohybrid.lk', business_reg_no='BR-10001', open_time='08:00', close_time='17:30', open_days='Monday - Saturday', open_today=true;

-- Garage 2: Kandy Auto Care & Towing
INSERT INTO garages (id, user_id, garage_name, owner_name, description, address, city, district, status, latitude, longitude, vehicle_types, engine_types, phone, email, business_reg_no, open_time, close_time, open_days, open_today)
VALUES (2, 5, 'Kandy Auto Care & Towing', 'Ranjith Alwis', 'Full-service garage including engine diagnostics, AC repairs, breakdown support, and 24/7 towing services in the hill country.', '88, William Gopallawa Mawatha', 'Kandy', 'Kandy', 'APPROVED', 7.2842, 80.6234, 'Car,Van,Truck', 'Petrol,Diesel,Hybrid', '0812233445', 'contact@kandycare.lk', 'BR-10002', '07:30', '18:00', 'Monday - Friday', true)
ON DUPLICATE KEY UPDATE vehicle_types='Car,Van,Truck', engine_types='Petrol,Diesel,Hybrid', phone='0812233445', email='contact@kandycare.lk', business_reg_no='BR-10002', open_time='07:30', close_time='18:00', open_days='Monday - Friday', open_today=true;

-- Garage 3: Galle Tire & Wheel Alignment
INSERT INTO garages (id, user_id, garage_name, owner_name, description, address, city, district, status, latitude, longitude, vehicle_types, engine_types, phone, email, business_reg_no, open_time, close_time, open_days, open_today)
VALUES (3, 6, 'Galle Tire & Wheel Alignment', 'Mohamed Sajid', 'Authorised dealer for premium tires. Specializing in computerised wheel alignment, wheel balancing, and tire puncture repairs.', '210, Matara Road', 'Galle', 'Galle', 'APPROVED', 6.0367, 80.2222, 'Car,Bike,Van', 'Petrol,Diesel,EV,Hybrid', '0912233445', 'galletire@gmail.com', 'BR-10003', '08:00', '17:00', 'Daily', true)
ON DUPLICATE KEY UPDATE vehicle_types='Car,Bike,Van', engine_types='Petrol,Diesel,EV,Hybrid', phone='0912233445', email='galletire@gmail.com', business_reg_no='BR-10003', open_time='08:00', close_time='17:00', open_days='Daily', open_today=true;

-- Garage 4: Lanka Diesel Engineers (PENDING Admin approval)
INSERT INTO garages (id, user_id, garage_name, owner_name, description, address, city, district, status, latitude, longitude, vehicle_types, engine_types, phone, email, business_reg_no)
VALUES (4, 7, 'Lanka Diesel Engineers', 'Thusitha Perera', 'Expert repair and servicing for diesel injection pumps, turbochargers, and heavy engine overhauls.', '45, High Level Road, Maharagama', 'Maharagama', 'Colombo', 'PENDING', 6.8488, 79.9265, 'Van,Truck', 'Diesel', '0777665544', 'lankadiesel@gmail.com', 'BR-10004')
ON DUPLICATE KEY UPDATE vehicle_types='Van,Truck', engine_types='Diesel', phone='0777665544', email='lankadiesel@gmail.com', business_reg_no='BR-10004';


-- 4. Insert Offered Services
-- Colombo Hybrid Motors services
INSERT INTO offered_services (id, garage_id, service_type, price) VALUES (1, 1, 'General Service', 12500.00) ON DUPLICATE KEY UPDATE price=price;
INSERT INTO offered_services (id, garage_id, service_type, price) VALUES (2, 1, 'Engine Repair', 45000.00) ON DUPLICATE KEY UPDATE price=price;
INSERT INTO offered_services (id, garage_id, service_type, price) VALUES (3, 1, 'Electrical', 8500.00) ON DUPLICATE KEY UPDATE price=price;
INSERT INTO offered_services (id, garage_id, service_type, price) VALUES (4, 1, 'AC Repair', 15000.00) ON DUPLICATE KEY UPDATE price=price;

-- Kandy Auto Care & Towing services
INSERT INTO offered_services (id, garage_id, service_type, price) VALUES (5, 2, 'General Service', 9500.00) ON DUPLICATE KEY UPDATE price=price;
INSERT INTO offered_services (id, garage_id, service_type, price) VALUES (6, 2, 'Engine Repair', 35000.00) ON DUPLICATE KEY UPDATE price=price;
INSERT INTO offered_services (id, garage_id, service_type, price) VALUES (7, 2, 'Towing', 18000.00) ON DUPLICATE KEY UPDATE price=price;
INSERT INTO offered_services (id, garage_id, service_type, price) VALUES (8, 2, 'Electrical', 6000.00) ON DUPLICATE KEY UPDATE price=price;
INSERT INTO offered_services (id, garage_id, service_type, price) VALUES (11, 2, 'AC Repair', 12000.00) ON DUPLICATE KEY UPDATE price=price;

-- Galle Tire Shop services
INSERT INTO offered_services (id, garage_id, service_type, price) VALUES (9, 3, 'Tire/Wheel Alignment', 4500.00) ON DUPLICATE KEY UPDATE price=price;
INSERT INTO offered_services (id, garage_id, service_type, price) VALUES (10, 3, 'General Service', 8000.00) ON DUPLICATE KEY UPDATE price=price;
INSERT INTO offered_services (id, garage_id, service_type, price) VALUES (12, 3, 'Tinkering', 22000.00) ON DUPLICATE KEY UPDATE price=price;


-- 5. Insert Seed Bookings (COMPLETED — required for reviews to be possible)
INSERT INTO bookings (id, customer_id, garage_id, service_type, booking_date, status, price, notes, booking_code)
VALUES (1, 1, 1, 'General Service', '2026-04-10 09:00:00', 'COMPLETED', 12500.00, 'Full A/C service and oil change', 'GBK-000001')
ON DUPLICATE KEY UPDATE status=status, booking_code=VALUES(booking_code);

INSERT INTO bookings (id, customer_id, garage_id, service_type, booking_date, status, price, notes, booking_code)
VALUES (2, 2, 2, 'Towing', '2026-04-15 14:00:00', 'COMPLETED', 18000.00, 'Towing from Kandy to Colombo', 'GBK-000002')
ON DUPLICATE KEY UPDATE status=status, booking_code=VALUES(booking_code);

INSERT INTO bookings (id, customer_id, garage_id, service_type, booking_date, status, price, notes, booking_code)
VALUES (3, 1, 3, 'Tire/Wheel Alignment', '2026-05-01 10:00:00', 'COMPLETED', 4500.00, 'All four wheels', 'GBK-000003')
ON DUPLICATE KEY UPDATE status=status, booking_code=VALUES(booking_code);


-- 6. Insert Seed Reviews (linked to the completed bookings above)
INSERT INTO reviews (id, customer_id, garage_id, booking_id, star_rating, comment, created_at)
VALUES (1, 1, 1, 1, 5, 'Excellent hybrid service! The team was very professional and explained everything clearly. My Prius runs perfectly now.', '2026-04-11 11:00:00')
ON DUPLICATE KEY UPDATE star_rating=star_rating;

INSERT INTO reviews (id, customer_id, garage_id, booking_id, star_rating, comment, created_at)
VALUES (2, 2, 2, 2, 4, 'Good towing service, arrived within 30 minutes. Driver was very helpful. Slightly pricey but reliable.', '2026-04-16 09:30:00')
ON DUPLICATE KEY UPDATE star_rating=star_rating;

INSERT INTO reviews (id, customer_id, garage_id, booking_id, star_rating, comment, created_at)
VALUES (3, 1, 3, 3, 5, 'Best wheel alignment in Galle! Very precise computerised balancing. My car drives perfectly straight now.', '2026-05-02 10:00:00')
ON DUPLICATE KEY UPDATE star_rating=star_rating;


-- 7. Insert Spare Part Shop Owners (password: password123)
INSERT INTO users (id, username, password, full_name, email, phone, role, is_active) 
VALUES (8, 'colomboparts', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Colombo Auto Spares Owner', 'colomboparts@gmail.com', '0779988776', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE username=username, full_name=VALUES(full_name);

INSERT INTO users (id, username, password, full_name, email, phone, role, is_active) 
VALUES (9, 'kandyparts', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Kandy Parts Shop Owner', 'kandyparts@gmail.com', '0778877665', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE username=username, full_name=VALUES(full_name);


-- 8. Insert Spare Part Shops
INSERT INTO spare_part_shops (id, user_id, shop_name, owner_name, description, address, city, district, status, latitude, longitude, phone, email, business_reg_no, open_time, close_time, open_days, open_today)
VALUES (1, 8, 'Colombo Auto Spares', 'Sunil Jayawardena', 'All kinds of Japanese car spare parts, genuine body parts, engines, and accessories.', '50, Panchikawatta Road, Borella', 'Colombo', 'Colombo', 'APPROVED', 6.9298, 79.8665, '0112334455', 'colomboparts@gmail.com', 'BR-20001', '08:30', '18:00', 'Monday - Saturday', true)
ON DUPLICATE KEY UPDATE shop_name=shop_name, business_reg_no='BR-20001', open_time='08:30', close_time='18:00', open_days='Monday - Saturday', open_today=true;

INSERT INTO spare_part_shops (id, user_id, shop_name, owner_name, description, address, city, district, status, latitude, longitude, phone, email, business_reg_no, open_time, close_time, open_days, open_today)
VALUES (2, 9, 'Kandy Auto Spares', 'Nihal Kularatne', 'Retail and wholesale distributor of high quality automotive filters, brake pads, side mirrors, and electrical parts.', '12, Peradeniya Road', 'Kandy', 'Kandy', 'APPROVED', 7.2889, 80.6120, '0812334455', 'kandyparts@gmail.com', 'BR-20002', '09:00', '19:00', 'Daily', true)
ON DUPLICATE KEY UPDATE shop_name=shop_name, business_reg_no='BR-20002', open_time='09:00', close_time='19:00', open_days='Daily', open_today=true;


-- 9. Insert Spare Parts
INSERT INTO spare_parts (id, shop_id, part_name, vehicle_model, vehicle_year, price, quantity, status)
VALUES (1, 1, 'Brake Pad', 'Toyota Prius', 2015, 12000.00, 10, 'IN_STOCK')
ON DUPLICATE KEY UPDATE price=price;

INSERT INTO spare_parts (id, shop_id, part_name, vehicle_model, vehicle_year, price, quantity, status)
VALUES (2, 2, 'Brake Pad', 'Toyota Prius', 2015, 11500.00, 5, 'IN_STOCK')
ON DUPLICATE KEY UPDATE price=price;

INSERT INTO spare_parts (id, shop_id, part_name, vehicle_model, vehicle_year, price, quantity, status)
VALUES (3, 1, 'Alternator', 'Toyota Prius', 2015, 35000.00, 2, 'IN_STOCK')
ON DUPLICATE KEY UPDATE price=price;

INSERT INTO spare_parts (id, shop_id, part_name, vehicle_model, vehicle_year, price, quantity, status)
VALUES (4, 2, 'Alternator', 'Honda Vezel', 2016, 42000.00, 3, 'IN_STOCK')
ON DUPLICATE KEY UPDATE price=price;

INSERT INTO spare_parts (id, shop_id, part_name, vehicle_model, vehicle_year, price, quantity, status)
VALUES (5, 1, 'Side Mirror', 'Honda Vezel', 2016, 18000.00, 4, 'IN_STOCK')
ON DUPLICATE KEY UPDATE price=price;

INSERT INTO spare_parts (id, shop_id, part_name, vehicle_model, vehicle_year, price, quantity, status)
VALUES (6, 2, 'Side Mirror', 'Toyota Prius', 2015, 16500.00, 6, 'IN_STOCK')
ON DUPLICATE KEY UPDATE price=price;


-- 10. Insert Seed Breakdown Requests
-- Colombo requests
INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address, breakdown_code)
VALUES (1, 1, 'Engine overheating on Baseline Road', 'Colombo', 'COMPLETED', '0711122334', '2026-05-10 10:00:00', 6.9271, 79.8612, 'WP CAD-4321', 'Baseline Road, Colombo 08', 'EMB-000001')
ON DUPLICATE KEY UPDATE description=description, breakdown_code=VALUES(breakdown_code);

INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address, breakdown_code)
VALUES (2, 2, 'Flat tire near Galle Face', 'Colombo', 'COMPLETED', '0722233445', '2026-05-11 11:30:00', 6.9275, 79.8484, 'CP LG-8899', 'Galle Face Green, Colombo 03', 'EMB-000002')
ON DUPLICATE KEY UPDATE description=description, breakdown_code=VALUES(breakdown_code);

INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address, breakdown_code)
VALUES (3, 1, 'Brake failure near Town Hall', 'Colombo', 'ACCEPTED', '0711122334', '2026-06-01 08:15:00', 6.9182, 79.8631, 'WP CAD-4321', 'Town Hall, Colombo 07', 'EMB-000003')
ON DUPLICATE KEY UPDATE description=description, breakdown_code=VALUES(breakdown_code);

INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address, breakdown_code)
VALUES (4, 2, 'Battery dead in Bambalapitiya', 'Colombo', 'OPEN', '0722233445', '2026-06-09 14:00:00', 6.8972, 79.8597, 'CP LG-8899', 'Galle Road, Colombo 04', 'EMB-000004')
ON DUPLICATE KEY UPDATE description=description, breakdown_code=VALUES(breakdown_code);

INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address, breakdown_code)
VALUES (5, 1, 'Transmission slip near Kollupitiya', 'Colombo', 'OPEN', '0711122334', '2026-06-10 16:30:00', 6.9112, 79.8512, 'WP CAD-4321', 'R. A. De Mel Mawatha, Colombo 03', 'EMB-000005')
ON DUPLICATE KEY UPDATE description=description, breakdown_code=VALUES(breakdown_code);

-- Kandy requests
INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address, breakdown_code)
VALUES (6, 2, 'Clutch burn near Kandy Lake Round', 'Kandy', 'COMPLETED', '0722233445', '2026-05-15 09:00:00', 7.2911, 80.6418, 'CP LG-8899', 'Lake Round Road, Kandy', 'EMB-000006')
ON DUPLICATE KEY UPDATE description=description, breakdown_code=VALUES(breakdown_code);

INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address, breakdown_code)
VALUES (7, 1, 'Radiator leak in Peradeniya', 'Kandy', 'ACCEPTED', '0711122334', '2026-06-02 12:45:00', 7.2714, 80.5921, 'WP CAD-4321', 'Peradeniya, Kandy', 'EMB-000007')
ON DUPLICATE KEY UPDATE description=description, breakdown_code=VALUES(breakdown_code);

INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address, breakdown_code)
VALUES (8, 2, 'Suspension noise near Katugastota', 'Kandy', 'OPEN', '0722233445', '2026-06-10 18:00:00', 7.3211, 80.6288, 'CP LG-8899', 'Katugastota, Kandy', 'EMB-000008')
ON DUPLICATE KEY UPDATE description=description, breakdown_code=VALUES(breakdown_code);

-- Galle requests
INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address, breakdown_code)
VALUES (9, 1, 'Engine warning light near Galle Fort', 'Galle', 'COMPLETED', '0711122334', '2026-05-20 15:30:00', 6.0264, 80.2176, 'WP CAD-4321', 'Fort, Galle', 'EMB-000009')
ON DUPLICATE KEY UPDATE description=description, breakdown_code=VALUES(breakdown_code);

INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address, breakdown_code)
VALUES (10, 2, 'Puncture tire in Karapitiya', 'Galle', 'OPEN', '0722233445', '2026-06-08 10:15:00', 6.0622, 80.2234, 'CP LG-8899', 'Karapitiya, Galle', 'EMB-000010')
ON DUPLICATE KEY UPDATE description=description, breakdown_code=VALUES(breakdown_code);

-- Kurunegala requests
INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address, breakdown_code)
VALUES (11, 1, 'Alternator failure near Kurunegala Clock Tower', 'Kurunegala', 'COMPLETED', '0711122334', '2026-05-25 11:00:00', 7.4875, 80.3647, 'WP CAD-4321', 'Clock Tower Road, Kurunegala', 'EMB-000011')
ON DUPLICATE KEY UPDATE description=description, breakdown_code=VALUES(breakdown_code);


-- 11. Insert Seed Spare Part Bookings
INSERT INTO spare_part_bookings (id, customer_id, spare_part_id, quantity, total_price, status, booking_date, pickup_date, notes, booking_code)
VALUES (1, 1, 1, 2, 24000.00, 'PICKED_UP', '2026-06-10 09:00:00', '2026-06-11 10:00:00', 'Need genuine ones', 'SPB-000001')
ON DUPLICATE KEY UPDATE status=status, booking_code=VALUES(booking_code);

INSERT INTO spare_part_bookings (id, customer_id, spare_part_id, quantity, total_price, status, booking_date, pickup_date, notes, booking_code)
VALUES (2, 2, 3, 1, 35000.00, 'PICKED_UP', '2026-06-12 14:00:00', '2026-06-13 11:00:00', 'Please keep ready', 'SPB-000002')
ON DUPLICATE KEY UPDATE status=status, booking_code=VALUES(booking_code);

INSERT INTO spare_part_bookings (id, customer_id, spare_part_id, quantity, total_price, status, booking_date, pickup_date, notes, booking_code)
VALUES (3, 1, 5, 1, 18000.00, 'PICKED_UP', '2026-06-13 16:00:00', '2026-06-14 10:00:00', 'Left side mirror', 'SPB-000003')
ON DUPLICATE KEY UPDATE status=status, booking_code=VALUES(booking_code);

INSERT INTO spare_part_bookings (id, customer_id, spare_part_id, quantity, total_price, status, booking_date, notes, booking_code)
VALUES (4, 2, 1, 1, 12000.00, 'READY_FOR_PICKUP', '2026-06-14 11:00:00', 'Active booking', 'SPB-000004')
ON DUPLICATE KEY UPDATE status=status, booking_code=VALUES(booking_code);


-- 12. Insert Seed Notifications
INSERT INTO notifications (id, user_id, message, created_at, is_read)
VALUES (1, 1, 'New garage registration pending approval: Kandy Auto Care', NOW(), false)
ON DUPLICATE KEY UPDATE message=VALUES(message);

INSERT INTO notifications (id, user_id, message, created_at, is_read)
VALUES (2, 2, 'Your booking request at Colombo Hybrid Motors has been APPROVED. (Code: GBK-2026061901)', NOW(), false)
ON DUPLICATE KEY UPDATE message=VALUES(message);

INSERT INTO notifications (id, user_id, message, created_at, is_read)
VALUES (3, 2, 'Your reservation for Brake Pads is READY FOR PICKUP at Toyota Lanka Shop. (Code: SPB-2026061902)', NOW(), false)
ON DUPLICATE KEY UPDATE message=VALUES(message);

INSERT INTO notifications (id, user_id, message, created_at, is_read)
VALUES (4, 4, 'New booking request received for Colombo Hybrid Motors (Code: GBK-2026061901)', NOW(), false)
ON DUPLICATE KEY UPDATE message=VALUES(message);



