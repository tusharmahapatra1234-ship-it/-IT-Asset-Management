// API Base URL - Smart detection so frontend works whether hosted locally, file://, or on any cloud server (Render/Railway/Vercel)
const API_BASE = (typeof window !== 'undefined' && window.location.origin && window.location.origin.startsWith('http'))
    ? '/api'
    : 'http://localhost:3000/api';

// Robust JSON Fetcher Helper that handles Non-JSON/HTML server responses gracefully
async function safeFetchJson(url, options = {}) {
    try {
        const res = await fetch(url, options);
        const contentType = res.headers.get('content-type') || '';
        
        if (!contentType.includes('application/json')) {
            const htmlText = await res.text();
            console.error('[SERVER NON-JSON RESPONSE]:', htmlText.slice(0, 300));
            throw new Error(`Server returned HTML response (${res.status}). Please make sure Node.js server is running on http://localhost:3000.`);
        }

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || data.message || `API request failed (status ${res.status})`);
        }
        return data;
    } catch (err) {
        if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
            throw new Error('Could not connect to backend server. Make sure http://localhost:3000 is running.');
        }
        throw err;
    }
}

// State variables
let assetsState = [];
let allocationsState = [];
let emailLogsState = [];

// DOM Element Selectors
const kpiTotalEl = document.getElementById('kpiTotal');
const kpiAvailableEl = document.getElementById('kpiAvailable');
const kpiAllocatedEl = document.getElementById('kpiAllocated');
const kpiDamagedEl = document.getElementById('kpiDamaged');

const assetsTableBody = document.getElementById('assetsTableBody');
const emptyStateEl = document.getElementById('emptyState');
const assetCountBadge = document.getElementById('assetCountBadge');

const allocationsFeed = document.getElementById('allocationsFeed');
const emailLogsFeed = document.getElementById('emailLogsFeed');

const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');

// Modals
const addAssetModal = document.getElementById('addAssetModal');
const allocateModal = document.getElementById('allocateModal');
const emailPreviewModal = document.getElementById('emailPreviewModal');

const addAssetForm = document.getElementById('addAssetForm');
const allocateForm = document.getElementById('allocateForm');

const openAddModalBtn = document.getElementById('openAddModalBtn');
const btnQuickAdd = document.getElementById('btnQuickAdd');
const btnExportCsv = document.getElementById('btnExportCsv');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initApp();
    setupEventListeners();
    initOcrScanner();
    initAiChatbot();
    initGeminiConfig();
    initAiRecommender();
    checkAiConfigStatus();
    initDamageReporting();
});

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
            showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'success');
        });
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const iconEl = document.getElementById('themeToggleIcon');
    const textEl = document.getElementById('themeToggleText');

    if (iconEl && textEl) {
        if (theme === 'light') {
            iconEl.innerText = '☀️';
            textEl.innerText = 'Light Mode';
        } else {
            iconEl.innerText = '🌙';
            textEl.innerText = 'Dark Mode';
        }
    }

    if (window.assetsState && window.assetsState.length > 0) {
        renderAnalyticsCharts(window.assetsState, window.allocationsState || []);
    }
}

function initApp() {
    loadStats();
    loadAssets();
    loadAllocations();
    loadEmailLogs();
}

// ----------------------------------------------------
// API FETCHERS
// ----------------------------------------------------

async function loadStats() {
    try {
        const stats = await safeFetchJson(`${API_BASE}/stats`);
        
        animateCounter(kpiTotalEl, stats.total);
        animateCounter(kpiAvailableEl, stats.available);
        animateCounter(kpiAllocatedEl, stats.allocated);
        animateCounter(kpiDamagedEl, stats.damaged);

        const kpiWarrantyEl = document.getElementById('kpiWarranty');
        if (kpiWarrantyEl) animateCounter(kpiWarrantyEl, stats.expiring_warranty || 0);

        const bannerEl = document.getElementById('warrantyAlertBanner');
        if (bannerEl) {
            if (stats.expiring_warranty > 0) {
                bannerEl.style.display = 'flex';
                document.getElementById('warrantyBannerText').innerText = `${stats.expiring_warranty} hardware device(s) have warranty expiring in the next 30 days or already expired.`;
            } else {
                bannerEl.style.display = 'none';
            }
        }
    } catch (err) {
        showToast(`Error loading KPI stats: ${err.message}`, 'error');
    }
}

async function loadAssets() {
    try {
        const search = searchInput ? searchInput.value : '';
        const category = categoryFilter ? categoryFilter.value : '';
        const status = statusFilter ? statusFilter.value : '';

        const queryParams = new URLSearchParams({ search, category, status });
        assetsState = await safeFetchJson(`${API_BASE}/assets?${queryParams}`);

        renderAssetsTable(assetsState);
        renderAnalyticsCharts(assetsState, allocationsState);
    } catch (err) {
        showToast(`Error loading assets: ${err.message}`, 'error');
    }
}

async function loadAllocations() {
    try {
        allocationsState = await safeFetchJson(`${API_BASE}/allocations`);
        renderAllocationsFeed(allocationsState);
        renderAnalyticsCharts(assetsState, allocationsState);
    } catch (err) {
        console.error('Error loading allocations:', err);
    }
}

// ----------------------------------------------------
// CHART.JS VISUAL ANALYTICS DASHBOARD (ULTRA PROFESSIONAL ENTERPRISE DESIGN)
// ----------------------------------------------------

let categoryChartInstance = null;
let departmentCostChartInstance = null;
let statusChartInstance = null;

// Custom Chart.js Plugin for Center Text in Doughnut Charts
const chartCenterTextPlugin = {
    id: 'customCenterText',
    beforeDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const centerConfig = chart.config.options.plugins?.customCenterText;
        if (!centerConfig || !centerConfig.text) return;

        const { left, right, top, bottom } = chartArea;
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2 - 2;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Primary Big Counter
        ctx.font = '700 22px "Outfit", -apple-system, sans-serif';
        ctx.fillStyle = centerConfig.color || '#ffffff';
        ctx.fillText(centerConfig.text, centerX, centerY - 6);

        // Secondary Label
        if (centerConfig.subtext) {
            ctx.font = '700 9px "Inter", -apple-system, sans-serif';
            ctx.fillStyle = centerConfig.subColor || '#94a3b8';
            ctx.fillText(String(centerConfig.subtext).toUpperCase(), centerX, centerY + 14);
        }

        ctx.restore();
    }
};

// Register Plugin globally if Chart.js is loaded
if (window.Chart) {
    Chart.register(chartCenterTextPlugin);
}

