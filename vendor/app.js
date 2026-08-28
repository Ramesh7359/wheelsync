// ============ WheelSync Vendor Portal ============
const API_URL = window.location.origin + '/api';

const state = {
    token: localStorage.getItem('ws_vendor_token') || null,
    user: JSON.parse(localStorage.getItem('ws_vendor_user') || 'null'),
    categories: [],
    dashboard: null,
    vehicles: [],
    pricing: [],
    currentPage: 'dashboard',
};

function isLoggedIn() { return !!state.token; }
function setAuth(token, user) {
    state.token = token; state.user = user;
    localStorage.setItem('ws_vendor_token', token);
    localStorage.setItem('ws_vendor_user', JSON.stringify(user));
}
function logout() {
    state.token = null; state.user = null;
    localStorage.removeItem('ws_vendor_token'); localStorage.removeItem('ws_vendor_user');
    navigate('login');
}
function authHeaders() { return state.token ? { 'Authorization': `Bearer ${state.token}` } : {}; }

async function api(endpoint, options = {}) {
    const config = { headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers }, ...options };
    if (options.body && typeof options.body === 'object') config.body = JSON.stringify(options.body);
    const res = await fetch(`${API_URL}${endpoint}`, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Something went wrong');
    return data;
}

function navigate(page) { state.currentPage = page; window.location.hash = page; render(); window.scrollTo(0, 0); }
window.addEventListener('hashchange', () => {
    const h = window.location.hash.slice(1) || (isLoggedIn() ? 'dashboard' : 'login');
    if (h !== state.currentPage) { state.currentPage = h; render(); }
});

function showToast(msg) {
    const ex = document.querySelector('.toast'); if (ex) ex.remove();
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3200);
}

// ============ Render ============
function render() {
    if (!isLoggedIn() && !['login', 'register', 'about'].includes(state.currentPage)) {
        state.currentPage = 'about';
    }
    document.getElementById('app').innerHTML = `
        ${renderHeader()}
        <main class="page-in">${renderPage()}</main>
        ${isLoggedIn() ? renderBottomNav() : ''}
        <div class="modal-overlay" id="modal"><div class="modal-content" id="modalContent"></div></div>
    `;
    afterRender();
}

function renderHeader() {
    return `
    <header class="top-header">
        <div class="logo" onclick="navigate('${isLoggedIn()?'dashboard':'about'}')" style="cursor:pointer">
            <span class="material-icons-round">storefront</span>Wheel<span>Sync</span> Vendor
        </div>
        <div class="header-actions">
            ${isLoggedIn()
                ? `<div class="user-avatar" onclick="navigate('profile')">${(state.user.name||'V').charAt(0).toUpperCase()}</div>`
                : `<a class="header-btn" href="/">Customer App</a>`}
        </div>
    </header>`;
}

function renderBottomNav() {
    const items = [
        { icon: 'dashboard', label: 'Dashboard', page: 'dashboard' },
        { icon: 'directions_car', label: 'Vehicles', page: 'vehicles' },
        { icon: 'payments', label: 'Pricing', page: 'pricing' },
        { icon: 'receipt_long', label: 'Bookings', page: 'bookings' },
    ];
    return `<nav class="bottom-nav">${items.map(i => `
        <button class="nav-item ${state.currentPage===i.page?'active':''}" onclick="navigate('${i.page}')">
            <span class="material-icons-round">${i.icon}</span><span>${i.label}</span>
        </button>`).join('')}</nav>`;
}

function renderPage() {
    if (!isLoggedIn()) {
        if (state.currentPage === 'login') return renderLogin();
        if (state.currentPage === 'register') return renderRegister();
        return renderAbout();
    }
    switch (state.currentPage) {
        case 'dashboard': return renderDashboard();
        case 'vehicles': return renderVehicles();
        case 'pricing': return renderPricing();
        case 'bookings': return renderBookings();
        case 'profile': return renderProfile();
        default: return renderDashboard();
    }
}

