<?php
session_start();
require_once 'db.php';

// Fetch stats
try {
    $total_query = $pdo->query("SELECT COUNT(*) FROM assets");
    $total_assets = $total_query->fetchColumn();

    $available_query = $pdo->query("SELECT COUNT(*) FROM assets WHERE status = 'Available'");
    $available_assets = $available_query->fetchColumn();

    $allocated_query = $pdo->query("SELECT COUNT(*) FROM assets WHERE status = 'Allocated'");
    $allocated_assets = $allocated_query->fetchColumn();

    $damaged_query = $pdo->query("SELECT COUNT(*) FROM assets WHERE status = 'Damaged'");
    $damaged_assets = $damaged_query->fetchColumn();
} catch (\PDOException $e) {
    die("Error fetching stats: " . $e->getMessage());
}

// Search and Filter variables
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$filter_category = isset($_GET['category']) ? trim($_GET['category']) : '';
$filter_status = isset($_GET['status']) ? trim($_GET['status']) : '';

// Build Query
$sql = "SELECT * FROM assets WHERE 1=1";
$params = [];

if ($search !== '') {
    $sql .= " AND (asset_name LIKE :search OR serial_number LIKE :search)";
    $params['search'] = "%$search%";
}

if ($filter_category !== '') {
    $sql .= " AND category = :category";
    $params['category'] = $filter_category;
}

if ($filter_status !== '') {
    $sql .= " AND status = :status";
    $params['status'] = $filter_status;
}

$sql .= " ORDER BY id DESC";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $assets = $stmt->fetchAll();
} catch (\PDOException $e) {
    die("Error fetching assets: " . $e->getMessage());
}