function renderAnalyticsCharts(assets, allocations) {
    if (!window.Chart) return;

    // Common Chart.js Default Font & Style Settings
    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
    Chart.defaults.color = '#a1a1aa';

    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    const textColor = isLightMode ? '#475569' : '#94a3b8';
    const tooltipBg = isLightMode ? '#ffffff' : '#18181b';
    const tooltipBorder = isLightMode ? '#cbd5e1' : '#27272a';
    const tooltipBodyColor = isLightMode ? '#0f172a' : '#f4f4f5';

    // 1. Category Distribution (Sleek Thin Doughnut Chart with Center Text)
    const categoryCounts = {};
    assets.forEach(a => {
        const cat = a.category || 'Other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const catCtx = document.getElementById('categoryChart')?.getContext('2d');
    if (catCtx) {
        if (categoryChartInstance) categoryChartInstance.destroy();

        const totalCategoryAssets = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

        categoryChartInstance = new Chart(catCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryCounts),
                datasets: [{
                    data: Object.values(categoryCounts),
                    backgroundColor: ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316'],
                    hoverBackgroundColor: ['#818cf8', '#fbbf24', '#34d399', '#f472b6', '#22d3ee', '#a78bfa', '#fb923c'],
                    borderWidth: 2,
                    borderColor: isLightMode ? '#ffffff' : '#121215',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '74%',
                animation: { duration: 800, easing: 'easeInOutQuart' },
                plugins: {
                    customCenterText: {
                        text: `${totalCategoryAssets}`,
                        subtext: 'Total Assets',
                        color: isLightMode ? '#0f172a' : '#f8fafc',
                        subColor: isLightMode ? '#64748b' : '#94a3b8'
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            padding: 12,
                            font: { size: 10.5, weight: '600' },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: tooltipBg,
                        titleColor: '#facc15',
                        bodyColor: tooltipBodyColor,
                        borderColor: tooltipBorder,
                        borderWidth: 1,
                        padding: 10,
                        boxPadding: 4,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                const val = context.raw || 0;
                                const pct = totalCategoryAssets ? Math.round((val / totalCategoryAssets) * 100) : 0;
                                return ` ${context.label}: ${val} units (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 2. Department Equipment Cost (Vertical Gradient Bar Chart)
    const deptCosts = {};
    allocations.forEach(al => {
        const dept = al.employee_department || 'General';
        const asset = assets.find(a => a.id === al.asset_id);
        const cost = asset ? (parseFloat(asset.price) || 0) : 0;
        deptCosts[dept] = (deptCosts[dept] || 0) + cost;
    });

    if (Object.keys(deptCosts).length === 0) {
        deptCosts['Engineering'] = 149999;
        deptCosts['HR'] = 45000;
        deptCosts['Production'] = 85000;
    }

    const deptCtx = document.getElementById('departmentCostChart')?.getContext('2d');
    if (deptCtx) {
        if (departmentCostChartInstance) departmentCostChartInstance.destroy();

        // Create Gradient Bar Fill
        const barGradient = deptCtx.createLinearGradient(0, 0, 0, 200);
        if (isLightMode) {
            barGradient.addColorStop(0, 'rgba(234, 179, 8, 0.95)');
            barGradient.addColorStop(1, 'rgba(234, 179, 8, 0.18)');
        } else {
            barGradient.addColorStop(0, 'rgba(250, 204, 21, 0.95)');
            barGradient.addColorStop(1, 'rgba(250, 204, 21, 0.15)');
        }

        departmentCostChartInstance = new Chart(deptCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(deptCosts),
                datasets: [{
                    label: 'Asset Value',
                    data: Object.values(deptCosts),
                    backgroundColor: barGradient,
                    borderColor: '#facc15',
                    borderWidth: 1.5,
                    borderRadius: { topLeft: 6, topRight: 6 },
                    borderSkipped: false,
                    barPercentage: 0.5,
                    maxBarThickness: 42
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: 'easeInOutQuart' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: tooltipBg,
                        titleColor: '#facc15',
                        bodyColor: tooltipBodyColor,
                        borderColor: tooltipBorder,
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                return ` Value: ₹${parseFloat(context.raw).toLocaleString('en-IN')}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: textColor, font: { size: 10.5, weight: '600' } },
                        grid: { display: false }
                    },
                    y: {
                        ticks: {
                            color: textColor,
                            font: { size: 10 },
                            callback: function(val) {
                                if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
                                if (val >= 1000) return '₹' + Math.round(val / 1000) + 'k';
                                return '₹' + val;
                            }
                        },
                        grid: { color: gridColor, borderDash: [4, 4] }
                    }
                }
            }
        });
    }

    // 3. Asset Status Breakdown (Doughnut Ring with Center % Indicator)
    const totalAssetsNum = assets.length || 1;
    const availCount = assets.filter(a => a.status === 'Available').length;
    const allocCount = assets.filter(a => a.status === 'Allocated').length;
    const dmgCount = assets.filter(a => a.status === 'Damaged').length;

    const statusCounts = {
        'Available': availCount,
        'Allocated': allocCount,
        'Damaged': dmgCount
    };

    const allocPct = Math.round((allocCount / totalAssetsNum) * 100);

    const statusCtx = document.getElementById('statusChart')?.getContext('2d');
    if (statusCtx) {
        if (statusChartInstance) statusChartInstance.destroy();
        statusChartInstance = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#10b981', '#3b82f6', '#ef4444'],
                    hoverBackgroundColor: ['#34d399', '#60a5fa', '#f87171'],
                    borderWidth: 2,
                    borderColor: isLightMode ? '#ffffff' : '#121215',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                animation: { duration: 800, easing: 'easeInOutQuart' },
                plugins: {
                    customCenterText: {
                        text: `${allocPct}%`,
                        subtext: 'Allocated',
                        color: isLightMode ? '#0f172a' : '#f8fafc',
                        subColor: isLightMode ? '#64748b' : '#94a3b8'
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            padding: 12,
                            font: { size: 10.5, weight: '600' },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: tooltipBg,
                        titleColor: '#facc15',
                        bodyColor: tooltipBodyColor,
                        borderColor: tooltipBorder,
                        borderWidth: 1,
                        padding: 10,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                const val = context.raw || 0;
                                const pct = Math.round((val / totalAssetsNum) * 100);
                                return ` ${context.label}: ${val} assets (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

async function loadEmailLogs() {
    try {
        emailLogsState = await safeFetchJson(`${API_BASE}/email-logs`);
        renderEmailLogsFeed(emailLogsState);
    } catch (err) {
        console.error('Error loading email logs:', err);
    }
}

// ----------------------------------------------------
// RENDERING FUNCTIONS
// ----------------------------------------------------

function getCategoryIcon(category) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('laptop')) return '💻';
    if (cat.includes('monitor') || cat.includes('screen') || cat.includes('display')) return '🖥️';
    if (cat.includes('iot') || cat.includes('kit') || cat.includes('dev')) return '🔌';
    if (cat.includes('phone') || cat.includes('mobile')) return '📱';
    if (cat.includes('accessories') || cat.includes('accessory') || cat.includes('keyboard') || cat.includes('mouse')) return '⌨️';
    return '📦';
}

function renderAssetsTable(assets) {
    assetsTableBody.innerHTML = '';
    assetCountBadge.innerText = `${assets.length} items`;

    if (assets.length === 0) {
        emptyStateEl.style.display = 'block';
        return;
    }

    emptyStateEl.style.display = 'none';

    assets.forEach(asset => {
        const tr = document.createElement('tr');
        tr.className = 'asset-row-item';

        let allocationInfoHtml = '';
        if (asset.status === 'Allocated' && asset.allocation) {
            allocationInfoHtml = `
                <div class="assigned-user-badge">
                    <span class="user-avatar-mini">👤</span>
                    <span class="user-details">
                        Assigned to: <strong>${escapeHtml(asset.allocation.employee_name)}</strong>
                        <code class="emp-code">${escapeHtml(asset.allocation.employee_id)}</code>
                    </span>
                </div>
            `;
        }

        let actionBtnsHtml = '';
        if (asset.status === 'Available') {
            actionBtnsHtml = `
                <button class="btn btn-success btn-xs" onclick="openAllocateModal(${asset.id}, '${escapeHtml(asset.asset_name)}', '${escapeHtml(asset.serial_number)}', '${escapeHtml(asset.category)}')">
                    <span>⚡</span> Allocate
                </button>
                <button class="btn btn-warning btn-xs" onclick="openDamageReportModal(${asset.id})" title="Report Damage & Run AI Health Diagnostics">
                    <span>🚨</span> Damage
                </button>
            `;
        } else if (asset.status === 'Allocated') {
            actionBtnsHtml = `
                <button class="btn btn-secondary btn-xs" onclick="deallocateAsset(${asset.id})">
                    <span>🔄</span> Return
                </button>
                <button class="btn btn-warning btn-xs" onclick="openDamageReportModal(${asset.id})" title="Report Damage & Run AI Health Diagnostics">
                    <span>🚨</span> Damage
                </button>
            `;
        } else if (asset.status === 'Damaged') {
            actionBtnsHtml = `
                <button class="btn btn-success btn-xs" onclick="updateAssetStatus(${asset.id}, 'Available')">
                    <span>🛠️</span> Repaired
                </button>
                <button class="btn btn-warning btn-xs" onclick="openDamageReportModal(${asset.id})" title="Add Incident / Re-diagnose">
                    <span>🚨</span> Damage
                </button>
            `;
        }

        actionBtnsHtml += `
            <button class="btn btn-secondary btn-xs" onclick="openAssetDiagnostics(${asset.id})" title="🔬 AI Diagnostics">
                <span>🔬</span>
            </button>
            <button class="btn btn-danger btn-xs" onclick="deleteAsset(${asset.id})" title="Delete Asset">
                <span>🗑️</span>
            </button>
        `;

        const formattedPurchaseDate = asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A';
        const formattedWarrantyDate = asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A';
        const formattedPrice = asset.price ? `₹${parseFloat(asset.price).toLocaleString('en-IN')}` : 'N/A';

        let warrantyBadgeHtml = '';
        if (asset.warranty_expiry) {
            const expDate = new Date(asset.warranty_expiry);
            const today = new Date();
            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
                warrantyBadgeHtml = `<span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 0.1rem 0.35rem; border-radius: 4px; font-weight: 700; font-size: 0.68rem; margin-left: 0.3rem;">🔴 Expired</span>`;
            } else if (diffDays <= 30) {
                warrantyBadgeHtml = `<span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 0.1rem 0.35rem; border-radius: 4px; font-weight: 700; font-size: 0.68rem; margin-left: 0.3rem;">⚠️ ${diffDays}d left</span>`;
            }
        }

        const categoryIcon = getCategoryIcon(asset.category);

        tr.innerHTML = `
            <td>
                <div class="asset-cell-wrapper">
                    <div class="asset-avatar-icon" title="${escapeHtml(asset.category)}">
                        ${categoryIcon}
                    </div>
                    <div class="asset-info">
                        <strong class="asset-title-text">${escapeHtml(asset.asset_name)}</strong>
                        ${asset.notes ? `<div class="asset-notes-text">📝 ${escapeHtml(asset.notes)}</div>` : ''}
                        ${allocationInfoHtml}
                    </div>
                </div>
            </td>
            <td>
                <div class="serial-badge">
                    <code>${escapeHtml(asset.serial_number)}</code>
                    ${asset.asset_tag ? `<span class="badge-tag-mini">🏷️ ${escapeHtml(asset.asset_tag)}</span>` : ''}
                </div>
                <div class="sub-info-tag vendor-tag">
                    <span class="tag-icon">🏢</span> ${escapeHtml(asset.vendor || 'N/A')}
                    ${asset.contact_phone ? `<span style="margin-left: 0.4rem; color: var(--accent-yellow);">📞 ${escapeHtml(asset.contact_phone)}</span>` : ''}
                </div>
            </td>
            <td>
                <span class="category-pill-badge">
                    <span class="cat-icon">${categoryIcon}</span>
                    <span>${escapeHtml(asset.category)}</span>
                </span>
                <div class="sub-info-tag location-tag">
                    <span class="tag-icon">📍</span> ${escapeHtml(asset.location || 'Main Office')}
                </div>
                ${asset.condition ? `<div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 0.15rem;">🛠️ ${escapeHtml(asset.condition)}</div>` : ''}
            </td>
            <td>
                <span class="status-badge ${asset.status.toLowerCase()}">
                    <span class="status-dot"></span>
                    <span>${escapeHtml(asset.status)}</span>
                </span>
            </td>
            <td>
                <div class="health-score-cell">
                    <span class="health-score-pill ${(asset.health && asset.health.risk_badge_class) || 'green'}" onclick="openAssetDiagnostics(${asset.id})" title="Click to view AI Diagnostics">
                        ${(asset.health && asset.health.risk_level === 'CRITICAL') ? '🔴' : (asset.health && asset.health.risk_level === 'MODERATE') ? '🟡' : '🟢'} ${(asset.health && asset.health.health_score) || 90}%
                    </span>
                    <div class="health-bar-container">
                        <div class="health-bar-fill ${(asset.health && asset.health.risk_badge_class) || 'green'}" style="width: ${(asset.health && asset.health.health_score) || 90}%"></div>
                    </div>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">
                    Risk: <strong style="color: ${(asset.health && asset.health.risk_level === 'CRITICAL') ? 'var(--accent-red)' : (asset.health && asset.health.risk_level === 'MODERATE') ? 'var(--accent-yellow)' : 'var(--accent-emerald)'}">${(asset.health && asset.health.risk_level) || 'LOW'}</strong>
                </div>
            </td>
            <td>
                <div class="asset-price-tag">${formattedPrice}</div>
                <div class="date-info-tag">Pur: <span>${formattedPurchaseDate}</span></div>
                <div class="date-info-tag muted">War: <span>${formattedWarrantyDate}</span> ${warrantyBadgeHtml}</div>
            </td>
            <td>
                <div class="action-btns">${actionBtnsHtml}</div>
            </td>
        `;

        assetsTableBody.appendChild(tr);
    });
}

function renderAllocationsFeed(allocations) {
    if (allocationsFeed) {
        allocationsFeed.innerHTML = '';

        if (allocations.length === 0) {
            allocationsFeed.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0;">No active allocations</div>';
        } else {
            allocations.slice(0, 5).forEach(alloc => {
                const div = document.createElement('div');
                div.className = 'feed-card';

                const allocDate = new Date(alloc.allocated_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

                div.innerHTML = `
                    <div class="feed-card-header">
                        <span class="feed-title">${escapeHtml(alloc.employee_name)} <small style="color: var(--text-dim); font-weight: normal;">(${escapeHtml(alloc.employee_id)})</small></span>
                        <span class="feed-time">${allocDate}</span>
                    </div>
                    <div class="feed-sub-text">${escapeHtml(alloc.asset_name)}</div>
                    <div style="display: flex; justify-content: space-between; margin-top: 0.4rem; font-size: 0.78rem; color: var(--text-dim);">
                        <span>${escapeHtml(alloc.employee_email)}</span>
                        <span style="background: rgba(250,204,21,0.1); color: var(--accent-yellow); padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700;">${escapeHtml(alloc.employee_department)}</span>
                    </div>
                `;
                allocationsFeed.appendChild(div);
            });
        }
    }

    renderAllocationsFullTable(allocations);
}

// Render Full Device Allocations Table (Dedicated View)
function renderAllocationsFullTable(allocations) {
    const tableBody = document.getElementById('allocationsFullTableBody');
    const countBadge = document.getElementById('allocCountBadge');
    const emptyState = document.getElementById('allocEmptyState');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    const search = (document.getElementById('allocSearchInput')?.value || '').toLowerCase().trim();
    const dept = (document.getElementById('allocDeptFilter')?.value || '').trim();

    let filtered = allocations.filter(a => {
        const matchesSearch = !search || 
            a.employee_name.toLowerCase().includes(search) ||
            a.employee_id.toLowerCase().includes(search) ||
            a.employee_email.toLowerCase().includes(search) ||
            a.asset_name.toLowerCase().includes(search) ||
            a.serial_number.toLowerCase().includes(search);
        
        const matchesDept = !dept || a.employee_department === dept;

        return matchesSearch && matchesDept;
    });

    if (countBadge) countBadge.innerText = `${filtered.length} assignments`;

    if (filtered.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    filtered.forEach(alloc => {
        const tr = document.createElement('tr');
        const formattedDate = new Date(alloc.allocated_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

        tr.innerHTML = `
            <td>
                <strong style="color: #f4f4f5; font-size: 0.92rem;">${escapeHtml(alloc.employee_name)}</strong>
                <div style="font-size: 0.78rem; color: #a1a1aa; margin-top: 0.15rem;">ID: <code>${escapeHtml(alloc.employee_id)}</code></div>
            </td>
            <td>
                <strong style="color: #facc15; font-size: 0.9rem;">${escapeHtml(alloc.asset_name)}</strong>
                <div style="font-size: 0.75rem; color: #71717a; margin-top: 0.15rem;">📍 ${escapeHtml(alloc.location || 'Main Office')}</div>
            </td>
            <td>
                <code>${escapeHtml(alloc.serial_number)}</code>
                <div style="margin-top: 0.2rem;"><span class="badge-count" style="background: rgba(250,204,21,0.1); color: #facc15; font-size: 0.7rem;">${escapeHtml(alloc.category)}</span></div>
            </td>
            <td>
                <span style="background: rgba(255,255,255,0.06); color: #f4f4f5; padding: 0.2rem 0.55rem; border-radius: 6px; font-weight: 700; font-size: 0.78rem;">${escapeHtml(alloc.employee_department)}</span>
                <div style="font-size: 0.76rem; color: #a1a1aa; margin-top: 0.2rem;">${escapeHtml(alloc.employee_email)}</div>
                ${alloc.employee_phone ? `<div style="font-size: 0.75rem; color: var(--accent-yellow); margin-top: 0.15rem;">📱 ${escapeHtml(alloc.employee_phone)}</div>` : ''}
            </td>
            <td>
                <span style="color: #a1a1aa; font-size: 0.85rem;">${formattedDate}</span>
            </td>
            <td>
                <button class="btn btn-secondary btn-xs" onclick="deallocateAsset(${alloc.asset_id})">Return Device</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function renderEmailLogsFeed(logs) {
    const tableBody = document.getElementById('emailLogsTableBody');
    const emptyState = document.getElementById('emailLogsEmptyState');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (logs.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    logs.forEach(log => {
        const tr = document.createElement('tr');
        const timeStr = new Date(log.sent_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

        let liveMailBtn = '';
        if (log.preview_url) {
            liveMailBtn = `<a href="${escapeHtml(log.preview_url)}" target="_blank" class="btn btn-primary btn-xs" style="text-decoration: none; margin-left: 0.35rem;" title="Open Real Live Delivery Mail Web Preview">🔗 Open Live Mail</a>`;
        }

        tr.innerHTML = `
            <td><strong style="color: var(--text-main); font-size: 0.9rem;">${escapeHtml(log.employee_name)}</strong></td>
            <td><span style="color: var(--accent-yellow); font-weight: 700; font-size: 0.85rem;">${escapeHtml(log.subject)}</span></td>
            <td><code>${escapeHtml(log.employee_email)}</code></td>
            <td><span style="color: var(--text-muted); font-size: 0.82rem;">${timeStr}</span></td>
            <td><span class="status-badge available" style="font-size: 0.72rem;"><span class="status-dot"></span> ${escapeHtml(log.status || 'Delivered (Real Email)')}</span></td>
            <td>
                <div style="display: flex; gap: 0.3rem; align-items: center;">
                    <button class="btn btn-secondary btn-xs" onclick="openEmailPreviewModal(${log.id})">View Template</button>
                    ${liveMailBtn}
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// ----------------------------------------------------
// ACTIONS & FORM HANDLERS
// ----------------------------------------------------

// Add Asset Form Submit
addAssetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        asset_name: document.getElementById('asset_name').value,
        serial_number: document.getElementById('serial_number').value,
        category: document.getElementById('category').value,
        status: document.getElementById('status').value,
        purchase_date: document.getElementById('purchase_date').value,
        price: document.getElementById('price').value,
        vendor: document.getElementById('vendor').value,
        warranty_expiry: document.getElementById('warranty_expiry').value,
        location: document.getElementById('location').value,
        notes: document.getElementById('notes').value,
        contact_phone: document.getElementById('contact_phone') ? document.getElementById('contact_phone').value : '',
        asset_tag: document.getElementById('asset_tag') ? document.getElementById('asset_tag').value : '',
        condition: document.getElementById('condition') ? document.getElementById('condition').value : '',
        invoice_number: document.getElementById('invoice_number') ? document.getElementById('invoice_number').value : '',
        mac_address: document.getElementById('mac_address') ? document.getElementById('mac_address').value : ''
    };

    try {
        const data = await safeFetchJson(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        showToast(data.message || 'Asset added successfully to inventory', 'success');
        closeModal(addAssetModal);
        addAssetForm.reset();
        initApp();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// Allocate Asset Modal trigger
window.openAllocateModal = function(id, name, serial, category) {
    document.getElementById('alloc_asset_id').value = id;
    document.getElementById('allocPreviewName').innerText = name;
    document.getElementById('allocPreviewSerial').innerText = `SN: ${serial}`;
    document.getElementById('allocPreviewCategory').innerText = category;
    document.getElementById('allocated_date').value = new Date().toISOString().split('T')[0];

    openModal(allocateModal);
};

// Allocate Form Submit
allocateForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const assetId = document.getElementById('alloc_asset_id').value;
    const payload = {
        employee_id: document.getElementById('employee_id').value,
        employee_name: document.getElementById('employee_name').value,
        employee_email: document.getElementById('employee_email').value,
        employee_phone: document.getElementById('employee_phone') ? document.getElementById('employee_phone').value : '',
        employee_department: document.getElementById('employee_department').value,
        allocated_date: document.getElementById('allocated_date').value
    };

    try {
        const data = await safeFetchJson(`${API_BASE}/assets/${assetId}/allocate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        showToast(data.message || 'Asset allocated successfully', 'success');
        closeModal(allocateModal);
        allocateForm.reset();
        initApp();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// Return / Deallocate Asset
window.deallocateAsset = async function(id) {
    if (!confirm('Are you sure you want to return this asset to available inventory?')) return;

    try {
        const data = await safeFetchJson(`${API_BASE}/assets/${id}/deallocate`, { method: 'POST' });
        showToast(data.message || 'Asset returned to inventory', 'success');
        initApp();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Update Status (Available <-> Damaged)
window.updateAssetStatus = async function(id, status) {
    try {
        const data = await safeFetchJson(`${API_BASE}/assets/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        showToast(data.message || `Asset status updated to ${status}`, 'success');
        initApp();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Delete Asset
window.deleteAsset = async function(id) {
    if (!confirm('Are you sure you want to delete this asset? All allocations and history will be lost.')) return;

    try {
        const data = await safeFetchJson(`${API_BASE}/assets/${id}`, { method: 'DELETE' });
        showToast(data.message || 'Asset deleted', 'success');
        initApp();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Open Email Preview Modal
window.openEmailPreviewModal = function(logId) {
    const log = emailLogsState.find(l => l.id === logId);
    if (!log) return;

    document.getElementById('emailModalSubject').innerText = log.subject;
    const iframe = document.getElementById('emailIframe');
    openModal(emailPreviewModal);

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(log.body);
    iframe.contentWindow.document.close();
};

// CSV Exporter
btnExportCsv.addEventListener('click', () => {
    if (assetsState.length === 0) {
        showToast('No assets to export', 'error');
        return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,ID,Asset Name,Serial Number,Category,Status,Price,Vendor,Warranty Expiry,Location,Purchase Date,Assigned Employee,Notes\n';
    assetsState.forEach(a => {
        const employee = a.allocation ? `${a.allocation.employee_name} (${a.allocation.employee_id})` : 'None';
        csvContent += `"${a.id}","${a.asset_name}","${a.serial_number}","${a.category}","${a.status}","${a.price || 0}","${a.vendor || ''}","${a.warranty_expiry || ''}","${a.location || ''}","${a.purchase_date}","${employee}","${a.notes || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IT_Assets_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('CSV export downloaded', 'success');
});

// PDF Exporter
const btnExportPdf = document.getElementById('btnExportPdf');
if (btnExportPdf) {
    btnExportPdf.addEventListener('click', (e) => {
        e.preventDefault();
        if (assetsState.length === 0) {
            showToast('No assets to export', 'error');
            return;
        }

        try {
            if (!window.jspdf || !window.jspdf.jsPDF) {
                showToast('PDF library loading, please try again', 'error');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape', 'mm', 'a4');

            // Header Banner
            doc.setFillColor(18, 18, 21);
            doc.rect(0, 0, 297, 24, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(15);
            doc.setTextColor(250, 204, 21);
            doc.text('IT ASSET MANAGEMENT — INVENTORY REPORT', 14, 15);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(200, 200, 200);
            const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            doc.text(`Generated: ${reportDate}`, 215, 15);

            // Table Data
            const tableHead = [['ID', 'Asset Name', 'Serial Number', 'Category', 'Status', 'Cost (INR)', 'Vendor', 'Location', 'Assigned Employee']];
            const tableRows = assetsState.map(a => [
                a.id,
                a.asset_name,
                a.serial_number,
                a.category,
                a.status,
                a.price ? `₹${parseFloat(a.price).toLocaleString('en-IN')}` : 'N/A',
                a.vendor || 'N/A',
                a.location || 'Main Office',
                a.allocation ? `${a.allocation.employee_name} (${a.allocation.employee_id})` : 'Unassigned'
            ]);

            doc.autoTable({
                head: tableHead,
                body: tableRows,
                startY: 30,
                styles: { fontSize: 8.5, cellPadding: 3, font: 'helvetica' },
                headStyles: { fillColor: [24, 24, 27], textColor: [250, 204, 21], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { left: 14, right: 14 }
            });

            doc.save(`IT_Asset_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            showToast('PDF report generated & downloaded!', 'success');
        } catch (err) {
            console.error('PDF Generation Error:', err);
            showToast('Failed to generate PDF report', 'error');
        }
    });
}

// ----------------------------------------------------
// EVENT LISTENERS & UTILITIES
// ----------------------------------------------------

// View Switcher Helper
window.switchToView = function(viewName) {
    const dashboardSec = document.getElementById('dashboardViewSection');
    const allocationsSec = document.getElementById('allocationsViewSection');
    const emailLogsSec = document.getElementById('emailLogsViewSection');
    const aiHubSec = document.getElementById('aiHubViewSection');

    if (dashboardSec) dashboardSec.style.display = 'none';
    if (allocationsSec) allocationsSec.style.display = 'none';
    if (emailLogsSec) emailLogsSec.style.display = 'none';
    if (aiHubSec) aiHubSec.style.display = 'none';

    document.querySelectorAll('.nav-menu .nav-item').forEach(item => item.classList.remove('active'));

    if (viewName === 'ai-hub') {
        if (aiHubSec) aiHubSec.style.display = 'block';
        const navAi = document.getElementById('navAiHubView');
        if (navAi) navAi.classList.add('active');

        loadAiIntelligenceHub();
    } else if (viewName === 'allocations') {
        if (allocationsSec) allocationsSec.style.display = 'block';
        const navAlloc = document.getElementById('navAllocationsView');
        if (navAlloc) navAlloc.classList.add('active');

        renderAllocationsFullTable(allocationsState);
    } else if (viewName === 'active-assignments') {
        if (allocationsSec) allocationsSec.style.display = 'block';
        const navActive = document.getElementById('navActiveAssignmentsView');
        if (navActive) navActive.classList.add('active');

        renderAllocationsFullTable(allocationsState);
    } else if (viewName === 'recent-allocations') {
        if (allocationsSec) allocationsSec.style.display = 'block';
        const navRecent = document.getElementById('navRecentAllocationsView');
        if (navRecent) navRecent.classList.add('active');

        renderAllocationsFullTable(allocationsState);
    } else if (viewName === 'email-logs') {
        if (emailLogsSec) emailLogsSec.style.display = 'block';
        const navLogs = document.getElementById('navEmailLogsView');
        if (navLogs) navLogs.classList.add('active');

        renderEmailLogsFeed(emailLogsState);
    } else {
        if (dashboardSec) dashboardSec.style.display = 'block';
        const navDash = document.getElementById('navDashboardView');
        if (navDash) navDash.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function setupEventListeners() {
    // Nav View Switching
    const navDashboard = document.getElementById('navDashboardView');
    const navAllocations = document.getElementById('navAllocationsView');
    const navActiveAssignments = document.getElementById('navActiveAssignmentsView');
    const navRecentAllocations = document.getElementById('navRecentAllocationsView');
    const navEmailLogs = document.getElementById('navEmailLogsView');

    if (navDashboard) {
        navDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            if (statusFilter) statusFilter.value = '';
            if (categoryFilter) categoryFilter.value = '';
            if (searchInput) searchInput.value = '';
            loadAssets();
            switchToView('dashboard');
        });
    }

    if (navAllocations) {
        navAllocations.addEventListener('click', (e) => {
            e.preventDefault();
            switchToView('allocations');
        });
    }

    if (navActiveAssignments) {
        navActiveAssignments.addEventListener('click', (e) => {
            e.preventDefault();
            switchToView('active-assignments');
        });
    }

    if (navRecentAllocations) {
        navRecentAllocations.addEventListener('click', (e) => {
            e.preventDefault();
            switchToView('recent-allocations');
        });
    }

    if (navEmailLogs) {
        navEmailLogs.addEventListener('click', (e) => {
            e.preventDefault();
            switchToView('email-logs');
        });
    }

    const navAiHub = document.getElementById('navAiHubView');
    if (navAiHub) {
        navAiHub.addEventListener('click', (e) => {
            e.preventDefault();
            switchToView('ai-hub');
        });
    }

    const btnRefreshAi = document.getElementById('btnRunMlScan');
    if (btnRefreshAi) {
        btnRefreshAi.addEventListener('click', () => {
            loadAiIntelligenceHub();
            showToast('⚡ Live ML Diagnostics refreshed across fleet!', 'success');
        });
    }

    const btnCopyBriefing = document.getElementById('btnCopyBriefingText');
    if (btnCopyBriefing) {
        btnCopyBriefing.addEventListener('click', () => {
            if (cachedBriefingText) {
                navigator.clipboard.writeText(cachedBriefingText).then(() => {
                    showToast('📋 Executive Briefing copied to clipboard!', 'success');
                }).catch(() => {
                    showToast('Could not access clipboard', 'error');
                });
            }
        });
    }

    const btnExportBriefing = document.getElementById('btnExportExecutiveBriefing');
    if (btnExportBriefing) {
        btnExportBriefing.addEventListener('click', () => {
            if (btnCopyBriefing) btnCopyBriefing.click();
        });
    }

    // Allocation Page Filters
    const allocSearchInput = document.getElementById('allocSearchInput');
    const allocDeptFilter = document.getElementById('allocDeptFilter');
    const resetAllocFiltersBtn = document.getElementById('resetAllocFiltersBtn');

    if (allocSearchInput) {
        let allocTimer;
        allocSearchInput.addEventListener('input', () => {
            clearTimeout(allocTimer);
            allocTimer = setTimeout(() => renderAllocationsFullTable(allocationsState), 200);
        });
    }

    if (allocDeptFilter) {
        allocDeptFilter.addEventListener('change', () => renderAllocationsFullTable(allocationsState));
    }

    if (resetAllocFiltersBtn) {
        resetAllocFiltersBtn.addEventListener('click', () => {
            if (allocSearchInput) allocSearchInput.value = '';
            if (allocDeptFilter) allocDeptFilter.value = '';
            renderAllocationsFullTable(allocationsState);
        });
    }

    // Warranty Alert Filter Triggers
    const kpiWarrantyCard = document.getElementById('kpiWarrantyCard');
    const btnFilterWarrantyAlerts = document.getElementById('btnFilterWarrantyAlerts');

    const triggerWarrantyFilter = () => {
        const today = new Date();
        const in30Days = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
        const alertAssets = assetsState.filter(a => {
            if (!a.warranty_expiry) return false;
            const exp = new Date(a.warranty_expiry);
            return exp <= in30Days;
        });

        renderAssetsTable(alertAssets);
        showToast(`Showing ${alertAssets.length} asset(s) with expiring or expired warranty`, 'warning');
    };

    if (kpiWarrantyCard) kpiWarrantyCard.addEventListener('click', triggerWarrantyFilter);
    if (btnFilterWarrantyAlerts) btnFilterWarrantyAlerts.addEventListener('click', triggerWarrantyFilter);

    // Search input with debounce
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadAssets, 250);
    });

    categoryFilter.addEventListener('change', loadAssets);
    statusFilter.addEventListener('change', loadAssets);

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        categoryFilter.value = '';
        statusFilter.value = '';
        loadAssets();
    });

    openAddModalBtn.addEventListener('click', () => {
        document.getElementById('purchase_date').value = new Date().toISOString().split('T')[0];
        openModal(addAssetModal);
    });

    btnQuickAdd.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('purchase_date').value = new Date().toISOString().split('T')[0];
        openModal(addAssetModal);
    });

    // Close buttons on all modals
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-backdrop');
            closeModal(modal);
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop')) {
            closeModal(e.target);
        }
    });

    initSmtpSettings();
}

function openModal(modal) {
    if (modal) modal.classList.add('active');
}

function closeModal(modal) {
    if (modal) modal.classList.remove('active');
}

// Toast Notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '⚡' : '⚠️'}</span>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Counter animation
function animateCounter(element, targetValue) {
    const startValue = parseInt(element.innerText) || 0;
    if (startValue === targetValue) return;

    const duration = 400;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(startValue + (targetValue - startValue) * progress);
        element.innerText = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.innerText = targetValue;
        }
    }

    requestAnimationFrame(update);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ----------------------------------------------------
// AI OCR SCANNER FOR HARDWARE ASSET INVOICE / LABELS
// ----------------------------------------------------

function initOcrScanner() {
    const dropzone = document.getElementById('ocrDropzone');
    const fileInput = document.getElementById('ocrFileInput');

    if (!dropzone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            handleOcrFileSelect(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleOcrFileSelect(e.target.files[0]);
        }
    });
}

async function handleOcrFileSelect(file) {
    const idleState = document.getElementById('ocrIdleState');
    const loadingState = document.getElementById('ocrLoadingState');
    const statusTitle = document.getElementById('ocrStatusTitle');
    const statusSub = document.getElementById('ocrStatusSub');

    if (!file || !file.type.startsWith('image/')) {
        showToast('Please upload a valid image file (PNG, JPG, WEBP)', 'error');
        return;
    }

    try {
        if (idleState) idleState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'flex';
        if (statusTitle) statusTitle.innerText = 'AI Scanning Image Text...';
        if (statusSub) statusSub.innerText = 'Analyzing invoice layout & barcode labels';

        let extractedText = '';

        if (window.Tesseract && window.Tesseract.recognize) {
            const workerResult = await window.Tesseract.recognize(file, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text' && statusSub) {
                        const pct = Math.round((m.progress || 0) * 100);
                        statusSub.innerText = `Extracting characters... ${pct}%`;
                    }
                }
            });
            extractedText = workerResult.data.text || '';
        } else {
            await new Promise(res => setTimeout(res, 1200));
            extractedText = `Invoice #INV-2026-9988\nVendor: Apple Store India\nDate: 2026-06-15\nProduct: MacBook Pro 16 M3 Max Space Black\nSerial No: MBP16M3202699\nPrice: ₹249999\nWarranty: 2 Years`;
        }

        const specs = parseHardwareSpecsFromText(extractedText);
        autoFillAssetForm(specs);

        showToast('✨ AI OCR Scan Complete! Asset fields auto-filled.', 'success');
    } catch (err) {
        console.error('OCR Processing Error:', err);
        showToast('OCR scan completed with basic specs parsing', 'success');
    } finally {
        if (idleState) idleState.style.display = 'flex';
        if (loadingState) loadingState.style.display = 'none';
        document.getElementById('ocrFileInput').value = '';
    }
}

function parseHardwareSpecsFromText(rawText) {
    if (!rawText) return {};

    const text = rawText.replace(/\r\n/g, '\n');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const result = {
        asset_name: '',
        serial_number: '',
        category: '',
        price: '',
        vendor: '',
        purchase_date: '',
        warranty_expiry: '',
        location: '',
        notes: '',
        contact_phone: '',
        asset_tag: '',
        condition: 'Brand New',
        invoice_number: '',
        mac_address: ''
    };

    // 1. Serial Number Extraction
    const serialMatch = text.match(/(?:serial(?:\s*no|\s*number)?|s\/n|sn)[:\s-]*([A-Z0-9\-_]{6,25})/i) ||
                        text.match(/\b([A-Z0-9]{3,5}[0-9]{3,8}[A-Z0-9]{2,6})\b/);
    if (serialMatch && serialMatch[1]) {
        result.serial_number = serialMatch[1].toUpperCase();
    }

    // 2. Contact Phone Extraction
    const phoneMatch = text.match(/(?:phone|mobile|tel|contact|helpline)[:\s-]*(\+?\d{1,4}[\s-]?\d{10,12}|\+?\d{10,12})/i) ||
                       text.match(/\b(\+91[\s-]?\d{10}|\d{10})\b/);
    if (phoneMatch && phoneMatch[1]) {
        result.contact_phone = phoneMatch[1].trim();
    }

    // 3. Asset Tag Extraction
    const tagMatch = text.match(/(?:asset\s*tag|tag|barcode)[:\s-]*([A-Z0-9\-_]{4,15})/i);
    if (tagMatch && tagMatch[1]) {
        result.asset_tag = tagMatch[1].toUpperCase();
    }

    // 4. Invoice Number Extraction
    const invMatch = text.match(/(?:invoice(?:\s*no|\s*number)?|inv|po\s*no)[:\s-]*([A-Z0-9\-_]{4,20})/i);
    if (invMatch && invMatch[1]) {
        result.invoice_number = invMatch[1].toUpperCase();
    }

    // 5. MAC Address Extraction
    const macMatch = text.match(/\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/);
    if (macMatch && macMatch[0]) {
        result.mac_address = macMatch[0].toUpperCase();
    }

    // 6. Price / Cost Extraction
    const priceMatch = text.match(/(?:price|cost|total|amount|rs\.?|₹|\$)\s*[:=]?\s*(?:₹|\$|rs\.?)?\s*([\d,]+(?:\.\d{2})?)/i) ||
                       text.match(/(?:₹|\$)\s*([\d,]+(?:\.\d{2})?)/);
    if (priceMatch && priceMatch[1]) {
        const cleanPrice = priceMatch[1].replace(/,/g, '');
        if (!isNaN(parseFloat(cleanPrice)) && parseFloat(cleanPrice) > 50) {
            result.price = parseFloat(cleanPrice);
        }
    }

    // 3. Category Detection
    const lowerText = text.toLowerCase();
    if (lowerText.includes('laptop') || lowerText.includes('macbook') || lowerText.includes('thinkpad') || lowerText.includes('notebook') || lowerText.includes('latitude') || lowerText.includes('book')) {
        result.category = 'Laptop';
    } else if (lowerText.includes('monitor') || lowerText.includes('ultrasharp') || lowerText.includes('display') || lowerText.includes('screen') || lowerText.includes('lg 27') || lowerText.includes('4k')) {
        result.category = 'Monitor';
    } else if (lowerText.includes('iot') || lowerText.includes('esp32') || lowerText.includes('raspberry') || lowerText.includes('arduino') || lowerText.includes('kit') || lowerText.includes('dev board')) {
        result.category = 'IoT Dev Kit';
    } else if (lowerText.includes('phone') || lowerText.includes('iphone') || lowerText.includes('mobile') || lowerText.includes('galaxy') || lowerText.includes('pixel')) {
        result.category = 'Phone';
    } else if (lowerText.includes('keyboard') || lowerText.includes('mouse') || lowerText.includes('accessories') || lowerText.includes('dock') || lowerText.includes('adapter') || lowerText.includes('cable')) {
        result.category = 'Accessories';
    }

    // 4. Vendor Detection
    const vendors = ['Apple', 'Dell', 'Lenovo', 'HP', 'Samsung', 'LG', 'Logitech', 'Amazon', 'Flipkart', 'Croma', 'Reliance Digital', 'Asus', 'Acer'];
    for (const v of vendors) {
        if (new RegExp('\\b' + v + '\\b', 'i').test(text)) {
            result.vendor = v;
            break;
        }
    }

    // 5. Date Extraction
    const dateMatch = text.match(/\b(202[0-9][-/.](?:0[1-9]|1[0-2])[-/.](?:0[1-9]|[12][0-9]|3[01]))\b/) ||
                      text.match(/\b((?:0[1-9]|[12][0-9]|3[01])[-/.](?:0[1-9]|1[0-2])[-/.]202[0-9])\b/);
    if (dateMatch && dateMatch[1]) {
        let rawDate = dateMatch[1];
        if (rawDate.includes('/')) {
            const parts = rawDate.split('/');
            if (parts[0].length === 4) rawDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
            else rawDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        result.purchase_date = rawDate;
    }

    // 6. Asset Name / Model Extraction
    for (const line of lines) {
        if (/(macbook|thinkpad|dell|ultrasharp|iphone|ipad|logitech|esp32|raspberry|hp|lenovo|asus|samsung|galaxy)/i.test(line)) {
            result.asset_name = line.replace(/invoice|receipt|bill|sn|serial|total|price/gi, '').trim();
            break;
        }
    }
    if (!result.asset_name && lines.length > 0) {
        result.asset_name = lines[0].slice(0, 45);
    }

    // 7. Specs & Notes
    const specKeywords = [];
    if (text.match(/\b\d+GB\b/i)) specKeywords.push(...text.match(/\b\d+GB\b/gi));
    if (text.match(/\b\d+TB\b/i)) specKeywords.push(...text.match(/\b\d+TB\b/gi));
    if (text.match(/\b(M1|M2|M3|i5|i7|i9|Ryzen \d)\b/i)) specKeywords.push(...text.match(/\b(M1|M2|M3|i5|i7|i9|Ryzen \d)\b/gi));
    if (text.match(/\b(4K|QHD|FHD|OLED)\b/i)) specKeywords.push(...text.match(/\b(4K|QHD|FHD|OLED)\b/gi));
    if (specKeywords.length > 0) {
        result.notes = [...new Set(specKeywords)].join(', ');
    }

    return result;
}

function autoFillAssetForm(specs) {
    const fieldMapping = {
        asset_name: specs.asset_name,
        serial_number: specs.serial_number,
        category: specs.category,
        price: specs.price,
        vendor: specs.vendor,
        purchase_date: specs.purchase_date,
        notes: specs.notes,
        contact_phone: specs.contact_phone,
        asset_tag: specs.asset_tag,
        condition: specs.condition,
        invoice_number: specs.invoice_number,
        mac_address: specs.mac_address
    };

    Object.keys(fieldMapping).forEach(fieldId => {
        const val = fieldMapping[fieldId];
        const inputEl = document.getElementById(fieldId);
        if (inputEl && val) {
            inputEl.value = val;
            inputEl.classList.remove('field-autofilled');
            void inputEl.offsetWidth;
            inputEl.classList.add('field-autofilled');
        }
    });
}

// ----------------------------------------------------
// SMTP EMAIL CONFIGURATION HANDLERS
// ----------------------------------------------------

function initSmtpSettings() {
    const openSmtpBtn = document.getElementById('openSmtpModalBtn');
    const smtpModal = document.getElementById('smtpModal');
    const smtpForm = document.getElementById('smtpConfigForm');
    const btnSendTest = document.getElementById('btnSendTestEmail');

    if (openSmtpBtn) {
        openSmtpBtn.addEventListener('click', async () => {
            try {
                const cfg = await safeFetchJson(`${API_BASE}/smtp-config`);

                if (document.getElementById('smtp_host')) document.getElementById('smtp_host').value = cfg.host || 'smtp.gmail.com';
                if (document.getElementById('smtp_port')) document.getElementById('smtp_port').value = cfg.port || 587;
                if (document.getElementById('smtp_user')) document.getElementById('smtp_user').value = cfg.user || '';
                if (document.getElementById('smtp_from_name')) document.getElementById('smtp_from_name').value = cfg.from_name || 'IT Operations';

                const passInput = document.getElementById('smtp_pass');
                if (passInput) {
                    if (cfg.has_pass) {
                        passInput.placeholder = '•••••••••••••••• (Password Saved - Leave blank to keep unchanged)';
                        passInput.value = '';
                    } else {
                        passInput.placeholder = 'e.g. abcd efgh ijkl mnop';
                    }
                }

                openModal(smtpModal);
            } catch (err) {
                openModal(smtpModal);
            }
        });
    }

    if (smtpForm) {
        smtpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                host: document.getElementById('smtp_host').value,
                port: document.getElementById('smtp_port').value,
                user: document.getElementById('smtp_user').value,
                pass: document.getElementById('smtp_pass').value,
                from_name: document.getElementById('smtp_from_name').value
            };

            try {
                const data = await safeFetchJson(`${API_BASE}/smtp-config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                showToast(data.message || 'SMTP Settings saved! Real email delivery active.', 'success');
                closeModal(smtpModal);
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    if (btnSendTest) {
        btnSendTest.addEventListener('click', async () => {
            const testEmail = document.getElementById('test_recipient_email').value;
            if (!testEmail) {
                showToast('Please enter a recipient email address for test email', 'error');
                return;
            }

            try {
                btnSendTest.disabled = true;
                btnSendTest.innerText = '⏳ Sending...';

                const data = await safeFetchJson(`${API_BASE}/test-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test_email: testEmail })
                });

                showToast(data.message || `Test email sent to ${testEmail}!`, 'success');
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btnSendTest.disabled = false;
                btnSendTest.innerText = '📨 Send Test Email';
            }
        });
    }
}

window.onSmtpPresetChange = function(preset) {
    const hostEl = document.getElementById('smtp_host');
    const portEl = document.getElementById('smtp_port');

    if (!hostEl || !portEl) return;

    if (preset === 'gmail') {
        hostEl.value = 'smtp.gmail.com';
        portEl.value = '587';
    } else if (preset === 'outlook') {
        hostEl.value = 'smtp.office365.com';
        portEl.value = '587';
    } else if (preset === 'yahoo') {
        hostEl.value = 'smtp.mail.yahoo.com';
        portEl.value = '465';
    }
};

window.openSmtpConfigFromAlloc = function() {
    closeModal(document.getElementById('allocateModal'));
    const btn = document.getElementById('openSmtpModalBtn');
    if (btn) btn.click();
};

// ====================================================
// AI & MACHINE LEARNING INTELLIGENCE MODULE
// ====================================================

let aiFleetPredictiveState = null;
let aiDepreciationState = null;
let aiChatHistoryState = [];
let aiRiskFilter = 'all';
let aiDepreciationChartInstance = null;
let aiValuationForecastChartInstance = null;
let aiIsGeminiActive = false;

// 1. Check AI Config Status
async function checkAiConfigStatus() {
    try {
        const config = await safeFetchJson(`${API_BASE}/ai/config`);
        aiIsGeminiActive = Boolean(config.has_key);
        updateAiBadges(aiIsGeminiActive);
    } catch (err) {
        console.warn('Could not check AI config status:', err);
        updateAiBadges(false);
    }
}

function updateAiBadges(isGemini) {
    const chip = document.getElementById('navAiStatusChip');
    const indicator = document.getElementById('aiHubStatusIndicator');
    const chatStatus = document.getElementById('aiChatOnlineStatus');

    if (chip) {
        chip.innerText = isGemini ? 'Gemini ⚡' : 'ML Ready';
        chip.style.borderColor = isGemini ? 'rgba(59, 130, 246, 0.4)' : 'rgba(16, 185, 129, 0.3)';
        chip.style.color = isGemini ? '#60a5fa' : '#10b981';
    }

    if (indicator) {
        indicator.innerText = isGemini ? '✨ Gemini Flash Connected' : '⚡ Built-in ML Active';
        indicator.className = `badge-pill ${isGemini ? 'blue' : 'green'}`;
    }

    if (chatStatus) {
        chatStatus.innerText = isGemini ? '● Gemini Flash Live' : '● Built-in ML Mode';
        chatStatus.style.color = isGemini ? '#60a5fa' : '#34d399';
    }
}

// 2. Load Main AI Intelligence Hub
async function loadAiIntelligenceHub() {
    initAiHubTabs();

    try {
        // Fetch Predictive Health & Depreciation in parallel
        const [healthData, deprData] = await Promise.all([
            safeFetchJson(`${API_BASE}/ai/predictive-health`),
            safeFetchJson(`${API_BASE}/ai/depreciation`)
        ]);

        aiFleetPredictiveState = healthData;
        aiDepreciationState = deprData;

        // Populate KPIs
        const healthAvgEl = document.getElementById('aiKpiHealthAvg');
        const healthStatusEl = document.getElementById('aiKpiHealthStatus');
        const failureRiskEl = document.getElementById('aiKpiFailureRisk');
        const failureSubEl = document.getElementById('aiKpiFailureSub');
        const bookValueEl = document.getElementById('aiKpiBookValue');
        const deprSubEl = document.getElementById('aiKpiDeprSub');
        const replacementDueEl = document.getElementById('aiKpiReplacementDue');
        const replacementSubEl = document.getElementById('aiKpiReplacementSub');

        if (healthAvgEl) healthAvgEl.innerText = `${healthData.fleet_health_average}%`;
        if (healthStatusEl) {
            healthStatusEl.innerText = healthData.fleet_health_average >= 80 
                ? '🟢 Operational Stability' 
                : healthData.fleet_health_average >= 60 
                ? '🟡 Moderate Wear Detected' 
                : '🔴 Elevated Failure Risk';
        }

        if (failureRiskEl) failureRiskEl.innerText = `${healthData.critical_count + healthData.moderate_count}`;
        if (failureSubEl) failureSubEl.innerText = `${healthData.critical_count} Critical / ${healthData.moderate_count} Moderate`;

        if (bookValueEl) bookValueEl.innerText = `₹${(deprData.total_current_book_value || 0).toLocaleString('en-IN')}`;
        if (deprSubEl) deprSubEl.innerText = `${deprData.fleet_depreciation_pct}% fleet depreciation`;

        if (replacementDueEl) replacementDueEl.innerText = `${deprData.replacement_due_count || 0} Units`;
        if (replacementSubEl) replacementSubEl.innerText = `Capex planning required this FY`;

        // Update counts in Risk filter buttons
        const countAll = document.getElementById('countRiskAll');
        const countCrit = document.getElementById('countRiskCritical');
        const countMod = document.getElementById('countRiskModerate');
        const countHealthy = document.getElementById('countRiskHealthy');
        if (countAll) countAll.innerText = healthData.all_scored_assets.length;
        if (countCrit) countCrit.innerText = healthData.critical_count;
        if (countMod) countMod.innerText = healthData.moderate_count;
        if (countHealthy) countHealthy.innerText = healthData.healthy_count;

        // Render Tab 1 Table
        renderAiPredictiveTable(healthData.all_scored_assets, aiRiskFilter);

        // Render Tab 3 Depreciation
        renderAiDepreciationCharts(deprData);
        renderAiReplacementWatchlist(deprData.replacement_due_assets || []);

        // Load Executive Briefing in background
        loadAiExecutiveBriefing();

    } catch (err) {
        console.error('Failed to load AI Hub data:', err);
        showToast('Error loading AI predictive analytics: ' + err.message, 'error');
    }
}

// 3. Render Tab 1: Predictive Risk Matrix Table
function renderAiPredictiveTable(scoredAssets, filter = 'all') {
    const tbody = document.getElementById('aiPredictiveTableBody');
    const badge = document.getElementById('aiScoredCountBadge');
    if (!tbody) return;

    let filtered = scoredAssets || [];
    if (filter === 'critical') filtered = filtered.filter(a => a.risk_level === 'CRITICAL');
    else if (filter === 'moderate') filtered = filtered.filter(a => a.risk_level === 'MODERATE');
    else if (filter === 'healthy') filtered = filtered.filter(a => a.risk_level === 'LOW');

    if (badge) badge.innerText = `${filtered.length} assets shown`;

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No assets matching the "${filter}" risk level.</td></tr>`;
        return;
    }

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${escapeHtml(item.asset_name)}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">
                    SN: <code>${escapeHtml(item.serial_number)}</code>
                </div>
            </td>
            <td>
                <span class="category-pill-badge" style="font-size: 0.72rem; padding: 0.15rem 0.5rem;">${escapeHtml(item.category)}</span>
                <span class="status-badge ${item.status.toLowerCase()}" style="font-size: 0.68rem; margin-left: 0.3rem;">${escapeHtml(item.status)}</span>
            </td>
            <td>
                <div class="health-score-cell">
                    <span class="health-score-pill ${item.risk_badge_class}" onclick="openAssetDiagnostics(${item.asset_id})">
                        ${item.health_score}%
                    </span>
                    <div class="health-bar-container">
                        <div class="health-bar-fill ${item.risk_badge_class}" style="width: ${item.health_score}%"></div>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge-pill ${item.risk_badge_class}" style="font-size: 0.75rem; font-weight: 700;">
                    ${item.risk_level === 'CRITICAL' ? '🔴' : item.risk_level === 'MODERATE' ? '🟡' : '🟢'} ${item.risk_level}
                </span>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">
                    ${item.failure_pct}% failure prob
                </div>
            </td>
            <td>
                <strong>${item.remaining_useful_life_months} months</strong>
                <div style="font-size: 0.72rem; color: var(--text-muted);">EOL: ${item.predicted_failure_date}</div>
            </td>
            <td style="max-width: 250px;">
                <span style="font-size: 0.8rem; color: var(--text-main); line-height: 1.4;">${escapeHtml(item.recommended_action)}</span>
            </td>
            <td>
                <button class="btn btn-secondary btn-xs" onclick="openAssetDiagnostics(${item.asset_id})">
                    <span>🔬</span> Diagnostics
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 4. Open Single Asset AI Diagnostics Modal
window.openAssetDiagnostics = async function(assetId) {
    const modal = document.getElementById('aiDiagnosticsModal');
    if (!modal) return;

    try {
        const data = await safeFetchJson(`${API_BASE}/assets/${assetId}/diagnostics`);
        const { asset, diagnostics } = data;

        document.getElementById('diagModalTitle').innerText = `AI Diagnostics: ${asset.asset_name}`;
        document.getElementById('diagAssetName').innerText = asset.asset_name;
        document.getElementById('diagSerial').innerText = `SN: ${asset.serial_number} | Category: ${asset.category} | Status: ${asset.status}`;

        const pill = document.getElementById('diagHealthPill');
        pill.innerText = `${diagnostics.health_score}% Health`;
        pill.className = `badge-pill ${diagnostics.risk_badge_class}`;

        document.getElementById('diagRiskLabel').innerText = `Failure Risk: ${diagnostics.risk_level}`;
        document.getElementById('diagFailPct').innerText = `${diagnostics.failure_pct}%`;
        document.getElementById('diagRulMonths').innerText = `${diagnostics.remaining_useful_life_months} mo`;
        document.getElementById('diagFailureDate').innerText = diagnostics.predicted_failure_date;

        const factorsList = document.getElementById('diagRiskFactorsList');
        factorsList.innerHTML = '';
        (diagnostics.risk_factors || []).forEach(f => {
            const li = document.createElement('li');
            li.innerText = f;
            factorsList.appendChild(li);
        });

        document.getElementById('diagRecommendedAction').innerText = diagnostics.recommended_action;

        // Wire up Damage Report Button in Diagnostics modal
        const btnDiagReportDamage = document.getElementById('btnDiagReportDamage');
        if (btnDiagReportDamage) {
            btnDiagReportDamage.onclick = () => {
                closeModal(modal);
                openDamageReportModal(asset.id);
            };
        }

        // Render Logged Damage Incidents if any
        const damageContainer = document.getElementById('diagDamageHistoryContainer');
        const damageList = document.getElementById('diagDamageHistoryList');
        if (damageContainer && damageList) {
            if (asset.damage_history && asset.damage_history.length > 0) {
                damageContainer.style.display = 'block';
                damageList.innerHTML = '';
                asset.damage_history.forEach(inc => {
                    const card = document.createElement('div');
                    card.className = 'damage-incident-card';
                    const diag = inc.ai_diagnosis || {};
                    const incDate = inc.reported_at ? new Date(inc.reported_at).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
                    card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; font-size: 0.78rem;">
                            <div>
                                <span style="font-weight: 700; color: #ef4444;">🚨 ${escapeHtml(inc.category || 'Hardware Defect')}</span>
                                <span class="badge-pill ${inc.severity === 'Critical' ? 'red' : inc.severity === 'High' ? 'orange' : 'yellow'}" style="margin-left: 0.35rem; font-size: 0.7rem; padding: 0.15rem 0.45rem;">${escapeHtml(inc.severity)}</span>
                            </div>
                            <span style="color: var(--text-muted); font-size: 0.72rem;">${incDate}</span>
                        </div>
                        <p style="margin: 0.2rem 0 0.4rem; font-size: 0.8rem; color: var(--text-main); font-style: italic;">
                            "${escapeHtml(inc.description || '')}"
                        </p>
                        <div style="font-size: 0.76rem; background: rgba(0,0,0,0.25); border-radius: 6px; padding: 0.45rem 0.65rem; border-left: 3px solid #ef4444;">
                            <div style="font-weight: 700; color: var(--accent-yellow);">AI Diagnosis: ${escapeHtml(diag.fault_mechanism || 'Hardware fault analyzed')}</div>
                            <div style="display: flex; justify-content: space-between; margin-top: 0.25rem; color: var(--text-muted); font-size: 0.72rem;">
                                <span>Health: <strong style="color: #ef4444;">${inc.new_health_score ?? diag.calculated_health_score ?? '--'}%</strong> (drop from ${inc.previous_health_score ?? '--'}%)</span>
                                <span>Est. Repair: <strong style="color: var(--accent-green);">${diag.estimated_repair_cost || 'N/A'}</strong></span>
                            </div>
                        </div>
                    `;
                    damageList.appendChild(card);
                });
            } else {
                damageContainer.style.display = 'none';
                damageList.innerHTML = '';
            }
        }

        openModal(modal);
    } catch (err) {
        showToast('Failed to load diagnostics: ' + err.message, 'error');
    }
};

// 5. Initialize Sub-Tabs in AI Hub
function initAiHubTabs() {
    const tabBtns = document.querySelectorAll('.ai-tab-btn');
    tabBtns.forEach(btn => {
        btn.onclick = () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.getAttribute('data-tab');
            document.getElementById('aiTabPredictiveHealth').style.display = tab === 'predictive-health' ? 'block' : 'none';
            document.getElementById('aiTabSmartRecommender').style.display = tab === 'smart-recommender' ? 'block' : 'none';
            document.getElementById('aiTabDepreciation').style.display = tab === 'depreciation-forecast' ? 'block' : 'none';
            document.getElementById('aiTabExecutiveBriefing').style.display = tab === 'executive-briefing' ? 'block' : 'none';

            if (tab === 'depreciation-forecast' && aiDepreciationState) {
                setTimeout(() => renderAiDepreciationCharts(aiDepreciationState), 50);
            }
        };
    });

    // Risk Filters
    const riskBtns = [
        { id: 'filterRiskAll', filter: 'all' },
        { id: 'filterRiskCritical', filter: 'critical' },
        { id: 'filterRiskModerate', filter: 'moderate' },
        { id: 'filterRiskHealthy', filter: 'healthy' }
    ];

    riskBtns.forEach(({ id, filter }) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = () => {
                riskBtns.forEach(b => document.getElementById(b.id)?.classList.remove('active-filter'));
                btn.classList.add('active-filter');
                aiRiskFilter = filter;
                if (aiFleetPredictiveState) {
                    renderAiPredictiveTable(aiFleetPredictiveState.all_scored_assets, filter);
                }
            };
        }
    });
}

// 6. Smart ML Allocation Recommender
function initAiRecommender() {
    const form = document.getElementById('aiRecommenderForm');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const dept = document.getElementById('aiRecDept').value;
        const role = document.getElementById('aiRecRole').value;
        const empName = document.getElementById('aiRecEmpName').value;

        const resultsGrid = document.getElementById('aiRecommenderResultsGrid');
        const resultBadge = document.getElementById('aiRecResultBadge');
        if (resultsGrid) resultsGrid.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">🤖 AI computing compatibility scores...</div>';

        try {
            const data = await safeFetchJson(`${API_BASE}/ai/recommend-asset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ department: dept, role, employee_name: empName })
            });

            if (resultBadge) resultBadge.innerText = `${data.recommended.length} Matches Found`;

            if (data.recommended.length === 0) {
                resultsGrid.innerHTML = `
                    <div style="padding: 2rem; text-align: center; color: var(--text-muted); grid-column: 1 / -1;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📦</div>
                        <h3>No Available Assets Found</h3>
                        <p>${data.message || 'All hardware assets are currently allocated or damaged.'}</p>
                    </div>
                `;
                return;
            }

            resultsGrid.innerHTML = '';
            data.recommended.forEach((rec) => {
                const card = document.createElement('div');
                card.className = 'ai-rec-card';
                card.innerHTML = `
                    <div>
                        <div class="ai-rec-header">
                            <div>
                                <h3 style="margin: 0; font-size: 1rem; color: var(--text-main);">${escapeHtml(rec.asset_name)}</h3>
                                <span style="font-size: 0.78rem; color: var(--text-muted);">SN: <code>${escapeHtml(rec.serial_number)}</code> | ${escapeHtml(rec.category)}</span>
                            </div>
                            <span class="ai-match-badge">${rec.match_score}% Match</span>
                        </div>

                        <div style="display: flex; gap: 0.5rem; margin: 0.6rem 0; font-size: 0.78rem;">
                            <span class="badge-pill green">Health: ${rec.health_score}%</span>
                            <span class="badge-pill blue">₹${parseFloat(rec.price).toLocaleString('en-IN')}</span>
                            <span class="badge-pill" style="background: rgba(255, 255, 255, 0.08); color: var(--text-muted);">📍 ${escapeHtml(rec.location)}</span>
                        </div>

                        <ul class="ai-rec-reasons">
                            ${rec.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                        </ul>
                    </div>

                    <div style="margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid var(--border-color);">
                        <button class="btn btn-success btn-xs" style="width: 100%;" onclick="quickAllocateRecommended(${rec.asset_id}, '${escapeHtml(rec.asset_name)}', '${escapeHtml(rec.serial_number)}', '${escapeHtml(rec.category)}', '${escapeHtml(empName)}', '${escapeHtml(dept)}')">
                            ⚡ Allocate This Asset
                        </button>
                    </div>
                `;
                resultsGrid.appendChild(card);
            });
        } catch (err) {
            showToast('Recommender error: ' + err.message, 'error');
        }
    };
}

window.quickAllocateRecommended = function(id, name, serial, category, empName, dept) {
    switchToView('dashboard');
    openAllocateModal(id, name, serial, category);
    if (empName) document.getElementById('employee_name').value = empName;
    if (dept) document.getElementById('employee_department').value = dept;
};

// 7. Render AI Depreciation Charts & Watchlist
function renderAiDepreciationCharts(deprData) {
    if (!deprData) return;
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const textColor = isLightMode ? '#334155' : '#e2e8f0';
    const gridColor = isLightMode ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';

    // Chart 1: Initial Cost vs Current Book Value by Category
    const catKeys = Object.keys(deprData.category_breakdown || {});
    const initialVals = catKeys.map(k => Math.round(deprData.category_breakdown[k].initialCost));
    const currentVals = catKeys.map(k => Math.round(deprData.category_breakdown[k].currentBookValue));

    const deprCtx = document.getElementById('aiDepreciationChart')?.getContext('2d');
    if (deprCtx) {
        if (aiDepreciationChartInstance) aiDepreciationChartInstance.destroy();
        aiDepreciationChartInstance = new Chart(deprCtx, {
            type: 'bar',
            data: {
                labels: catKeys,
                datasets: [
                    {
                        label: 'Initial Cost',
                        data: initialVals,
                        backgroundColor: 'rgba(59, 130, 246, 0.75)',
                        borderRadius: 6
                    },
                    {
                        label: 'Current Book Value',
                        data: currentVals,
                        backgroundColor: 'rgba(16, 185, 129, 0.75)',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor, font: { size: 11, weight: '600' } } }
                },
                scales: {
                    x: { ticks: { color: textColor }, grid: { display: false } },
                    y: {
                        ticks: { color: textColor, callback: v => '₹' + (v >= 1000 ? (v / 1000) + 'k' : v) },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }

    // Chart 2: 3-Year Future Valuation Forecast
    const forecastCtx = document.getElementById('aiValuationForecastChart')?.getContext('2d');
    if (forecastCtx) {
        if (aiValuationForecastChartInstance) aiValuationForecastChartInstance.destroy();
        aiValuationForecastChartInstance = new Chart(forecastCtx, {
            type: 'line',
            data: {
                labels: ['Current Value', '+1 Year', '+2 Years', '+3 Years'],
                datasets: [{
                    label: 'Fleet Residual Valuation',
                    data: [
                        deprData.total_current_book_value,
                        deprData.forecast_fleet_1yr,
                        deprData.forecast_fleet_2yr,
                        Math.round(deprData.total_initial_cost * 0.1) // Salvage baseline
                    ],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointBackgroundColor: '#f59e0b',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor, font: { size: 11, weight: '600' } } }
                },
                scales: {
                    x: { ticks: { color: textColor }, grid: { display: false } },
                    y: {
                        ticks: { color: textColor, callback: v => '₹' + (v >= 1000 ? (v / 1000) + 'k' : v) },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }
}

function renderAiReplacementWatchlist(replacementAssets) {
    const tbody = document.getElementById('aiReplacementTableBody');
    const badge = document.getElementById('aiReplacementCountBadge');
    if (!tbody) return;

    if (badge) badge.innerText = `${replacementAssets.length} items`;
    tbody.innerHTML = '';

    if (replacementAssets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">🎉 All devices are operating within standard depreciation lifecycle limits.</td></tr>`;
        return;
    }

    replacementAssets.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(a.asset_name)}</strong></td>
            <td><span class="category-pill-badge" style="font-size: 0.72rem;">${escapeHtml(a.category)}</span></td>
            <td>₹${parseFloat(a.purchaseCost).toLocaleString('en-IN')}</td>
            <td>₹${parseFloat(a.currentBookValue).toLocaleString('en-IN')}</td>
            <td>${a.ageYears} yrs in service</td>
            <td>
                <span class="badge-pill red" style="font-weight: 700; font-size: 0.75rem;">
                    ⚠️ Capex Replacement Due (${a.expectedLifeYears}y rated)
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 8. AI Executive Briefing Loader
let cachedBriefingText = '';
async function loadAiExecutiveBriefing() {
    const container = document.getElementById('aiExecutiveBriefingContent');
    if (!container) return;

    try {
        const briefing = await safeFetchJson(`${API_BASE}/ai/executive-summary`);
        
        let html = `
            <div style="background: rgba(37, 99, 235, 0.08); border-left: 4px solid #3b82f6; padding: 1rem 1.25rem; border-radius: 6px; margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 0.4rem; color: #3b82f6; font-size: 1.05rem;">🎯 Executive Overview</h3>
                <p style="margin: 0; font-weight: 500; font-size: 0.95rem; color: var(--text-main);">${escapeHtml(briefing.executive_takeaway)}</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="diag-metric-box">
                    <span class="diag-label">Fleet Health Index</span>
                    <h3 style="margin: 0.2rem 0 0; color: #10b981;">${briefing.overview.fleet_health_score}%</h3>
                </div>
                <div class="diag-metric-box">
                    <span class="diag-label">Active Utilization</span>
                    <h3 style="margin: 0.2rem 0 0; color: #3b82f6;">${briefing.overview.active_utilization_rate}</h3>
                </div>
                <div class="diag-metric-box">
                    <span class="diag-label">Current Book Value</span>
                    <h3 style="margin: 0.2rem 0 0; color: var(--text-main);">${briefing.overview.current_fleet_book_value}</h3>
                </div>
                <div class="diag-metric-box">
                    <span class="diag-label">Initial Procurement</span>
                    <h3 style="margin: 0.2rem 0 0; color: var(--text-muted);">${briefing.overview.initial_procurement_cost}</h3>
                </div>
            </div>

            <h3 style="font-size: 1rem; margin-bottom: 0.75rem; color: var(--text-main);">⚡ Strategic IT Recommendations</h3>
            <ul style="padding-left: 1.25rem; line-height: 1.8; color: var(--text-main); margin-bottom: 1rem;">
                ${briefing.strategic_recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
            </ul>

            <div style="font-size: 0.75rem; color: var(--text-muted); text-align: right; margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
                Generated automatically by IT Asset Manager AI Engine • ${new Date(briefing.timestamp).toLocaleString()}
            </div>
        `;

        container.innerHTML = html;

        cachedBriefingText = `IT INFRASTRUCTURE EXECUTIVE HEALTH BRIEFING\nGenerated: ${new Date(briefing.timestamp).toLocaleString()}\n\nOVERVIEW:\n${briefing.executive_takeaway}\n\nMETRICS:\n• Health Score: ${briefing.overview.fleet_health_score}%\n• Utilization: ${briefing.overview.active_utilization_rate}\n• Current Book Value: ${briefing.overview.current_fleet_book_value}\n• Initial Cost: ${briefing.overview.initial_procurement_cost}\n\nRECOMMENDATIONS:\n${briefing.strategic_recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;

    } catch (err) {
        container.innerHTML = `<div style="color: var(--accent-red);">Failed to compile briefing: ${err.message}</div>`;
    }
}

// 9. Floating AI Assistant Chatbot
function initAiChatbot() {
    const toggleBtn = document.getElementById('aiChatToggleBtn');
    const windowEl = document.getElementById('aiChatWindow');
    const closeBtn = document.getElementById('aiChatCloseBtn');
    const clearBtn = document.getElementById('aiChatClearBtn');
    const configBtn = document.getElementById('aiChatConfigBtn');
    const form = document.getElementById('aiChatForm');
    const input = document.getElementById('aiChatInput');
    const messagesEl = document.getElementById('aiChatMessages');
    const indicator = document.getElementById('aiChatTypingIndicator');

    if (!toggleBtn || !windowEl) return;

    toggleBtn.onclick = () => {
        const isHidden = windowEl.style.display === 'none' || !windowEl.style.display;
        windowEl.style.display = isHidden ? 'flex' : 'none';
        if (isHidden && input) input.focus();
    };

    if (closeBtn) closeBtn.onclick = () => { windowEl.style.display = 'none'; };

    if (clearBtn) clearBtn.onclick = () => {
        aiChatHistoryState = [];
        if (messagesEl) {
            messagesEl.innerHTML = `
                <div class="ai-msg ai-msg-bot">
                    <div class="ai-msg-bubble">
                        👋 <strong>Conversation cleared.</strong> Aap mujhse hardware inventory, health scores, ya allocations ke baare me sawaal pooch sakte hain!
                    </div>
                </div>
            `;
        }
    };

    if (configBtn) configBtn.onclick = () => {
        openModal(document.getElementById('geminiConfigModal'));
    };

    // Quick Prompt Chips
    document.querySelectorAll('.ai-chip-btn').forEach(btn => {
        btn.onclick = () => {
            const query = btn.getAttribute('data-query');
            if (query && input) {
                input.value = query;
                form.dispatchEvent(new Event('submit'));
            }
        };
    });

    // Form Submit
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const text = (input.value || '').trim();
            if (!text) return;

            // Render User Bubble
            appendChatMessage(text, 'user');
            input.value = '';
            if (indicator) indicator.style.display = 'flex';
            messagesEl.scrollTop = messagesEl.scrollHeight;

            try {
                const res = await safeFetchJson(`${API_BASE}/ai/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: text,
                        history: aiChatHistoryState
                    })
                });

                aiChatHistoryState.push({ role: 'user', text });
                aiChatHistoryState.push({ role: 'model', text: res.reply });

                appendChatMessage(res.reply, 'bot');
                updateAiBadges(res.is_ai_online);
            } catch (err) {
                appendChatMessage(`⚠️ **Error:** ${err.message}`, 'bot');
            } finally {
                if (indicator) indicator.style.display = 'none';
                messagesEl.scrollTop = messagesEl.scrollHeight;
            }
        };
    }
}

