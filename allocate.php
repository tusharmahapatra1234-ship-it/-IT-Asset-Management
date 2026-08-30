<?php
session_start();
require_once 'db.php';

$asset_id = isset($_GET['asset_id']) ? (int)$_GET['asset_id'] : 0;

if ($asset_id <= 0) {
    $_SESSION['error'] = 'Invalid asset selected.';
    header('Location: index.php');
    exit;
}

// Fetch asset details
try {
    $stmt = $pdo->prepare("SELECT * FROM assets WHERE id = :id");
    $stmt->execute(['id' => $asset_id]);
    $asset = $stmt->fetch();
    
    if (!$asset) {
        $_SESSION['error'] = 'Asset not found.';
        header('Location: index.php');
        exit;
    }
    
    if ($asset['status'] !== 'Available') {
        $_SESSION['error'] = 'This asset is not available for allocation. Current status: ' . $asset['status'];
        header('Location: index.php');
        exit;
    }
} catch (\PDOException $e) {
    $_SESSION['error'] = 'Database error: ' . $e->getMessage();
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Allocate IT Asset</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container" style="max-width: 650px;">
        <!-- Header -->
        <header>
            <div class="logo-section">
                <h1>Allocate Asset</h1>
                <p>Assign this hardware asset to an employee</p>
            </div>
            <div>
                <a href="index.php" class="btn btn-secondary">&larr; Back to Dashboard</a>
            </div>
        </header>

        <!-- Form Card -->
        <section class="data-card">
            <!-- Asset info display -->
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px dashed var(--border-color); border-radius: 12px; padding: 1.2rem; margin-bottom: 2rem;">
                <h3 style="margin-bottom: 0.5rem; color: var(--text-primary); font-size: 1.1rem;"><?php echo htmlspecialchars($asset['asset_name']); ?></h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.9rem;">
                    <div><span style="color: var(--text-secondary);">Serial Number:</span> <code><?php echo htmlspecialchars($asset['serial_number']); ?></code></div>
                    <div><span style="color: var(--text-secondary);">Category:</span> <?php echo htmlspecialchars($asset['category']); ?></div>
                </div>
            </div>

            <!-- Allocation Form -->
            <form method="POST" action="action.php?action=allocate">
                <input type="hidden" name="asset_id" value="<?php echo $asset['id']; ?>">
                
                <div class="form-group">
                    <label for="employee_id">Employee ID</label>
                    <input type="text" id="employee_id" name="employee_id" class="form-control" placeholder="e.g., EMP1024" required>
                </div>

                <div class="form-group">
                    <label for="employee_name">Employee Name</label>
                    <input type="text" id="employee_name" name="employee_name" class="form-control" placeholder="e.g., Amit Sharma" required>
                </div>

                <div class="form-group">
                    <label for="employee_email">Employee Email</label>
                    <input type="email" id="employee_email" name="employee_email" class="form-control" placeholder="e.g., amit.sharma@example.com" required>
                </div>

                <div class="form-group">
                    <label for="employee_department">Employee Department</label>
                    <input type="text" id="employee_department" name="employee_department" class="form-control" placeholder="e.g., Engineering" required>
                </div>

                <div class="form-group">
                    <label for="allocated_date">Allocation Date</label>
                    <input type="date" id="allocated_date" name="allocated_date" class="form-control" value="<?php echo date('Y-m-d'); ?>" required>
                </div>

                <div class="form-actions">
                    <a href="index.php" class="btn btn-secondary">Cancel</a>
                    <button type="submit" class="btn btn-primary">Allocate Asset</button>
                </div>
            </form>
        </section>
    </div>
</body>
</html>
