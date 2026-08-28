// ============ WheelSync Customer PWA ============
const API_URL = window.location.origin + '/api';

const state = {
    user: JSON.parse(localStorage.getItem('ws_user') || 'null'),
    token: localStorage.getItem('ws_token') || null,
    city: localStorage.getItem('ws_city') || '',
    cities: [],
    categories: [],
    vehicles: [],
    currentVehicle: null,
    tripType: 'local',
    currentPage: 'home',
};

// ============ Helpers ============
function isLoggedIn() { return !!state.token; }
function setAuth(token, user) {
    state.token = token; state.user = user;
    localStorage.setItem('ws_token', token);
    localStorage.setItem('ws_user', JSON.stringify(user));
}
function logout() {
    state.token = null; state.user = null;
    localStorage.removeItem('ws_token'); localStorage.removeItem('ws_user');
    navigate('home');
}
function setCity(c) { state.city = c; localStorage.setItem('ws_city', c); }
function authHeaders() { return state.token ? { 'Authorization': `Bearer ${state.token}` } : {}; }

async function api(endpoint, options = {}) {
    const config = {
        headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers },
        ...options
    };
    if (options.body && typeof options.body === 'object') config.body = JSON.stringify(options.body);
    const res = await fetch(`${API_URL}${endpoint}`, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Something went wrong');
    return data;
}

function navigate(page, params = {}) {
    state.currentPage = page; state.pageParams = params;
    window.location.hash = page; render(); window.scrollTo(0, 0);
}
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) || 'home';
    if (hash !== state.currentPage) { state.currentPage = hash; render(); }
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
    document.getElementById('app').innerHTML = `
        ${renderHeader()}
        <main>${renderPage()}</main>
        ${renderBottomNav()}
    `;
    afterRender();
}

function renderHeader() {
    return `
    <header class="top-header">
        <div class="logo"><span class="material-icons-round">directions_car</span>Wheel<span>Sync</span></div>
        <nav class="nav-desktop">
            <a href="#home" class="nav-link ${state.currentPage==='home'?'active':''}">Home</a>
            <a href="#search" class="nav-link ${state.currentPage==='search'?'active':''}">Book</a>
            <a href="#bookings" class="nav-link ${state.currentPage==='bookings'?'active':''}">My Trips</a>
            <a href="/vendor" class="nav-link">List Vehicles</a>
        </nav>
        <div class="header-actions">
            ${isLoggedIn()
                ? `<div class="user-avatar" onclick="navigate('bookings')">${(state.user.name||'U').charAt(0).toUpperCase()}</div>`
                : `<button class="header-btn" onclick="navigate('login')"><span class="material-icons-round">person</span></button>`}
        </div>
    </header>`;
}

function renderBottomNav() {
    const items = [
        { icon: 'home', label: 'Home', page: 'home' },
        { icon: 'directions_car', label: 'Book', page: 'search' },
        { icon: 'receipt_long', label: 'My Trips', page: 'bookings' },
        { icon: 'storefront', label: 'List Vehicles', page: 'vendor-link' },
    ];
    return `<nav class="bottom-nav">${items.map(i => `
        <button class="nav-item ${state.currentPage===i.page?'active':''}" onclick="${i.page==='vendor-link'?"window.location.href='/vendor'":`navigate('${i.page}')`}">
            <span class="material-icons-round">${i.icon}</span><span>${i.label}</span>
        </button>`).join('')}</nav>`;
}

function renderPage() {
    switch (state.currentPage) {
        case 'home': return renderHome();
        case 'search': return renderSearch();
        case 'booking': return renderBookingForm();
        case 'bookings': return renderMyBookings();
        case 'login': return renderLogin();
        default: return renderHome();
    }
}

