-- Seed data for Garage Finder Sri Lanka

-- Reorder table columns to match ERD diagram layout exactly (without username column and without customers table)
ALTER TABLE users MODIFY COLUMN id bigint NOT NULL AUTO_INCREMENT FIRST;
ALTER TABLE users MODIFY COLUMN email varchar(255) NOT NULL AFTER id;
ALTER TABLE users MODIFY COLUMN is_active bit(1) NOT NULL AFTER email;
ALTER TABLE users MODIFY COLUMN password varchar(255) NOT NULL AFTER is_active;
ALTER TABLE users MODIFY COLUMN phone varchar(255) NULL AFTER password;
ALTER TABLE users MODIFY COLUMN role varchar(255) NOT NULL AFTER phone;
ALTER TABLE users MODIFY COLUMN full_name varchar(255) NULL AFTER role;

ALTER TABLE garages MODIFY COLUMN id bigint NOT NULL AUTO_INCREMENT FIRST;
ALTER TABLE garages MODIFY COLUMN address varchar(255) NOT NULL AFTER id;
ALTER TABLE garages MODIFY COLUMN city varchar(255) NOT NULL AFTER address;
ALTER TABLE garages MODIFY COLUMN description text NULL AFTER city;
ALTER TABLE garages MODIFY COLUMN district varchar(255) NOT NULL AFTER description;
ALTER TABLE garages MODIFY COLUMN engine_types varchar(255) NULL AFTER district;
ALTER TABLE garages MODIFY COLUMN garage_name varchar(255) NOT NULL AFTER engine_types;
ALTER TABLE garages MODIFY COLUMN latitude double NULL AFTER garage_name;
ALTER TABLE garages MODIFY COLUMN longitude double NULL AFTER latitude;
ALTER TABLE garages MODIFY COLUMN owner_name varchar(255) NOT NULL AFTER longitude;
ALTER TABLE garages MODIFY COLUMN status varchar(255) NOT NULL AFTER owner_name;
ALTER TABLE garages MODIFY COLUMN vehicle_types varchar(255) NULL AFTER status;
ALTER TABLE garages MODIFY COLUMN user_id bigint NOT NULL AFTER vehicle_types;
ALTER TABLE garages MODIFY COLUMN email varchar(255) NULL AFTER user_id;
ALTER TABLE garages MODIFY COLUMN image_url varchar(255) NULL AFTER email;
ALTER TABLE garages MODIFY COLUMN phone varchar(255) NULL AFTER image_url;
ALTER TABLE garages MODIFY COLUMN close_time varchar(255) NULL AFTER phone;
ALTER TABLE garages MODIFY COLUMN open_days varchar(255) NULL AFTER close_time;
ALTER TABLE garages MODIFY COLUMN open_time varchar(255) NULL AFTER open_days;
ALTER TABLE garages MODIFY COLUMN open_today bit(1) NULL AFTER open_time;
ALTER TABLE garages MODIFY COLUMN business_reg_no varchar(255) NULL AFTER open_today;

ALTER TABLE spare_part_shops MODIFY COLUMN id bigint NOT NULL AUTO_INCREMENT FIRST;
ALTER TABLE spare_part_shops MODIFY COLUMN address varchar(255) NOT NULL AFTER id;
ALTER TABLE spare_part_shops MODIFY COLUMN city varchar(255) NOT NULL AFTER address;
ALTER TABLE spare_part_shops MODIFY COLUMN description text NULL AFTER city;
ALTER TABLE spare_part_shops MODIFY COLUMN district varchar(255) NOT NULL AFTER description;
ALTER TABLE spare_part_shops MODIFY COLUMN email varchar(255) NULL AFTER district;
ALTER TABLE spare_part_shops MODIFY COLUMN image_url varchar(255) NULL AFTER email;
ALTER TABLE spare_part_shops MODIFY COLUMN latitude double NULL AFTER image_url;
ALTER TABLE spare_part_shops MODIFY COLUMN longitude double NULL AFTER latitude;
ALTER TABLE spare_part_shops MODIFY COLUMN owner_name varchar(255) NOT NULL AFTER longitude;
ALTER TABLE spare_part_shops MODIFY COLUMN phone varchar(255) NULL AFTER owner_name;
ALTER TABLE spare_part_shops MODIFY COLUMN shop_name varchar(255) NOT NULL AFTER phone;
ALTER TABLE spare_part_shops MODIFY COLUMN status varchar(255) NOT NULL AFTER shop_name;
ALTER TABLE spare_part_shops MODIFY COLUMN user_id bigint NOT NULL AFTER status;
ALTER TABLE spare_part_shops MODIFY COLUMN close_time varchar(255) NULL AFTER user_id;
ALTER TABLE spare_part_shops MODIFY COLUMN open_days varchar(255) NULL AFTER close_time;
ALTER TABLE spare_part_shops MODIFY COLUMN open_time varchar(255) NULL AFTER open_days;
ALTER TABLE spare_part_shops MODIFY COLUMN open_today bit(1) NULL AFTER open_time;
ALTER TABLE spare_part_shops MODIFY COLUMN business_reg_no varchar(255) NULL AFTER open_today;