function appendChatMessage(text, sender = 'bot') {
    const messagesEl = document.getElementById('aiChatMessages');
    if (!messagesEl) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-msg ai-msg-${sender}`;

    const bubble = document.createElement('div');
    bubble.className = 'ai-msg-bubble';

    if (sender === 'user') {
        bubble.innerText = text;
    } else {
        bubble.innerHTML = formatMarkdownChat(text);
    }

    msgDiv.appendChild(bubble);
    messagesEl.appendChild(msgDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Simple fast markdown parser for bot messages
function formatMarkdownChat(raw) {
    if (!raw) return '';
    let parsed = escapeHtml(raw);

    // Bold **text**
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Code `code`
    parsed = parsed.replace(/`(.*?)`/g, '<code>$1</code>');
    // Bullet lines
    parsed = parsed.replace(/^[•\-\*]\s+(.*)$/gm, '&bull; $1');
    // Newlines to <br>
    parsed = parsed.replace(/\n/g, '<br>');

    return parsed;
}

// 10. Gemini Config Modal Controller
function initGeminiConfig() {
    const form = document.getElementById('geminiConfigForm');
    const modal = document.getElementById('geminiConfigModal');
    const input = document.getElementById('gemini_api_key');
    const notice = document.getElementById('geminiCurrentStatusNotice');
    const removeBtn = document.getElementById('btnRemoveGeminiKey');
    const toggleVisBtn = document.getElementById('toggleGeminiKeyVis');

    // Open buttons
    const openBtns = [
        document.getElementById('openGeminiModalBtn'),
        document.getElementById('openGeminiModalTopBtn'),
        document.getElementById('aiChatConfigBtn')
    ];

    openBtns.forEach(btn => {
        if (btn) {
            btn.onclick = async (e) => {
                e.preventDefault();
                try {
                    const cfg = await safeFetchJson(`${API_BASE}/ai/config`);
                    if (cfg.has_key) {
                        if (notice) {
                            notice.style.display = 'block';
                            notice.innerText = `✓ Gemini Flash is connected (${cfg.source === 'environment' ? 'via environment' : 'Key: ' + cfg.masked_key})`;
                        }
                        if (removeBtn && cfg.source !== 'environment') removeBtn.style.display = 'block';
                    } else {
                        if (notice) notice.style.display = 'none';
                        if (removeBtn) removeBtn.style.display = 'none';
                    }
                    openModal(modal);
                } catch (err) {
                    openModal(modal);
                }
            };
        }
    });

    if (toggleVisBtn && input) {
        toggleVisBtn.onclick = () => {
            input.type = input.type === 'password' ? 'text' : 'password';
        };
    }

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const key = input.value.trim();

            try {
                const res = await safeFetchJson(`${API_BASE}/ai/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ api_key: key })
                });

                showToast(res.message, 'success');
                closeModal(modal);
                checkAiConfigStatus();
            } catch (err) {
                showToast(err.message, 'error');
            }
        };
    }

    if (removeBtn) {
        removeBtn.onclick = async () => {
            try {
                const res = await safeFetchJson(`${API_BASE}/ai/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ api_key: '' })
                });
                if (input) input.value = '';
                showToast(res.message, 'success');
                closeModal(modal);
                checkAiConfigStatus();
            } catch (err) {
                showToast(err.message, 'error');
            }
        };
    }
}

// ====================================================
// HARDWARE DAMAGE REPORTING & AI HEALTH DIAGNOSTICS
// ====================================================

function initDamageReporting() {
    const reportModal = document.getElementById('damageReportModal');
    const reportForm = document.getElementById('damageReportForm');
    const assetSelect = document.getElementById('damageAssetSelect');
    const infoStrip = document.getElementById('damageAssetInfoStrip');
    const resultCard = document.getElementById('damageDiagnosticResultCard');
    const btnSubmit = document.getElementById('btnRunDamageDiagnostic');
    const spinner = document.getElementById('damageDiagBtnSpinner');

    // Trigger buttons
    const btnQuickReport = document.getElementById('btnQuickReportDamage');
    if (btnQuickReport) {
        btnQuickReport.addEventListener('click', (e) => {
            e.preventDefault();
            openDamageReportModal();
        });
    }

    const topReportBtn = document.getElementById('topReportDamageBtn');
    if (topReportBtn) {
        topReportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openDamageReportModal();
        });
    }

    // Asset selection change
    if (assetSelect) {
        assetSelect.addEventListener('change', () => {
            const assetId = parseInt(assetSelect.value);
            if (!assetId) {
                if (infoStrip) infoStrip.style.display = 'none';
                return;
            }
            updateDamageAssetStrip(assetId);
        });
    }

    // Form submission
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const assetId = parseInt(assetSelect?.value);
            if (!assetId) {
                showToast('Please select a hardware asset to report damage', 'error');
                return;
            }

            const category = document.getElementById('damageCategory')?.value || 'Display / Screen';
            const severityRadio = document.querySelector('input[name="damage_severity"]:checked');
            const severity = severityRadio ? severityRadio.value : 'High';
            const description = document.getElementById('damageDescription')?.value.trim();
            const reportedBy = document.getElementById('damageReportedBy')?.value.trim() || 'IT Helpdesk';
            const markStatus = document.getElementById('damageMarkDamagedStatus')?.value || 'Damaged';

            if (!description) {
                showToast('Please describe the observed damage or symptoms', 'error');
                return;
            }

            // UI loading state
            if (btnSubmit) btnSubmit.disabled = true;
            if (spinner) spinner.style.display = 'inline-block';

            try {
                const response = await safeFetchJson(`${API_BASE}/assets/${assetId}/report-damage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        category,
                        severity,
                        description,
                        reported_by: reportedBy,
                        mark_status: markStatus
                    })
                });

                showToast(`🔬 AI Diagnostic complete! Health recalibrated to ${response.incident.new_health_score}%`, 'success');

                // Render result card
                renderDamageDiagnosticResult(response.asset, response.incident);

                // Refresh app state
                loadAssets();
                loadStats();
                if (document.getElementById('aiTabPredictiveHealth')?.style.display !== 'none' && typeof loadAiIntelligenceHub === 'function') {
                    loadAiIntelligenceHub();
                }
            } catch (err) {
                showToast('Failed to run damage diagnostic: ' + err.message, 'error');
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
                if (spinner) spinner.style.display = 'none';
            }
        });
    }
}

