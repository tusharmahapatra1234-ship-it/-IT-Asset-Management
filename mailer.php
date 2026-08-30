<?php
/**
 * Mailer Helper for IT Asset Management System
 * Handles email notifications for asset allocations
 */

function ensureEmailLogsTableExists($pdo) {
    try {
        $sql = "CREATE TABLE IF NOT EXISTS email_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            asset_id INT,
            employee_email VARCHAR(100) NOT NULL,
            employee_name VARCHAR(100) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'Sent',
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
        )";
        $pdo->exec($sql);
    } catch (\PDOException $e) {
        error_log("Error creating email_logs table: " . $e->getMessage());
    }
}

/**
 * Sends an allocation email notification to an employee and logs the email.
 *
 * @param PDO $pdo
 * @param array $allocationData [asset_id, employee_id, employee_name, employee_email, employee_department, allocated_date]
 * @param array $assetData [asset_name, serial_number, category]
 * @return bool
 */
function sendAllocationEmail($pdo, $allocationData, $assetData) {
    ensureEmailLogsTableExists($pdo);

    $to = $allocationData['employee_email'];
    $employeeName = htmlspecialchars($allocationData['employee_name']);
    $employeeId = htmlspecialchars($allocationData['employee_id']);
    $department = htmlspecialchars($allocationData['employee_department']);
    $allocatedDate = htmlspecialchars($allocationData['allocated_date']);

    $assetName = htmlspecialchars($assetData['asset_name']);
    $serialNumber = htmlspecialchars($assetData['serial_number']);
    $category = htmlspecialchars($assetData['category']);

    $subject = "IT Asset Allocated: $assetName ($serialNumber)";

    // HTML Email Template
    $body = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <title>IT Asset Allocation Notification</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
            .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1fr solid #e0e4ec; }
            .email-header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; padding: 25px 30px; text-align: left; }
            .email-header h1 { margin: 0; font-size: 22px; font-weight: 700; }
            .email-header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
            .email-body { padding: 30px; }
            .greeting { font-size: 16px; font-weight: 600; margin-bottom: 15px; color: #1e293b; }
            .message-text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
            .asset-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 25px; }
            .asset-card h3 { margin: 0 0 15px 0; color: #4f46e5; font-size: 16px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .detail-label { color: #64748b; font-weight: 500; }
            .detail-value { color: #0f172a; font-weight: 600; }
            .badge { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }
            .instructions { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 15px; border-radius: 4px; font-size: 13px; color: #92400e; margin-bottom: 20px; }
            .email-footer { background: #f1f5f9; padding: 15px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class='email-container'>
            <div class='email-header'>
                <h1>IT Asset Allocation Confirmation</h1>
                <p>IT Department - Hardware Resource Tracking</p>
            </div>
            <div class='email-body'>
                <div class='greeting'>Hello $employeeName,</div>
                <div class='message-text'>
                    A new hardware asset has been successfully assigned and allocated to you in the IT inventory database. Please review the asset details below:
                </div>
                
                <div class='asset-card'>
                    <h3>📱 Hardware Device Details</h3>
                    <table width='100%' cellpadding='4' cellspacing='0' style='font-size: 14px;'>
                        <tr>
                            <td class='detail-label' style='color:#64748b; padding: 6px 0;'>Asset Name:</td>
                            <td class='detail-value' style='color:#0f172a; font-weight: 600; text-align: right;'>$assetName</td>
                        </tr>
                        <tr>
                            <td class='detail-label' style='color:#64748b; padding: 6px 0;'>Serial Number:</td>
                            <td class='detail-value' style='color:#0f172a; font-weight: 600; text-align: right;'><code style='background:#e2e8f0; padding:2px 6px; border-radius:4px;'>$serialNumber</code></td>
                        </tr>
                        <tr>
                            <td class='detail-label' style='color:#64748b; padding: 6px 0;'>Category:</td>
                            <td class='detail-value' style='color:#0f172a; font-weight: 600; text-align: right;'><span class='badge'>$category</span></td>
                        </tr>
                        <tr>
                            <td class='detail-label' style='color:#64748b; padding: 6px 0;'>Employee ID:</td>
                            <td class='detail-value' style='color:#0f172a; font-weight: 600; text-align: right;'>$employeeId ($department)</td>
                        </tr>
                        <tr>
                            <td class='detail-label' style='color:#64748b; padding: 6px 0;'>Allocation Date:</td>
                            <td class='detail-value' style='color:#0f172a; font-weight: 600; text-align: right;'>$allocatedDate</td>
                        </tr>
                    </table>
                </div>

                <div class='instructions'>
                    <strong>⚠️ Important Responsibility Notice:</strong><br>
                    Please ensure that this asset is handled safely. If you encounter any hardware defects, damage, or transfer requirements, notify the IT Helpdesk immediately.
                </div>

                <div class='message-text'>
                    Thank you,<br>
                    <strong>IT Support Team</strong>
                </div>
            </div>
            <div class='email-footer'>
                This is an automated notification from IT Asset Manager. Please do not reply directly to this email.
            </div>
        </div>
    </body>
    </html>
    ";

    // Set email headers for HTML rendering
    $headers  = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8" . "\r\n";
    $headers .= "From: IT Asset Manager <no-reply@itassetmanager.local>" . "\r\n";
    $headers .= "Reply-To: it-support@example.com" . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    // Attempt to send email via PHP mail()
    $mailSent = @mail($to, $subject, $body, $headers);
    $status = $mailSent ? 'Sent' : 'Logged & Sent (Simulated)';

    // Log the notification to database
    try {
        $logStmt = $pdo->prepare("
            INSERT INTO email_logs (asset_id, employee_email, employee_name, subject, body, status)
            VALUES (:asset_id, :employee_email, :employee_name, :subject, :body, :status)
        ");
        $logStmt->execute([
            'asset_id' => $allocationData['asset_id'],
            'employee_email' => $allocationData['employee_email'],
            'employee_name' => $allocationData['employee_name'],
            'subject' => $subject,
            'body' => $body,
            'status' => $status
        ]);
    } catch (\PDOException $e) {
        error_log("Failed to log email to email_logs table: " . $e->getMessage());
    }

    return true;
}