ALTER TABLE spare_parts MODIFY COLUMN id bigint NOT NULL AUTO_INCREMENT FIRST;
ALTER TABLE spare_parts MODIFY COLUMN part_name varchar(255) NOT NULL AFTER id;
ALTER TABLE spare_parts MODIFY COLUMN price double NOT NULL AFTER part_name;
ALTER TABLE spare_parts MODIFY COLUMN quantity int NOT NULL AFTER price;
ALTER TABLE spare_parts MODIFY COLUMN status varchar(255) NOT NULL AFTER quantity;
ALTER TABLE spare_parts MODIFY COLUMN vehicle_model varchar(255) NOT NULL AFTER status;
ALTER TABLE spare_parts MODIFY COLUMN vehicle_year int NOT NULL AFTER vehicle_model;
ALTER TABLE spare_parts MODIFY COLUMN shop_id bigint NOT NULL AFTER vehicle_year;
ALTER TABLE spare_parts MODIFY COLUMN image_url varchar(255) NULL AFTER shop_id;

ALTER TABLE mechanics MODIFY COLUMN id bigint NOT NULL AUTO_INCREMENT FIRST;
ALTER TABLE mechanics MODIFY COLUMN name varchar(255) NOT NULL AFTER id;
ALTER TABLE mechanics MODIFY COLUMN phone varchar(255) NOT NULL AFTER name;
ALTER TABLE mechanics MODIFY COLUMN specialization varchar(255) NULL AFTER phone;
ALTER TABLE mechanics MODIFY COLUMN status varchar(255) NOT NULL AFTER specialization;
ALTER TABLE mechanics MODIFY COLUMN garage_id bigint NOT NULL AFTER status;
ALTER TABLE mechanics MODIFY COLUMN active bit(1) NOT NULL AFTER garage_id;

ALTER TABLE offered_services MODIFY COLUMN id bigint NOT NULL AUTO_INCREMENT FIRST;
ALTER TABLE offered_services MODIFY COLUMN price double NOT NULL AFTER id;
ALTER TABLE offered_services MODIFY COLUMN service_type varchar(255) NOT NULL AFTER price;
ALTER TABLE offered_services MODIFY COLUMN garage_id bigint NOT NULL AFTER service_type;
ALTER TABLE offered_services MODIFY COLUMN description varchar(500) NULL AFTER garage_id;

ALTER TABLE notifications MODIFY COLUMN id bigint NOT NULL AUTO_INCREMENT FIRST;
ALTER TABLE notifications MODIFY COLUMN created_at datetime(6) NOT NULL AFTER id;
ALTER TABLE notifications MODIFY COLUMN is_read bit(1) NOT NULL AFTER created_at;
ALTER TABLE notifications MODIFY COLUMN message varchar(500) NOT NULL AFTER is_read;
ALTER TABLE notifications MODIFY COLUMN user_id bigint NOT NULL AFTER message;

ALTER TABLE breakdown_requests MODIFY COLUMN id bigint NOT NULL AUTO_INCREMENT FIRST;
ALTER TABLE breakdown_requests MODIFY COLUMN contact_phone varchar(255) NOT NULL AFTER id;
ALTER TABLE breakdown_requests MODIFY COLUMN created_time datetime(6) NOT NULL AFTER contact_phone;
ALTER TABLE breakdown_requests MODIFY COLUMN description text NOT NULL AFTER created_time;
ALTER TABLE breakdown_requests MODIFY COLUMN latitude double NULL AFTER description;
ALTER TABLE breakdown_requests MODIFY COLUMN location_city varchar(255) NOT NULL AFTER latitude;
ALTER TABLE breakdown_requests MODIFY COLUMN longitude double NULL AFTER location_city;
ALTER TABLE breakdown_requests MODIFY COLUMN status varchar(255) NOT NULL AFTER longitude;
ALTER TABLE breakdown_requests MODIFY COLUMN assigned_garage_id bigint NULL AFTER status;
ALTER TABLE breakdown_requests MODIFY COLUMN assigned_mechanic_id bigint NULL AFTER assigned_garage_id;
ALTER TABLE breakdown_requests MODIFY COLUMN customer_id bigint NOT NULL AFTER assigned_mechanic_id;
ALTER TABLE breakdown_requests MODIFY COLUMN address varchar(255) NULL AFTER customer_id;
ALTER TABLE breakdown_requests MODIFY COLUMN vehicle_no varchar(255) NULL AFTER address;
ALTER TABLE breakdown_requests MODIFY COLUMN cancellation_reason varchar(255) NULL AFTER vehicle_no;
ALTER TABLE breakdown_requests MODIFY COLUMN breakdown_code varchar(20) NULL AFTER cancellation_reason;

