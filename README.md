# 💻 IT Asset Management System

[![PHP Version](https://img.shields.io/badge/PHP-8.x-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://www.php.net/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)

> A modern, lightweight, and full-featured **IT Asset Management & Hardware Lifecycle Tracking System** built with **PHP (PDO)** and **MySQL**. Track hardware inventory, allocate devices to employees, monitor asset conditions, and trigger automated email notification logs seamlessly.

---

## 📸 Visual Preview & Dashboard Tour

| 📊 Main Analytics Dashboard | 🔍 Real-time Search & Multi-Filters |
| :---: | :---: |
| ![Dashboard Overview](1_dashboard.png) | ![Filtering Working](2_filter_working.png) |

| ➕ Add New Hardware Asset | 🤝 Allocate Asset to Employee |
| :---: | :---: |
| ![Add Asset Page](3_add_asset_filled.png) | ![Allocate Asset](4_allocate_filled.png) |

---

## ✨ Key Features

- **📦 Inventory Asset Management**: Add, update, view, and soft-delete hardware assets (Laptops, Monitors, IoT Kits, Mobile Devices, Accessories) with unique serial number verification.
- **🔄 Employee Allocation Workflow**: Easily assign hardware to employees with detail tracking (Employee ID, Name, Email, Department, and Date).
- **✉️ Automated Email Notifications & Audit Logging**: Generates HTML notification emails upon allocation and logs all dispatch records into the database.
- **🏷️ Real-time Status Lifecycle**: Tracks asset statuses dynamically (`Available`, `Allocated`, `Damaged`).
- **🎯 Advanced Search & Filtering**: Multi-parameter search by serial number, asset name, category, or operational status.
- **📈 Dashboard KPI Metrics**: Real-time summary statistics cards showing total assets, available devices, allocated count, and damaged units.
- **🛡️ Secure Database Operations**: Powered by PHP PDO with prepared statements to protect against SQL Injection attacks.

---

## 📐 System Architecture & Workflow Diagrams

### 1️⃣ System Component Architecture
```mermaid
graph TD
    Client[👤 IT Admin / Browser] -->|HTTP Requests| WebUI[🖥️ PHP Web Fronted]
    
    subgraph Frontend Pages
        WebUI --> Dashboard[index.php]
        WebUI --> AddForm[add-asset.php]
        WebUI --> AllocForm[allocate.php]
    end
    
    Dashboard -->|POST Requests| Controller[⚙️ Controller Layer: action.php]
    AddForm -->|POST Form Data| Controller
    AllocForm -->|POST Form Data| Controller
    
    subgraph Backend Core
        Controller -->|Database Operations| PDO[🔌 Database Driver: db.php]
        Controller -->|Send Notification| Mailer[✉️ Mailer Engine: mailer.php]
    end
    
    subgraph Data Store
        PDO -->|SQL Queries| MySQL[(🗄️ MySQL Database: it_asset_db)]
        Mailer -->|Log Mail Status| MySQL
    end
```

---

### 2️⃣ Asset Allocation & Email Notification Sequence
```mermaid
sequenceDiagram
    autonumber
    actor Admin as 👤 IT Administrator
    participant UI as 🖥️ allocate.php
    participant Controller as ⚙️ action.php
    participant DB as 🗄️ MySQL (PDO)
    participant Mailer as ✉️ mailer.php

    Admin->>UI: Fills Allocation Details (Employee ID, Email, Dept)
    UI->>Controller: Submit Form (POST action=allocate)
    
    Controller->>DB: Check if Asset is 'Available'
    DB-->>Controller: Asset Confirmed Available
    
    Controller->>DB: Begin Transaction
    Controller->>DB: INSERT into `allocations` table
    Controller->>DB: UPDATE `assets` status to 'Allocated'
    
    Controller->>Mailer: sendAllocationEmail($pdo, $allocData, $assetData)
    Mailer->>Mailer: Generate Responsive HTML Email Body
    Mailer->>DB: INSERT log into `email_logs` table
    
    Controller->>DB: Commit Transaction
    Controller-->>Admin: Redirect to index.php with Success Notification Banner
```

---

### 3️⃣ Asset Lifecycle State Machine
```mermaid
stateDiagram-v2
    [*] --> NewAssetCreated : Register Asset

    state NewAssetCreated {
        [*] --> Available : Default Status
    }

    Available --> Allocated : Assign to Employee (allocate.php)
    Allocated --> Available : Deallocate / Return (action.php)
    Available --> Damaged : Report Damage / Maintenance
    Allocated --> Damaged : Mark Damaged upon Return
    Damaged --> Available : Repaired & Restored
    Damaged --> [*] : Scrapped / Deleted
```

---

### 4️⃣ Search & Multi-Filtering Algorithm
```mermaid
flowchart LR
    Start([User inputs filter parameters]) --> CheckQuery{Search Query?}
    CheckQuery -->|Yes| SearchSQL["WHERE (asset_name LIKE %query% OR serial_number LIKE %query%)"]
    CheckQuery -->|No| CheckCat{Category Selected?}
    
    SearchSQL --> CheckCat
    CheckCat -->|Yes| CatSQL["AND category = :category"]
    CheckCat -->|No| CheckStatus{Status Selected?}
    
    CatSQL --> CheckStatus
    CheckStatus -->|Yes| StatusSQL["AND status = :status"]
    CheckStatus -->|No| ExecuteSQL[Execute PDO Prepared Query]
    
    StatusSQL --> ExecuteSQL
    ExecuteSQL --> RenderTable[Render Dashboard Results Table & Stats]
```

---

## 🗄️ Database Architecture & ER Diagram

```mermaid
erDiagram
    ASSETS {
        int id PK
        string asset_name
        string serial_number UK
        string category
        string status
        date purchase_date
    }
    
    ALLOCATIONS {
        int id PK
        int asset_id FK
        string employee_id
        string employee_name
        string employee_email
        string employee_department
        timestamp allocated_date
    }

    EMAIL_LOGS {
        int id PK
        int asset_id FK
        string employee_email
        string employee_name
        string subject
        text body
        string status
        timestamp sent_at
    }

    ASSETS ||--o{ ALLOCATIONS : "allocated to"
    ASSETS ||--o{ EMAIL_LOGS : "logs notification"
```

---

## 🛠️ Tech Stack & Technologies

* **Frontend**: HTML5, Modern Responsive CSS3 (Glassmorphism & Clean Card Layouts), FontAwesome / SVG Icons.
* **Backend**: PHP 8.x (PDO MySQL Driver, Session Management, Custom Mailer Component).
* **Database**: MySQL / MariaDB (Relational Database with Foreign Key constraints & Cascading deletes).
* **Server Environment**: Apache / Nginx (XAMPP, Laragon, or WampServer compatible).

---

## 🚀 Quick Start & Local Setup

### 1️⃣ Prerequisites
Make sure you have the following installed on your machine:
* [PHP 8.0+](https://www.php.net/downloads)
* [MySQL 8.0+](https://www.mysql.com/) or [MariaDB](https://mariadb.org/)
* A local web server like **XAMPP**, **Laragon**, or **WampServer**

### 2️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/IT-Asset-Management.git
cd IT-Asset-Management
```

### 3️⃣ Setup Database
1. Open **phpMyAdmin** (or your MySQL client like DBeaver / HeidiSQL).
2. Create a database or simply run the provided `schema.sql` script:
```sql
SOURCE path/to/schema.sql;
```
This script creates the database `it_asset_db`, all required tables (`assets`, `allocations`, `email_logs`), and seeds initial mock data.

### 4️⃣ Configure Connection Credentials
Open [`db.php`](db.php) and update your database credentials if necessary:
```php
$host = '127.0.0.1';
$db   = 'it_asset_db';
$user = 'root';
$pass = 'root'; // Set your MySQL password (leave empty '' for default XAMPP setup)
```

### 5️⃣ Run the Application
Place the repository folder in your local web root directory (`htdocs` for XAMPP, `www` for Laragon) and navigate to:
```
http://localhost/IT Asset MAnagement/index.php
```
Or start PHP's built-in web server:
```bash
php -S localhost:8000
```
Then open `http://localhost:8000` in your web browser.

---

## 📂 Project Structure

```
IT Asset Management/
├── 📄 index.php             # Main Dashboard, KPI Cards, Inventory List & Filters
├── 📄 add-asset.php         # Form to register new hardware assets
├── 📄 allocate.php          # Form to assign an asset to an employee
├── 📄 action.php            # Controller handling POST requests (Add, Allocate, Deallocate, Delete)
├── 📄 db.php                # Database PDO connection setup
├── 📄 mailer.php            # Email dispatch helper & audit logging engine
├── 📄 style.css             # Modern custom CSS styling & component designs
├── 📄 schema.sql            # Database schema & sample seed data
└── 🖼️ *.png                # Preview screenshots for documentation
```

---

## 💻 How to Use

1. **View Overview Stats**: Check inventory health at a glance from the top metric cards on the main dashboard.
2. **Add New Hardware**: Click **"+ Add New Asset"**, enter the hardware details (Name, Serial Number, Category, Purchase Date), and submit.
3. **Allocate Device**: Click the **"Allocate"** button next to any *Available* asset. Enter the employee's details. The asset status will immediately shift to `Allocated`, an email notification will be logged, and recent allocations will update.
4. **Deallocate / Return**: Click **"Deallocate"** on an allocated item to mark it back as `Available` for reissue.
5. **Search & Filter**: Use the top filter bar to instantly locate specific devices by category, status, or search query.

---

## 🔮 Future Enhancements (Roadmap)

- [ ] 📄 PDF Receipt generation for signed physical hardware handovers.
- [ ] 🏷️ QR Code / Barcode generation for physical asset tagging.
- [ ] 🔒 User Authentication & Role-Based Access Control (Admin / Auditor).
- [ ] 📊 CSV / Excel Data Export for asset reports.
- [ ] 📧 Integration with PHPMailer / SMTP service for live production email delivery.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - feel free to modify and use it for personal or commercial projects.

---

### ⭐ Show Your Support
If you found this project helpful, please give it a **Star** on GitHub! 🌟
