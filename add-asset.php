<?php
session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add New IT Asset</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container" style="max-width: 650px;">
        <!-- Header -->
        <header>
            <div class="logo-section">
                <h1>Add New Asset</h1>
                <p>Register a new device in the inventory system</p>
            </div>
            <div>
                <a href="index.php" class="btn btn-secondary">&larr; Back to Dashboard</a>
            </div>
        </header>

        <!-- Flash messages -->
        <?php if (isset($_SESSION['error'])): ?>
            <div class="alert alert-danger" id="alert-banner-err">
                <span><?php echo $_SESSION['error']; unset($_SESSION['error']); ?></span>
                <button class="alert-close" onclick="document.getElementById('alert-banner-err').style.display='none'">&times;</button>
            </div>
        <?php endif; ?>

        <!-- Form Card -->
        <section class="data-card">
            <form method="POST" action="action.php?action=add">
                <div class="form-group">
                    <label for="asset_name">Asset Name / Model</label>
                    <input type="text" id="asset_name" name="asset_name" class="form-control" placeholder="e.g., MacBook Pro 16\" required>
                </div>

                <div class="form-group">
                    <label for="serial_number">Serial Number</label>
                    <input type="text" id="serial_number" name="serial_number" class="form-control" placeholder="e.g., MBP16M3998822" required>
                </div>

                <div class="form-group">
                    <label for="category">Category</label>
                    <select id="category" name="category" class="form-control" required>
                        <option value="" disabled selected>Select a category</option>
                        <option value="Laptop">Laptop</option>
                        <option value="Monitor">Monitor</option>
                        <option value="IoT Dev Kit">IoT Dev Kit</option>
                        <option value="Phone">Phone</option>
                        <option value="Accessories">Accessories</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="status">Initial Status</label>
                    <select id="status" name="status" class="form-control" required>
                        <option value="Available" selected>Available</option>
                        <option value="Damaged">Damaged</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="purchase_date">Purchase Date</label>
                    <input type="date" id="purchase_date" name="purchase_date" class="form-control" max="<?php echo date('Y-m-d'); ?>" required>
                </div>

                <div class="form-actions">
                    <a href="index.php" class="btn btn-secondary">Cancel</a>
                    <button type="submit" class="btn btn-primary">Save Asset</button>
                </div>
            </form>
        </section>
    </div>
</body>
</html>