// ============ ABOUT / LANDING ============
function renderAbout() {
    return `
    <div class="hero-vendor">
        <h2>Grow Your Fleet Business</h2>
        <p>List your vehicles on WheelSync and get bookings from customers across India</p>
    </div>
    <div class="benefit-list">
        <div class="benefit"><span class="material-icons-round">directions_car</span><div><h4>List Unlimited Vehicles</h4><p>Add all your cars, SUVs, tempo travellers in one place</p></div></div>
        <div class="benefit"><span class="material-icons-round">payments</span><div><h4>Set Your Own Prices</h4><p>Control base fare, per-km rate for local, outstation & airport trips</p></div></div>
        <div class="benefit"><span class="material-icons-round">notifications_active</span><div><h4>Get Instant Bookings</h4><p>Receive booking requests and confirm them from your dashboard</p></div></div>
        <div class="benefit"><span class="material-icons-round">public</span><div><h4>Reach Customers Anywhere</h4><p>Serve customers in your city and beyond</p></div></div>
    </div>
    <div style="padding:16px;display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-primary" onclick="navigate('register')"><span class="material-icons-round">how_to_reg</span> Register Your Business</button>
        <button class="btn btn-outline" onclick="navigate('login')"><span class="material-icons-round">login</span> Vendor Login</button>
    </div>`;
}

// ============ LOGIN / REGISTER ============
function renderLogin() {
    return `
    <div class="login-page">
        <div class="login-card">
            <h2>Vendor Login</h2>
            <p class="subtitle">Manage your fleet and bookings</p>
            <form id="loginForm" onsubmit="submitLogin(event)">
                <div class="form-group"><label>Phone Number</label><input type="tel" id="lgPhone" required pattern="[0-9]{10}" placeholder="Registered phone"></div>
                <div class="form-group"><label>Password</label><input type="password" id="lgPass" required></div>
                <button type="submit" class="btn btn-primary">Login</button>
            </form>
            <p style="text-align:center;margin-top:16px;font-size:0.82rem;color:var(--dark-light)">
                New vendor? <a href="#" onclick="navigate('register');return false;" style="color:var(--primary);font-weight:600">Register</a>
            </p>
            <div style="text-align:center;margin-top:12px;padding:10px;background:var(--bg);border-radius:10px;font-size:0.75rem;color:var(--dark-light)">
                <strong>Demo:</strong> Phone 9876500001 | Password password123
            </div>
        </div>
    </div>`;
}

function renderRegister() {
    return `
    <div class="form-page">
        <button class="back-btn" onclick="navigate('about')"><span class="material-icons-round">arrow_back</span> Back</button>
        <h2>Register Your Business</h2>
        <p class="subtitle">Start listing your vehicles in minutes</p>
        <form id="regForm" onsubmit="submitRegister(event)">
            <div class="form-group"><label>Business Name *</label><input type="text" id="rgBiz" required placeholder="e.g., Sri Balaji Travels"></div>
            <div class="form-group"><label>Owner Name *</label><input type="text" id="rgOwner" required></div>
            <div class="form-row">
                <div class="form-group"><label>Phone *</label><input type="tel" id="rgPhone" required pattern="[0-9]{10}"></div>
                <div class="form-group"><label>Email</label><input type="email" id="rgEmail"></div>
            </div>
            <div class="form-group"><label>Password *</label><input type="password" id="rgPass" required minlength="6"></div>
            <div class="form-row">
                <div class="form-group"><label>City *</label><input type="text" id="rgCity" required placeholder="e.g., Hyderabad"></div>
                <div class="form-group"><label>State</label><input type="text" id="rgState" placeholder="e.g., Telangana"></div>
            </div>
            <div class="form-group"><label>Address</label><textarea id="rgAddress" placeholder="Business address"></textarea></div>
            <div class="form-row">
                <div class="form-group"><label>Pincode</label><input type="text" id="rgPincode" pattern="[0-9]{6}"></div>
                <div class="form-group"><label>GST Number</label><input type="text" id="rgGst" placeholder="Optional"></div>
            </div>
            <div class="form-group"><label>About Your Business</label><textarea id="rgDesc" placeholder="Tell customers about your services"></textarea></div>
            <button type="submit" class="btn btn-primary mt-8"><span class="material-icons-round">check_circle</span> Register</button>
        </form>
        <div style="background:rgba(254,202,87,0.15);padding:12px;border-radius:12px;margin-top:14px;font-size:0.8rem;color:#7a5200">
            <strong>Note:</strong> New vendors are reviewed by our team before vehicles appear to customers. You can add vehicles right away.
        </div>
    </div>`;
}