// ============ HOME ============
function renderHome() {
    return `
    <section class="hero-section">
        <h2>Book a Ride, Anywhere in India</h2>
        <p>Cars, SUVs, tempo travellers — local, outstation & airport trips</p>
    </section>
    <div class="booking-card">
        <h3><span class="material-icons-round" style="color:var(--primary)">explore</span> Where are you travelling?</h3>
        <div class="form-group input-icon">
            <label>Select City</label>
            <span class="material-icons-round">location_city</span>
            <select id="homeCity">
                <option value="">Loading cities...</option>
            </select>
        </div>
        <button class="btn btn-primary" onclick="goSearchFromHome()">
            <span class="material-icons-round">search</span> Find Vehicles
        </button>
    </div>
    <div class="section-header"><h3>Vehicle Types</h3></div>
    <div class="category-grid" id="categoryGrid"><div class="loading"><div class="spinner"></div></div></div>
    <div class="info-banner">
        <span class="material-icons-round">verified_user</span>
        <div>All vehicles come from <strong>verified fleet operators</strong>. Own vehicles? <a href="/vendor" style="color:var(--primary);font-weight:600">List them here</a> and start earning.</div>
    </div>
    <div class="section-header"><h3>Top Rated Vehicles</h3><a class="see-all" href="#search">See All</a></div>
    <div class="vehicle-list" id="homeVehicles"><div class="loading"><div class="spinner"></div></div></div>

    <div class="partner-cta">
        <span class="material-icons-round">storefront</span>
        <h3>Own vehicles? Partner with us</h3>
        <p>List your cars, SUVs or tempo travellers and get bookings from customers across India.</p>
        <a href="/vendor" class="btn btn-sunset btn-block" style="max-width:280px;margin:12px auto 0">
            <span class="material-icons-round">how_to_reg</span> Become a Partner
        </a>
    </div>

    <footer class="app-footer">
        <div class="footer-links">
            <a href="#home">Home</a>
            <a href="#search">Book</a>
            <a href="/vendor">Vendor Portal</a>
            <a href="/admin">Admin</a>
        </div>
        <p>&copy; 2026 WheelSync — Instant vehicle booking across India</p>
    </footer>`;
}

function goSearchFromHome() {
    const c = document.getElementById('homeCity')?.value || '';
    setCity(c);
    navigate('search');
}

// ============ SEARCH ============
function renderSearch() {
    return `
    <div style="padding:16px 16px 4px"><h3 style="font-size:1.15rem;font-weight:800;">Find Your Vehicle</h3></div>
    <div class="city-bar">
        <span class="material-icons-round">location_on</span>
        <select id="searchCity" onchange="onSearchCityChange()"><option value="">All Cities</option></select>
    </div>
    <div style="padding:0 16px">
        <div class="trip-tabs">
            <button class="trip-tab ${state.tripType==='local'?'active':''}" onclick="setTrip('local')">Local</button>
            <button class="trip-tab ${state.tripType==='outstation'?'active':''}" onclick="setTrip('outstation')">Outstation</button>
            <button class="trip-tab ${state.tripType==='airport'?'active':''}" onclick="setTrip('airport')">Airport</button>
        </div>
        <div class="form-group input-icon">
            <label>Vehicle Type</label>
            <span class="material-icons-round">directions_car</span>
            <select id="searchCategory" onchange="performSearch()"><option value="">All Types</option></select>
        </div>
    </div>
    <div class="vehicle-list" id="searchVehicles"><div class="loading"><div class="spinner"></div></div></div>`;
}

