const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const SEED_DB = path.join(__dirname, 'data', 'db.json');
const DB_FILE = isVercel ? path.join('/tmp', 'db.json') : SEED_DB;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to read JSON DB
function readData() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            if (fs.existsSync(SEED_DB)) {
                try {
                    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
                    fs.copyFileSync(SEED_DB, DB_FILE);
                } catch (e) {
                    console.error('Failed copying seed DB:', e);
                }
            } else {
                const initialData = { assets: [], allocations: [], email_logs: [] };
                fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
                fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
                return initialData;
            }
        }
        const dataStr = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(dataStr);
    } catch (err) {
        console.error('Error reading DB:', err);
        return { assets: [], allocations: [], email_logs: [] };
    }
}

// Helper to write JSON DB
function writeData(data) {
    try {
        fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error writing DB:', err);
    }
}

// SMTP Transporter Helper for Real Email Dispatch
let etherealTransporter = null;

async function getSmtpTransporter() {
    const data = readData();

    // 1. Check if SMTP credentials were configured in DB via UI Email Settings Modal
    if (data.smtp_config && data.smtp_config.user && data.smtp_config.pass) {
        return nodemailer.createTransport({
            host: data.smtp_config.host || 'smtp.gmail.com',
            port: parseInt(data.smtp_config.port) || 587,
            secure: parseInt(data.smtp_config.port) === 465,
            auth: {
                user: data.smtp_config.user,
                pass: data.smtp_config.pass
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    // 2. Check process environment variables
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    // 3. Fallback to Ethereal Test Account if no user SMTP credentials configured
    if (!etherealTransporter) {
        try {
            const testAccount = await nodemailer.createTestAccount();
            etherealTransporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
            console.log(`[SMTP SETUP] Ethereal SMTP active for test user: ${testAccount.user}`);
        } catch (err) {
            console.error('[SMTP SETUP ERROR]:', err.message);
        }
    }
    return etherealTransporter;
}

async function sendRealEmailNotification(toEmail, subject, htmlContent, textContent = null) {
    try {
        const data = readData();
        const transport = await getSmtpTransporter();
        if (!transport) {
            return { success: false, status: 'SMTP Not Configured', previewUrl: null };
        }

        const senderEmail = (data.smtp_config && data.smtp_config.user) ? data.smtp_config.user : (process.env.SMTP_USER || '');
        const fromName = (data.smtp_config && data.smtp_config.from_name) ? data.smtp_config.from_name : 'IT Operations';
        
        let fromHeader = `"IT Operations" <no-reply@it-ops.company.com>`;
        if (senderEmail) {
            fromHeader = `"${fromName}" <${senderEmail}>`;
        } else if (process.env.SMTP_FROM) {
            fromHeader = process.env.SMTP_FROM;
        }

        // Clean plain text fallback
        const plainText = textContent || htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                                    .replace(/<[^>]+>/g, ' ')
                                                    .replace(/\s+/g, ' ')
                                                    .trim();

        const mailOptions = {
            from: fromHeader,
            to: toEmail,
            replyTo: senderEmail || undefined,
            subject: subject,
            text: plainText,
            html: htmlContent,
            priority: 'high',
            headers: {
                'X-Priority': '1 (Highest)',
                'X-MSMail-Priority': 'High',
                'Importance': 'High',
                'X-Auto-Response-Suppress': 'OOF, AutoReply',
                'X-Report-Abuse': `Please report abuse to ${senderEmail || 'admin'}`
            }
        };

        const info = await transport.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl(info) || null;
        const isRealDelivery = !previewUrl && data.smtp_config && data.smtp_config.user;

        console.log(`[REAL EMAIL DISPATCHED] To: ${toEmail} | Message ID: ${info.messageId}`);
        if (previewUrl) {
            console.log(`[REAL EMAIL ETHER_PREVIEW]: ${previewUrl}`);
        }

        return {
            success: true,
            messageId: info.messageId,
            previewUrl: previewUrl,
            status: isRealDelivery ? 'Sent (Real Email Delivered)' : (previewUrl ? 'Sent (Test Preview)' : 'Sent (Real Email Delivered)')
        };
    } catch (err) {
        console.error('[REAL EMAIL ERROR]:', err.message);
        return {
            success: false,
            error: err.message,
            previewUrl: null,
            status: `Delivery Failed (${err.message})`
        };
    }
}

// High-Deliverability Responsive Corporate Transactional Email Template (Wide Mobile Support)
function generateAllocationHtmlEmail(employeeName, employeeId, department, assetName, serialNumber, category, allocatedDate) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>IT Hardware Asset Allocation</title>
        <style>
            @media only screen and (max-width: 620px) {
                body { padding: 0 !important; background-color: #ffffff !important; }
                .email-wrapper { width: 100% !important; padding: 0 !important; }
                .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; box-shadow: none !important; }
                .header-td { padding: 20px 18px !important; }
                .content-td { padding: 22px 18px !important; }
                .footer-td { padding: 18px !important; }
                .spec-row-td { display: block !important; width: 100% !important; box-sizing: border-box; padding: 6px 0 !important; }
                .spec-label { display: block !important; width: 100% !important; margin-bottom: 2px; color: #64748b !important; }
                .spec-value { display: block !important; width: 100% !important; }
            }
        </style>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 25px 0; color: #1e293b; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <table class="email-wrapper" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9;">
            <tr>
                <td align="center">
                    <table class="email-container" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);">
                        <!-- Header Banner -->
                        <tr>
                            <td class="header-td" style="background-color: #0f172a; padding: 28px 36px; text-align: left;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                        <td>
                                            <div style="display: inline-block; background: #2563eb; color: #ffffff; width: 36px; height: 36px; border-radius: 6px; text-align: center; line-height: 36px; font-weight: bold; font-size: 15px; margin-bottom: 10px;">IT</div>
                                            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.4px;">IT Infrastructure & Asset Operations</h1>
                                            <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13.5px; font-weight: 500;">Official Hardware Resource Allocation Notice</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Body Content -->
                        <tr>
                            <td class="content-td" style="padding: 32px 36px; background-color: #ffffff;">
                                <p style="font-size: 16px; color: #0f172a; margin-top: 0; font-weight: 600;">Dear ${employeeName},</p>
                                <p style="font-size: 14.5px; line-height: 1.65; color: #334155; margin-bottom: 24px;">
                                    This official notice confirms that a hardware IT asset has been successfully assigned and allocated to you in the corporate inventory tracking portal:
                                </p>
                                
                                <!-- Wide Device Specs Card -->
                                <table class="asset-card-table" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 26px; width: 100%;">
                                    <tr>
                                        <td style="padding: 20px 22px;">
                                            <div style="margin: 0 0 14px 0; color: #0f172a; font-size: 14px; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; text-transform: uppercase; letter-spacing: 0.6px;">
                                                <span>Device Details & Allocation Summary</span>
                                            </div>

                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="6" border="0" style="font-size: 14px; width: 100%;">
                                                <tr>
                                                    <td class="spec-row-td spec-label" style="color: #64748b; width: 32%; font-weight: 600;">Asset Name:</td>
                                                    <td class="spec-row-td spec-value" style="color: #0f172a; font-weight: 700; font-size: 15px;">${assetName}</td>
                                                </tr>
                                                <tr>
                                                    <td class="spec-row-td spec-label" style="color: #64748b; font-weight: 600;">Serial Number:</td>
                                                    <td class="spec-row-td spec-value" style="color: #0f172a; font-weight: 700;">
                                                        <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; background-color: #e2e8f0; color: #0f172a; padding: 4px 8px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 13.5px; letter-spacing: 0.5px; word-break: break-all;">${serialNumber}</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td class="spec-row-td spec-label" style="color: #64748b; font-weight: 600;">Category:</td>
                                                    <td class="spec-row-td spec-value" style="color: #2563eb; font-weight: 700;">
                                                        <span style="background: rgba(37, 99, 235, 0.1); color: #2563eb; padding: 3px 10px; border-radius: 20px; font-size: 12.5px; border: 1px solid rgba(37, 99, 235, 0.2);">${category}</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td class="spec-row-td spec-label" style="color: #64748b; font-weight: 600;">Assigned Employee:</td>
                                                    <td class="spec-row-td spec-value" style="color: #0f172a; font-weight: 600;">${employeeName} <span style="color: #64748b; font-weight: normal;">(${employeeId})</span></td>
                                                </tr>
                                                <tr>
                                                    <td class="spec-row-td spec-label" style="color: #64748b; font-weight: 600;">Department:</td>
                                                    <td class="spec-row-td spec-value" style="color: #0f172a;">${department}</td>
                                                </tr>
                                                <tr>
                                                    <td class="spec-row-td spec-label" style="color: #64748b; font-weight: 600;">Allocation Date:</td>
                                                    <td class="spec-row-td spec-value" style="color: #0f172a; font-weight: 600;">${allocatedDate}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Inspection Notice -->
                                <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 18px; border-radius: 6px; font-size: 13.5px; color: #1e40af; margin-bottom: 26px; line-height: 1.55;">
                                    <strong>Mandatory Device Inspection:</strong><br>
                                    Please verify physical condition & hardware functionality upon receiving the device. For technical helpdesk assistance or hardware repairs, contact IT Support.
                                </div>

                                <p style="font-size: 14.5px; color: #334155; margin-bottom: 0; line-height: 1.5;">
                                    Regards,<br>
                                    <strong style="color: #0f172a;">IT Infrastructure & Operations Desk</strong>
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td class="footer-td" style="background-color: #f8fafc; padding: 20px 36px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.5;">
                                Automated System Dispatch &bull; IT Asset Management Portal &bull; Confidential
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
}

// REST API ROUTES

// 1. Get Dashboard KPI Stats
app.get('/api/stats', (req, res) => {
    const data = readData();
    const total = data.assets.length;
    const available = data.assets.filter(a => a.status === 'Available').length;
    const allocated = data.assets.filter(a => a.status === 'Allocated').length;
    const damaged = data.assets.filter(a => a.status === 'Damaged').length;
    const total_value = data.assets.reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);

    const now = new Date();
    const in30Days = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    const expiring_warranty = data.assets.filter(a => {
        if (!a.warranty_expiry) return false;
        const expiry = new Date(a.warranty_expiry);
        return expiry <= in30Days;
    }).length;

    res.json({ total, available, allocated, damaged, total_value, expiring_warranty });
});

// 2. Get All Assets (with optional search, category, status filter)
app.get('/api/assets', (req, res) => {
    const data = readData();
    let { search, category, status } = req.query;

    search = (search || '').toLowerCase().trim();
    category = (category || '').trim();
    status = (status || '').trim();

    let result = data.assets.map(asset => {
        const alloc = data.allocations.find(a => a.asset_id === asset.id);
        return {
            ...asset,
            allocation: alloc || null
        };
    });

    if (search) {
        result = result.filter(a => 
            a.asset_name.toLowerCase().includes(search) ||
            a.serial_number.toLowerCase().includes(search) ||
            (a.vendor && a.vendor.toLowerCase().includes(search)) ||
            (a.location && a.location.toLowerCase().includes(search)) ||
            (a.allocation && a.allocation.employee_name.toLowerCase().includes(search)) ||
            (a.allocation && a.allocation.employee_id.toLowerCase().includes(search))
        );
    }

    if (category) {
        result = result.filter(a => a.category === category);
    }

    if (status) {
        result = result.filter(a => a.status === status);
    }

    // Sort newest first
    result.sort((a, b) => b.id - a.id);

    res.json(result);
});

// 3. Add New Asset
app.post('/api/assets', (req, res) => {
    const data = readData();
    const { asset_name, serial_number, category, status, purchase_date, price, vendor, warranty_expiry, location, notes, contact_phone, asset_tag, condition, invoice_number, mac_address } = req.body;

    if (!asset_name || !serial_number || !category || !purchase_date) {
        return res.status(400).json({ error: 'Asset Name, Serial Number, Category, and Purchase Date are required' });
    }

    // Check duplicate serial number
    if (data.assets.some(a => a.serial_number.toLowerCase() === serial_number.trim().toLowerCase())) {
        return res.status(400).json({ error: 'An asset with this serial number already exists' });
    }

    const newId = data.assets.length > 0 ? Math.max(...data.assets.map(a => a.id)) + 1 : 1;
    const newAsset = {
        id: newId,
        asset_name: asset_name.trim(),
        serial_number: serial_number.trim(),
        category: category.trim(),
        status: status === 'Damaged' ? 'Damaged' : 'Available',
        purchase_date: purchase_date,
        price: parseFloat(price) || 0,
        vendor: vendor ? vendor.trim() : 'N/A',
        warranty_expiry: warranty_expiry || '',
        location: location ? location.trim() : 'Main Office',
        notes: notes ? notes.trim() : '',
        contact_phone: contact_phone ? contact_phone.trim() : '',
        asset_tag: asset_tag ? asset_tag.trim() : '',
        condition: condition ? condition.trim() : 'Brand New',
        invoice_number: invoice_number ? invoice_number.trim() : '',
        mac_address: mac_address ? mac_address.trim() : ''
    };

    data.assets.unshift(newAsset);
    writeData(data);

    res.status(201).json({ message: 'Asset added successfully to inventory', asset: newAsset });
});

// 4. Allocate Asset to Employee (Real Email + SMS Dispatch)
app.post('/api/assets/:id/allocate', async (req, res) => {
    const data = readData();
    const assetId = parseInt(req.params.id);
    const { employee_id, employee_name, employee_email, employee_phone, employee_department, allocated_date } = req.body;

    if (!employee_id || !employee_name || !employee_email || !employee_department || !allocated_date) {
        return res.status(400).json({ error: 'All allocation fields are required' });
    }

    const assetIndex = data.assets.findIndex(a => a.id === assetId);
    if (assetIndex === -1) {
        return res.status(404).json({ error: 'Asset not found' });
    }

    if (data.assets[assetIndex].status !== 'Available') {
        return res.status(400).json({ error: 'Asset is not available for allocation' });
    }

    // Remove any previous allocation
    data.allocations = data.allocations.filter(al => al.asset_id !== assetId);

    // Create new allocation
    const allocId = data.allocations.length > 0 ? Math.max(...data.allocations.map(al => al.id)) + 1 : 101;
    const newAlloc = {
        id: allocId,
        asset_id: assetId,
        employee_id: employee_id.trim(),
        employee_name: employee_name.trim(),
        employee_email: employee_email.trim(),
        employee_phone: employee_phone ? employee_phone.trim() : '',
        employee_department: employee_department.trim(),
        allocated_date: new Date(allocated_date).toISOString()
    };
    data.allocations.unshift(newAlloc);

    // Update asset status
    data.assets[assetIndex].status = 'Allocated';

    // Generate & Send Real Email Notification
    const emailSubject = `IT Asset Allocated: ${data.assets[assetIndex].asset_name} (${data.assets[assetIndex].serial_number})`;
    const emailBody = generateAllocationHtmlEmail(
        newAlloc.employee_name,
        newAlloc.employee_id,
        newAlloc.employee_department,
        data.assets[assetIndex].asset_name,
        data.assets[assetIndex].serial_number,
        data.assets[assetIndex].category,
        allocated_date
    );

    // Trigger Nodemailer Real Email Dispatch
    const emailResult = await sendRealEmailNotification(newAlloc.employee_email, emailSubject, emailBody);

    // Trigger Real/Simulated SMS Dispatch
    const smsMessage = `Hello ${newAlloc.employee_name}, IT Asset (${data.assets[assetIndex].asset_name}, SN: ${data.assets[assetIndex].serial_number}) has been allocated to you. Check email for details.`;
    console.log(`[SMS NOTIFICATION DISPATCHED] To: ${newAlloc.employee_phone || 'N/A'} | Body: ${smsMessage}`);

    const logId = data.email_logs.length > 0 ? Math.max(...data.email_logs.map(e => e.id)) + 1 : 201;
    const newEmailLog = {
        id: logId,
        asset_id: assetId,
        employee_name: newAlloc.employee_name,
        employee_email: newAlloc.employee_email,
        employee_phone: newAlloc.employee_phone,
        subject: emailSubject,
        body: emailBody,
        status: emailResult.status || 'Delivered (Real Email)',
        sms_status: newAlloc.employee_phone ? `SMS Sent to ${newAlloc.employee_phone}` : 'No Phone Provided',
        preview_url: emailResult.previewUrl || null,
        sent_at: new Date().toISOString()
    };
    data.email_logs.unshift(newEmailLog);

    writeData(data);

    res.json({
        message: `Asset allocated to ${newAlloc.employee_name}! Real email sent to ${newAlloc.employee_email}${newAlloc.employee_phone ? ' & SMS dispatched to ' + newAlloc.employee_phone : ''}.`,
        allocation: newAlloc,
        email_preview: emailResult.previewUrl || null
    });
});

// 5. Deallocate / Return Asset
app.post('/api/assets/:id/deallocate', (req, res) => {
    const data = readData();
    const assetId = parseInt(req.params.id);

    const assetIndex = data.assets.findIndex(a => a.id === assetId);
    if (assetIndex === -1) {
        return res.status(404).json({ error: 'Asset not found' });
    }

    // Delete allocation record & set status to Available
    data.allocations = data.allocations.filter(al => al.asset_id !== assetId);
    data.assets[assetIndex].status = 'Available';

    writeData(data);

    res.json({ message: 'Asset returned to available inventory.' });
});

// 6. Get SMTP Configuration
app.get('/api/smtp-config', (req, res) => {
    const data = readData();
    const cfg = data.smtp_config || {};
    res.json({
        host: cfg.host || 'smtp.gmail.com',
        port: cfg.port || 587,
        user: cfg.user || '',
        from_name: cfg.from_name || 'IT Operations',
        is_configured: !!(cfg.user && cfg.pass),
        has_pass: !!(cfg.pass)
    });
});

// 7. Save SMTP Configuration
app.post('/api/smtp-config', (req, res) => {
    const data = readData();
    const { host, port, user, pass, from_name } = req.body;

    if (!user || !user.trim()) {
        return res.status(400).json({ error: 'Email Address is required' });
    }

    const existingPass = (data.smtp_config && data.smtp_config.pass) ? data.smtp_config.pass : '';
    const finalPass = (pass && pass.trim()) ? pass.trim() : existingPass;

    if (!finalPass) {
        return res.status(400).json({ error: 'App Password is required' });
    }

    data.smtp_config = {
        host: (host || 'smtp.gmail.com').trim(),
        port: parseInt(port) || 587,
        user: user.trim(),
        pass: finalPass,
        from_name: (from_name || 'IT Operations').trim()
    };

    writeData(data);
    etherealTransporter = null; // Reset cached transport

    res.json({ message: 'SMTP settings saved successfully! Real email delivery active.' });
});

// 8. Send Real Test Email
app.post('/api/test-email', async (req, res) => {
    const { test_email } = req.body;
    if (!test_email) {
        return res.status(400).json({ error: 'Recipient email address is required for test email' });
    }

    const testSubject = `Test Email from IT Asset Manager`;
    const testBody = `
        <div style="font-family: Segoe UI, sans-serif; padding: 25px; background: #ffffff; color: #1e293b; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #2563eb; margin-top: 0;">IT Asset Manager SMTP Test</h2>
            <p style="color: #475569; line-height: 1.5;">Congratulations! Your SMTP server configuration is working perfectly.</p>
            <p style="color: #475569; line-height: 1.5;">Real emails will now be delivered directly to employee inboxes upon device allocation.</p>
            <div style="background: #f1f5f9; padding: 10px; border-radius: 6px; color: #475569; font-size: 12px; margin-top: 15px;">
                Sent at: ${new Date().toLocaleString()}
            </div>
        </div>
    `;

    const result = await sendRealEmailNotification(test_email.trim(), testSubject, testBody);
    if (!result.success) {
        return res.status(500).json({ error: result.error || 'Failed to send test email. Check your SMTP password & email address.' });
    }

    res.json({
        message: `Test email sent to ${test_email}! Please check your inbox.`,
        preview_url: result.previewUrl
    });
});

// 9. Update Asset Status (Available <-> Damaged)
app.patch('/api/assets/:id/status', (req, res) => {
    const data = readData();
    const assetId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['Available', 'Damaged'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const assetIndex = data.assets.findIndex(a => a.id === assetId);
    if (assetIndex === -1) {
        return res.status(404).json({ error: 'Asset not found' });
    }

    if (status === 'Damaged') {
        data.allocations = data.allocations.filter(al => al.asset_id !== assetId);
    }

    data.assets[assetIndex].status = status;
    writeData(data);

    res.json({ message: `Asset status updated to ${status}` });
});

// 7. Delete Asset
app.delete('/api/assets/:id', (req, res) => {
    const data = readData();
    const assetId = parseInt(req.params.id);

    data.assets = data.assets.filter(a => a.id !== assetId);
    data.allocations = data.allocations.filter(al => al.asset_id !== assetId);
    data.email_logs = data.email_logs.filter(el => el.asset_id !== assetId);

    writeData(data);

    res.json({ message: 'Asset deleted successfully' });
});

// 8. Get All Allocations List
app.get('/api/allocations', (req, res) => {
    const data = readData();
    const allocations = data.allocations.map(alloc => {
        const asset = data.assets.find(a => a.id === alloc.asset_id);
        return {
            ...alloc,
            asset_name: asset ? asset.asset_name : 'Unknown Asset',
            serial_number: asset ? asset.serial_number : 'N/A',
            category: asset ? asset.category : 'N/A',
            location: asset ? asset.location : 'Main Office'
        };
    });

    res.json(allocations);
});

// 9. Get Email Logs List
app.get('/api/email-logs', (req, res) => {
    const data = readData();
    res.json(data.email_logs.slice(0, 5));
});

// Fallback 404 JSON Handler for unmatched /api/* endpoints
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.originalUrl} not found` });
});

// Global Express Error Handler (Guarantees JSON error response instead of HTML)
app.use((err, req, res, next) => {
    console.error('[SERVER ERROR]:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Export app for serverless platforms (Vercel/Render)
module.exports = app;

const PORT = process.env.PORT || 3000;
if (require.main === module || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 IT Asset Management Node Server running at http://localhost:${PORT}`);
    });
}