async function submitLogin(e) {
    e.preventDefault();
    try {
        const res = await api('/auth/vendor/login', { method: 'POST', body: {
            phone: document.getElementById('lgPhone').value,
            password: document.getElementById('lgPass').value,
        }});
        setAuth(res.token, res.user);
        showToast(`Welcome, ${res.user.name}!`);
        navigate('dashboard');
    } catch (err) { showToast(err.message || 'Login failed'); }
}

async function submitRegister(e) {
    e.preventDefault();
    try {
        const res = await api('/auth/vendor/register', { method: 'POST', body: {
            business_name: document.getElementById('rgBiz').value,
            owner_name: document.getElementById('rgOwner').value,
            phone: document.getElementById('rgPhone').value,
            email: document.getElementById('rgEmail').value,
            password: document.getElementById('rgPass').value,
            city: document.getElementById('rgCity').value,
            state: document.getElementById('rgState').value,
            address: document.getElementById('rgAddress').value,
            pincode: document.getElementById('rgPincode').value,
            gst_number: document.getElementById('rgGst').value,
            description: document.getElementById('rgDesc').value,
        }});
        setAuth(res.token, res.user);
        showToast('Registered! Add your vehicles now.');
        navigate('dashboard');
    } catch (err) { showToast(err.message || 'Registration failed'); }
}

// ============ DASHBOARD ============
function renderDashboard() {
    return `
    <div class="dashboard-header">
        <div class="greeting">Welcome back,</div>
        <div class="name">${state.user.name}</div>
        <div class="verify-badge ${state.user.is_verified?'verify-yes':'verify-no'}">
            <span class="material-icons-round" style="font-size:0.9rem">${state.user.is_verified?'verified':'hourglass_top'}</span>
            ${state.user.is_verified?'Verified — visible to customers':'Pending verification'}
        </div>
    </div>
    <div class="stats-grid" id="statsGrid">
        <div class="stat-card"><div class="value">-</div><div class="label">Vehicles</div></div>
        <div class="stat-card"><div class="value">-</div><div class="label">Bookings</div></div>
        <div class="stat-card"><div class="value">-</div><div class="label">Pending</div></div>
        <div class="stat-card"><div class="value">-</div><div class="label">Done</div></div>
    </div>
    <div class="section-header"><h3>Recent Bookings</h3><a class="add-btn" onclick="navigate('bookings')">View All</a></div>
    <div id="dashBookings"><div class="loading"><div class="spinner"></div></div></div>
    <div style="padding:16px;display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-blue" onclick="navigate('vehicles')"><span class="material-icons-round">add</span> Add a Vehicle</button>
    </div>`;
}

async function loadDashboard() {
    try {
        const data = await api('/vendor/dashboard');
        state.dashboard = data;
        document.getElementById('statsGrid').innerHTML = `
            <div class="stat-card"><div class="value">${data.stats.total_vehicles}</div><div class="label">Vehicles</div></div>
            <div class="stat-card"><div class="value">${data.stats.total_bookings}</div><div class="label">Bookings</div></div>
            <div class="stat-card"><div class="value">${data.stats.pending}</div><div class="label">Pending</div></div>
            <div class="stat-card"><div class="value">${data.stats.completed}</div><div class="label">Done</div></div>`;
        const el = document.getElementById('dashBookings');
        const recent = data.bookings.slice(0, 5);
        if (!recent.length) {
            el.innerHTML = `<div class="empty-state"><span class="material-icons-round">inbox</span><h3>No bookings yet</h3><p>Bookings from customers will appear here</p></div>`;
        } else {
            el.innerHTML = recent.map(bookingCard).join('');
        }
    } catch (e) { showToast(e.message || 'Error loading dashboard'); }
}

// ============ VEHICLES ============
function renderVehicles() {
    return `
    <div class="section-header" style="padding-top:20px"><h3>My Vehicles</h3>
        <button class="add-btn" onclick="openVehicleModal()"><span class="material-icons-round">add</span> Add</button>
    </div>
    <div id="vehiclesList"><div class="loading"><div class="spinner"></div></div></div>`;
}