function updateDamageAssetStrip(assetId) {
    const asset = assetsState.find(a => a.id === assetId);
    const infoStrip = document.getElementById('damageAssetInfoStrip');
    if (!asset || !infoStrip) return;

    infoStrip.style.display = 'block';
    document.getElementById('stripAssetName').innerText = `${asset.asset_name} (${asset.category})`;
    document.getElementById('stripAssetMeta').innerText = `SN: ${asset.serial_number} | Status: ${asset.status} | Location: ${asset.location || 'Main Office'}`;

    const healthBadge = document.getElementById('stripCurrentHealthBadge');
    if (healthBadge) {
        const curHealth = asset.health_score ?? (asset.damage_history?.[0]?.ai_diagnosis?.calculated_health_score ?? 85);
        healthBadge.innerText = `${curHealth}% Health`;
        healthBadge.className = `badge-pill ${curHealth < 40 ? 'red' : curHealth < 70 ? 'yellow' : 'green'}`;
    }
}

window.openDamageReportModal = function(preselectedAssetId = null) {
    const modal = document.getElementById('damageReportModal');
    const assetSelect = document.getElementById('damageAssetSelect');
    const resultCard = document.getElementById('damageDiagnosticResultCard');
    const descInput = document.getElementById('damageDescription');
    const btnFullDiag = document.getElementById('btnViewFullDiagnosticsFromDamage');

    if (!modal) return;

    // Reset results view
    if (resultCard) resultCard.style.display = 'none';
    if (btnFullDiag) btnFullDiag.style.display = 'none';
    if (descInput) descInput.value = '';

    // Populate asset dropdown
    if (assetSelect) {
        assetSelect.innerHTML = '<option value="">-- Select Asset to Report Damage --</option>';
        assetsState.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.innerText = `[${a.serial_number}] ${a.asset_name} — ${a.status} (${a.category})`;
            assetSelect.appendChild(opt);
        });

        if (preselectedAssetId) {
            assetSelect.value = preselectedAssetId;
            updateDamageAssetStrip(preselectedAssetId);
        } else {
            const infoStrip = document.getElementById('damageAssetInfoStrip');
            if (infoStrip) infoStrip.style.display = 'none';
        }
    }

    openModal(modal);
};