function setTrip(t) {
    state.tripType = t;
    document.querySelectorAll('.trip-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    performSearch();
}

function onSearchCityChange() {
    setCity(document.getElementById('searchCity').value);
    performSearch();
}

async function performSearch() {
    const list = document.getElementById('searchVehicles');
    if (list) list.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    const city = document.getElementById('searchCity')?.value || '';
    const categoryId = document.getElementById('searchCategory')?.value || '';
    try {
        let url = `/search?trip_type=${state.tripType}`;
        if (city) url += `&city=${encodeURIComponent(city)}`;
        if (categoryId) url += `&category_id=${categoryId}`;
        const vehicles = await api(url);
        state.vehicles = vehicles;
        renderVehicleCards(vehicles, 'searchVehicles');
    } catch (e) {
        if (list) list.innerHTML = '<div class="empty-state"><span class="material-icons-round">error_outline</span><p>Could not load vehicles</p></div>';
    }
}

function renderVehicleCards(vehicles, containerId) {
    const c = document.getElementById(containerId);
    if (!c) return;
    if (!vehicles.length) {
        c.innerHTML = `<div class="empty-state"><span class="material-icons-round">no_transfer</span><h3>No vehicles found</h3><p>Try a different city or vehicle type</p></div>`;
        return;
    }
    c.innerHTML = vehicles.map(v => `
        <div class="vehicle-card">
            <div class="vehicle-card-header">
                <div>
                    <div class="vehicle-name">${v.name}</div>
                    <div class="vehicle-cat">${v.category}</div>
                </div>
                ${v.vendor_verified ? '<span class="verified-chip">✓ Verified</span>' : ''}
            </div>
            <div class="vendor-badge">
                <span class="material-icons-round">storefront</span> ${v.vendor_name} • ${v.vendor_city}
                <span class="rating-star" style="margin-left:6px"><span class="material-icons-round">star</span>${v.vendor_rating}</span>
            </div>
            <div class="vehicle-specs">
                <span class="spec-chip"><span class="material-icons-round">airline_seat_recline_normal</span>${v.seating_capacity} seats</span>
                ${v.ac_available ? '<span class="spec-chip"><span class="material-icons-round">ac_unit</span>AC</span>' : ''}
                <span class="spec-chip"><span class="material-icons-round">local_gas_station</span>${v.fuel_type}</span>
            </div>
            ${v.base_fare != null ? `<div class="vehicle-price">From ₹${v.base_fare} <small>+ ₹${v.per_km_rate}/km</small></div>` : ''}
            <div class="vehicle-actions">
                <button class="btn btn-primary btn-sm" onclick='openBooking(${JSON.stringify(v).replace(/'/g, "&#39;")})'>Book Now</button>
            </div>
        </div>`).join('');
}

function openBooking(vehicle) {
    state.currentVehicle = vehicle;
    navigate('booking');
}

// ============ BOOKING FORM ============
function renderBookingForm() {
    const v = state.currentVehicle;
    if (!v) { navigate('search'); return ''; }
    const showReturn = state.tripType === 'outstation';
    return `
    <div class="form-page">
        <button class="back-btn" onclick="history.back()"><span class="material-icons-round">arrow_back</span> Back</button>
        <h2>Book ${v.name}</h2>
        <p class="subtitle">${v.vendor_name} • ${v.category} • ${v.seating_capacity} seats</p>
        <form id="bookingForm" onsubmit="submitBooking(event)">
            <div class="form-group"><label>Your Name *</label><input type="text" id="bkName" required value="${state.user?.name||''}"></div>
            <div class="form-group"><label>Phone Number *</label><input type="tel" id="bkPhone" required pattern="[0-9]{10}" value="${state.user?.phone||''}"></div>
            <div class="form-group"><label>Pickup Location *</label><input type="text" id="bkPickup" required placeholder="Enter pickup address"></div>
            <div class="form-group"><label>Drop Location</label><input type="text" id="bkDrop" placeholder="Enter drop address"></div>
            <div class="form-row">
                <div class="form-group"><label>Pickup Date *</label><input type="date" id="bkDate" required></div>
                <div class="form-group"><label>Pickup Time *</label><input type="time" id="bkTime" required></div>
            </div>
            ${showReturn ? `<div class="form-group"><label>Return Date</label><input type="date" id="bkReturn"></div>` : ''}
            <div class="form-row">
                <div class="form-group"><label>Passengers</label><input type="number" id="bkPax" value="1" min="1" max="${v.seating_capacity}"></div>
                <div class="form-group"><label>Approx Distance (km)</label><input type="number" id="bkKm" value="0" min="0" onchange="updateEstimate()"></div>
            </div>
            <div class="fare-estimate" id="fareBox" style="display:none">
                <h4>Estimated Fare</h4>
                <p class="fare-amount" id="fareAmt">₹0</p>
                <p class="fare-breakdown" id="fareBd"></p>
            </div>
            <button type="button" class="btn btn-secondary" onclick="updateEstimate()"><span class="material-icons-round">calculate</span> Get Estimate</button>
            <button type="submit" class="btn btn-primary mt-8"><span class="material-icons-round">check_circle</span> Confirm Booking</button>
        </form>
        <div class="info-banner" style="margin:16px 0 0">
            <span class="material-icons-round">info</span>
            <div>The operator will confirm your booking and assign a driver. You can track it under <strong>My Trips</strong>.</div>
        </div>
    </div>`;
}

async function updateEstimate() {
    const v = state.currentVehicle;
    const km = document.getElementById('bkKm')?.value || 0;
    try {
        const data = await api(`/pricing/estimate?vendor_id=${v.vendor_id}&category_id=${v.category_id}&trip_type=${state.tripType}&km=${km}`);
        document.getElementById('fareBox').style.display = 'block';
        document.getElementById('fareAmt').textContent = `₹${data.estimated_fare.toLocaleString()}`;
        document.getElementById('fareBd').textContent = data.breakdown;
    } catch (e) {
        showToast('Pricing not available for this trip type');
    }
}

async function submitBooking(e) {
    e.preventDefault();
    const v = state.currentVehicle;
    const date = document.getElementById('bkDate').value;
    const time = document.getElementById('bkTime').value;
    const ret = document.getElementById('bkReturn')?.value;
    const data = {
        customer_name: document.getElementById('bkName').value,
        phone: document.getElementById('bkPhone').value,
        vendor_id: v.vendor_id, vehicle_id: v.vehicle_id, category_id: v.category_id,
        trip_type: state.tripType, city: v.vendor_city,
        pickup_location: document.getElementById('bkPickup').value,
        drop_location: document.getElementById('bkDrop').value,
        pickup_date: `${date}T${time}:00`,
        return_date: ret ? `${ret}T${time}:00` : null,
        passenger_count: parseInt(document.getElementById('bkPax').value),
        estimated_km: parseFloat(document.getElementById('bkKm').value) || 0,
    };
    try {
        const res = await api('/bookings', { method: 'POST', body: data });
        showToast(`Booking confirmed! ID: ${res.booking_id}`);
        setTimeout(() => navigate('bookings'), 800);
    } catch (err) {
        showToast(err.message || 'Booking failed');
    }
}

// ============ MY BOOKINGS ============
function renderMyBookings() {
    return `
    <div style="padding:16px 16px 4px"><h3 style="font-size:1.15rem;font-weight:800;">My Trips</h3></div>
    <div style="padding:0 16px">
        <div class="form-group input-icon">
            <label>Enter your phone to see bookings</label>
            <span class="material-icons-round">phone</span>
            <input type="tel" id="myPhone" placeholder="10-digit phone" value="${state.user?.phone||''}" onkeyup="if(event.key==='Enter')loadMyBookings()">
        </div>
        <button class="btn btn-primary" onclick="loadMyBookings()"><span class="material-icons-round">search</span> View My Bookings</button>
    </div>
    <div id="myBookingsList" style="margin-top:12px"></div>`;
}

async function loadMyBookings() {
    const phone = document.getElementById('myPhone')?.value;
    if (!phone) { showToast('Please enter your phone number'); return; }
    const list = document.getElementById('myBookingsList');
    list.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
        const bookings = await api(`/bookings/my?phone=${phone}`);
        if (!bookings.length) {
            list.innerHTML = `<div class="empty-state"><span class="material-icons-round">receipt_long</span><h3>No bookings yet</h3><p>Book a vehicle to see it here</p></div>`;
            return;
        }
        list.innerHTML = bookings.map(b => `
            <div class="request-card">
                <div class="req-header">
                    <span class="req-name">${b.vendor_name || b.category}</span>
                    <span class="req-status status-${b.status}">${b.status.charAt(0).toUpperCase()+b.status.slice(1)}</span>
                </div>
                <div class="req-details">
                    <strong>${b.category}</strong> • ${b.trip_type} • ${b.city || ''}<br>
                    From: ${b.pickup_location}<br>
                    ${b.drop_location ? 'To: ' + b.drop_location + '<br>' : ''}
                    ${b.pickup_date ? 'When: ' + new Date(b.pickup_date).toLocaleString() + '<br>' : ''}
                    Fare: ₹${b.final_fare || b.estimated_fare} ${b.final_fare ? '(final)' : '(est.)'}<br>
                    Vehicle: ${b.vehicle} | Driver: ${b.driver}<br>
                    ID: ${b.booking_id}
                </div>
                ${['pending','confirmed'].includes(b.status) ? `
                <div class="req-actions">
                    <button class="btn btn-danger btn-sm" onclick="cancelBooking('${b.booking_id}','${phone}')">Cancel</button>
                    ${b.vendor_phone ? `<a class="btn btn-outline btn-sm" href="tel:${b.vendor_phone}">Call Operator</a>` : ''}
                </div>` : ''}
            </div>`).join('');
    } catch (e) {
        list.innerHTML = '<div class="empty-state"><p>Error loading bookings</p></div>';
    }
}