async function loadVehicles() {
    try {
        if (!state.categories.length) state.categories = await api('/categories');
        const vehicles = await api('/vendor/vehicles');
        state.vehicles = vehicles;
        const el = document.getElementById('vehiclesList');
        const active = vehicles.filter(v => v.is_active);
        if (!active.length) {
            el.innerHTML = `<div class="empty-state"><span class="material-icons-round">directions_car</span><h3>No vehicles yet</h3><p>Add your first vehicle to start receiving bookings</p></div>`;
            return;
        }
        el.innerHTML = active.map(v => `
            <div class="card">
                <div class="card-row">
                    <div>
                        <div class="card-title">${v.name}</div>
                        <div class="card-sub">${v.category} • ${v.registration_number}</div>
                    </div>
                    <span class="req-status ${v.is_available?'status-confirmed':'status-cancelled'}">${v.is_available?'Available':'Unavailable'}</span>
                </div>
                <div class="chip-row">
                    <span class="chip"><span class="material-icons-round">airline_seat_recline_normal</span>${v.seating_capacity} seats</span>
                    ${v.ac_available?'<span class="chip"><span class="material-icons-round">ac_unit</span>AC</span>':''}
                    <span class="chip"><span class="material-icons-round">local_gas_station</span>${v.fuel_type}</span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-outline btn-sm" onclick="toggleAvailability(${v.id}, ${!v.is_available})">${v.is_available?'Mark Unavailable':'Mark Available'}</button>
                    <button class="btn btn-danger btn-sm" onclick="removeVehicle(${v.id})">Remove</button>
                </div>
            </div>`).join('');
    } catch (e) { showToast(e.message); }
}

function openVehicleModal() {
    const cats = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('modalContent').innerHTML = `
        <h3>Add Vehicle</h3>
        <form id="vehForm" onsubmit="submitVehicle(event)">
            <div class="form-group"><label>Vehicle Name *</label><input type="text" id="vName" required placeholder="e.g., Toyota Innova Crysta"></div>
            <div class="form-group"><label>Category *</label><select id="vCat" required><option value="">Select type</option>${cats}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Registration No *</label><input type="text" id="vReg" required placeholder="TS09AB1234"></div>
                <div class="form-group"><label>Seats *</label><input type="number" id="vSeats" required min="1" max="30"></div>
            </div>
            <div class="form-group"><label>Fuel Type</label><select id="vFuel"><option>Petrol</option><option>Diesel</option><option>CNG</option><option>Electric</option></select></div>
            <div class="checkbox-line" style="margin-bottom:14px"><input type="checkbox" id="vAc" checked><label for="vAc" style="margin:0">Air Conditioned</label></div>
            <button type="submit" class="btn btn-primary">Add Vehicle</button>
            <button type="button" class="btn btn-outline mt-8" onclick="closeModal()">Cancel</button>
        </form>`;
    document.getElementById('modal').classList.add('active');
}
function closeModal() { document.getElementById('modal').classList.remove('active'); }

async function submitVehicle(e) {
    e.preventDefault();
    try {
        await api('/vendor/vehicles', { method: 'POST', body: {
            name: document.getElementById('vName').value,
            category_id: parseInt(document.getElementById('vCat').value),
            registration_number: document.getElementById('vReg').value,
            seating_capacity: parseInt(document.getElementById('vSeats').value),
            fuel_type: document.getElementById('vFuel').value,
            ac_available: document.getElementById('vAc').checked,
            amenities: ['AC', 'Music System'],
        }});
        closeModal();
        showToast('Vehicle added!');
        loadVehicles();
    } catch (err) { showToast(err.message); }
}

async function toggleAvailability(id, avail) {
    try { await api(`/vendor/vehicles/${id}`, { method: 'PUT', body: { is_available: avail } }); loadVehicles(); }
    catch (e) { showToast(e.message); }
}
async function removeVehicle(id) {
    if (!confirm('Remove this vehicle?')) return;
    try { await api(`/vendor/vehicles/${id}`, { method: 'DELETE' }); showToast('Vehicle removed'); loadVehicles(); }
    catch (e) { showToast(e.message); }
}