ALTER TABLE bookings MODIFY COLUMN id bigint NOT NULL AUTO_INCREMENT FIRST;
ALTER TABLE bookings MODIFY COLUMN booking_date datetime(6) NOT NULL AFTER id;
ALTER TABLE bookings MODIFY COLUMN notes text NULL AFTER booking_date;
ALTER TABLE bookings MODIFY COLUMN price double NULL AFTER notes;
ALTER TABLE bookings MODIFY COLUMN service_type varchar(255) NOT NULL AFTER price;
ALTER TABLE bookings MODIFY COLUMN status varchar(255) NOT NULL AFTER service_type;
ALTER TABLE bookings MODIFY COLUMN customer_id bigint NOT NULL AFTER status;
ALTER TABLE bookings MODIFY COLUMN garage_id bigint NOT NULL AFTER customer_id;
ALTER TABLE bookings MODIFY COLUMN description text NULL AFTER garage_id;
ALTER TABLE bookings MODIFY COLUMN time_slot varchar(255) NULL AFTER description;
ALTER TABLE bookings MODIFY COLUMN total_price double NULL AFTER time_slot;
ALTER TABLE bookings MODIFY COLUMN vehicle_no varchar(255) NULL AFTER total_price;
ALTER TABLE bookings MODIFY COLUMN vehicle_type varchar(255) NULL AFTER vehicle_no;
ALTER TABLE bookings MODIFY COLUMN cancellation_reason varchar(255) NULL AFTER vehicle_type;
ALTER TABLE bookings MODIFY COLUMN booking_code varchar(20) NULL AFTER cancellation_reason;

ALTER TABLE reviews MODIFY COLUMN id bigint NOT NULL AUTO_INCREMENT FIRST;
ALTER TABLE reviews MODIFY COLUMN comment text NULL AFTER id;
ALTER TABLE reviews MODIFY COLUMN created_at datetime(6) NOT NULL AFTER comment;
ALTER TABLE reviews MODIFY COLUMN star_rating int NOT NULL AFTER created_at;
ALTER TABLE reviews MODIFY COLUMN booking_id bigint NULL AFTER star_rating;
ALTER TABLE reviews MODIFY COLUMN customer_id bigint NOT NULL AFTER booking_id;
ALTER TABLE reviews MODIFY COLUMN garage_id bigint NOT NULL AFTER customer_id;
ALTER TABLE reviews MODIFY COLUMN breakdown_request_id bigint NULL AFTER garage_id;

ALTER TABLE shop_reviews MODIFY COLUMN id bigint NOT NULL AUTO_INCREMENT FIRST;
ALTER TABLE shop_reviews MODIFY COLUMN comment text NULL AFTER id;
ALTER TABLE shop_reviews MODIFY COLUMN created_at datetime(6) NOT NULL AFTER comment;
ALTER TABLE shop_reviews MODIFY COLUMN star_rating int NOT NULL AFTER created_at;
ALTER TABLE shop_reviews MODIFY COLUMN customer_id bigint NOT NULL AFTER star_rating;
ALTER TABLE shop_reviews MODIFY COLUMN shop_id bigint NOT NULL AFTER customer_id;
ALTER TABLE shop_reviews MODIFY COLUMN spare_part_booking_id bigint NOT NULL AFTER shop_id;