// Fetch recent allocations
try {
    $recent_query = $pdo->query("
        SELECT a.*, ast.asset_name, ast.serial_number 
        FROM allocations a 
        JOIN assets ast ON a.asset_id = ast.id 
        ORDER BY a.allocated_date DESC 
        LIMIT 5
    ");
    $recent_allocations = $recent_query->fetchAll();
} catch (\PDOException $e) {
    die("Error fetching recent allocations: " . $e->getMessage());
}

// Fetch recent email notification logs
try {
    $email_logs_query = $pdo->query("SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 5");
    $email_logs = $email_logs_query->fetchAll();
} catch (\PDOException $e) {
    $email_logs = [];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IT Asset Manager Dashboard</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header>
            <div class="logo-section">
                <h1>IT Asset Manager</h1>
                <p>Track, Allocate, and Optimize Hardware Resources</p>
            </div>
            <div>
                <a href="add-asset.php" class="btn btn-primary">+ Add New Asset</a>
            </div>
        </header>

        <!-- Flash messages -->
        <?php if (isset($_SESSION['success'])): ?>
            <div class="alert alert-success" id="alert-banner">
                <span><?php echo $_SESSION['success']; unset($_SESSION['success']); ?></span>
                <button class="alert-close" onclick="document.getElementById('alert-banner').style.display='none'">&times;</button>
            </div>
        <?php endif; ?>

        <?php if (isset($_SESSION['error'])): ?>
            <div class="alert alert-danger" id="alert-banner-err">
                <span><?php echo $_SESSION['error']; unset($_SESSION['error']); ?></span>
                <button class="alert-close" onclick="document.getElementById('alert-banner-err').style.display='none'">&times;</button>
            </div>
        <?php endif; ?>

        <!-- KPI Stats Grid -->
        <section class="stats-grid">
            <div class="stat-card total">
                <div class="stat-info">
                    <h3>Total Assets</h3>
                    <p><?php echo $total_assets; ?></p>
                </div>
                <div class="stat-icon">📦</div>
            </div>
            <div class="stat-card available">
                <div class="stat-info">
                    <h3>Available</h3>
                    <p><?php echo $available_assets; ?></p>
                </div>
                <div class="stat-icon">✅</div>
            </div>
            <div class="stat-card allocated">
                <div class="stat-info">
                    <h3>Allocated</h3>
                    <p><?php echo $allocated_assets; ?></p>
                </div>
                <div class="stat-icon">👤</div>
            </div>
            <div class="stat-card damaged">
                <div class="stat-info">
                    <h3>Damaged</h3>
                    <p><?php echo $damaged_assets; ?></p>
                </div>
                <div class="stat-icon">⚠️</div>
            </div>
        </section>

        <!-- Controls (Search & Filter) -->
        <section class="controls-card">
            <form method="GET" action="index.php" class="controls-form">
                <div class="search-input">
                    <input type="text" name="search" class="form-control" placeholder="Search by asset name or serial number..." value="<?php echo htmlspecialchars($search); ?>">
                </div>
                <div class="filter-select">
                    <select name="category" class="form-control">
                        <option value="">All Categories</option>
                        <option value="Laptop" <?php if($filter_category === 'Laptop') echo 'selected'; ?>>Laptop</option>
                        <option value="Monitor" <?php if($filter_category === 'Monitor') echo 'selected'; ?>>Monitor</option>
                        <option value="IoT Dev Kit" <?php if($filter_category === 'IoT Dev Kit') echo 'selected'; ?>>IoT Dev Kit</option>
                        <option value="Phone" <?php if($filter_category === 'Phone') echo 'selected'; ?>>Phone</option>
                        <option value="Accessories" <?php if($filter_category === 'Accessories') echo 'selected'; ?>>Accessories</option>
                    </select>
                </div>
                <div class="filter-select">
                    <select name="status" class="form-control">
                        <option value="">All Statuses</option>
                        <option value="Available" <?php if($filter_status === 'Available') echo 'selected'; ?>>Available</option>
                        <option value="Allocated" <?php if($filter_status === 'Allocated') echo 'selected'; ?>>Allocated</option>
                        <option value="Damaged" <?php if($filter_status === 'Damaged') echo 'selected'; ?>>Damaged</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-secondary">Apply Filters</button>
                <?php if ($search !== '' || $filter_category !== '' || $filter_status !== ''): ?>
                    <a href="index.php" class="btn btn-danger">Clear Filters</a>
                <?php endif; ?>
            </form>
        </section>

        <!-- Main Section Grid -->
        <div class="main-grid">
            <!-- Asset Table Section -->
            <section class="data-card">
                <div class="card-header">
                    <h2>Hardware Assets List</h2>
                </div>
                <div class="table-responsive">
                    <?php if (count($assets) > 0): ?>
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>Asset Details</th>
                                    <th>Serial Number</th>
                                    <th>Category</th>
                                    <th>Status</th>
                                    <th>Purchase Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($assets as $asset): ?>
                                    <tr>
                                        <td>
                                            <strong style="display: block; font-size: 1rem;"><?php echo htmlspecialchars($asset['asset_name']); ?></strong>
                                        </td>
                                        <td><code><?php echo htmlspecialchars($asset['serial_number']); ?></code></td>
                                        <td><?php echo htmlspecialchars($asset['category']); ?></td>
                                        <td>
                                            <span class="badge badge-<?php echo strtolower($asset['status']); ?>">
                                                <?php echo htmlspecialchars($asset['status']); ?>
                                            </span>
                                        </td>
                                        <td><?php echo $asset['purchase_date'] ? date('M d, Y', strtotime($asset['purchase_date'])) : 'N/A'; ?></td>
                                        <td>
                                            <div class="action-links">
                                                <?php if ($asset['status'] === 'Available'): ?>
                                                    <a href="allocate.php?asset_id=<?php echo $asset['id']; ?>" class="btn btn-success" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Allocate</a>
                                                <?php elseif ($asset['status'] === 'Allocated'): ?>
                                                    <form method="POST" action="action.php?action=deallocate" style="display: inline;" onsubmit="return confirm('Are you sure you want to return this asset?');">
                                                        <input type="hidden" name="asset_id" value="<?php echo $asset['id']; ?>">
                                                        <button type="submit" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Return</button>
                                                    </form>
                                                <?php endif; ?>
                                                
                                                <form method="POST" action="action.php?action=delete" style="display: inline;" onsubmit="return confirm('Are you sure you want to delete this asset? All allocations will be lost.');">
                                                    <input type="hidden" name="asset_id" value="<?php echo $asset['id']; ?>">
                                                    <button type="submit" class="btn btn-danger" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Delete</button>
                                                </form>
                                            </div>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php else: ?>
                        <div class="empty-state">
                            <h3>No assets found</h3>
                            <p>Try resetting the filters or add a new asset to get started.</p>
                        </div>
                    <?php endif; ?>
                </div>
            </section>

            <!-- Recent Allocations Panel -->
            <section class="data-card" style="height: fit-content;">
                <div class="card-header">
                    <h2>Recent Allocations</h2>
                </div>
                <div class="recent-list">
                    <?php if (count($recent_allocations) > 0): ?>
                        <?php foreach ($recent_allocations as $allocation): ?>
                            <div class="recent-item">
                                <div class="recent-item-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.2rem 0.5rem;">
                                    <span class="recent-name">
                                        <?php echo htmlspecialchars($allocation['employee_name']); ?> 
                                        <small style="color: var(--text-secondary); font-weight: normal; margin-left: 0.3rem; display: inline-block;">(<?php echo htmlspecialchars($allocation['employee_id']); ?>)</small>
                                    </span>
                                    <span class="recent-date" style="white-space: nowrap;"><?php echo date('M d, Y', strtotime($allocation['allocated_date'])); ?></span>
                                </div>
                                <div style="margin-top: 0.2rem;">
                                    <span class="recent-asset"><?php echo htmlspecialchars($allocation['asset_name']); ?></span>
                                </div>
                                <div style="margin-top: 0.4rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem 0.8rem; font-size: 0.85rem;">
                                    <span class="recent-email" style="color: var(--text-secondary); min-width: 130px; flex: 1; word-break: break-all;"><?php echo htmlspecialchars($allocation['employee_email']); ?></span>
                                    <span class="recent-dept" style="background: rgba(15, 23, 42, 0.06); color: var(--text-primary); padding: 0.15rem 0.45rem; border-radius: 6px; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; flex-shrink: 0;"><?php echo htmlspecialchars($allocation['employee_department']); ?></span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div style="text-align: center; color: var(--text-secondary); padding: 1.5rem 0;">
                            No assets currently allocated.
                        </div>
                    <?php endif; ?>
                </div>
            </section>

            <!-- Email Notification Logs Panel -->
            <section class="data-card" style="height: fit-content; margin-top: 1.5rem;">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h2>📧 Sent Email Logs</h2>
                    <span style="background: rgba(99, 102, 241, 0.1); color: var(--accent-color); font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 20px; font-weight: 600;">Automated</span>
                </div>
                <div class="recent-list">
                    <?php if (count($email_logs) > 0): ?>
                        <?php foreach ($email_logs as $log): ?>
                            <div class="recent-item" style="border-left: 3px solid var(--accent-color); padding-left: 0.8rem;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                                    <strong style="font-size: 0.88rem; color: var(--text-primary);"><?php echo htmlspecialchars($log['employee_name']); ?></strong>
                                    <span style="font-size: 0.75rem; color: var(--text-secondary);"><?php echo date('M d, H:i', strtotime($log['sent_at'])); ?></span>
                                </div>
                                <div style="font-size: 0.82rem; color: var(--accent-color); margin-top: 0.15rem; font-weight: 600;">
                                    <?php echo htmlspecialchars($log['subject']); ?>
                                </div>
                                <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.25rem;">
                                    To: <code><?php echo htmlspecialchars($log['employee_email']); ?></code>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div style="text-align: center; color: var(--text-secondary); padding: 1rem 0; font-size: 0.85rem;">
                            No email notifications sent yet. Allocate an asset to send the first email.
                        </div>
                    <?php endif; ?>
                </div>
            </section>
        </div>
    </div>
</body>
</html>