async function cancelBooking(bookingId, phone) {
    if (!confirm('Cancel this booking?')) return;
    try {
        await api(`/bookings/${bookingId}/cancel`, { method: 'PUT', body: { phone } });
        showToast('Booking cancelled');
        loadMyBookings();
    } catch (e) { showToast(e.message || 'Could not cancel'); }
}

// ============ LOGIN ============
function renderLogin() {
    return `
    <div class="login-page">
        <div class="login-card">
            <h2>Welcome</h2>
            <p class="subtitle">Login to manage your bookings faster</p>
            <form id="loginForm" onsubmit="submitLogin(event)">
                <div class="form-group"><label>Phone Number</label><input type="tel" id="lgPhone" required pattern="[0-9]{10}" placeholder="10-digit phone"></div>
                <div class="form-group"><label>Password</label><input type="password" id="lgPass" required></div>
                <button type="submit" class="btn btn-primary">Login</button>
            </form>
            <p style="text-align:center;margin-top:16px;font-size:0.82rem;color:var(--dark-light)">
                New here? <a href="#" onclick="showRegister();return false;" style="color:var(--primary);font-weight:600">Create account</a>
            </p>
            <div style="text-align:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--gray-light)">
                <p style="font-size:0.8rem;color:var(--dark-light);margin-bottom:8px">Have vehicles to rent out?</p>
                <a href="/vendor" class="btn btn-outline btn-sm"><span class="material-icons-round">storefront</span> Vendor Portal</a>
            </div>
        </div>
    </div>`;
}