// ============ PRICING ============
function renderPricing() {
    return `
    <div class="section-header" style="padding-top:20px"><h3>My Pricing</h3>
        <button class="add-btn" onclick="openPricingModal()"><span class="material-icons-round">add</span> Set</button>
    </div>
    <div style="padding:0 16px 8px;font-size:0.82rem;color:var(--dark-light)">Set fares for each vehicle type and trip type. Customers see these prices.</div>
    <div id="pricingList"><div class="loading"><div class="spinner"></div></div></div>`;
}

async function loadPricing() {
    try {
        if (!state.categories.length) state.categories = await api('/categories');
        const rules = await api('/vendor/pricing');
        state.pricing = rules;
        const el = document.getElementById('pricingList');
        if (!rules.length) {
            el.innerHTML = `<div class="empty-state"><span class="material-icons-round">payments</span><h3>No pricing set</h3><p>Set your fares so customers can book</p></div>`;
            return;
        }
        el.innerHTML = rules.map(r => `
            <div class="card">
                <div class="card-row">
                    <div><div class="card-title">${r.category}</div><div class="card-sub">${r.trip_type.charAt(0).toUpperCase()+r.trip_type.slice(1)} trip</div></div>
                </div>
                <div class="chip-row">
                    <span class="chip">Base ₹${r.base_fare}</span>
                    <span class="chip">₹${r.per_km_rate}/km</span>
                    ${r.per_hour_rate?`<span class="chip">₹${r.per_hour_rate}/hr</span>`:''}
                    ${r.min_km?`<span class="chip">Min ${r.min_km}km</span>`:''}
                    ${r.driver_allowance?`<span class="chip">DA ₹${r.driver_allowance}</span>`:''}
                </div>
            </div>`).join('');
    } catch (e) { showToast(e.message); }
}

function openPricingModal() {
    const cats = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('modalContent').innerHTML = `
        <h3>Set Pricing</h3>
        <form id="priceForm" onsubmit="submitPricing(event)">
            <div class="form-group"><label>Vehicle Type *</label><select id="pCat" required><option value="">Select</option>${cats}</select></div>
            <div class="form-group"><label>Trip Type *</label><select id="pTrip" required><option value="local">Local</option><option value="outstation">Outstation</option><option value="airport">Airport</option></select></div>
            <div class="form-row">
                <div class="form-group"><label>Base Fare (₹) *</label><input type="number" id="pBase" required min="0"></div>
                <div class="form-group"><label>Per KM (₹) *</label><input type="number" id="pKm" required min="0" step="0.5"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Per Hour (₹)</label><input type="number" id="pHr" min="0" value="0"></div>
                <div class="form-group"><label>Min KM</label><input type="number" id="pMinKm" min="0" value="0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Driver Allowance (₹/day)</label><input type="number" id="pDa" min="0" value="0"></div>
                <div class="form-group"><label>Night Charge (₹)</label><input type="number" id="pNight" min="0" value="0"></div>
            </div>
            <button type="submit" class="btn btn-primary">Save Pricing</button>
            <button type="button" class="btn btn-outline mt-8" onclick="closeModal()">Cancel</button>
        </form>`;
    document.getElementById('modal').classList.add('active');
}

async function submitPricing(e) {
    e.preventDefault();
    try {
        await api('/vendor/pricing', { method: 'POST', body: {
            category_id: parseInt(document.getElementById('pCat').value),
            trip_type: document.getElementById('pTrip').value,
            base_fare: parseFloat(document.getElementById('pBase').value),
            per_km_rate: parseFloat(document.getElementById('pKm').value),
            per_hour_rate: parseFloat(document.getElementById('pHr').value) || 0,
            min_km: parseInt(document.getElementById('pMinKm').value) || 0,
            driver_allowance: parseFloat(document.getElementById('pDa').value) || 0,
            night_charge: parseFloat(document.getElementById('pNight').value) || 0,
        }});
        closeModal();
        showToast('Pricing saved!');
        loadPricing();
    } catch (err) { showToast(err.message); }
}

// ============ BOOKINGS ============
function renderBookings() {
    return `
    <div class="section-header" style="padding-top:20px"><h3>Bookings</h3></div>
    <div id="bookingsList"><div class="loading"><div class="spinner"></div></div></div>`;
}