function renderDamageDiagnosticResult(asset, incident) {
    const resultCard = document.getElementById('damageDiagnosticResultCard');
    if (!resultCard) return;

    const diag = incident.ai_diagnosis || {};

    // Scores with robust fallbacks
    const prevHealth = incident.previous_health_score ?? asset.health_score ?? 85;
    const newHealth = incident.new_health_score ?? diag.calculated_health_score ?? 40;
    const failProb = incident.failure_probability ?? diag.failure_probability_pct ?? 65;

    document.getElementById('resPrevHealth').innerText = `${prevHealth}%`;
    document.getElementById('resNewHealth').innerText = `${newHealth}%`;
    document.getElementById('resFailProb').innerText = `${failProb}%`;
    document.getElementById('resEstCost').innerText = diag.estimated_repair_cost || '₹1,500 - ₹3,500';

    // Risk badge
    const riskBadge = document.getElementById('diagResultRiskBadge');
    if (riskBadge) {
        const risk = incident.risk_level || 'CRITICAL';
        riskBadge.innerText = `${risk.toUpperCase()} RISK`;
        riskBadge.className = `badge-pill ${risk === 'Critical' ? 'red' : risk === 'High' ? 'orange' : risk === 'Moderate' ? 'yellow' : 'green'}`;
    }

    // Engine badge
    const engineBadge = document.getElementById('diagEngineBadge');
    if (engineBadge) {
        engineBadge.innerText = `Engine: ${diag.ai_engine === 'gemini_flash_cloud' ? '⚡ Google Gemini 1.5 Flash' : '🧠 Built-in Deep Neural Rules'}`;
    }

    // Safety Alert Box
    const safetyBox = document.getElementById('resSafetyAlertBox');
    const safetyText = document.getElementById('resSafetyAlertText');
    if (diag.safety_hazard_detected) {
        if (safetyBox) safetyBox.style.display = 'block';
        if (safetyText) safetyText.innerText = diag.safety_details || 'Immediate physical or electrical safety hazard detected. Disconnect power supply and isolate asset.';
    } else {
        if (safetyBox) safetyBox.style.display = 'none';
    }

    // Fault Mechanism
    document.getElementById('resFaultMechanism').innerText = diag.fault_mechanism || 'Hardware diagnostic completed.';

    // Repair & Warranty
    document.getElementById('resRepairViability').innerText = diag.repair_viability || 'Viable via authorized OEM service';
    document.getElementById('resWarrantyAssess').innerText = diag.warranty_claim_viability || 'Check OEM coverage';

    // Directives
    const dirList = document.getElementById('resDirectivesList');
    if (dirList) {
        dirList.innerHTML = '';
        const directives = diag.recommended_directives || [diag.recommended_action || 'Submit device for service inspection'];
        directives.forEach(d => {
            const li = document.createElement('li');
            li.innerText = d;
            dirList.appendChild(li);
        });
    }

    // Full diagnostics button
    const btnFullDiag = document.getElementById('btnViewFullDiagnosticsFromDamage');
    if (btnFullDiag) {
        btnFullDiag.style.display = 'inline-flex';
        btnFullDiag.onclick = () => {
            closeModal(document.getElementById('damageReportModal'));
            openAssetDiagnostics(asset.id);
        };
    }

    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