function showRegister() {
    document.querySelector('.login-card').innerHTML = `
        <h2>Create Account</h2>
        <p class="subtitle">Quick sign up to book rides</p>
        <form id="regForm" onsubmit="submitRegister(event)">
            <div class="form-group"><label>Name</label><input type="text" id="rgName" required></div>
            <div class="form-group"><label>Phone</label><input type="tel" id="rgPhone" required pattern="[0-9]{10}"></div>
            <div class="form-group"><label>City</label><input type="text" id="rgCity" placeholder="Your city"></div>
            <div class="form-group"><label>Password</label><input type="password" id="rgPass" required minlength="6"></div>
            <button type="submit" class="btn btn-primary">Sign Up</button>
        </form>
        <p style="text-align:center;margin-top:16px;font-size:0.82rem;color:var(--dark-light)">
            Already have an account? <a href="#" onclick="render();return false;" style="color:var(--primary);font-weight:600">Login</a>
        </p>`;
}

async function submitLogin(e) {
    e.preventDefault();
    try {
        const res = await api('/auth/customer/login', { method: 'POST', body: {
            phone: document.getElementById('lgPhone').value,
            password: document.getElementById('lgPass').value,
        }});
        setAuth(res.token, res.user);
        showToast(`Welcome back, ${res.user.name}!`);
        navigate('home');
    } catch (err) { showToast(err.message || 'Login failed'); }
}

