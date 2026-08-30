<?php
session_start();
require_once 'db.php';
require_once 'mailer.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php');
    exit;
}

switch ($action) {
    case 'add':
        $asset_name = isset($_POST['asset_name']) ? trim($_POST['asset_name']) : '';
        $serial_number = isset($_POST['serial_number']) ? trim($_POST['serial_number']) : '';
        $category = isset($_POST['category']) ? trim($_POST['category']) : '';
        $status = isset($_POST['status']) ? trim($_POST['status']) : 'Available';
        $purchase_date = isset($_POST['purchase_date']) ? trim($_POST['purchase_date']) : '';

        if ($asset_name === '' || $serial_number === '' || $category === '' || $purchase_date === '') {
            $_SESSION['error'] = 'All fields are required.';
            header('Location: add-asset.php');
            exit;
        }

        try {
            // Check if serial number already exists
            $check_stmt = $pdo->prepare("SELECT COUNT(*) FROM assets WHERE serial_number = :serial_number");
            $check_stmt->execute(['serial_number' => $serial_number]);
            if ($check_stmt->fetchColumn() > 0) {
                $_SESSION['error'] = 'An asset with this serial number already exists.';
                header('Location: add-asset.php');
                exit;
            }

            // Insert new asset
            $insert_stmt = $pdo->prepare("
                INSERT INTO assets (asset_name, serial_number, category, status, purchase_date) 
                VALUES (:asset_name, :serial_number, :category, :status, :purchase_date)
            ");
            $insert_stmt->execute([
                'asset_name' => $asset_name,
                'serial_number' => $serial_number,
                'category' => $category,
                'status' => $status,
                'purchase_date' => $purchase_date
            ]);

            $_SESSION['success'] = "Asset '$asset_name' successfully added to inventory.";
            header('Location: index.php');
            exit;

        } catch (\PDOException $e) {
            $_SESSION['error'] = 'Database Error: ' . $e->getMessage();
            header('Location: add-asset.php');
            exit;
        }
        break;

    case 'allocate':
        $asset_id = isset($_POST['asset_id']) ? (int)$_POST['asset_id'] : 0;
        $employee_id = isset($_POST['employee_id']) ? trim($_POST['employee_id']) : '';
        $employee_name = isset($_POST['employee_name']) ? trim($_POST['employee_name']) : '';
        $employee_email = isset($_POST['employee_email']) ? trim($_POST['employee_email']) : '';
        $employee_department = isset($_POST['employee_department']) ? trim($_POST['employee_department']) : '';
        $allocated_date = isset($_POST['allocated_date']) ? trim($_POST['allocated_date']) : '';

        if ($asset_id <= 0 || $employee_id === '' || $employee_name === '' || $employee_email === '' || $employee_department === '' || $allocated_date === '') {
            $_SESSION['error'] = 'All fields are required for allocation.';
            header('Location: allocate.php?asset_id=' . $asset_id);
            exit;
        }

        try {
            // Confirm asset is still available & get asset details
            $check_stmt = $pdo->prepare("SELECT * FROM assets WHERE id = :id");
            $check_stmt->execute(['id' => $asset_id]);
            $asset_info = $check_stmt->fetch();

            if (!$asset_info || $asset_info['status'] !== 'Available') {
                $_SESSION['error'] = 'Asset is no longer available.';
                header('Location: index.php');
                exit;
            }

            // Start transaction to insert allocation and update asset status
            $pdo->beginTransaction();

            $alloc_stmt = $pdo->prepare("
                INSERT INTO allocations (asset_id, employee_id, employee_name, employee_email, employee_department, allocated_date) 
                VALUES (:asset_id, :employee_id, :employee_name, :employee_email, :employee_department, :allocated_date)
            ");
            $alloc_stmt->execute([
                'asset_id' => $asset_id,
                'employee_id' => $employee_id,
                'employee_name' => $employee_name,
                'employee_email' => $employee_email,
                'employee_department' => $employee_department,
                'allocated_date' => $allocated_date
            ]);

            $update_stmt = $pdo->prepare("UPDATE assets SET status = 'Allocated' WHERE id = :id");
            $update_stmt->execute(['id' => $asset_id]);

            $pdo->commit();

            // Send Email Notification to Employee
            $allocation_info = [
                'asset_id' => $asset_id,
                'employee_id' => $employee_id,
                'employee_name' => $employee_name,
                'employee_email' => $employee_email,
                'employee_department' => $employee_department,
                'allocated_date' => $allocated_date
            ];
            sendAllocationEmail($pdo, $allocation_info, $asset_info);

            $_SESSION['success'] = "Asset successfully allocated to $employee_name. Email notification sent to $employee_email.";
            header('Location: index.php');
            exit;

        } catch (\PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $_SESSION['error'] = 'Database Error: ' . $e->getMessage();
            header('Location: index.php');
            exit;
        }
        break;

    case 'deallocate':
        $asset_id = isset($_POST['asset_id']) ? (int)$_POST['asset_id'] : 0;

        if ($asset_id <= 0) {
            $_SESSION['error'] = 'Invalid asset ID.';
            header('Location: index.php');
            exit;
        }

        try {
            // Start transaction to delete allocation and update status
            $pdo->beginTransaction();

            $delete_stmt = $pdo->prepare("DELETE FROM allocations WHERE asset_id = :asset_id");
            $delete_stmt->execute(['asset_id' => $asset_id]);

            $update_stmt = $pdo->prepare("UPDATE assets SET status = 'Available' WHERE id = :id");
            $update_stmt->execute(['id' => $asset_id]);

            $pdo->commit();

            $_SESSION['success'] = 'Asset returned to inventory and status updated to Available.';
            header('Location: index.php');
            exit;

        } catch (\PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $_SESSION['error'] = 'Database Error: ' . $e->getMessage();
            header('Location: index.php');
            exit;
        }
        break;

    case 'delete':
        $asset_id = isset($_POST['asset_id']) ? (int)$_POST['asset_id'] : 0;

        if ($asset_id <= 0) {
            $_SESSION['error'] = 'Invalid asset ID.';
            header('Location: index.php');
            exit;
        }

        try {
            $delete_stmt = $pdo->prepare("DELETE FROM assets WHERE id = :id");
            $delete_stmt->execute(['id' => $asset_id]);

            $_SESSION['success'] = 'Asset deleted successfully.';
            header('Location: index.php');
            exit;

        } catch (\PDOException $e) {
            $_SESSION['error'] = 'Database Error: ' . $e->getMessage();
            header('Location: index.php');
            exit;
        }
        break;

    default:
        header('Location: index.php');
        exit;
}
?>