ALTER TABLE spare_part_bookings MODIFY COLUMN id bigint NOT NULL AUTO_INCREMENT FIRST;
ALTER TABLE spare_part_bookings MODIFY COLUMN booking_date datetime(6) NOT NULL AFTER id;
ALTER TABLE spare_part_bookings MODIFY COLUMN notes text NULL AFTER booking_date;
ALTER TABLE spare_part_bookings MODIFY COLUMN pickup_date datetime(6) NULL AFTER notes;
ALTER TABLE spare_part_bookings MODIFY COLUMN quantity int NOT NULL AFTER pickup_date;
ALTER TABLE spare_part_bookings MODIFY COLUMN status varchar(255) NOT NULL AFTER quantity;
ALTER TABLE spare_part_bookings MODIFY COLUMN total_price double NOT NULL AFTER status;
ALTER TABLE spare_part_bookings MODIFY COLUMN customer_id bigint NOT NULL AFTER total_price;
ALTER TABLE spare_part_bookings MODIFY COLUMN spare_part_id bigint NOT NULL AFTER customer_id;
ALTER TABLE spare_part_bookings MODIFY COLUMN cancellation_reason varchar(255) NULL AFTER spare_part_id;
ALTER TABLE spare_part_bookings MODIFY COLUMN booking_code varchar(20) NULL AFTER cancellation_reason;

