// ============ WheelSync Admin Panel ============
const API_URL = window.location.origin + '/api';

const state = {
    token: localStorage.getItem('ws_admin_token') || null,
    user: JSON.parse(localStorage.getItem('ws_admin_user') || 'null'),
    page: 'dashboard',
};

function isLoggedIn() { return !!state.token; }
function setAuth(t, u) { state.token = t; state.user = u; localStorage.setItem('ws_admin_token', t); localStorage.setItem('ws_admin_user', JSON.stringify(u)); }
function logout() { state.token = null; state.user = null; localStorage.removeItem('ws_admin_token'); localStorage.removeItem('ws_admin_user'); render(); }
function authHeaders() { return state.token ? { 'Authorization': `Bearer ${state.token}` } : {}; }

async function api(endpoint, options = {}) {
    const config = { headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers }, ...options };
    if (options.body && typeof options.body === 'object') config.body = JSON.stringify(options.body);
    const res = await fetch(`${API_URL}${endpoint}`, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Something went wrong');
    return data;
}

function showToast(msg) {
    const ex = document.querySelector('.toast'); if (ex) ex.remove();
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

function go(page) { state.page = page; render(); }

// ============ Render ============
function render() {
    const app = document.getElementById('app');
    if (!isLoggedIn()) { app.innerHTML = renderLogin(); return; }
    app.innerHTML = `
    <div class="layout">
        <aside class="sidebar">
            <div class="brand"><span class="material-icons-round">admin_panel_settings</span>Wheel<span>Sync</span></div>
            <nav>
                <a class="${state.page==='dashboard'?'active':''}" onclick="go('dashboard')"><span class="material-icons-round">dashboard</span><span>Dashboard</span></a>
                <a class="${state.page==='vendors'?'active':''}" onclick="go('vendors')"><span class="material-icons-round">store</span><span>Vendors</span></a>
                <a class="${state.page==='bookings'?'active':''}" onclick="go('bookings')"><span class="material-icons-round">receipt_long</span><span>Bookings</span></a>
                <a href="/" target="_blank"><span class="material-icons-round">open_in_new</span><span>Customer App</span></a>
            </nav>
            <div class="logout"><button class="btn btn-outline btn-sm" style="width:100%" onclick="logout()"><span class="material-icons-round" style="font-size:1rem">logout</span> Logout</button></div>
        </aside>
        <main class="main">${renderPage()}</main>
    </div>`;
    afterRender();
}

function renderLogin() {
    return `
    <div class="login-page">
        <div class="login-card">
            <div class="brand">Wheel<span>Sync</span></div>
            <p class="subtitle">Admin Control Panel</p>
            <form id="loginForm" onsubmit="submitLogin(event)">
                <div class="form-group"><label>Username</label><input type="text" id="username" required value="admin"></div>
                <div class="form-group"><label>Password</label><input type="password" id="password" required></div>
                <button type="submit" class="btn btn-primary">Login</button>
            </form>
            <div class="demo-hint"><strong>Demo:</strong> admin / admin123</div>
        </div>
    </div>`;
}

async function submitLogin(e) {
    e.preventDefault();
    try {
        const res = await api('/auth/admin/login', { method: 'POST', body: {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
        }});
        setAuth(res.token, res.user);
        showToast('Welcome, Admin');
        render();
    } catch (err) { showToast(err.message || 'Login failed'); }
}

function renderPage() {
    switch (state.page) {
        case 'dashboard': return `<h1>Dashboard</h1><p class="page-sub">Platform overview</p>
            <div class="stats-grid" id="statsGrid"><div class="loading"><div class="spinner"></div></div></div>
            <div class="panel"><h3>Pending Vendor Approvals</h3><div id="pendingVendors"><div class="loading"><div class="spinner"></div></div></div></div>`;
        case 'vendors': return `<h1>Vendors</h1><p class="page-sub">Manage fleet operators on the platform</p>
            <div class="panel"><div id="vendorsTable"><div class="loading"><div class="spinner"></div></div></div></div>`;
        case 'bookings': return `<h1>Bookings</h1><p class="page-sub">All bookings across the platform</p>
            <div class="panel"><div id="bookingsTable"><div class="loading"><div class="spinner"></div></div></div></div>`;
        default: return '';
    }
}

// ============ Data ============
function afterRender() {
    if (!isLoggedIn()) return;
    if (state.page === 'dashboard') { loadStats(); loadPendingVendors(); }
    if (state.page === 'vendors') loadVendors();
    if (state.page === 'bookings') loadBookings();
}

async function loadStats() {
    try {
        const s = await api('/admin/dashboard');
        document.getElementById('statsGrid').innerHTML = `
            ${statCard('store', s.total_vendors, 'Total Vendors')}
            ${statCard('hourglass_top', s.pending_vendors, 'Pending Approval')}
            ${statCard('directions_car', s.total_vehicles, 'Vehicles')}
            ${statCard('people', s.total_customers, 'Customers')}
            ${statCard('receipt_long', s.total_bookings, 'Bookings')}
            ${statCard('payments', '₹' + (s.total_revenue||0).toLocaleString(), 'Revenue')}`;
    } catch (e) { showToast(e.message); }
}
function statCard(icon, value, label) {
    return `<div class="stat-card"><div class="icon"><span class="material-icons-round">${icon}</span></div><div class="value">${value}</div><div class="label">${label}</div></div>`;
}

async function loadPendingVendors() {
    try {
        const vendors = (await api('/admin/vendors')).filter(v => !v.is_verified);
        const el = document.getElementById('pendingVendors');
        if (!vendors.length) { el.innerHTML = '<div class="empty">No pending approvals 🎉</div>'; return; }
        el.innerHTML = vendorTable(vendors);
    } catch (e) { showToast(e.message); }
}

async function loadVendors() {
    try {
        const vendors = await api('/admin/vendors');
        document.getElementById('vendorsTable').innerHTML = vendors.length ? vendorTable(vendors) : '<div class="empty">No vendors yet</div>';
    } catch (e) { showToast(e.message); }
}

function vendorTable(vendors) {
    return `<table>
        <thead><tr><th>Business</th><th>Owner</th><th>City</th><th>Vehicles</th><th>Rating</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>${vendors.map(v => `
            <tr>
                <td><strong>${v.business_name}</strong><br><small style="color:#888">${v.phone}</small></td>
                <td>${v.owner_name}</td>
                <td>${v.city||'-'}<br><small style="color:#888">${v.state||''}</small></td>
                <td>${v.total_vehicles}</td>
                <td>⭐ ${v.rating}</td>
                <td><span class="badge ${v.is_verified?'badge-confirmed':'badge-pending'}">${v.is_verified?'Verified':'Pending'}</span></td>
                <td>
                    ${v.is_verified
                        ? `<button class="btn btn-outline btn-sm" onclick="setVerify(${v.id}, false)">Unverify</button>`
                        : `<button class="btn btn-success btn-sm" onclick="setVerify(${v.id}, true)">Approve</button>`}
                </td>
            </tr>`).join('')}</tbody>
    </table>`;
}

async function setVerify(vendorId, verified) {
    try {
        await api(`/admin/vendors/${vendorId}/verify`, { method: 'PUT', body: { is_verified: verified } });
        showToast(verified ? 'Vendor approved' : 'Vendor unverified');
        if (state.page === 'dashboard') { loadStats(); loadPendingVendors(); }
        else loadVendors();
    } catch (e) { showToast(e.message); }
}

async function loadBookings() {
    try {
        const bookings = await api('/admin/bookings');
        const el = document.getElementById('bookingsTable');
        if (!bookings.length) { el.innerHTML = '<div class="empty">No bookings yet</div>'; return; }
        el.innerHTML = `<table>
            <thead><tr><th>Booking ID</th><th>Customer</th><th>Vendor</th><th>Trip</th><th>City</th><th>Fare</th><th>Status</th></tr></thead>
            <tbody>${bookings.map(b => `
                <tr>
                    <td><strong>${b.booking_id}</strong><br><small style="color:#888">${b.pickup_date ? new Date(b.pickup_date).toLocaleDateString() : ''}</small></td>
                    <td>${b.customer_name}<br><small style="color:#888">${b.customer_phone}</small></td>
                    <td>${b.vendor_name||'-'}</td>
                    <td>${b.category}<br><small style="color:#888">${b.trip_type}</small></td>
                    <td>${b.city||'-'}</td>
                    <td>₹${b.final_fare||b.estimated_fare}</td>
                    <td><span class="badge badge-${b.status}">${b.status}</span></td>
                </tr>`).join('')}</tbody>
        </table>`;
    } catch (e) { showToast(e.message); }
}

// ============ Init ============
document.addEventListener('DOMContentLoaded', render);