async function submitRegister(e) {
    e.preventDefault();
    try {
        const res = await api('/auth/customer/register', { method: 'POST', body: {
            name: document.getElementById('rgName').value,
            phone: document.getElementById('rgPhone').value,
            city: document.getElementById('rgCity').value,
            password: document.getElementById('rgPass').value,
        }});
        setAuth(res.token, res.user);
        showToast('Account created!');
        navigate('home');
    } catch (err) { showToast(err.message || 'Registration failed'); }
}

// ============ After render data loading ============
function afterRender() {
    if (state.currentPage === 'home') loadHome();
    if (state.currentPage === 'search') loadSearch();
    if (state.currentPage === 'bookings' && (state.user?.phone)) {
        setTimeout(loadMyBookings, 100);
    }
}

async function loadCitiesInto(selectId) {
    try {
        if (!state.cities.length) state.cities = await api('/cities');
        const sel = document.getElementById(selectId);
        if (sel) {
            const keepFirst = sel.options[0] ? sel.options[0].outerHTML : '';
            sel.innerHTML = keepFirst + state.cities.map(c =>
                `<option value="${c}" ${c===state.city?'selected':''}>${c}</option>`).join('');
        }
    } catch (e) {}
}

async function loadHome() {
    await loadCitiesInto('homeCity');
    // categories
    try {
        if (!state.categories.length) state.categories = await api('/categories');
        const grid = document.getElementById('categoryGrid');
        const icons = { car: 'directions_car', suv: 'airport_shuttle', bus: 'directions_bus', tempo: 'airport_shuttle' };
        if (grid) grid.innerHTML = state.categories.map(c => `
            <div class="category-tile" onclick="browseCategory(${c.id})">
                <div class="category-icon"><span class="material-icons-round">${icons[c.icon]||'directions_car'}</span></div>
                <div class="category-name">${c.name}</div>
                <div class="category-seats">${c.min_seats}-${c.max_seats} seats</div>
            </div>`).join('');
    } catch (e) {}
    // top vehicles
    try {
        const url = state.city ? `/search?city=${encodeURIComponent(state.city)}` : '/search';
        const vehicles = await api(url);
        state.vehicles = vehicles;
        renderVehicleCards(vehicles.slice(0, 5), 'homeVehicles');
    } catch (e) {
        const el = document.getElementById('homeVehicles');
        if (el) el.innerHTML = '<div class="empty-state"><p>Could not load vehicles</p></div>';
    }
}

function browseCategory(catId) {
    navigate('search');
    setTimeout(() => {
        const sel = document.getElementById('searchCategory');
        if (sel) { sel.value = catId; performSearch(); }
    }, 150);
}

async function loadSearch() {
    await loadCitiesInto('searchCity');
    // categories dropdown
    try {
        if (!state.categories.length) state.categories = await api('/categories');
        const sel = document.getElementById('searchCategory');
        if (sel) sel.innerHTML = '<option value="">All Types</option>' +
            state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (e) {}
    performSearch();
}

// ============ Init ============
document.addEventListener('DOMContentLoaded', () => {
    state.currentPage = window.location.hash.slice(1) || 'home';
    render();
});
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