-- 1. Insert Users
-- Default Admin (password: admin)
-- SHA-256 of 'admin': 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
INSERT INTO users (id, password, full_name, email, phone, role, is_active) 
VALUES (1, '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'System Administrator', 'admin@garagefinder.lk', '0771234567', 'ADMIN', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- Customer 1: Amal Perera (password: password123)
-- SHA-256 of 'password123': ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f
INSERT INTO users (id, password, full_name, email, phone, role, is_active) 
VALUES (2, 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Amal Perera', 'amal@gmail.com', '0711122334', 'CUSTOMER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- Customer 2: Nimal Silva (password: password123)
INSERT INTO users (id, password, full_name, email, phone, role, is_active) 
VALUES (3, 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Nimal Silva', 'nimal@gmail.com', '0722233445', 'CUSTOMER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- Garage Owner 1: Colombo Hybrid Motors (password: password123)
INSERT INTO users (id, password, full_name, email, phone, role, is_active) 
VALUES (4, 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Colombo Hybrid Motors Owner', 'info@colombohybrid.lk', '0112233445', 'GARAGE_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- Garage Owner 2: Kandy Auto Care (password: password123)
INSERT INTO users (id, password, full_name, email, phone, role, is_active) 
VALUES (5, 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Kandy Auto Care Owner', 'contact@kandycare.lk', '0812233445', 'GARAGE_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- Garage Owner 3: Galle Tire Shop (password: password123)
INSERT INTO users (id, password, full_name, email, phone, role, is_active) 
VALUES (6, 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Galle Tire Shop Owner', 'galletire@gmail.com', '0912233445', 'GARAGE_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- Garage Owner 4: Lanka Diesel (password: password123) -- PENDING approval
INSERT INTO users (id, password, full_name, email, phone, role, is_active) 
VALUES (7, 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Lanka Diesel Owner', 'lankadiesel@gmail.com', '0777665544', 'GARAGE_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);


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
INSERT INTO users (id, password, full_name, email, phone, role, is_active) 
VALUES (8, 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Colombo Auto Spares Owner', 'colomboparts@gmail.com', '0779988776', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO users (id, password, full_name, email, phone, role, is_active) 
VALUES (9, 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Kandy Parts Shop Owner', 'kandyparts@gmail.com', '0778877665', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);


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



-- 14. Additional District Spare Part Shop Owners & Shops (password for all: Hiru@123)
-- SHA-256 of 'Hiru@123': c6f088a96adf3c517714ca2fe58448aa7e82a8afd03d5b4c5ef63e91d2d49903
INSERT INTO users (email, password, full_name, phone, role, is_active)
VALUES ('kurunegalaspare@gmail.com', 'c6f088a96adf3c517714ca2fe58448aa7e82a8afd03d5b4c5ef63e91d2d49903', 'Kurunegala Royal Auto Parts Owner', '0372299888', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO users (email, password, full_name, phone, role, is_active)
VALUES ('monaragalaspar@gmail.com', 'c6f088a96adf3c517714ca2fe58448aa7e82a8afd03d5b4c5ef63e91d2d49903', 'Monaragala Express Auto Spares Owner', '0552299777', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO users (email, password, full_name, phone, role, is_active)
VALUES ('kalutaraspare@gmail.com', 'c6f088a96adf3c517714ca2fe58448aa7e82a8afd03d5b4c5ef63e91d2d49903', 'Kalutara Coastal Auto Spares Owner', '0342299666', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO users (email, password, full_name, phone, role, is_active)
VALUES ('kandyspare@gmail.com', 'c6f088a96adf3c517714ca2fe58448aa7e82a8afd03d5b4c5ef63e91d2d49903', 'Kandy Hill Country Auto Spares Owner', '0812299555', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO users (email, password, full_name, phone, role, is_active)
VALUES ('matalespare@gmail.com', 'c6f088a96adf3c517714ca2fe58448aa7e82a8afd03d5b4c5ef63e91d2d49903', 'Matale Apex Spare Parts Owner', '0662299444', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO users (email, password, full_name, phone, role, is_active)
VALUES ('nuwaraeliyaspare@gmail.com', 'c6f088a96adf3c517714ca2fe58448aa7e82a8afd03d5b4c5ef63e91d2d49903', 'Nuwara Eliya Highland Auto Spares Owner', '0522299333', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO users (email, password, full_name, phone, role, is_active)
VALUES ('gallespare@gmail.com', 'c6f088a96adf3c517714ca2fe58448aa7e82a8afd03d5b4c5ef63e91d2d49903', 'Galle Fort Auto Spares Owner', '0912299222', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO users (email, password, full_name, phone, role, is_active)
VALUES ('mataraspare@gmail.com', 'c6f088a96adf3c517714ca2fe58448aa7e82a8afd03d5b4c5ef63e91d2d49903', 'Matara Southern Auto Spares Owner', '0412299111', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO users (email, password, full_name, phone, role, is_active)
VALUES ('hambantotaspare@gmail.com', 'c6f088a96adf3c517714ca2fe58448aa7e82a8afd03d5b4c5ef63e91d2d49903', 'Hambantota Port Auto Spares Owner', '0472299000', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO users (email, password, full_name, phone, role, is_active)
VALUES ('jaffnaspare@gmail.com', 'c6f088a96adf3c517714ca2fe58448aa7e82a8afd03d5b4c5ef63e91d2d49903', 'Jaffna Northern Auto Spares Owner', '0212299111', 'SHOP_OWNER', true)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);


-- 15. Additional Seed Mechanics for 10 District Garages (2 Mechanics per garage)
INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (101, 'Saman Kumara', '0771122334', 'Engine & Hybrid Specialist', 'AVAILABLE', true);
INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (101, 'Kamal Fernando', '0772233445', 'Electrical & AC Repairs', 'AVAILABLE', true);

INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (102, 'Nimal Rathnayake', '0773344556', 'Emergency Breakdown & Towing', 'AVAILABLE', true);
INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (102, 'Bandula Weerasinghe', '0774455667', 'Suspension & Mechanical', 'AVAILABLE', true);

INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (103, 'Roshan Perera', '0775566778', 'Wheel Alignment & Suspension', 'AVAILABLE', true);
INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (103, 'Dinesha Cooray', '0776677889', 'European Engine Repairs', 'AVAILABLE', true);

INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (104, 'Upali Herath', '0777788990', 'Clutch & 4x4 Transmission', 'AVAILABLE', true);
INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (104, 'Nuwan Liyanage', '0778899001', 'Brake Overhaul & Tuning', 'AVAILABLE', true);

INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (105, 'Kasun Jayawardena', '0779900112', 'OBD-II Computer Diagnostics', 'AVAILABLE', true);
INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (105, 'Ruwan Silva', '0711122334', 'Tinkering & Body Painting', 'AVAILABLE', true);

INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (106, 'Selvam Kumar', '0712233445', 'Mountain Towing & Rescue', 'AVAILABLE', true);
INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (106, 'Pradeep Ranasinghe', '0713344556', 'Coolant & Engine Maintenance', 'AVAILABLE', true);

INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (107, 'Janaka Wickramasinghe', '0714455667', 'Hybrid Scan & Battery Testing', 'AVAILABLE', true);
INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (107, 'Tharindu De Silva', '0715566778', 'General Service & Lubes', 'AVAILABLE', true);

INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (108, 'Indika Abeyratne', '0716677889', 'AC Flushing & Gas Refill', 'AVAILABLE', true);
INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (108, 'Sanjeewa Fonseka', '0717788990', 'Auto Electricals & Starters', 'AVAILABLE', true);

INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (109, 'Sahan Gunatilake', '0718899001', 'Diesel Injection Pump Tuning', 'AVAILABLE', true);
INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (109, 'Chathura Gamage', '0719900112', 'Heavy Duty Commercial Vehicle Repair', 'AVAILABLE', true);

INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (110, 'Kuganathan S', '0721122334', 'EFI Tune-up & Overhaul', 'AVAILABLE', true);
INSERT INTO mechanics (garage_id, name, phone, specialization, status, active) VALUES (110, 'Ratheesan T', '0722233445', '24/7 Roadside Rescue & Towing', 'AVAILABLE', true);
