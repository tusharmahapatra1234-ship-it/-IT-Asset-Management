-- Create database if not exists and use it
CREATE DATABASE IF NOT EXISTS it_asset_db;
USE it_asset_db;

-- 1. Assets Table: Saare hardware devices ka record rakhne ke liye
CREATE TABLE IF NOT EXISTS assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_name VARCHAR(100) NOT NULL,
    serial_number VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- e.g., Laptop, Monitor, IoT Dev Kit, Phone, Accessories
    status VARCHAR(20) DEFAULT 'Available', -- Available, Allocated, Damaged
    purchase_date DATE
);

-- 2. Allocations Table: Kis employee ko kya mila hai uski tracking
CREATE TABLE IF NOT EXISTS allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    employee_email VARCHAR(100) NOT NULL,
    employee_department VARCHAR(100) NOT NULL,
    allocated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- 3. Email Logs Table: Sent email notifications track karne ke liye
CREATE TABLE IF NOT EXISTS email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT,
    employee_email VARCHAR(100) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Sent',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- Insert Seed Data for testing
INSERT INTO assets (asset_name, serial_number, category, status, purchase_date) VALUES
('MacBook Pro 16" M3', 'MBP16M3202601', 'Laptop', 'Available', '2026-01-15'),
('Dell UltraSharp 27" Monitor', 'DELL27U202602', 'Monitor', 'Allocated', '2026-02-10'),
('Raspberry Pi 5 Starter Kit', 'RPI5START202603', 'IoT Dev Kit', 'Available', '2026-03-05'),
('iPhone 15 Pro Max', 'IPH15PM202604', 'Phone', 'Damaged', '2026-04-12'),
('Lenovo ThinkPad T14 Gen 4', 'LNVT14G4202605', 'Laptop', 'Allocated', '2026-05-20');

-- Fetch the IDs of allocated assets and insert allocations
-- We assume the IDs are 2 (Dell Monitor) and 5 (ThinkPad)
INSERT INTO allocations (asset_id, employee_id, employee_name, employee_email, employee_department, allocated_date) VALUES
(2, 'EMP1001', 'Amit Sharma', 'amit.sharma@example.com', 'Engineering', '2026-06-01 10:00:00'),
(5, 'EMP1002', 'Priya Patel', 'priya.patel@example.com', 'Human Resources', '2026-06-15 14:30:00');