function bookingCard(b) {
    return `
    <div class="card">
        <div class="card-row">
            <div><div class="card-title">${b.customer_name}</div><div class="card-sub">${b.customer_phone}</div></div>
            <span class="req-status status-${b.status}">${b.status.charAt(0).toUpperCase()+b.status.slice(1)}</span>
        </div>
        <div class="card-sub" style="margin-top:8px;line-height:1.6">
            <strong>${b.category}</strong> • ${b.trip_type} • ${b.city||''}<br>
            From: ${b.pickup_location}<br>
            ${b.drop_location?'To: '+b.drop_location+'<br>':''}
            ${b.pickup_date?'When: '+new Date(b.pickup_date).toLocaleString()+'<br>':''}
            Fare: ₹${b.final_fare||b.estimated_fare} • ${b.passenger_count} pax<br>
            ID: ${b.booking_id}
        </div>
        ${b.status==='pending'?`
        <div class="card-actions">
            <button class="btn btn-green btn-sm" onclick="respondBooking('${b.booking_id}','confirmed')">Confirm</button>
            <button class="btn btn-danger btn-sm" onclick="respondBooking('${b.booking_id}','cancelled')">Decline</button>
        </div>`:''}
        ${b.status==='confirmed'?`
        <div class="card-actions">
            <button class="btn btn-blue btn-sm" onclick="completeBooking('${b.booking_id}')">Mark Completed</button>
            <a class="btn btn-outline btn-sm" href="tel:${b.customer_phone}">Call Customer</a>
        </div>`:''}
    </div>`;
}

async function loadBookings() {
    try {
        const data = state.dashboard || await api('/vendor/dashboard');
        state.dashboard = data;
        const el = document.getElementById('bookingsList');
        if (!data.bookings.length) {
            el.innerHTML = `<div class="empty-state"><span class="material-icons-round">receipt_long</span><h3>No bookings yet</h3><p>Customer bookings will show up here</p></div>`;
            return;
        }
        el.innerHTML = data.bookings.map(bookingCard).join('');
    } catch (e) { showToast(e.message); }
}

async function respondBooking(id, status) {
    try {
        await api(`/vendor/bookings/${id}/respond`, { method: 'PUT', body: { status } });
        showToast(`Booking ${status}`);
        state.dashboard = null;
        loadBookings();
    } catch (e) { showToast(e.message); }
}

async function completeBooking(id) {
    const fare = prompt('Enter final fare (₹):');
    if (!fare) return;
    try {
        await api(`/vendor/bookings/${id}/respond`, { method: 'PUT', body: { status: 'completed', final_fare: parseFloat(fare) } });
        showToast('Booking completed');
        state.dashboard = null;
        loadBookings();
    } catch (e) { showToast(e.message); }
}

// ============ PROFILE ============
function renderProfile() {
    return `
    <div class="dashboard-header">
        <div class="greeting">Business Profile</div>
        <div class="name">${state.user.name}</div>
        <div class="verify-badge ${state.user.is_verified?'verify-yes':'verify-no'}">
            ${state.user.is_verified?'✓ Verified':'Pending verification'}
        </div>
    </div>
    <div class="card" style="margin-top:20px">
        <div class="card-sub" style="line-height:2">
            <strong>Phone:</strong> ${state.user.phone}<br>
            <strong>City:</strong> ${state.user.city||'-'}<br>
        </div>
    </div>
    <div style="padding:16px">
        <button class="btn btn-danger btn-block" onclick="logout()"><span class="material-icons-round">logout</span> Logout</button>
    </div>`;
}

// ============ After render ============
function afterRender() {
    if (!isLoggedIn()) return;
    if (state.currentPage === 'dashboard') loadDashboard();
    if (state.currentPage === 'vehicles') loadVehicles();
    if (state.currentPage === 'pricing') loadPricing();
    if (state.currentPage === 'bookings') loadBookings();
}

// ============ Init ============
document.addEventListener('DOMContentLoaded', () => {
    state.currentPage = window.location.hash.slice(1) || (isLoggedIn() ? 'dashboard' : 'about');
    render();
});
