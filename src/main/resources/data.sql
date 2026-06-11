-- Seed data for Garage Finder Sri Lanka

-- 1. Insert Users
-- Default Admin (password: admin)
-- SHA-256 of 'admin': 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
INSERT INTO users (id, username, password, email, phone, role, is_active) 
VALUES (1, 'admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'admin@garagefinder.lk', '0771234567', 'ADMIN', true)
ON DUPLICATE KEY UPDATE username=username;

-- Customer 1: Amal Perera (password: password123)
-- SHA-256 of 'password123': ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f
INSERT INTO users (id, username, password, email, phone, role, is_active) 
VALUES (2, 'amal', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'amal@gmail.com', '0711122334', 'CUSTOMER', true)
ON DUPLICATE KEY UPDATE username=username;

-- Customer 2: Nimal Silva (password: password123)
INSERT INTO users (id, username, password, email, phone, role, is_active) 
VALUES (3, 'nimal', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'nimal@gmail.com', '0722233445', 'CUSTOMER', true)
ON DUPLICATE KEY UPDATE username=username;

-- Garage Owner 1: Colombo Hybrid Motors (password: password123)
INSERT INTO users (id, username, password, email, phone, role, is_active) 
VALUES (4, 'colombohybrid', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'info@colombohybrid.lk', '0112233445', 'GARAGE_OWNER', true)
ON DUPLICATE KEY UPDATE username=username;

-- Garage Owner 2: Kandy Auto Care (password: password123)
INSERT INTO users (id, username, password, email, phone, role, is_active) 
VALUES (5, 'kandycare', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'contact@kandycare.lk', '0812233445', 'GARAGE_OWNER', true)
ON DUPLICATE KEY UPDATE username=username;

-- Garage Owner 3: Galle Tire Shop (password: password123)
INSERT INTO users (id, username, password, email, phone, role, is_active) 
VALUES (6, 'galletire', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'galletire@gmail.com', '0912233445', 'GARAGE_OWNER', true)
ON DUPLICATE KEY UPDATE username=username;

-- Garage Owner 4: Lanka Diesel (password: password123) -- PENDING approval
INSERT INTO users (id, username, password, email, phone, role, is_active) 
VALUES (7, 'lankadiesel', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'lankadiesel@gmail.com', '0777665544', 'GARAGE_OWNER', true)
ON DUPLICATE KEY UPDATE username=username;


-- 2. Insert Customers
INSERT INTO customers (id, user_id, vehicle_no, vehicle_type, fuel_type)
VALUES (1, 2, 'WP CAD-4321', 'Toyota Prius (Hybrid)', 'Hybrid')
ON DUPLICATE KEY UPDATE vehicle_no=vehicle_no;

INSERT INTO customers (id, user_id, vehicle_no, vehicle_type, fuel_type)
VALUES (2, 3, 'CP LG-8899', 'Honda Vezel (Hybrid)', 'Hybrid')
ON DUPLICATE KEY UPDATE vehicle_no=vehicle_no;


-- 3. Insert Garages (with vehicle_types and engine_types)
-- Garage 1: Colombo Hybrid Motors
INSERT INTO garages (id, user_id, garage_name, owner_name, description, address, city, district, status, latitude, longitude, vehicle_types, engine_types)
VALUES (1, 4, 'Colombo Hybrid Motors', 'Priyantha De Silva', 'Specialized hybrid vehicle maintenance, battery testing, scan reports, and general servicing for Toyota and Honda models.', '142, Baseline Road, Borella', 'Colombo 08', 'Colombo', 'APPROVED', 6.9242, 79.8732, 'Car,Van', 'Hybrid,Petrol')
ON DUPLICATE KEY UPDATE vehicle_types='Car,Van', engine_types='Hybrid,Petrol';

-- Garage 2: Kandy Auto Care & Towing
INSERT INTO garages (id, user_id, garage_name, owner_name, description, address, city, district, status, latitude, longitude, vehicle_types, engine_types)
VALUES (2, 5, 'Kandy Auto Care & Towing', 'Ranjith Alwis', 'Full-service garage including engine diagnostics, AC repairs, breakdown support, and 24/7 towing services in the hill country.', '88, William Gopallawa Mawatha', 'Kandy', 'Kandy', 'APPROVED', 7.2842, 80.6234, 'Car,Van,Truck', 'Petrol,Diesel,Hybrid')
ON DUPLICATE KEY UPDATE vehicle_types='Car,Van,Truck', engine_types='Petrol,Diesel,Hybrid';

-- Garage 3: Galle Tire & Wheel Alignment
INSERT INTO garages (id, user_id, garage_name, owner_name, description, address, city, district, status, latitude, longitude, vehicle_types, engine_types)
VALUES (3, 6, 'Galle Tire & Wheel Alignment', 'Mohamed Sajid', 'Authorised dealer for premium tires. Specializing in computerised wheel alignment, wheel balancing, and tire puncture repairs.', '210, Matara Road', 'Galle', 'Galle', 'APPROVED', 6.0367, 80.2222, 'Car,Bike,Van', 'Petrol,Diesel,EV,Hybrid')
ON DUPLICATE KEY UPDATE vehicle_types='Car,Bike,Van', engine_types='Petrol,Diesel,EV,Hybrid';

-- Garage 4: Lanka Diesel Engineers (PENDING Admin approval)
INSERT INTO garages (id, user_id, garage_name, owner_name, description, address, city, district, status, latitude, longitude, vehicle_types, engine_types)
VALUES (4, 7, 'Lanka Diesel Engineers', 'Thusitha Perera', 'Expert repair and servicing for diesel injection pumps, turbochargers, and heavy engine overhauls.', '45, High Level Road, Maharagama', 'Maharagama', 'Colombo', 'PENDING', 6.8488, 79.9265, 'Van,Truck', 'Diesel')
ON DUPLICATE KEY UPDATE vehicle_types='Van,Truck', engine_types='Diesel';


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
INSERT INTO bookings (id, customer_id, garage_id, service_type, booking_date, status, price, notes)
VALUES (1, 1, 1, 'General Service', '2026-04-10 09:00:00', 'COMPLETED', 12500.00, 'Full A/C service and oil change')
ON DUPLICATE KEY UPDATE status=status;

INSERT INTO bookings (id, customer_id, garage_id, service_type, booking_date, status, price, notes)
VALUES (2, 2, 2, 'Towing', '2026-04-15 14:00:00', 'COMPLETED', 18000.00, 'Towing from Kandy to Colombo')
ON DUPLICATE KEY UPDATE status=status;

INSERT INTO bookings (id, customer_id, garage_id, service_type, booking_date, status, price, notes)
VALUES (3, 1, 3, 'Tire/Wheel Alignment', '2026-05-01 10:00:00', 'COMPLETED', 4500.00, 'All four wheels')
ON DUPLICATE KEY UPDATE status=status;


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
INSERT INTO users (id, username, password, email, phone, role, is_active) 
VALUES (8, 'colomboparts', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'colomboparts@gmail.com', '0779988776', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE username=username;

INSERT INTO users (id, username, password, email, phone, role, is_active) 
VALUES (9, 'kandyparts', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'kandyparts@gmail.com', '0778877665', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE username=username;


-- 8. Insert Spare Part Shops
INSERT INTO spare_part_shops (id, user_id, shop_name, owner_name, description, address, city, district, status, latitude, longitude, phone, email)
VALUES (1, 8, 'Colombo Auto Spares', 'Sunil Jayawardena', 'All kinds of Japanese car spare parts, genuine body parts, engines, and accessories.', '50, Panchikawatta Road, Borella', 'Colombo', 'Colombo', 'APPROVED', 6.9298, 79.8665, '0112334455', 'colomboparts@gmail.com')
ON DUPLICATE KEY UPDATE shop_name=shop_name;

INSERT INTO spare_part_shops (id, user_id, shop_name, owner_name, description, address, city, district, status, latitude, longitude, phone, email)
VALUES (2, 9, 'Kandy Auto Spares', 'Nihal Kularatne', 'Retail and wholesale distributor of high quality automotive filters, brake pads, side mirrors, and electrical parts.', '12, Peradeniya Road', 'Kandy', 'Kandy', 'APPROVED', 7.2889, 80.6120, '0812334455', 'kandyparts@gmail.com')
ON DUPLICATE KEY UPDATE shop_name=shop_name;


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
INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address)
VALUES (1, 1, 'Engine overheating on Baseline Road', 'Colombo', 'COMPLETED', '0711122334', '2026-05-10 10:00:00', 6.9271, 79.8612, 'WP CAD-4321', 'Baseline Road, Colombo 08')
ON DUPLICATE KEY UPDATE description=description;

INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address)
VALUES (2, 2, 'Flat tire near Galle Face', 'Colombo', 'COMPLETED', '0722233445', '2026-05-11 11:30:00', 6.9275, 79.8484, 'CP LG-8899', 'Galle Face Green, Colombo 03')
ON DUPLICATE KEY UPDATE description=description;

INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address)
VALUES (3, 1, 'Brake failure near Town Hall', 'Colombo', 'ACCEPTED', '0711122334', '2026-06-01 08:15:00', 6.9182, 79.8631, 'WP CAD-4321', 'Town Hall, Colombo 07')
ON DUPLICATE KEY UPDATE description=description;

INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address)
VALUES (4, 2, 'Battery dead in Bambalapitiya', 'Colombo', 'OPEN', '0722233445', '2026-06-09 14:00:00', 6.8972, 79.8597, 'CP LG-8899', 'Galle Road, Colombo 04')
ON DUPLICATE KEY UPDATE description=description;

INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address)
VALUES (5, 1, 'Transmission slip near Kollupitiya', 'Colombo', 'OPEN', '0711122334', '2026-06-10 16:30:00', 6.9112, 79.8512, 'WP CAD-4321', 'R. A. De Mel Mawatha, Colombo 03')
ON DUPLICATE KEY UPDATE description=description;

-- Kandy requests
INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address)
VALUES (6, 2, 'Clutch burn near Kandy Lake Round', 'Kandy', 'COMPLETED', '0722233445', '2026-05-15 09:00:00', 7.2911, 80.6418, 'CP LG-8899', 'Lake Round Road, Kandy')
ON DUPLICATE KEY UPDATE description=description;

INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address)
VALUES (7, 1, 'Radiator leak in Peradeniya', 'Kandy', 'ACCEPTED', '0711122334', '2026-06-02 12:45:00', 7.2714, 80.5921, 'WP CAD-4321', 'Peradeniya, Kandy')
ON DUPLICATE KEY UPDATE description=description;

INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address)
VALUES (8, 2, 'Suspension noise near Katugastota', 'Kandy', 'OPEN', '0722233445', '2026-06-10 18:00:00', 7.3211, 80.6288, 'CP LG-8899', 'Katugastota, Kandy')
ON DUPLICATE KEY UPDATE description=description;

-- Galle requests
INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address)
VALUES (9, 1, 'Engine warning light near Galle Fort', 'Galle', 'COMPLETED', '0711122334', '2026-05-20 15:30:00', 6.0264, 80.2176, 'WP CAD-4321', 'Fort, Galle')
ON DUPLICATE KEY UPDATE description=description;

INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address)
VALUES (10, 2, 'Puncture tire in Karapitiya', 'Galle', 'OPEN', '0722233445', '2026-06-08 10:15:00', 6.0622, 80.2234, 'CP LG-8899', 'Karapitiya, Galle')
ON DUPLICATE KEY UPDATE description=description;

-- Kurunegala requests
INSERT INTO breakdown_requests (id, customer_id, description, location_city, status, contact_phone, created_time, latitude, longitude, vehicle_no, address)
VALUES (11, 1, 'Alternator failure near Kurunegala Clock Tower', 'Kurunegala', 'COMPLETED', '0711122334', '2026-05-25 11:00:00', 7.4875, 80.3647, 'WP CAD-4321', 'Clock Tower Road, Kurunegala')
ON DUPLICATE KEY UPDATE description=description;

