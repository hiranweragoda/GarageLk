/**

 */

(function () {
    // Instantly check and apply theme on script load to avoid visual flash
    const savedTheme = localStorage.getItem('theme') || 'night';
    if (savedTheme === 'day') {
        document.body.classList.add('light-mode');
    }

    // Intercept fetch calls to redirect to port 8080 when running on other ports (e.g. port 80 Apache)
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        if (typeof input === 'string' && input.startsWith('/api/')) {
            const backendUrl = window.location.port === '8080' ? '' : 'http://localhost:8080';
            input = backendUrl + input;
            init = init || {};
            init.credentials = 'include';
        }
        return originalFetch(input, init);
    };

    const GarageLK = {
        currentUser: null,
        map: null,
        markers: [],
        selectedServices: new Map(), // serviceId -> price
        selectedGarageId: null,

        // --- AUTH & INITIAL CHECK ---
        async checkAuth() {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    this.currentUser = await res.json();
                    this.updateNavUI();
                    return true;
                }
            } catch (err) {
                console.error("Auth check failed:", err);
            }
            this.currentUser = null;
            this.updateNavUI();
            return false;
        },

        updateNavUI() {
            const authContainer = document.getElementById('nav-auth-container');
            if (!authContainer) return;

            if (this.currentUser) {
                const initials = this.currentUser.fullName ? 
                    this.currentUser.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 
                    this.currentUser.username.substring(0, 2).toUpperCase();

                authContainer.innerHTML = `
                    <div class="user-menu" id="user-menu-badge">
                        <div class="user-badge">
                            <div class="user-avatar">${initials}</div>
                            <span>${this.currentUser.fullName || this.currentUser.username}</span>
                            <i class="fa-solid fa-chevron-down" style="font-size:0.8rem; margin-left:0.25rem;"></i>
                        </div>
                        <div class="user-dropdown">
                            <a href="dashboard.html" class="dropdown-item"><i class="fa-solid fa-gauge"></i> Dashboard</a>
                            <a href="#" class="dropdown-item" onclick="window.GarageLK.handleLogout(event)"><i class="fa-solid fa-right-from-bracket"></i> Sign Out</a>
                        </div>
                    </div>
                `;
            } else {
                authContainer.innerHTML = `
                    <a href="auth.html" class="btn btn-outline" id="btn-login-nav">Sign In</a>
                    <a href="auth.html?tab=signup" class="btn btn-primary" id="btn-signup-nav">Get Started</a>
                `;
            }
        },

        async handleLogout(e) {
            if (e) e.preventDefault();
            try {
                const res = await fetch('/api/auth/logout', { method: 'POST' });
                if (res.ok) {
                    this.showToast('Logged out successfully', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                }
            } catch (err) {
                this.showToast('Logout failed', 'error');
            }
        },

        // --- AUTH PAGE FUNCTIONS ---
        switchAuthTab(tab) {
            const tabLogin = document.getElementById('tab-login');
            const tabSignup = document.getElementById('tab-signup');
            const formLogin = document.getElementById('form-login');
            const formSignup = document.getElementById('form-signup');

            if (tab === 'login') {
                tabLogin.classList.add('active');
                tabSignup.classList.remove('active');
                formLogin.style.display = 'block';
                formSignup.style.display = 'none';
            } else {
                tabSignup.classList.add('active');
                tabLogin.classList.remove('active');
                formSignup.style.display = 'block';
                formLogin.style.display = 'none';
            }
        },

        setSignupRole(role) {
            document.getElementById('signup-role').value = role;
            const btnCustomer = document.getElementById('toggle-role-customer');
            const btnOwner = document.getElementById('toggle-role-owner');

            if (role === 'CUSTOMER') {
                btnCustomer.classList.add('active');
                btnOwner.classList.remove('active');
            } else {
                btnOwner.classList.add('active');
                btnCustomer.classList.remove('active');
            }
        },

        async handleLogin(e) {
            e.preventDefault();
            const usernameInput = document.getElementById('login-username');
            const passwordInput = document.getElementById('login-password');

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: usernameInput.value.trim(),
                        password: passwordInput.value
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Welcome back, ' + data.fullName, 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    this.showToast(data.message || 'Login failed', 'error');
                }
            } catch (err) {
                this.showToast('Connection error', 'error');
            }
        },

        async handleSignup(e) {
            e.preventDefault();
            const username = document.getElementById('signup-username').value.trim();
            const fullName = document.getElementById('signup-fullname').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const phone = document.getElementById('signup-phone').value.trim();
            const password = document.getElementById('signup-password').value;
            const role = document.getElementById('signup-role').value;

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, fullName, email, phone, password, role })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Registration successful! Please Sign In.', 'success');
                    setTimeout(() => {
                        this.switchAuthTab('login');
                        document.getElementById('login-username').value = username;
                    }, 1500);
                } else {
                    this.showToast(data.message || 'Registration failed', 'error');
                }
            } catch (err) {
                this.showToast('Connection error', 'error');
            }
        },

        // --- HOMEPAGE / SEARCH PAGE ---
        async initHomepage() {
            await this.checkAuth();
            this.initMap();
            
            // Set search listeners
            const btnSearch = document.getElementById('btn-search');
            if (btnSearch) {
                btnSearch.addEventListener('click', () => this.loadGarages());
            }

            const searchKeyword = document.getElementById('search-keyword');
            if (searchKeyword) {
                searchKeyword.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.loadGarages();
                });
            }

            this.loadGarages();
        },

        initMap() {
            // Center map on Sri Lanka
            this.map = L.map('map', {
                zoomControl: true,
                attributionControl: false
            }).setView([7.8731, 80.7718], 7.5);

            const savedTheme = localStorage.getItem('theme') || 'night';
            const tilesUrl = savedTheme === 'day' 
                ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

            L.tileLayer(tilesUrl, {
                maxZoom: 20
            }).addTo(this.map);
        },

        async loadGarages() {
            const city = document.getElementById('search-city').value;
            const search = document.getElementById('search-keyword').value;
            
            const container = document.getElementById('garages-container');
            container.innerHTML = `
                <div style="text-align:center; padding: 3rem; color: var(--text-muted);">
                    <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--primary); margin-bottom: 1rem;"></i>
                    <p>Fetching garages...</p>
                </div>
            `;

            // Clear previous map markers
            this.markers.forEach(m => this.map.removeLayer(m));
            this.markers = [];

            try {
                let url = '/api/garages';
                const params = [];
                if (city) params.push(`city=${encodeURIComponent(city)}`);
                if (search) params.push(`search=${encodeURIComponent(search)}`);
                if (params.length > 0) url += '?' + params.join('&');

                const res = await fetch(url);
                const garages = await res.json();

                if (!res.ok) throw new Error("Failed to load garages");

                if (garages.length === 0) {
                    container.innerHTML = `
                        <div style="text-align:center; padding: 3rem; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius:var(--radius-md);">
                            <i class="fa-solid fa-circle-info fa-2x" style="margin-bottom:1rem;"></i>
                            <p>No active garages found matching your search.</p>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = '';
                const mapPoints = [];

                garages.forEach(g => {
                    // Create card
                    const card = document.createElement('div');
                    card.className = 'garage-card';
                    card.innerHTML = `
                        <img src="${g.imageUrl || 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=400'}" class="garage-card-img" alt="${g.name}">
                        <div class="garage-card-content">
                            <div>
                                <div class="garage-header">
                                    <h3 class="garage-title">${g.name}</h3>
                                    <div class="garage-rating">
                                        <i class="fa-solid fa-star"></i> ${g.rating ? g.rating.toFixed(1) : '0.0'}
                                    </div>
                                </div>
                                <div class="garage-address">
                                    <i class="fa-solid fa-location-dot"></i> ${g.address}, ${g.city}
                                </div>
                                <p class="garage-description">${g.description}</p>
                            </div>
                            <div class="garage-footer">
                                <span class="garage-phone"><i class="fa-solid fa-phone"></i> ${g.phone || 'N/A'}</span>
                                <a href="garage.html?id=${g.id}" class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.85rem;">View Profile</a>
                            </div>
                        </div>
                    `;

                    // Click card: pan to marker
                    card.addEventListener('click', () => {
                        if (g.latitude && g.longitude) {
                            this.map.setView([g.latitude, g.longitude], 13);
                        }
                    });

                    container.appendChild(card);

                    // Add map marker
                    if (g.latitude && g.longitude) {
                        const marker = L.marker([g.latitude, g.longitude]).addTo(this.map);
                        marker.bindPopup(`
                            <div style="color:white; font-family:var(--font-body); min-width: 150px;">
                                <h4 style="font-weight:700; margin-bottom:4px; font-family:var(--font-heading);">${g.name}</h4>
                                <p style="font-size:0.8rem; margin-bottom:8px; color:var(--text-secondary);"><i class="fa-solid fa-location-dot"></i> ${g.city}</p>
                                <a href="garage.html?id=${g.id}" class="btn btn-primary" style="padding:0.25rem 0.5rem; font-size:0.75rem; width:100%; text-align:center; color:white;">Book Service</a>
                            </div>
                        `);
                        this.markers.push(marker);
                        mapPoints.push([g.latitude, g.longitude]);
                    }
                });

                // Auto-fit map to show all markers if any
                if (mapPoints.length > 0) {
                    const bounds = L.latLngBounds(mapPoints);
                    this.map.fitBounds(bounds, { padding: [50, 50] });
                }

            } catch (err) {
                container.innerHTML = `
                    <div style="text-align:center; padding:3rem; color:var(--danger);">
                        <i class="fa-solid fa-triangle-exclamation fa-2x" style="margin-bottom:1rem;"></i>
                        <p>Error loading garages. Please refresh page.</p>
                    </div>
                `;
            }
        },

        // --- GARAGE DETAILS & BOOKING PAGE ---
        async initGarageDetails() {
            await this.checkAuth();
            
            const urlParams = new URLSearchParams(window.location.search);
            const garageId = urlParams.get('id');
            if (!garageId) {
                window.location.href = 'index.html';
                return;
            }
            this.selectedGarageId = garageId;

            // Set min booking date to today
            const dateInput = document.getElementById('booking-date');
            if (dateInput) {
                dateInput.min = new Date().toISOString().split('T')[0];
            }

            try {
                const res = await fetch(`/api/garages/${garageId}`);
                if (!res.ok) throw new Error("Garage not found");
                
                const data = await res.json();
                this.renderGarageProfile(data.garage);
                this.renderGarageServices(data.services);
                this.renderGarageReviews(data.reviews);

            } catch (err) {
                this.showToast('Error loading garage details', 'error');
            }
        },

        renderGarageProfile(g) {
            document.title = `${g.name} - GarageLK`;
            const headerContainer = document.getElementById('garage-profile-header');
            
            headerContainer.innerHTML = `
                <div style="position:relative; margin-bottom: 2rem;">
                    <img src="${g.imageUrl || 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=1200'}" class="garage-hero-img" alt="${g.name}">
                    <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap:wrap; gap:1rem;">
                        <div>
                            <h1 style="font-size:2.5rem; font-weight:800; margin-bottom:0.5rem;">${g.name}</h1>
                            <div style="display:flex; gap:1.5rem; color:var(--text-secondary); font-size:0.95rem; flex-wrap:wrap;">
                                <span><i class="fa-solid fa-location-dot" style="color:var(--primary)"></i> ${g.address}, ${g.city}</span>
                                <span><i class="fa-solid fa-phone" style="color:var(--secondary)"></i> ${g.phone || 'N/A'}</span>
                                <span><i class="fa-solid fa-envelope" style="color:var(--primary)"></i> ${g.email || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="garage-rating" style="font-size: 1.25rem; padding: 0.5rem 1rem;">
                            <i class="fa-solid fa-star"></i> ${g.rating ? g.rating.toFixed(1) : '0.0'}
                        </div>
                    </div>
                    <p style="color:var(--text-secondary); margin-top:1rem; font-size:1.05rem; line-height:1.6;">${g.description}</p>
                </div>
            `;
        },

        renderGarageServices(services) {
            const container = document.getElementById('services-container');
            if (services.length === 0) {
                container.innerHTML = '<p style="color:var(--text-muted);">No services listed for this garage.</p>';
                return;
            }

            container.innerHTML = '';
            this.selectedServices.clear();
            this.updateBookingSummary();

            services.forEach(s => {
                const item = document.createElement('div');
                item.className = 'service-list-item';
                item.innerHTML = `
                    <div class="service-info">
                        <h4>${s.serviceName}</h4>
                        <p>${s.description || 'Routine service option.'}</p>
                    </div>
                    <div class="service-price-select">
                        <span class="service-price">LKR ${s.price.toFixed(2)}</span>
                        <input type="checkbox" class="form-control" style="width:20px; height:20px; cursor:pointer;" 
                            onclick="window.GarageLK.toggleServiceSelect(this, ${s.id}, '${s.serviceName}', ${s.price})" unique-id="service-chk-${s.id}">
                    </div>
                `;
                container.appendChild(item);
            });
        },

        toggleServiceSelect(checkbox, id, name, price) {
            if (checkbox.checked) {
                this.selectedServices.set(id, { name, price });
            } else {
                this.selectedServices.delete(id);
            }
            this.updateBookingSummary();
        },

        updateBookingSummary() {
            const container = document.getElementById('booking-services-summary');
            const totalSpan = document.getElementById('booking-total-price');
            
            if (this.selectedServices.size === 0) {
                container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-muted);">No services selected yet.</p>';
                totalSpan.textContent = 'LKR 0.00';
                return;
            }

            let html = '';
            let total = 0.0;
            
            this.selectedServices.forEach((value) => {
                html += `
                    <div class="summary-row">
                        <span>${value.name}</span>
                        <span>LKR ${value.price.toFixed(2)}</span>
                    </div>
                `;
                total += value.price;
            });
            
            container.innerHTML = html;
            totalSpan.textContent = `LKR ${total.toFixed(2)}`;
        },

        renderGarageReviews(reviews) {
            const container = document.getElementById('reviews-container');
            if (reviews.length === 0) {
                container.innerHTML = '<p style="color:var(--text-muted); padding:1rem 0;">No reviews yet. Be the first to book and rate!</p>';
                return;
            }

            container.innerHTML = '';
            reviews.forEach(r => {
                let stars = '';
                for (let i = 1; i <= 5; i++) {
                    stars += i <= r.rating ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
                }

                const item = document.createElement('div');
                item.className = 'review-item';
                item.innerHTML = `
                    <div class="review-header">
                        <span class="review-user">${r.user.fullName || r.user.username}</span>
                        <span class="review-rating">${stars}</span>
                    </div>
                    <p class="review-comment">${r.comment || ''}</p>
                    <span class="review-date">${new Date(r.createdAt).toLocaleDateString()}</span>
                `;
                container.appendChild(item);
            });
        },

        async handleBookingSubmit(e) {
            e.preventDefault();
            if (!this.currentUser) {
                this.showToast('Please Sign In to book an appointment.', 'error');
                setTimeout(() => { window.location.href = 'auth.html'; }, 1000);
                return;
            }

            if (this.selectedServices.size === 0) {
                this.showToast('Please select at least one service.', 'error');
                return;
            }

            const date = document.getElementById('booking-date').value;
            const slot = document.getElementById('booking-time').value;
            const vehicleType = document.getElementById('booking-vehicletype').value;
            const vehicleNo = document.getElementById('booking-vehicleno').value.trim();
            const desc = document.getElementById('booking-desc').value.trim();

            // Calculate total price
            let total = 0.0;
            const serviceNames = [];
            this.selectedServices.forEach(v => {
                total += v.price;
                serviceNames.push(v.name);
            });

            const finalDesc = `Selected Services: [${serviceNames.join(', ')}] | Note: ${desc}`;

            try {
                const res = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        garageId: this.selectedGarageId,
                        bookingDate: date,
                        timeSlot: slot,
                        vehicleNo: vehicleNo,
                        vehicleType: vehicleType,
                        description: finalDesc,
                        totalPrice: total
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Booking request submitted successfully!', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    this.showToast(data.message || 'Booking failed', 'error');
                }
            } catch (err) {
                this.showToast('Connection error', 'error');
            }
        },

        // --- DASHBOARD FUNCTIONS ---
        async initDashboard() {
            const authed = await this.checkAuth();
            if (!authed) {
                this.showToast('Access denied. Please log in first.', 'error');
                window.location.href = 'auth.html';
                return;
            }

            this.buildDashboardSidebar();
            
            // Activate first visible section
            const role = this.currentUser.role;
            if (role === 'CUSTOMER') {
                this.switchDashboardTab('customer-bookings');
                this.loadCustomerBookings();
                this.loadCustomerBreakdowns();
            } else if (role === 'OWNER') {
                this.switchDashboardTab('owner-garages');
                this.loadOwnerGarages();
                this.loadOwnerBookings();
                this.loadOwnerAnalytics();
                this.loadOwnerBreakdownAlerts();
            } else if (role === 'ADMIN') {
                this.switchDashboardTab('admin-approvals');
                this.loadAdminApprovals();
                this.loadAdminMonitor();
            }
        },

        buildDashboardSidebar() {
            const sidebar = document.getElementById('dashboard-sidebar');
            const role = this.currentUser.role;

            let html = '';
            if (role === 'CUSTOMER') {
                html = `
                    <div style="padding: 1rem; text-align: center; border-bottom:1px solid var(--border-color); margin-bottom:1rem;">
                        <h4 style="font-weight:700;">Customer Panel</h4>
                        <span style="font-size:0.75rem; color:var(--secondary);">Registered Member</span>
                    </div>
                    <button class="sidebar-btn active" id="side-customer-bookings" onclick="window.GarageLK.switchDashboardTab('customer-bookings')">
                        <i class="fa-solid fa-list-check"></i> My Appointments
                    </button>
                    <button class="sidebar-btn" id="side-customer-breakdowns" onclick="window.GarageLK.switchDashboardTab('customer-breakdowns'); window.GarageLK.loadCustomerBreakdowns();">
                        <i class="fa-solid fa-truck-medical"></i> Emergency Assist
                    </button>
                `;
            } else if (role === 'OWNER') {
                html = `
                    <div style="padding: 1rem; text-align: center; border-bottom:1px solid var(--border-color); margin-bottom:1rem;">
                        <h4 style="font-weight:700;">Owner Panel</h4>
                        <span style="font-size:0.75rem; color:var(--accent);">Garage Business</span>
                    </div>
                    <button class="sidebar-btn" id="side-owner-garages" onclick="window.GarageLK.switchDashboardTab('owner-garages')">
                        <i class="fa-solid fa-warehouse"></i> My Garages
                    </button>
                    <button class="sidebar-btn" id="side-owner-bookings" onclick="window.GarageLK.switchDashboardTab('owner-bookings')">
                        <i class="fa-solid fa-calendar-days"></i> Bookings Requests
                    </button>
                    <button class="sidebar-btn" id="side-owner-services" onclick="window.GarageLK.switchDashboardTab('owner-services')">
                        <i class="fa-solid fa-screwdriver-wrench"></i> Manage Services
                    </button>
                    <button class="sidebar-btn" id="side-owner-breakdowns" onclick="window.GarageLK.switchDashboardTab('owner-breakdowns'); window.GarageLK.loadOwnerBreakdownAlerts();">
                        <i class="fa-solid fa-bell"></i> Breakdown Alerts
                    </button>
                    <button class="sidebar-btn" id="side-owner-analytics" onclick="window.GarageLK.switchDashboardTab('owner-analytics')">
                        <i class="fa-solid fa-chart-line"></i> Analytics Overview
                    </button>
                `;
            } else if (role === 'ADMIN') {
                html = `
                    <div style="padding: 1rem; text-align: center; border-bottom:1px solid var(--border-color); margin-bottom:1rem;">
                        <h4 style="font-weight:700;">Admin Panel</h4>
                        <span style="font-size:0.75rem; color:var(--danger);">System Administrator</span>
                    </div>
                    <button class="sidebar-btn active" id="side-admin-approvals" onclick="window.GarageLK.switchDashboardTab('admin-approvals')">
                        <i class="fa-solid fa-clipboard-check"></i> Pending Approvals
                    </button>
                    <button class="sidebar-btn" id="side-admin-monitor" onclick="window.GarageLK.switchDashboardTab('admin-monitor'); window.GarageLK.loadAdminMonitor();">
                        <i class="fa-solid fa-chart-line"></i> System Monitor
                    </button>
                `;
            }

            sidebar.innerHTML = html;
        },

        switchDashboardTab(sectionId) {
            // Deactivate all sections
            document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
            // Activate target section
            const targetSection = document.getElementById(`section-${sectionId}`);
            if (targetSection) targetSection.classList.add('active');

            // Deactivate all sidebar buttons
            document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
            // Activate target sidebar button
            const targetBtn = document.getElementById(`side-${sectionId}`);
            if (targetBtn) targetBtn.classList.add('active');
        },

        // --- CUSTOMER DATA LOADER ---
        async loadCustomerBookings() {
            const list = document.getElementById('customer-bookings-list');
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading bookings...</p>';

            try {
                const res = await fetch('/api/bookings/my');
                const bookings = await res.json();
                if (!res.ok) throw new Error("Load failed");

                if (bookings.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">You have no appointment history yet.</p>';
                    return;
                }

                list.innerHTML = '';
                bookings.forEach(b => {
                    const item = document.createElement('div');
                    item.className = 'table-item';
                    
                    let statusBadgeClass = 'badge-pending';
                    if (b.status === 'APPROVED') statusBadgeClass = 'badge-approved';
                    else if (b.status === 'COMPLETED') statusBadgeClass = 'badge-completed';
                    else if (b.status === 'CANCELLED') statusBadgeClass = 'badge-cancelled';

                    // Review button if completed
                    let actionHtml = '';
                    if (b.status === 'COMPLETED') {
                        actionHtml = `
                            <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" 
                                onclick="window.GarageLK.openReviewModal(${b.id})" unique-id="review-btn-${b.id}">
                                <i class="fa-solid fa-star"></i> Write Review
                            </button>
                        `;
                    } else if (b.status === 'PENDING' || b.status === 'APPROVED') {
                        actionHtml = `
                            <button class="btn btn-danger" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" 
                                onclick="window.GarageLK.updateBookingStatus(${b.id}, 'CANCELLED')" unique-id="cancel-btn-${b.id}">
                                Cancel
                            </button>
                        `;
                    }

                    item.innerHTML = `
                        <div style="flex:1;">
                            <h4 style="font-weight:700;">${b.garage.name}</h4>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                <i class="fa-regular fa-calendar"></i> ${b.bookingDate} &bull; <i class="fa-regular fa-clock"></i> ${b.timeSlot}
                            </p>
                            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">
                                <strong>Vehicle:</strong> ${b.vehicleType} (${b.vehicleNo}) <br>
                                <strong>Details:</strong> ${b.description}
                            </p>
                        </div>
                        <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem;">
                            <span class="badge ${statusBadgeClass}">${b.status}</span>
                            <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${b.totalPrice.toFixed(2)}</span>
                            ${actionHtml}
                        </div>
                    `;
                    list.appendChild(item);
                });

            } catch (err) {
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading bookings.</p>';
            }
        },

        // --- OWNER DATA LOADERS ---
        async loadOwnerGarages() {
            const list = document.getElementById('owner-garages-list');
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading garages...</p>';

            try {
                const res = await fetch('/api/garages/my');
                const garages = await res.json();
                if (!res.ok) throw new Error();

                // Populate service garage select dropdown while we are here
                const select = document.getElementById('owner-services-garage-select');
                if (select) {
                    select.innerHTML = '<option value="">-- Choose Garage --</option>';
                    garages.forEach(g => {
                        if (g.status === 'APPROVED') {
                            select.innerHTML += `<option value="${g.id}">${g.name}</option>`;
                        }
                    });
                }

                // Populate analytics garage select dropdown
                const analyticsSelect = document.getElementById('owner-analytics-garage-select');
                if (analyticsSelect) {
                    analyticsSelect.innerHTML = '<option value="">All Garages</option>';
                    garages.forEach(g => {
                        if (g.status === 'APPROVED') {
                            analyticsSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`;
                        }
                    });
                }

                if (garages.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">You have not registered any garages yet.</p>';
                    return;
                }

                list.innerHTML = '';
                garages.forEach(g => {
                    const item = document.createElement('div');
                    item.className = 'table-item';
                    
                    let badgeClass = 'badge-pending';
                    if (g.status === 'APPROVED') badgeClass = 'badge-completed';

                    item.innerHTML = `
                        <div style="display:flex; gap:1rem; align-items:center;">
                            <img src="${g.imageUrl || 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=150'}" style="width:80px; height:60px; object-fit:cover; border-radius:var(--radius-sm);">
                            <div>
                                <h4 style="font-weight:700;">${g.name}</h4>
                                <p style="font-size:0.85rem; color:var(--text-secondary);"><i class="fa-solid fa-location-dot"></i> ${g.address}, ${g.city}</p>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <span class="badge ${badgeClass}">${g.status === 'APPROVED' ? 'APPROVED' : 'PENDING APPROVAL'}</span>
                        </div>
                    `;
                    list.appendChild(item);
                });

            } catch (err) {
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading garages.</p>';
            }
        },

        async loadOwnerBookings() {
            const list = document.getElementById('owner-bookings-list');
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading bookings...</p>';

            try {
                const res = await fetch('/api/bookings/my');
                const bookings = await res.json();
                if (!res.ok) throw new Error();

                if (bookings.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No booking requests found.</p>';
                    return;
                }

                list.innerHTML = '';
                bookings.forEach(b => {
                    const item = document.createElement('div');
                    item.className = 'table-item';

                    let badgeClass = 'badge-pending';
                    if (b.status === 'APPROVED') badgeClass = 'badge-approved';
                    else if (b.status === 'COMPLETED') badgeClass = 'badge-completed';
                    else if (b.status === 'CANCELLED') badgeClass = 'badge-cancelled';

                    // Actions
                    let actionHtml = '';
                    if (b.status === 'PENDING') {
                        actionHtml = `
                            <button class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                onclick="window.GarageLK.updateBookingStatus(${b.id}, 'APPROVED')" unique-id="approve-btn-${b.id}">Approve</button>
                            <button class="btn btn-outline btn-danger" style="padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                onclick="window.GarageLK.updateBookingStatus(${b.id}, 'CANCELLED')" unique-id="reject-btn-${b.id}">Reject</button>
                        `;
                    } else if (b.status === 'APPROVED') {
                        actionHtml = `
                            <button class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem; background:var(--success);" 
                                onclick="window.GarageLK.updateBookingStatus(${b.id}, 'COMPLETED')" unique-id="complete-btn-${b.id}">Mark Completed</button>
                            <button class="btn btn-outline btn-danger" style="padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                onclick="window.GarageLK.updateBookingStatus(${b.id}, 'CANCELLED')" unique-id="owner-cancel-btn-${b.id}">Cancel</button>
                        `;
                    }

                    item.innerHTML = `
                        <div style="flex:1;">
                            <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:4px;">
                                <h4 style="font-weight:700; margin-bottom:0;">${b.user.fullName || b.user.username}</h4>
                                <span style="font-size:0.8rem; color:var(--text-muted);">booked at <strong>${b.garage.name}</strong></span>
                            </div>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                <i class="fa-regular fa-calendar"></i> ${b.bookingDate} &bull; <i class="fa-regular fa-clock"></i> ${b.timeSlot}
                            </p>
                            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">
                                <strong>Vehicle:</strong> ${b.vehicleType} (${b.vehicleNo}) <br>
                                <strong>Details:</strong> ${b.description}
                            </p>
                        </div>
                        <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; min-width: 180px;">
                            <span class="badge ${badgeClass}">${b.status}</span>
                            <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${b.totalPrice.toFixed(2)}</span>
                            <div style="display:flex; gap:0.5rem; margin-top:0.25rem;">
                                ${actionHtml}
                            </div>
                        </div>
                    `;
                    list.appendChild(item);
                });

            } catch (err) {
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading bookings.</p>';
            }
        },

        async loadOwnerServices() {
            const garageId = document.getElementById('owner-services-garage-select').value;
            const container = document.getElementById('owner-services-container');
            const btnAdd = document.getElementById('btn-add-service');

            if (!garageId) {
                container.innerHTML = '<p style="color:var(--text-muted);">Please select a garage to manage services.</p>';
                if (btnAdd) btnAdd.style.display = 'none';
                return;
            }

            if (btnAdd) btnAdd.style.display = 'inline-flex';
            container.innerHTML = '<p style="color:var(--text-muted);">Loading services...</p>';

            try {
                const res = await fetch(`/api/garages/${garageId}`);
                if (!res.ok) throw new Error();
                const data = await res.json();
                
                const services = data.services;
                this.ownerServices = services;

                if (services.length === 0) {
                    container.innerHTML = '<p style="color:var(--text-muted);">No services added yet for this garage.</p>';
                    return;
                }

                container.innerHTML = '';
                services.forEach(s => {
                    const card = document.createElement('div');
                    card.className = 'owner-service-card';
                    card.innerHTML = `
                        <div>
                            <h4>${s.serviceName}</h4>
                            <p>${s.description || 'No description provided.'}</p>
                        </div>
                        <div class="owner-service-footer">
                            <span class="owner-service-price">LKR ${s.price.toFixed(2)}</span>
                            <div style="display:flex; gap:0.5rem; align-items:center;">
                                <button class="btn btn-outline" style="padding:0.35rem 0.65rem; font-size:0.75rem;" 
                                    onclick="window.GarageLK.openEditServiceModal(${garageId}, ${s.id})" unique-id="edit-service-${s.id}">
                                    <i class="fa-solid fa-pen-to-square"></i> Edit
                                </button>
                                <button class="btn btn-outline btn-danger" style="padding:0.35rem 0.65rem; font-size:0.75rem;" 
                                    onclick="window.GarageLK.handleDeleteService(${garageId}, ${s.id})" unique-id="del-service-${s.id}">
                                    <i class="fa-solid fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    `;
                    container.appendChild(card);
                });

            } catch (err) {
                container.innerHTML = '<p style="color:var(--danger);">Error loading services.</p>';
            }
        },

        async loadOwnerAnalytics() {
            try {
                // Fetch bookings
                const res = await fetch('/api/bookings/my');
                const bookings = await res.json();
                if (!res.ok) return;

                this.ownerBookingsList = bookings;

                // Fetch completed rescues
                const resBreakdowns = await fetch('/api/breakdowns/history');
                const breakdowns = await resBreakdowns.json();
                if (resBreakdowns.ok) {
                    this.ownerBreakdownsList = breakdowns;
                } else {
                    this.ownerBreakdownsList = [];
                }

                this.filterOwnerAnalytics();

            } catch (err) {
                console.error("Analytics failure", err);
            }
        },

        toggleDateFilterType() {
            const dateTypeEl = document.getElementById('owner-analytics-date-type');
            const dateType = dateTypeEl ? dateTypeEl.value : 'all';
            
            const dayContainer = document.getElementById('container-analytics-day');
            const monthContainer = document.getElementById('container-analytics-month');
            
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            const localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
            
            if (dateType === 'all') {
                if (dayContainer) dayContainer.style.display = 'none';
                if (monthContainer) monthContainer.style.display = 'none';
            } else if (dateType === 'day') {
                if (dayContainer) dayContainer.style.display = 'flex';
                if (monthContainer) monthContainer.style.display = 'none';
                const dayInput = document.getElementById('owner-analytics-date-day');
                if (dayInput && !dayInput.value) {
                    dayInput.value = localISOTime.split('T')[0];
                }
            } else if (dateType === 'month') {
                if (dayContainer) dayContainer.style.display = 'none';
                if (monthContainer) monthContainer.style.display = 'flex';
                const monthInput = document.getElementById('owner-analytics-date-month');
                if (monthInput && !monthInput.value) {
                    monthInput.value = localISOTime.substring(0, 7);
                }
            }
            
            this.filterOwnerAnalytics();
        },

        filterOwnerAnalytics() {
            if (!this.ownerBookingsList) return;

            const garageIdSelect = document.getElementById('owner-analytics-garage-select');
            const selectedGarageId = garageIdSelect ? garageIdSelect.value : '';
            
            const dateTypeEl = document.getElementById('owner-analytics-date-type');
            const dateType = dateTypeEl ? dateTypeEl.value : 'all';
            const targetDay = document.getElementById('owner-analytics-date-day') ? document.getElementById('owner-analytics-date-day').value : '';
            const targetMonth = document.getElementById('owner-analytics-date-month') ? document.getElementById('owner-analytics-date-month').value : '';

            // Filter bookings
            let filteredBookings = this.ownerBookingsList;
            if (selectedGarageId) {
                filteredBookings = this.ownerBookingsList.filter(b => b.garage && b.garage.id === parseInt(selectedGarageId, 10));
            }
            if (dateType === 'day' && targetDay) {
                filteredBookings = filteredBookings.filter(b => b.bookingDate && b.bookingDate.split(' ')[0] === targetDay);
            } else if (dateType === 'month' && targetMonth) {
                filteredBookings = filteredBookings.filter(b => b.bookingDate && b.bookingDate.split(' ')[0].startsWith(targetMonth));
            }

            let totalCount = filteredBookings.length;
            let completedCount = 0;
            let revenue = 0.0;
            const revenueMap = {};

            filteredBookings.forEach(b => {
                if (b.status === 'COMPLETED') {
                    completedCount++;
                    revenue += b.totalPrice;
                    const type = b.serviceType || 'Other';
                    revenueMap[type] = (revenueMap[type] || 0) + (b.totalPrice || 0);
                }
            });

            document.getElementById('stat-total-bookings').textContent = totalCount;
            document.getElementById('stat-total-revenue').textContent = `LKR ${revenue.toFixed(2)}`;
            document.getElementById('stat-completed-bookings').textContent = completedCount;

            // Filter completed rescues (breakdowns)
            let completedRescuesCount = 0;
            if (this.ownerBreakdownsList) {
                let filteredBreakdowns = this.ownerBreakdownsList;
                if (selectedGarageId) {
                    filteredBreakdowns = this.ownerBreakdownsList.filter(b => b.assignedGarage && b.assignedGarage.id === parseInt(selectedGarageId, 10));
                }
                if (dateType === 'day' && targetDay) {
                    filteredBreakdowns = filteredBreakdowns.filter(b => b.createdAt && b.createdAt.split('T')[0] === targetDay);
                } else if (dateType === 'month' && targetMonth) {
                    filteredBreakdowns = filteredBreakdowns.filter(b => b.createdAt && b.createdAt.split('T')[0].startsWith(targetMonth));
                }
                completedRescuesCount = filteredBreakdowns.length;
                const statCompletedBreakdowns = document.getElementById('stat-completed-breakdowns');
                if (statCompletedBreakdowns) {
                    statCompletedBreakdowns.textContent = completedRescuesCount;
                }
            }

            // --- RENDER REVENUE BAR CHART ---
            const revenueCanvas = document.getElementById('chart-owner-revenue');
            if (revenueCanvas) {
                if (window.ownerRevenueChart) window.ownerRevenueChart.destroy();
                
                const isDarkMode = !document.body.classList.contains('light-mode');
                const textColor = isDarkMode ? '#e2e8f0' : '#1e293b';
                const gridColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
                
                const revenueLabels = Object.keys(revenueMap);
                const revenueValues = Object.values(revenueMap);

                window.ownerRevenueChart = new Chart(revenueCanvas, {
                    type: 'bar',
                    data: {
                        labels: revenueLabels.length > 0 ? revenueLabels : ['No Data'],
                        datasets: [{
                            label: 'Revenue (LKR)',
                            data: revenueValues.length > 0 ? revenueValues : [0],
                            backgroundColor: 'rgba(6, 182, 212, 0.75)',
                            borderColor: 'rgb(6, 182, 212)',
                            borderWidth: 1.5,
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: { mode: 'index', intersect: false }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { color: textColor, font: { family: 'Outfit', size: 11 } }
                            },
                            y: {
                                grid: { color: gridColor },
                                ticks: { color: textColor, font: { family: 'Outfit', size: 11 } }
                            }
                        }
                    }
                });
            }

            // --- RENDER PIE CHART (Completed Bookings vs Rescues) ---
            const completionsCanvas = document.getElementById('chart-owner-completions');
            if (completionsCanvas) {
                if (window.ownerCompletionsChart) window.ownerCompletionsChart.destroy();

                const isDarkMode = !document.body.classList.contains('light-mode');
                const textColor = isDarkMode ? '#e2e8f0' : '#1e293b';

                const hasData = completedCount > 0 || completedRescuesCount > 0;

                window.ownerCompletionsChart = new Chart(completionsCanvas, {
                    type: 'pie',
                    data: {
                        labels: ['Completed Bookings', 'Completed Rescues'],
                        datasets: [{
                            data: hasData ? [completedCount, completedRescuesCount] : [1, 0],
                            backgroundColor: hasData ? ['rgba(16, 185, 129, 0.75)', 'rgba(239, 68, 68, 0.75)'] : ['rgba(148, 163, 184, 0.25)', 'rgba(0,0,0,0)'],
                            borderColor: hasData ? ['rgb(16, 185, 129)', 'rgb(239, 68, 68)'] : ['rgba(148, 163, 184, 0.4)', 'rgba(0,0,0,0)'],
                            borderWidth: 1.5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { color: textColor, font: { family: 'Outfit', size: 11 } }
                            }
                        }
                    }
                });
            }
        },

        exportOwnerAnalyticsToExcel() {
            if (!this.ownerBookingsList) return;
            
            const garageIdSelect = document.getElementById('owner-analytics-garage-select');
            const selectedGarageId = garageIdSelect ? garageIdSelect.value : '';
            
            const dateTypeEl = document.getElementById('owner-analytics-date-type');
            const dateType = dateTypeEl ? dateTypeEl.value : 'all';
            const targetDay = document.getElementById('owner-analytics-date-day') ? document.getElementById('owner-analytics-date-day').value : '';
            const targetMonth = document.getElementById('owner-analytics-date-month') ? document.getElementById('owner-analytics-date-month').value : '';

            // Filter bookings
            let filteredBookings = this.ownerBookingsList;
            if (selectedGarageId) {
                filteredBookings = this.ownerBookingsList.filter(b => b.garage && b.garage.id === parseInt(selectedGarageId, 10));
            }
            if (dateType === 'day' && targetDay) {
                filteredBookings = filteredBookings.filter(b => b.bookingDate && b.bookingDate.split(' ')[0] === targetDay);
            } else if (dateType === 'month' && targetMonth) {
                filteredBookings = filteredBookings.filter(b => b.bookingDate && b.bookingDate.split(' ')[0].startsWith(targetMonth));
            }

            // Filter completed rescues (breakdowns)
            let filteredBreakdowns = this.ownerBreakdownsList || [];
            if (selectedGarageId) {
                filteredBreakdowns = filteredBreakdowns.filter(b => b.assignedGarage && b.assignedGarage.id === parseInt(selectedGarageId, 10));
            }
            if (dateType === 'day' && targetDay) {
                filteredBreakdowns = filteredBreakdowns.filter(b => b.createdAt && b.createdAt.split('T')[0] === targetDay);
            } else if (dateType === 'month' && targetMonth) {
                filteredBreakdowns = filteredBreakdowns.filter(b => b.createdAt && b.createdAt.split('T')[0].startsWith(targetMonth));
            }

            // Map bookings data
            const bookingsSheetData = filteredBookings.map(b => ({
                'Booking ID': b.id,
                'Garage Name': b.garage ? b.garage.name : 'N/A',
                'Customer Name': b.user ? (b.user.fullName || b.user.username) : 'N/A',
                'Customer Email': b.user ? b.user.email : 'N/A',
                'Customer Phone': b.user ? b.user.phone : 'N/A',
                'Service Type': b.serviceType,
                'Booking Date/Time': b.bookingDate,
                'Price (LKR)': b.totalPrice,
                'Status': b.status,
                'Vehicle No': b.vehicleNo || 'N/A',
                'Vehicle Type': b.vehicleType || 'N/A',
                'Description': b.description || 'N/A'
            }));

            // Map rescues data
            const rescuesSheetData = filteredBreakdowns.map(b => ({
                'Rescue ID': b.id,
                'Garage Name': b.assignedGarage ? b.assignedGarage.name : 'N/A',
                'Customer Name': b.user ? (b.user.fullName || b.user.username) : 'N/A',
                'Contact Phone': b.phone || 'N/A',
                'Location City': b.city || 'N/A',
                'Address/Landmark': b.address || 'N/A',
                'Vehicle No': b.vehicleNo || 'N/A',
                'Description': b.description || 'N/A',
                'Created Time': b.createdAt,
                'Status': b.status
            }));

            // Calculate overview summary statistics
            let totalCount = filteredBookings.length;
            let completedCount = 0;
            let revenue = 0.0;
            filteredBookings.forEach(b => {
                if (b.status === 'COMPLETED') {
                    completedCount++;
                    revenue += (b.totalPrice || 0);
                }
            });
            const completedRescuesCount = filteredBreakdowns.length;

            let dateRangeStr = 'All Time';
            if (dateType === 'day') {
                dateRangeStr = `Day: ${targetDay}`;
            } else if (dateType === 'month') {
                dateRangeStr = `Month: ${targetMonth}`;
            }

            const summarySheetData = [
                { 'Metric': 'Export Date', 'Value': new Date().toISOString().split('T')[0] },
                { 'Metric': 'Selected Garage', 'Value': selectedGarageId ? (document.getElementById('owner-analytics-garage-select')?.options[document.getElementById('owner-analytics-garage-select').selectedIndex]?.text || selectedGarageId) : 'All Garages' },
                { 'Metric': 'Date Range', 'Value': dateRangeStr },
                { 'Metric': 'Total Bookings', 'Value': totalCount },
                { 'Metric': 'Total Revenue', 'Value': `LKR ${revenue.toFixed(2)}` },
                { 'Metric': 'Completed', 'Value': completedCount },
                { 'Metric': 'Completed Rescues', 'Value': completedRescuesCount }
            ];

            // Generate Workbook
            const wb = XLSX.utils.book_new();

            const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Overview Summary');
            
            const wsBookings = XLSX.utils.json_to_sheet(bookingsSheetData);
            XLSX.utils.book_append_sheet(wb, wsBookings, 'Bookings');

            const wsRescues = XLSX.utils.json_to_sheet(rescuesSheetData);
            XLSX.utils.book_append_sheet(wb, wsRescues, 'Completed Rescues');

            XLSX.writeFile(wb, `garage_analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
            this.showToast('Excel file downloaded successfully!', 'success');
        },

        downloadOwnerAnalyticsPDF() {
            const element = document.getElementById('section-owner-analytics');
            if (!element) return;

            const dateStr = new Date().toISOString().split('T')[0];
            this.showToast("Generating PDF report...", "success");

            const isDarkMode = !document.body.classList.contains('light-mode');
            const bgHex = isDarkMode ? '#0f172a' : '#ffffff';

            const opt = {
                margin: [0.5, 0.5, 0.5, 0.5], // in inches
                filename: `GarageLK_Owner_Analytics_${dateStr}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true,
                    backgroundColor: bgHex
                },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
            };

            html2pdf().set(opt).from(element).save()
                .then(() => {
                    this.showToast("PDF report downloaded successfully!", "success");
                })
                .catch(err => {
                    console.error("PDF generation failed:", err);
                    this.showToast("Failed to generate PDF", "error");
                });
        },

        // --- ADMIN DATA LOADERS ---
        async loadAdminApprovals() {
            const list = document.getElementById('admin-approvals-list');
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading pending garages...</p>';

            try {
                const res = await fetch('/api/garages/all');
                const allGarages = await res.json();
                if (!res.ok) throw new Error();

                const pending = allGarages.filter(g => g.status === 'PENDING_APPROVAL');

                if (pending.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No garages currently pending approval.</p>';
                    return;
                }

                list.innerHTML = '';
                pending.forEach(g => {
                    const item = document.createElement('div');
                    item.className = 'table-item';
                    item.innerHTML = `
                        <div style="display:flex; gap:1.25rem; align-items:center;">
                            <img src="${g.imageUrl || 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=150'}" style="width:100px; height:75px; object-fit:cover; border-radius:var(--radius-sm);">
                            <div>
                                <h4 style="font-weight:700; margin-bottom:2px;">${g.name}</h4>
                                <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                    <i class="fa-solid fa-location-dot"></i> ${g.address}, ${g.city} &bull; <i class="fa-solid fa-user"></i> Owner ID: ${g.owner.id}
                                </p>
                                <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">${g.description}</p>
                            </div>
                        </div>
                        <div>
                            <button class="btn btn-primary" style="padding:0.5rem 1rem; font-size:0.85rem;" 
                                onclick="window.GarageLK.handleApproveGarage(${g.id})" unique-id="approve-garage-${g.id}">
                                <i class="fa-solid fa-check"></i> Approve
                            </button>
                        </div>
                    `;
                    list.appendChild(item);
                });

            } catch (err) {
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading admin approvals.</p>';
            }
        },

        // --- ACTIONS & MUTATIONS ---
        async updateBookingStatus(id, status) {
            try {
                const res = await fetch(`/api/bookings/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast(`Booking ${status.toLowerCase()} successfully`, 'success');
                    
                    const role = this.currentUser.role;
                    if (role === 'CUSTOMER') {
                        this.loadCustomerBookings();
                    } else {
                        this.loadOwnerBookings();
                        this.loadOwnerAnalytics();
                    }
                } else {
                    this.showToast(data.message || 'Action failed', 'error');
                }
            } catch (err) {
                this.showToast('Connection error', 'error');
            }
        },

        async handleApproveGarage(id) {
            try {
                const res = await fetch(`/api/garages/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'APPROVED' })
                });

                if (res.ok) {
                    this.showToast('Garage approved successfully!', 'success');
                    this.loadAdminApprovals();
                } else {
                    this.showToast('Approval failed', 'error');
                }
            } catch (err) {
                this.showToast('Connection error', 'error');
            }
        },

        async handleDeleteService(garageId, serviceId) {
            if (!confirm('Are you sure you want to delete this service?')) return;
            try {
                const res = await fetch(`/api/garages/${garageId}/services/${serviceId}`, {
                    method: 'DELETE'
                });

                if (res.ok) {
                    this.showToast('Service deleted successfully', 'success');
                    this.loadOwnerServices();
                } else {
                    const data = await res.json();
                    this.showToast(data.message || 'Deletion failed', 'error');
                }
            } catch (err) {
                this.showToast('Connection error', 'error');
            }
        },

        async handleAddGarage(e) {
            e.preventDefault();
            const name = document.getElementById('garage-name').value.trim();
            const description = document.getElementById('garage-desc').value.trim();
            const address = document.getElementById('garage-address').value.trim();
            const city = document.getElementById('garage-city').value;
            const phone = document.getElementById('garage-phone').value.trim();
            const email = document.getElementById('garage-email').value.trim();
            const imageUrl = document.getElementById('garage-image').value.trim();
            const latitude = parseFloat(document.getElementById('garage-lat').value);
            const longitude = parseFloat(document.getElementById('garage-lng').value);

            try {
                const res = await fetch('/api/garages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name, description, address, city, phone, email, imageUrl, latitude, longitude
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Garage registered! Awaiting Admin approval.', 'success');
                    this.closeModal('modal-add-garage');
                    this.loadOwnerGarages();
                    e.target.reset();
                } else {
                    this.showToast(data.message || 'Registration failed', 'error');
                }
            } catch (err) {
                this.showToast('Connection error', 'error');
            }
        },

        async handleAddService(e) {
            e.preventDefault();
            const garageId = document.getElementById('owner-services-garage-select').value;
            const serviceId = document.getElementById('service-id').value;
            const serviceName = document.getElementById('service-name').value.trim();
            const description = document.getElementById('service-desc').value.trim();
            const price = parseFloat(document.getElementById('service-price').value);

            if (!garageId) return;

            try {
                const payload = { serviceName, description, price };
                if (serviceId) {
                    payload.id = parseInt(serviceId, 10);
                }

                const res = await fetch(`/api/garages/${garageId}/services`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast(serviceId ? 'Service updated successfully!' : 'Service added successfully!', 'success');
                    this.closeModal('modal-add-service');
                    this.loadOwnerServices();
                    e.target.reset();
                } else {
                    this.showToast(data.message || 'Save service failed', 'error');
                }
            } catch (err) {
                this.showToast('Connection error', 'error');
            }
        },

        async submitReview(e) {
            e.preventDefault();
            const bookingId = document.getElementById('review-booking-id').value;
            const rating = parseFloat(document.getElementById('review-rating').value);
            const comment = document.getElementById('review-comment').value.trim();

            try {
                const res = await fetch('/api/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookingId, rating, comment })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Review submitted successfully!', 'success');
                    this.closeModal('modal-review');
                    this.loadCustomerBookings();
                    e.target.reset();
                } else {
                    this.showToast(data.message || 'Submission failed', 'error');
                }
            } catch (err) {
                this.showToast('Connection error', 'error');
            }
        },

        // --- TOASTS & MODALS UTIL ---
        showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            
            const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
            toast.innerHTML = `
                <i class="fa-solid ${icon}"></i>
                <span>${message}</span>
            `;

            container.appendChild(toast);

            // Auto remove toast after 3s
            setTimeout(() => {
                toast.style.animation = 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse forwards';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        openModal(id) {
            const modal = document.getElementById(id);
            if (modal) modal.style.display = 'flex';
        },

        closeModal(id) {
            const modal = document.getElementById(id);
            if (modal) modal.style.display = 'none';
        },

        // --- EMERGENCY BREAKDOWN ASSIST ---
        openEmergencyModal() {
            if (!this.currentUser) {
                this.showToast('Please Sign In to submit an emergency assist request.', 'error');
                setTimeout(() => { window.location.href = 'auth.html'; }, 1000);
                return;
            }
            this.openModal('modal-breakdown');
        },

        detectLocation() {
            if (navigator.geolocation) {
                this.showToast("Retrieving GPS coordinates...", "success");
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        document.getElementById('breakdown-lat').value = position.coords.latitude;
                        document.getElementById('breakdown-lng').value = position.coords.longitude;
                        this.showToast("GPS Location auto-detected!", "success");
                    },
                    (error) => {
                        this.showToast("GPS Access Denied. Please specify Nearest City and Landmark.", "error");
                    }
                );
            } else {
                this.showToast("Browser does not support GPS Geolocation.", "error");
            }
        },

        async handleEmergencySubmit(e) {
            e.preventDefault();
            const vehicleNo = document.getElementById('breakdown-vehicle').value.trim();
            const phone = document.getElementById('breakdown-phone').value.trim();
            const city = document.getElementById('breakdown-city').value;
            const address = document.getElementById('breakdown-address').value.trim();
            const description = document.getElementById('breakdown-desc').value.trim();
            
            const latVal = document.getElementById('breakdown-lat').value;
            const lngVal = document.getElementById('breakdown-lng').value;
            const latitude = latVal ? parseFloat(latVal) : null;
            const longitude = lngVal ? parseFloat(lngVal) : null;

            try {
                const res = await fetch('/api/breakdowns', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        vehicleNo, phone, city, address, description, latitude, longitude
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Emergency request broadcasted successfully!', 'success');
                    this.closeModal('modal-breakdown');
                    e.target.reset();
                    
                    // Redirect to dashboard where they can track status
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    this.showToast(data.message || 'Emergency assist request failed', 'error');
                }
            } catch (err) {
                this.showToast('Connection error', 'error');
            }
        },

        async loadCustomerBreakdowns() {
            const list = document.getElementById('customer-breakdowns-list');
            if (!list) return;
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading requests...</p>';

            try {
                const res = await fetch('/api/breakdowns/my');
                const breakdowns = await res.json();
                if (!res.ok) throw new Error();

                if (breakdowns.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No emergency assistance requests found.</p>';
                    return;
                }

                list.innerHTML = '';
                breakdowns.forEach(b => {
                    const item = document.createElement('div');
                    item.className = 'table-item';

                    let badgeClass = 'badge-pending';
                    let responseHtml = '<span style="color:var(--text-muted); font-size:0.85rem;">Searching for response...</span>';
                    if (b.status === 'ACCEPTED') {
                        badgeClass = 'badge-approved';
                        responseHtml = `
                            <div style="font-size:0.85rem; color:var(--secondary); font-weight:500;">
                                <i class="fa-solid fa-truck-pickup"></i> Dispatched: <strong>${b.acceptedBy.name}</strong> <br>
                                <i class="fa-solid fa-phone"></i> Call Rescue: <strong>${b.acceptedBy.phone || 'N/A'}</strong>
                            </div>
                        `;
                    } else if (b.status === 'COMPLETED') {
                        badgeClass = 'badge-completed';
                        responseHtml = '<span style="color:var(--success); font-size:0.85rem;"><i class="fa-solid fa-check-double"></i> Resolved</span>';
                    }

                    let actionHtml = '';
                    if (b.status !== 'COMPLETED') {
                        actionHtml = `
                            <button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem; border-color:var(--border-color);" 
                                onclick="window.GarageLK.completeBreakdown(${b.id})" unique-id="resolve-breakdown-${b.id}">
                                Mark Resolved
                            </button>
                        `;
                    }

                    item.innerHTML = `
                        <div style="flex:1;">
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:4px;">
                                <h4 style="font-weight:700; color:#f87171;">Emergency Assist Alert</h4>
                                <span style="font-size:0.8rem; color:var(--text-muted);">${new Date(b.createdAt).toLocaleString()}</span>
                            </div>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                <i class="fa-solid fa-location-dot"></i> <strong>Where:</strong> ${b.address}, ${b.city}
                            </p>
                            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3; margin-bottom:8px;">
                                <strong>Vehicle:</strong> ${b.vehicleNo} <br>
                                <strong>Description:</strong> ${b.description}
                            </p>
                            ${responseHtml}
                        </div>
                        <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; min-width: 140px;">
                            <span class="badge ${badgeClass}">${b.status === 'ACCEPTED' ? 'RESCUE DISPATCHED' : b.status}</span>
                            ${actionHtml}
                        </div>
                    `;
                    list.appendChild(item);
                });

            } catch (err) {
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading emergencies.</p>';
            }
        },

        async loadOwnerBreakdownAlerts() {
            const list = document.getElementById('owner-breakdowns-list');
            if (!list) return;
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading active alerts...</p>';

            try {
                // Get owner's approved garages to find operating cities
                const garagesRes = await fetch('/api/garages/my');
                const garages = await garagesRes.json();
                if (!garagesRes.ok) throw new Error();

                const approvedGarages = garages.filter(g => g.status === 'APPROVED');
                if (approvedGarages.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">You need at least one APPROVED garage to receive breakdown alerts.</p>';
                    return;
                }

                // Get unique cities
                const cities = [...new Set(approvedGarages.map(g => g.city))];

                list.innerHTML = '';
                let alertCount = 0;

                for (const city of cities) {
                    const res = await fetch(`/api/breakdowns/active?city=${encodeURIComponent(city)}`);
                    const alerts = await res.json();
                    if (!res.ok) continue;

                    alerts.forEach(b => {
                        alertCount++;
                        const item = document.createElement('div');
                        item.className = 'table-item';

                        item.innerHTML = `
                            <div style="flex:1;">
                                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:4px;">
                                    <h4 style="font-weight:700; color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Emergency Breakdown Alert</h4>
                                    <span style="font-size:0.8rem; color:var(--text-muted);">${new Date(b.createdAt).toLocaleString()}</span>
                                </div>
                                <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                    <i class="fa-solid fa-location-dot"></i> <strong>Location:</strong> ${b.address}, ${b.city}
                                </p>
                                <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">
                                    <strong>Stranded User:</strong> ${b.user.fullName || b.user.username} <br>
                                    <strong>Phone:</strong> ${b.phone} &bull; <strong>Vehicle:</strong> ${b.vehicleNo} <br>
                                    <strong>Problem:</strong> ${b.description}
                                </p>
                            </div>
                            <div>
                                <button class="btn btn-primary" style="background:#ef4444; box-shadow:0 0 10px rgba(239,68,68,0.25);" 
                                    onclick="window.GarageLK.openAcceptBreakdownModal(${b.id}, '${b.city}')" unique-id="accept-breakdown-btn-${b.id}">
                                    Accept & Dispatch
                                </button>
                            </div>
                        `;
                        list.appendChild(item);
                    });
                }

                if (alertCount === 0) {
                    list.innerHTML = `<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No active emergency breakdown alerts in your operating cities (${cities.join(', ')}).</p>`;
                }

            } catch (err) {
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading alerts.</p>';
            }
        },

        async openAcceptBreakdownModal(requestId, city) {
            document.getElementById('accept-breakdown-id').value = requestId;
            
            // Populate dropdown with owner's approved garages in this specific city
            const select = document.getElementById('accept-breakdown-garage-select');
            select.innerHTML = '<option value="">-- Select Garage --</option>';

            try {
                const res = await fetch('/api/garages/my');
                const garages = await res.json();
                
                const matchedGarages = garages.filter(g => g.status === 'APPROVED' && g.city.toLowerCase() === city.toLowerCase());
                matchedGarages.forEach(g => {
                    select.innerHTML += `<option value="${g.id}">${g.name}</option>`;
                });

                this.openModal('modal-accept-breakdown');
            } catch (err) {
                this.showToast('Error loading dispatching garages', 'error');
            }
        },

        async confirmAcceptBreakdown(e) {
            e.preventDefault();
            const id = document.getElementById('accept-breakdown-id').value;
            const garageId = document.getElementById('accept-breakdown-garage-select').value;

            if (!garageId) return;

            try {
                const res = await fetch(`/api/breakdowns/${id}/accept`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ garageId: parseInt(garageId) })
                });

                if (res.ok) {
                    this.showToast('Emergency accepted! Help is on the way.', 'success');
                    this.closeModal('modal-accept-breakdown');
                    this.loadOwnerBreakdownAlerts();
                } else {
                    const data = await res.json();
                    this.showToast(data.message || 'Dispatch confirm failed', 'error');
                }
            } catch (err) {
                this.showToast('Connection error', 'error');
            }
        },

        async completeBreakdown(id) {
            if (!confirm('Mark this emergency breakdown assist as resolved?')) return;
            try {
                const res = await fetch(`/api/breakdowns/${id}/complete`, { method: 'PUT' });
                if (res.ok) {
                    this.showToast('Emergency request marked as completed.', 'success');
                    
                    const role = this.currentUser.role;
                    if (role === 'CUSTOMER') {
                        this.loadCustomerBreakdowns();
                    } else if (role === 'ADMIN') {
                        this.loadAdminMonitor();
                    }
                } else {
                    this.showToast('Failed to update status', 'error');
                }
            } catch (err) {
                this.showToast('Connection error', 'error');
            }
        },

        // --- ADMIN SYSTEM MONITOR ---
        async loadAdminMonitor() {
            const list = document.getElementById('admin-breakdowns-list');
            if (!list) return;
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading emergency logs...</p>';

            try {
                const garagesRes = await fetch('/api/garages/all');
                const garages = await garagesRes.json();
                
                const bookingsRes = await fetch('/api/bookings/my'); // Admin gets all bookings
                const bookings = await bookingsRes.json();
                
                const breakdownsRes = await fetch('/api/breakdowns/all');
                const breakdowns = await breakdownsRes.json();

                // Compute counts
                document.getElementById('admin-stat-garages').textContent = garages.length;
                document.getElementById('admin-stat-bookings').textContent = bookings.length;
                
                const activeBreakdowns = breakdowns.filter(b => b.status !== 'COMPLETED').length;
                document.getElementById('admin-stat-breakdowns').textContent = activeBreakdowns;
                
                const userIds = new Set();
                userIds.add(1); userIds.add(2); userIds.add(3); // standard seeds
                bookings.forEach(b => userIds.add(b.user.id));
                garages.forEach(g => userIds.add(g.owner.id));
                document.getElementById('admin-stat-users').textContent = userIds.size;

                // Render breakdowns list
                if (breakdowns.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No emergency assist logs recorded.</p>';
                    return;
                }

                list.innerHTML = '';
                breakdowns.forEach(b => {
                    const item = document.createElement('div');
                    item.className = 'table-item';

                    let badgeClass = 'badge-pending';
                    let detailHtml = '<span style="color:var(--text-muted); font-size:0.85rem;"><i class="fa-solid fa-spinner fa-spin"></i> Pending Dispatcher</span>';
                    if (b.status === 'ACCEPTED') {
                        badgeClass = 'badge-approved';
                        detailHtml = `<span style="color:var(--secondary); font-size:0.85rem;"><i class="fa-solid fa-truck-pickup"></i> Dispatched: <strong>${b.acceptedBy.name}</strong></span>`;
                    } else if (b.status === 'COMPLETED') {
                        badgeClass = 'badge-completed';
                        detailHtml = `<span style="color:var(--success); font-size:0.85rem;"><i class="fa-solid fa-circle-check"></i> Resolved by ${b.acceptedBy ? b.acceptedBy.name : 'Customer'}</span>`;
                    }

                    item.innerHTML = `
                        <div style="flex:1;">
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:4px;">
                                <h4 style="font-weight:700;">Request ID #${b.id} &bull; ${b.user.fullName || b.user.username}</h4>
                                <span style="font-size:0.8rem; color:var(--text-muted);">${new Date(b.createdAt).toLocaleString()}</span>
                            </div>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                <i class="fa-solid fa-location-dot"></i> <strong>Location:</strong> ${b.address}, ${b.city}
                            </p>
                            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3; margin-bottom:6px;">
                                <strong>Vehicle:</strong> ${b.vehicleNo} &bull; <strong>Phone:</strong> ${b.phone} <br>
                                <strong>Issue:</strong> ${b.description}
                            </p>
                            ${detailHtml}
                        </div>
                        <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; min-width:140px;">
                            <span class="badge ${badgeClass}">${b.status}</span>
                        </div>
                    `;
                    list.appendChild(item);
                });

            } catch (err) {
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading monitor logs.</p>';
            }
        },

        // Review triggers
        openReviewModal(bookingId) {
            document.getElementById('review-booking-id').value = bookingId;
            this.openModal('modal-review');
        },

        openAddGarageModal() {
            this.openModal('modal-add-garage');
        },

        openAddServiceModal() {
            document.getElementById('service-id').value = '';
            document.getElementById('service-name').value = '';
            document.getElementById('service-desc').value = '';
            document.getElementById('service-price').value = '';
            document.getElementById('modal-service-title').innerHTML = '<i class="fa-solid fa-wrench"></i> Add New Service';
            document.getElementById('btn-save-service').textContent = 'Add Service';
            this.openModal('modal-add-service');
        },

        openEditServiceModal(garageId, serviceId) {
            if (!this.ownerServices) return;
            const service = this.ownerServices.find(s => s.id === serviceId);
            if (!service) return;

            document.getElementById('service-id').value = service.id;
            document.getElementById('service-name').value = service.serviceName || service.serviceType || '';
            document.getElementById('service-desc').value = service.description || '';
            document.getElementById('service-price').value = service.price;

            document.getElementById('modal-service-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Service';
            document.getElementById('btn-save-service').textContent = 'Save Changes';
            this.openModal('modal-add-service');
        },

        // --- THEME / MODE CONTROLLER ---
        initTheme() {
            const savedTheme = localStorage.getItem('theme') || 'night';
            if (savedTheme === 'day') {
                document.body.classList.add('light-mode');
                this.updateThemeToggleUI('day');
            } else {
                document.body.classList.remove('light-mode');
                this.updateThemeToggleUI('night');
            }
        },

        toggleTheme() {
            if (document.body.classList.contains('light-mode')) {
                document.body.classList.remove('light-mode');
                localStorage.setItem('theme', 'night');
                this.updateThemeToggleUI('night');
                this.updateMapTiles('night');
            } else {
                document.body.classList.add('light-mode');
                localStorage.setItem('theme', 'day');
                this.updateThemeToggleUI('day');
                this.updateMapTiles('day');
            }
        },

        updateThemeToggleUI(theme) {
            const toggles = document.querySelectorAll('.theme-toggle i');
            toggles.forEach(icon => {
                if (theme === 'day') {
                    icon.className = 'fa-solid fa-sun';
                    icon.style.color = '#f59e0b';
                } else {
                    icon.className = 'fa-solid fa-moon';
                    icon.style.color = '#6366f1';
                }
            });
        },

        updateMapTiles(theme) {
            if (!this.map) return;
            this.map.eachLayer(layer => {
                if (layer instanceof L.TileLayer) {
                    this.map.removeLayer(layer);
                }
            });
            const tilesUrl = theme === 'day' 
                ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
            L.tileLayer(tilesUrl, { maxZoom: 20 }).addTo(this.map);
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        GarageLK.initTheme();
    });

    window.GarageLK = GarageLK;
})();
