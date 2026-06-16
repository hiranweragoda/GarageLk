/**
 * GARAGELK - CLIENT SIDE JAVASCRIPT CONTROLLER
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
            const backendUrl = window.location.port === '8080' ? '' : `${window.location.protocol}//${window.location.hostname}:8080`;
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
        pickerMap: null,
        pickerMarker: null,
        activeLatInput: null,
        activeLngInput: null,
        breakdownChart: null,
        providersChart: null,
        breakdownsByCityChart: null,

        // --- AUTH & INITIAL CHECK ---
        async checkAuth() {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    this.currentUser = await res.json(); // flat object: { id, username, fullName, role, ... }
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

                let dropdownHtml = '';
                if (this.currentUser.role === 'GARAGE_OWNER') {
                    dropdownHtml = `
                        <a href="dashboard.html" class="dropdown-item"><i class="fa-solid fa-gauge"></i> Dashboard</a>
                        <a href="dashboard.html" class="dropdown-item" id="nav-dropdown-my-garages"><i class="fa-solid fa-warehouse"></i> My Garages</a>
                        <a href="#" class="dropdown-item" onclick="window.GarageLK.handleLogout(event)"><i class="fa-solid fa-right-from-bracket"></i> Sign Out</a>
                    `;
                } else if (this.currentUser.role === 'SHOP_OWNER') {
                    dropdownHtml = `
                        <a href="dashboard.html" class="dropdown-item"><i class="fa-solid fa-gauge"></i> Dashboard</a>
                        <a href="dashboard.html" class="dropdown-item" id="nav-dropdown-my-shops"><i class="fa-solid fa-store"></i> My Shops</a>
                        <a href="#" class="dropdown-item" onclick="window.GarageLK.handleLogout(event)"><i class="fa-solid fa-right-from-bracket"></i> Sign Out</a>
                    `;
                } else {
                    dropdownHtml = `
                        <a href="dashboard.html" class="dropdown-item"><i class="fa-solid fa-gauge"></i> Dashboard</a>
                        <a href="#" class="dropdown-item" onclick="window.GarageLK.handleLogout(event)"><i class="fa-solid fa-right-from-bracket"></i> Sign Out</a>
                    `;
                }

                authContainer.innerHTML = `
                    <div class="user-menu" id="user-menu-badge">
                        <div class="user-badge">
                            <div class="user-avatar">${initials}</div>
                            <span>${this.currentUser.fullName || this.currentUser.username}</span>
                            <i class="fa-solid fa-chevron-down" style="font-size:0.8rem; margin-left:0.25rem;"></i>
                        </div>
                        <div class="user-dropdown">
                            ${dropdownHtml}
                        </div>
                    </div>
                `;

                // Add "My Garages" or "My Shops" link to nav-links
                const navLinks = document.querySelector('.nav-links');
                if (this.currentUser.role === 'GARAGE_OWNER') {
                    if (navLinks && !document.getElementById('nav-my-garages')) {
                        const myGaragesLink = document.createElement('a');
                        myGaragesLink.href = 'dashboard.html';
                        myGaragesLink.className = 'nav-link';
                        myGaragesLink.id = 'nav-my-garages';
                        myGaragesLink.innerHTML = '<i class="fa-solid fa-warehouse"></i> My Garages';

                        // Insert it before the "Dashboard" link
                        const dashboardLink = document.getElementById('nav-dashboard');
                        if (dashboardLink) {
                            navLinks.insertBefore(myGaragesLink, dashboardLink);
                        } else {
                            navLinks.appendChild(myGaragesLink);
                        }
                    }
                    const myShopsLink = document.getElementById('nav-my-shops');
                    if (myShopsLink) myShopsLink.remove();
                } else if (this.currentUser.role === 'SHOP_OWNER') {
                    if (navLinks && !document.getElementById('nav-my-shops')) {
                        const myShopsLink = document.createElement('a');
                        myShopsLink.href = 'dashboard.html';
                        myShopsLink.className = 'nav-link';
                        myShopsLink.id = 'nav-my-shops';
                        myShopsLink.innerHTML = '<i class="fa-solid fa-store"></i> My Shops';

                        // Insert it before the "Dashboard" link
                        const dashboardLink = document.getElementById('nav-dashboard');
                        if (dashboardLink) {
                            navLinks.insertBefore(myShopsLink, dashboardLink);
                        } else {
                            navLinks.appendChild(myShopsLink);
                        }
                    }
                    const myGaragesLink = document.getElementById('nav-my-garages');
                    if (myGaragesLink) myGaragesLink.remove();
                } else {
                    const myGaragesLink = document.getElementById('nav-my-garages');
                    if (myGaragesLink) {
                        myGaragesLink.remove();
                    }
                    const myShopsLink = document.getElementById('nav-my-shops');
                    if (myShopsLink) {
                        myShopsLink.remove();
                    }
                }
            } else {
                authContainer.innerHTML = `
                    <a href="auth.html" class="btn btn-outline" id="btn-login-nav">Sign In</a>
                    <a href="auth.html?tab=signup" class="btn btn-primary" id="btn-signup-nav">Get Started</a>
                `;
                const myGaragesLink = document.getElementById('nav-my-garages');
                if (myGaragesLink) myGaragesLink.remove();
                const myShopsLink = document.getElementById('nav-my-shops');
                if (myShopsLink) myShopsLink.remove();
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
                console.error("Logout failed:", err);
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
            const btnShop = document.getElementById('toggle-role-shop');

            btnCustomer.classList.remove('active');
            btnOwner.classList.remove('active');
            if (btnShop) btnShop.classList.remove('active');

            if (role === 'CUSTOMER') {
                btnCustomer.classList.add('active');
            } else if (role === 'OWNER' || role === 'GARAGE_OWNER') {
                btnOwner.classList.add('active');
            } else if (role === 'SHOP_OWNER') {
                if (btnShop) btnShop.classList.add('active');
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
                    this.showToast('Welcome back, ' + (data.fullName || data.username), 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    this.showToast(data.message || 'Login failed', 'error');
                }
            } catch (err) {
                console.error("Login failed:", err);
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
                console.error("Registration failed:", err);
                this.showToast('Connection error', 'error');
            }
        },

        // --- HOMEPAGE / SEARCH PAGE ---
        async initHomepage() {
            await this.checkAuth();
            this.initMap();

            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('emergency') === 'true') {
                this.openEmergencyModal();
            }

            // Set search listeners for garages
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

            // Set search listeners for spare parts
            const searchPartName = document.getElementById('search-part-name');
            const searchPartModel = document.getElementById('search-part-model');
            const searchPartYear = document.getElementById('search-part-year');

            const handlePartEnter = (e) => {
                if (e.key === 'Enter') this.loadSpareParts();
            };

            if (searchPartName) searchPartName.addEventListener('keypress', handlePartEnter);
            if (searchPartModel) searchPartModel.addEventListener('keypress', handlePartEnter);
            if (searchPartYear) searchPartYear.addEventListener('keypress', handlePartEnter);

            if (urlParams.get('search') === 'parts') {
                this.setSearchMode('parts');
            } else {
                this.loadGarages();
            }
            this.loadAboutStats();

            if (this.currentUser && this.currentUser.role === 'CUSTOMER') {
                this.loadHomepageActiveBreakdown();
            }
        },

        async loadAboutStats() {
            try {
                const res = await fetch('/api/garages/stats');
                if (res.ok) {
                    const stats = await res.json();
                    const elGarages = document.getElementById('stat-garages');
                    const elCustomers = document.getElementById('stat-customers');
                    const elBookings = document.getElementById('stat-bookings');

                    if (elGarages) elGarages.innerText = `${stats.verifiedGarages}+`;
                    if (elCustomers) elCustomers.innerText = `${stats.customers}+`;
                    if (elBookings) elBookings.innerText = `${stats.bookings.toLocaleString()}+`;
                }
            } catch (err) {
                console.error("Failed to load about stats:", err);
            }
        },

        setSearchMode(mode) {
            const btnGarage = document.getElementById('mode-garage');
            const btnParts = document.getElementById('mode-parts');
            const containerGarage = document.getElementById('garage-search-container');
            const containerParts = document.getElementById('parts-search-container');

            if (mode === 'garage') {
                if (btnGarage) btnGarage.className = 'btn btn-primary';
                if (btnParts) btnParts.className = 'btn btn-outline';
                if (containerGarage) containerGarage.style.display = 'flex';
                if (containerParts) containerParts.style.display = 'none';
                this.loadGarages();
            } else if (mode === 'parts') {
                if (btnGarage) btnGarage.className = 'btn btn-outline';
                if (btnParts) btnParts.className = 'btn btn-primary';
                if (containerGarage) containerGarage.style.display = 'none';
                if (containerParts) containerParts.style.display = 'flex';
                this.loadSpareParts();
            }
        },

        async loadSpareParts() {
            const partName = document.getElementById('search-part-name').value.trim();
            const vehicleModel = document.getElementById('search-part-model').value.trim();
            const vehicleYear = document.getElementById('search-part-year').value.trim();
            const city = document.getElementById('search-part-city').value;

            const container = document.getElementById('garages-container');
            if (!container) return;

            const isPartSearch = (partName || vehicleModel || vehicleYear);

            container.innerHTML = `
                <div style="text-align:center; padding: 3rem; color: var(--text-muted);">
                    <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--primary); margin-bottom: 1rem;"></i>
                    <p>${isPartSearch ? 'Searching parts marketplace...' : 'Fetching spare part shops...'}</p>
                </div>
            `;

            // Clear previous map markers
            if (this.markers) {
                this.markers.forEach(m => this.map.removeLayer(m));
            }
            this.markers = [];

            const performSearch = async (latitude, longitude) => {
                try {
                    let url;
                    const params = [];

                    if (isPartSearch) {
                        url = '/api/spare-parts/search';
                        if (partName) params.push(`partName=${encodeURIComponent(partName)}`);
                        if (vehicleModel) params.push(`vehicleModel=${encodeURIComponent(vehicleModel)}`);
                        if (vehicleYear) params.push(`vehicleYear=${encodeURIComponent(vehicleYear)}`);
                    } else {
                        url = '/api/shops';
                    }

                    if (city) params.push(`city=${encodeURIComponent(city)}`);
                    if (latitude) params.push(`lat=${latitude}`);
                    if (longitude) params.push(`lng=${longitude}`);
                    
                    if (params.length > 0) url += '?' + params.join('&');

                    const res = await fetch(url);
                    if (!res.ok) throw new Error("Failed to load search results");
                    const data = await res.json();

                    if (data.length === 0) {
                        container.innerHTML = `
                            <div style="text-align:center; padding: 3rem; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius:var(--radius-md);">
                                <i class="fa-solid fa-circle-info fa-2x" style="margin-bottom:1rem;"></i>
                                <p>${isPartSearch ? 'No matching spare parts in stock found.' : 'No active spare part shops found matching your search.'}</p>
                            </div>
                        `;
                        return;
                    }

                    container.innerHTML = '';
                    const mapPoints = [];

                    if (isPartSearch) {
                        const renderedShopIds = new Set();
                        data.forEach(p => {
                            const shop = p.shop;
                            const card = document.createElement('div');
                            card.className = 'garage-card';
                            
                            const distText = (latitude && longitude && p.distance !== undefined) 
                                ? ` (${p.distance.toFixed(1)} km away)` 
                                : '';

                            card.innerHTML = `
                                <img src="${p.imageUrl || shop.imageUrl || 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=400'}" class="garage-card-img" alt="${p.partName}">
                                <div class="garage-card-content">
                                    <div>
                                        <div class="garage-header">
                                            <h3 class="garage-title" style="color:var(--primary); font-size:1.15rem; font-weight:700; margin:0;">${p.partName}</h3>
                                            <div style="font-size:1.2rem; font-weight:800; color:var(--accent);">${p.price.toLocaleString('en-LK', { style: 'currency', currency: 'LKR' })}</div>
                                        </div>
                                        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px; margin-top:4px;">
                                            <strong>Compatibility:</strong> ${p.vehicleModel} (${p.vehicleYear})<br>
                                            <strong>Stock:</strong> <span class="badge ${p.quantity > 0 ? 'badge-approved' : 'badge-pending'}">${p.quantity} Available</span>
                                        </p>
                                        <hr style="border:0; border-top:1px solid var(--border-color); margin:8px 0;">
                                        <div class="garage-address" style="margin-top:4px; display:flex; justify-content:space-between; align-items:center;">
                                            <span><i class="fa-solid fa-store"></i> <strong>${shop.shopName}</strong>${distText}</span>
                                            <span style="color:#f59e0b; font-weight:700; font-size:0.9rem; white-space:nowrap;"><i class="fa-solid fa-star"></i> ${shop.rating ? shop.rating.toFixed(1) : '0.0'}</span>
                                        </div>
                                        <div class="garage-address">
                                            <i class="fa-solid fa-location-dot"></i> ${shop.address}, ${shop.city}
                                        </div>
                                    </div>
                                    <div class="garage-footer" style="margin-top:auto; padding-top:8px;">
                                        <span class="garage-phone"><i class="fa-solid fa-phone"></i> ${shop.phone || 'N/A'}</span>
                                        <a href="shop.html?id=${shop.id}" class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.85rem;">View Shop</a>
                                    </div>
                                </div>
                            `;

                            card.addEventListener('click', () => {
                                if (shop.latitude && shop.longitude) {
                                    this.map.setView([shop.latitude, shop.longitude], 13);
                                }
                            });

                            container.appendChild(card);

                            if (shop.latitude && shop.longitude && !renderedShopIds.has(shop.id)) {
                                renderedShopIds.add(shop.id);
                                const marker = L.marker([shop.latitude, shop.longitude]).addTo(this.map);
                                marker.bindPopup(`
                                    <div style="color:var(--text-primary); font-family:var(--font-body); min-width: 180px;">
                                        <h4 style="font-weight:700; margin-bottom:4px; font-family:var(--font-heading); display:flex; justify-content:space-between; align-items:center;">
                                            <span>${shop.shopName}</span>
                                            <span style="color:#f59e0b; margin-left: 10px; white-space: nowrap;"><i class="fa-solid fa-star"></i> ${shop.rating ? shop.rating.toFixed(1) : '0.0'}</span>
                                        </h4>
                                        <p style="font-size:0.8rem; margin-bottom:6px; color:var(--text-secondary);"><i class="fa-solid fa-location-dot"></i> ${shop.address}, ${shop.city}</p>
                                        <p style="font-size:0.8rem; margin-bottom:8px; color:var(--primary); font-weight:600;"><i class="fa-solid fa-phone"></i> ${shop.phone || 'N/A'}</p>
                                        <div style="font-size:0.75rem; color:var(--text-muted); border-top:1px solid var(--border-color); padding-top:4px;">
                                            Stocking: <strong>${p.partName}</strong> for ${p.vehicleModel}
                                        </div>
                                    </div>
                                `);
                                this.markers.push(marker);
                                mapPoints.push([shop.latitude, shop.longitude]);
                            }
                        });
                    } else {
                        // Shop Marketplace rendering logic (like garages)
                        data.forEach(s => {
                            const card = document.createElement('div');
                            card.className = 'garage-card';
                            
                            const distText = (latitude && longitude && s.distance !== undefined) 
                                ? ` (${s.distance.toFixed(1)} km away)` 
                                : '';

                            card.innerHTML = `
                                <img src="${s.imageUrl || 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=400'}" class="garage-card-img" alt="${s.shopName}">
                                <div class="garage-card-content">
                                    <div>
                                        <div class="garage-header" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                            <h3 class="garage-title" style="margin:0;">${s.shopName}</h3>
                                            <span style="color:#f59e0b; font-weight:700; font-size: 0.95rem; white-space: nowrap;"><i class="fa-solid fa-star"></i> ${s.rating ? s.rating.toFixed(1) : '0.0'}</span>
                                        </div>
                                        <div class="garage-address">
                                            <i class="fa-solid fa-location-dot"></i> ${s.address}, ${s.city}${distText}
                                        </div>
                                        <p class="garage-description">${s.description || 'Quality automotive spare parts.'}</p>
                                    </div>
                                    <div class="garage-footer">
                                        <span class="garage-phone"><i class="fa-solid fa-phone"></i> ${s.phone || 'N/A'}</span>
                                        <a href="shop.html?id=${s.id}" class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.85rem;">View Shop</a>
                                    </div>
                                </div>
                            `;

                            card.addEventListener('click', () => {
                                if (s.latitude && s.longitude) {
                                    this.map.setView([s.latitude, s.longitude], 13);
                                }
                            });

                            container.appendChild(card);

                            if (s.latitude && s.longitude) {
                                const marker = L.marker([s.latitude, s.longitude]).addTo(this.map);
                                marker.bindPopup(`
                                    <div style="color:var(--text-primary); font-family:var(--font-body); min-width: 150px;">
                                        <h4 style="font-weight:700; margin-bottom:4px; font-family:var(--font-heading); display:flex; justify-content:space-between; align-items:center;">
                                            <span>${s.shopName}</span>
                                            <span style="color:#f59e0b; margin-left: 10px; white-space: nowrap;"><i class="fa-solid fa-star"></i> ${s.rating ? s.rating.toFixed(1) : '0.0'}</span>
                                        </h4>
                                        <p style="font-size:0.85rem; margin-bottom:8px; color:var(--text-secondary);"><i class="fa-solid fa-location-dot"></i> ${s.city}</p>
                                        <a href="shop.html?id=${s.id}" class="btn btn-primary" style="padding:0.25rem 0.5rem; font-size:0.75rem; width:100%; text-align:center; color:white;">View Shop</a>
                                    </div>
                                `);
                                this.markers.push(marker);
                                mapPoints.push([s.latitude, s.longitude]);
                            }
                        });
                    }

                    if (mapPoints.length > 0) {
                        const bounds = L.latLngBounds(mapPoints);
                        this.map.fitBounds(bounds, { padding: [50, 50] });
                    }

                } catch (err) {
                    console.error("Error searching spare parts / shops:", err);
                    container.innerHTML = `
                        <div style="text-align:center; padding: 3rem; color: var(--danger);">
                            <i class="fa-solid fa-circle-exclamation fa-2x" style="margin-bottom:1rem;"></i>
                            <p>Error loading search results. Please try again.</p>
                        </div>
                    `;
                }
            };

            // Load parts immediately so search doesn't hang on geolocation prompt/errors
            performSearch(null, null);

            // Optionally retrieve coordinates in the background to refine sorting by distance
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => performSearch(pos.coords.latitude, pos.coords.longitude),
                    () => {}, // Silently fail on block/timeout
                    { timeout: 3000 }
                );
            }
        },

        async loadHomepageActiveBreakdown() {
            const container = document.getElementById('active-breakdown-panel');
            const content = document.getElementById('active-breakdown-details-content');
            const statusBadge = document.getElementById('active-breakdown-status-badge');
            const resolveBtn = document.getElementById('active-breakdown-resolve-btn');
            const emergencyBtnContainer = document.getElementById('emergency-assist-container');
            
            if (!container || !content) return;
            
            try {
                const res = await fetch('/api/breakdowns/my');
                if (!res.ok) return;
                const breakdowns = await res.json();
                
                // Find first active request (status is 'OPEN' or 'ACCEPTED')
                const active = breakdowns.find(b => b.status === 'OPEN' || b.status === 'ACCEPTED');
                
                if (active) {
                    // Hide emergency button container to prevent multiple requests
                    if (emergencyBtnContainer) emergencyBtnContainer.style.display = 'none';
                    
                    // Show breakdown panel
                    container.style.display = 'block';
                    
                    // Configure status badge
                    statusBadge.className = 'badge';
                    if (active.status === 'OPEN') {
                        statusBadge.classList.add('badge-pending');
                        statusBadge.innerText = 'OPEN';
                    } else {
                        statusBadge.classList.add('badge-approved');
                        statusBadge.innerText = 'RESCUE DISPATCHED';
                    }
                    
                    let responseHtml = '<span style="color:var(--text-muted);">Searching for nearby service responder...</span>';
                    if (active.status === 'ACCEPTED') {
                        responseHtml = `
                            <div style="margin-top: 10px; padding: 10px; background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.2); border-radius: var(--radius-md);">
                                <strong style="color: var(--secondary);"><i class="fa-solid fa-truck-pickup"></i> Dispatched Garage:</strong> ${active.acceptedBy.name} <br>
                                ${active.assignedMechanic ? `<strong style="color: var(--secondary);"><i class="fa-solid fa-user-gear"></i> Assigned Mechanic:</strong> ${active.assignedMechanic.name} (${active.assignedMechanic.phone}) <br>` : ''}
                                <strong style="color: var(--secondary);"><i class="fa-solid fa-phone"></i> Call Rescue:</strong> <a href="tel:${active.acceptedBy.phone}" style="color: var(--secondary); font-weight:700; text-decoration: underline;">${active.acceptedBy.phone || 'N/A'}</a>
                            </div>
                        `;
                    }
                    
                    content.innerHTML = `
                        <div style="margin-bottom: 8px;">
                            <strong>📍 Location:</strong> ${active.address}, ${active.city}
                        </div>
                        <div style="margin-bottom: 8px;">
                            <strong>🚗 Vehicle:</strong> ${active.vehicleNo}
                        </div>
                        <div style="margin-bottom: 8px;">
                            <strong>📝 Description:</strong> ${active.description}
                        </div>
                        <div style="margin-bottom: 8px; font-size: 0.8rem; color: var(--text-muted);">
                            Reported at: ${new Date(active.createdAt).toLocaleString()}
                        </div>
                        ${responseHtml}
                    `;
                    
                    // Setup complete button
                    resolveBtn.onclick = async () => {
                        if (!confirm('Mark this emergency breakdown assist as resolved?')) return;
                        try {
                            const compRes = await fetch(`/api/breakdowns/${active.id}/complete`, { method: 'PUT' });
                            if (compRes.ok) {
                                this.showToast('Emergency request marked as completed.', 'success');
                                // Reload homepage breakdown state
                                this.loadHomepageActiveBreakdown();
                            } else {
                                const data = await compRes.json();
                                this.showToast(data.message || 'Failed to complete breakdown', 'error');
                            }
                        } catch (err) {
                            console.error("Error resolving breakdown:", err);
                            this.showToast('Connection error', 'error');
                        }
                    };
                } else {
                    // No active breakdown request
                    container.style.display = 'none';
                    if (emergencyBtnContainer) emergencyBtnContainer.style.display = 'block';
                }
            } catch (err) {
                console.error("Error loading active breakdown on homepage:", err);
            }
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
                if (!res.ok) throw new Error("Failed to load garages");
                const garages = await res.json();

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
                            <div style="color:var(--text-primary); font-family:var(--font-body); min-width: 150px;">
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
                console.error("Failed to load garages:", err);
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
            this.isAdminView = urlParams.get('isAdminView') === 'true';

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
                console.error("Error loading garage details:", err);
                this.showToast('Error loading garage details', 'error');
            }
        },

        renderGarageProfile(g) {
            document.title = `${g.name} - GarageLK`;
            const headerContainer = document.getElementById('garage-profile-header');

            let ownerActionsHtml = '';
            if (this.currentUser && g.user && this.currentUser.id === g.user.id) {
                ownerActionsHtml = `
                    <div style="margin-top: 1rem; display: flex; gap: 1rem;">
                        <button class="btn btn-primary" onclick="window.GarageLK.handleProfileEditGarage(${g.id})" unique-id="profile-edit-btn" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                            <i class="fa-solid fa-pen-to-square"></i> Edit Garage Profile
                        </button>
                        <button class="btn btn-danger" onclick="window.GarageLK.handleProfileDeleteGarage(${g.id})" unique-id="profile-delete-btn" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                            <i class="fa-solid fa-trash"></i> Delete Garage
                        </button>
                    </div>
                `;
            }

            let ownerInfoHtml = '';
            if (this.isAdminView) {
                ownerInfoHtml = `
                    <div style="margin-top: 0.5rem; font-size: 1.15rem; color: var(--accent); font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-user-tie"></i> Owner: ${g.ownerName || (g.user ? (g.user.fullName || g.user.username) : 'N/A')}
                    </div>
                `;
                
                // Hide booking sidebar
                setTimeout(() => {
                    const bookingSidebar = document.querySelector('.booking-sidebar');
                    if (bookingSidebar) {
                        bookingSidebar.style.display = 'none';
                    }
                    const detailsGrid = document.querySelector('.details-grid');
                    if (detailsGrid) {
                        detailsGrid.style.gridTemplateColumns = '1fr';
                    }
                }, 50);
            }

            headerContainer.innerHTML = `
                <div style="position:relative; margin-bottom: 2rem;">
                    <img src="${g.imageUrl || 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=1200'}" class="garage-hero-img" alt="${g.name}">
                    <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap:wrap; gap:1rem;">
                        <div>
                            <h1 style="font-size:2.5rem; font-weight:800; margin-bottom:0.25rem;">${g.name}</h1>
                            ${ownerInfoHtml}
                            <div style="display:flex; gap:1.5rem; color:var(--text-secondary); font-size:0.95rem; flex-wrap:wrap; margin-top:0.75rem;">
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
                    ${ownerActionsHtml}
                </div>
            `;
        },

        handleProfileEditGarage(id) {
            window.location.href = `dashboard.html?editGarageId=${id}`;
        },

        async handleProfileDeleteGarage(id) {
            if (!confirm('Are you sure you want to delete this garage? This will permanently delete all associated services, reviews, and bookings.')) return;
            try {
                const res = await fetch(`/api/garages/${id}`, {
                    method: 'DELETE'
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Garage deleted successfully.', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                } else {
                    this.showToast(data.message || 'Deletion failed', 'error');
                }
            } catch (err) {
                console.error("Error deleting garage:", err);
                this.showToast('Connection error', 'error');
            }
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

        // --- SHOP DETAILS PAGE ---
        async initShopDetails() {
            await this.checkAuth();

            const urlParams = new URLSearchParams(window.location.search);
            const shopId = urlParams.get('id');
            if (!shopId) {
                window.location.href = 'index.html';
                return;
            }
            this.isAdminView = urlParams.get('isAdminView') === 'true';

            try {
                const res = await fetch(`/api/shops/${shopId}`);
                if (!res.ok) throw new Error("Shop not found");

                const data = await res.json();
                this.renderShopProfile(data.shop);
                this.renderShopParts(data.parts);
                this.renderShopReviews(data.reviews);

            } catch (err) {
                console.error("Error loading shop details:", err);
                this.showToast('Error loading shop details', 'error');
            }
        },

        renderShopProfile(s) {
            document.title = `${s.shopName} - GarageLK`;
            const headerContainer = document.getElementById('shop-profile-header');

            let ownerInfoHtml = '';
            if (this.isAdminView) {
                ownerInfoHtml = `
                    <div style="margin-top: 0.5rem; font-size: 1.15rem; color: var(--accent); font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-user-tie"></i> Owner: ${s.ownerName || (s.user ? (s.user.fullName || s.user.username) : 'N/A')}
                    </div>
                `;
            }

            headerContainer.innerHTML = `
                <div style="position:relative; margin-bottom: 2rem;">
                    <img src="${s.imageUrl || 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=1200'}" class="garage-hero-img" alt="${s.shopName}">
                    <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap:wrap; gap:1rem;">
                        <div>
                            <h1 style="font-size:2.5rem; font-weight:800; margin-bottom:0.25rem;">${s.shopName}</h1>
                            ${ownerInfoHtml}
                            <div style="display:flex; gap:1.5rem; color:var(--text-secondary); font-size:0.95rem; flex-wrap:wrap; margin-top:0.75rem;">
                                <span><i class="fa-solid fa-location-dot" style="color:var(--primary)"></i> ${s.address}, ${s.city}</span>
                                <span><i class="fa-solid fa-phone" style="color:var(--secondary)"></i> ${s.phone || 'N/A'}</span>
                                <span><i class="fa-solid fa-envelope" style="color:var(--primary)"></i> ${s.email || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="garage-rating" style="font-size: 1.25rem; padding: 0.5rem 1rem;">
                            <i class="fa-solid fa-star"></i> ${s.rating ? s.rating.toFixed(1) : '0.0'} (${s.reviewCount || 0})
                        </div>
                    </div>
                    <p style="color:var(--text-secondary); margin-top:1rem; font-size:1.05rem; line-height:1.6;">${s.description || 'Quality automotive spare parts.'}</p>
                </div>
            `;
        },

        renderShopParts(parts) {
            const container = document.getElementById('parts-container');
            container.innerHTML = '';

            if (!parts || parts.length === 0) {
                container.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 40px; grid-column: 1 / -1; width: 100%;">No spare parts listed in inventory at this shop currently.</p>`;
                return;
            }

            parts.forEach(p => {
                const card = document.createElement('div');
                card.className = 'garage-card';

                let reserveBtnHtml = '';
                if (!this.currentUser || this.currentUser.role === 'CUSTOMER') {
                    const disabledStr = p.quantity <= 0 ? 'disabled' : '';
                    reserveBtnHtml = `
                        <div style="margin-top: 1rem;">
                            <button class="btn btn-primary btn-sm" style="width: 100%; font-size: 0.85rem;" 
                                onclick="window.GarageLK.openReservePartModal(${p.id}, '${(p.partName || '').replace(/'/g, "\\'")}', ${p.price}, ${p.quantity})" 
                                ${disabledStr} unique-id="reserve-btn-${p.id}">
                                <i class="fa-solid fa-cart-shopping"></i> Reserve Part
                            </button>
                        </div>
                    `;
                }

                card.innerHTML = `
                    <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400'}" class="garage-card-img" alt="${p.partName}">
                    <div class="garage-card-content" style="display: flex; flex-direction: column; justify-content: space-between; height: calc(100% - 150px);">
                        <div>
                            <div class="garage-header">
                                <h3 class="garage-title" style="color:var(--primary); font-size:1.15rem; font-weight:700; margin:0;">${p.partName}</h3>
                                <div style="font-size:1.2rem; font-weight:800; color:var(--accent);">${p.price.toLocaleString('en-LK', { style: 'currency', currency: 'LKR' })}</div>
                            </div>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px; margin-top:4px;">
                                <strong>Compatibility:</strong> ${p.vehicleModel} (${p.vehicleYear})<br>
                                <strong>Stock:</strong> <span class="badge ${p.quantity > 0 ? 'badge-approved' : 'badge-pending'}">${p.quantity} Available</span>
                            </p>
                        </div>
                        ${reserveBtnHtml}
                    </div>
                `;
                container.appendChild(card);
            });
        },

        renderShopReviews(reviews) {
            const container = document.getElementById('reviews-container');
            if (!container) return;
            if (!reviews || reviews.length === 0) {
                container.innerHTML = '<p style="color:var(--text-muted); padding:1rem 0;">No reviews yet. Be the first to reserve and rate!</p>';
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
                console.error("Booking request failed:", err);
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
                this.loadCustomerReservations();
            } else if (role === 'GARAGE_OWNER') {
                this.switchDashboardTab('owner-garages');
                await this.loadOwnerGarages();
                this.loadOwnerBookings();
                this.loadOwnerAnalytics();
                this.loadOwnerBreakdownAlerts();

                // Check for editGarageId redirect parameter
                const urlParams = new URLSearchParams(window.location.search);
                const editGarageId = urlParams.get('editGarageId');
                if (editGarageId) {
                    this.openEditGarageModal(editGarageId);
                }
            } else if (role === 'SHOP_OWNER') {
                this.switchDashboardTab('shop-my-shops');
                await this.loadShopMyShops();
                this.loadShopInventoryDropdown();
                this.loadShopReservations();
            } else if (role === 'ADMIN') {
                this.switchDashboardTab('admin-garage-approvals');
                this.loadAdminApprovals();
                this.loadAdminMonitor();
            }

            // Initialize drag and drop image upload handlers
            this.initImageUploads();
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
                    <button class="sidebar-btn" id="side-customer-reservations" onclick="window.GarageLK.switchDashboardTab('customer-reservations'); window.GarageLK.loadCustomerReservations();">
                        <i class="fa-solid fa-gears"></i> Part Reservations
                    </button>
                    <button class="sidebar-btn" id="side-customer-breakdowns" onclick="window.GarageLK.switchDashboardTab('customer-breakdowns'); window.GarageLK.loadCustomerBreakdowns();">
                        <i class="fa-solid fa-truck-medical"></i> Emergency Assist
                    </button>
                    <button class="sidebar-btn" id="side-profile" onclick="window.GarageLK.switchDashboardTab('profile'); window.GarageLK.loadUserProfile();">
                        <i class="fa-solid fa-user-gear"></i> Profile Settings
                    </button>
                `;
            } else if (role === 'GARAGE_OWNER') {
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
                    <button class="sidebar-btn" id="side-owner-mechanics" onclick="window.GarageLK.switchDashboardTab('owner-mechanics'); window.GarageLK.loadOwnerMechanics();">
                        <i class="fa-solid fa-user-gear"></i> Manage Mechanics
                    </button>
                    <button class="sidebar-btn" id="side-owner-breakdowns" onclick="window.GarageLK.switchDashboardTab('owner-breakdowns'); window.GarageLK.loadOwnerBreakdownAlerts();">
                        <i class="fa-solid fa-bell"></i> Breakdown Alerts
                    </button>
                    <button class="sidebar-btn" id="side-owner-analytics" onclick="window.GarageLK.switchDashboardTab('owner-analytics')">
                        <i class="fa-solid fa-chart-line"></i> Analytics Overview
                    </button>
                    <button class="sidebar-btn" id="side-profile" onclick="window.GarageLK.switchDashboardTab('profile'); window.GarageLK.loadUserProfile();">
                        <i class="fa-solid fa-user-gear"></i> Profile Settings
                    </button>
                `;
            } else if (role === 'SHOP_OWNER') {
                html = `
                    <div style="padding: 1rem; text-align: center; border-bottom:1px solid var(--border-color); margin-bottom:1rem;">
                        <h4 style="font-weight:700;">Seller Panel</h4>
                        <span style="font-size:0.75rem; color:var(--secondary);">Spare Parts Shop</span>
                    </div>
                    <button class="sidebar-btn" id="side-shop-my-shops" onclick="window.GarageLK.switchDashboardTab('shop-my-shops')">
                        <i class="fa-solid fa-store"></i> My Shops
                    </button>
                    <button class="sidebar-btn" id="side-shop-inventory" onclick="window.GarageLK.switchDashboardTab('shop-inventory'); window.GarageLK.loadShopInventoryDropdown();">
                        <i class="fa-solid fa-gears"></i> Manage Inventory
                    </button>
                    <button class="sidebar-btn" id="side-shop-reservations" onclick="window.GarageLK.switchDashboardTab('shop-reservations'); window.GarageLK.loadShopReservations();">
                        <i class="fa-solid fa-cart-flatbed-suitcase"></i> Part Reservations
                    </button>
                    <button class="sidebar-btn" id="side-shop-analytics" onclick="window.GarageLK.switchDashboardTab('shop-analytics'); window.GarageLK.loadShopAnalytics();">
                        <i class="fa-solid fa-chart-line"></i> Analytics (Sales Reports)
                    </button>
                    <button class="sidebar-btn" id="side-profile" onclick="window.GarageLK.switchDashboardTab('profile'); window.GarageLK.loadUserProfile();">
                        <i class="fa-solid fa-user-gear"></i> Profile Settings
                    </button>
                `;
            } else if (role === 'ADMIN') {
                html = `
                    <div style="padding: 1rem; text-align: center; border-bottom:1px solid var(--border-color); margin-bottom:1rem;">
                        <h4 style="font-weight:700;">Admin Panel</h4>
                        <span style="font-size:0.75rem; color:var(--danger);">System Administrator</span>
                    </div>
                    <button class="sidebar-btn active" id="side-admin-garage-approvals" onclick="window.GarageLK.switchDashboardTab('admin-garage-approvals')">
                        <i class="fa-solid fa-warehouse"></i> Garage Approvals
                    </button>
                    <button class="sidebar-btn" id="side-admin-shop-approvals" onclick="window.GarageLK.switchDashboardTab('admin-shop-approvals')">
                        <i class="fa-solid fa-store"></i> Shop Approvals
                    </button>
                    <button class="sidebar-btn" id="side-admin-monitor" onclick="window.GarageLK.switchDashboardTab('admin-monitor'); window.GarageLK.loadAdminMonitor();">
                        <i class="fa-solid fa-chart-line"></i> System Monitor
                    </button>
                    <button class="sidebar-btn" id="side-admin-users" onclick="window.GarageLK.switchDashboardTab('admin-users'); window.GarageLK.resetAdminUserFilter();">
                        <i class="fa-solid fa-users"></i> User Management
                    </button>
                    <button class="sidebar-btn" id="side-profile" onclick="window.GarageLK.switchDashboardTab('profile'); window.GarageLK.loadUserProfile();">
                        <i class="fa-solid fa-user-gear"></i> Profile Management
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
            const completedList = document.getElementById('customer-completed-bookings-list');
            
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading bookings...</p>';
            if (completedList) {
                completedList.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading completed history...</p>';
            }

            try {
                const res = await fetch('/api/bookings/my');
                const bookings = await res.json();
                if (!res.ok) throw new Error("Load failed");

                const activeBookings = bookings.filter(b => b.status === 'PENDING' || b.status === 'APPROVED');
                const completedBookings = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

                // 1. Render Active Bookings
                if (activeBookings.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No active bookings found.</p>';
                } else {
                    list.innerHTML = '';
                    activeBookings.forEach(b => {
                        const item = document.createElement('div');
                        item.className = 'table-item';

                        let statusBadgeClass = 'badge-pending';
                        if (b.status === 'APPROVED') statusBadgeClass = 'badge-approved';

                        let actionHtml = `
                            <button class="btn btn-danger" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" 
                                onclick="window.GarageLK.updateBookingStatus(${b.id}, 'CANCELLED')" unique-id="cancel-btn-${b.id}">
                                Cancel
                            </button>
                        `;

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
                }

                // 2. Render Completed Bookings
                if (completedList) {
                    if (completedBookings.length === 0) {
                        completedList.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No completed appointments found.</p>';
                    } else {
                        completedList.innerHTML = '';
                        completedBookings.forEach(b => {
                            const item = document.createElement('div');
                            item.className = 'table-item';

                            const reviewBtnContainerId = `review-btn-container-${b.id}`;

                            let badgeClass = 'badge-completed';
                            if (b.status === 'CANCELLED') badgeClass = 'badge-cancelled';

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
                                <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; min-width: 150px;">
                                    <span class="badge ${badgeClass}">${b.status}</span>
                                    <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${b.totalPrice.toFixed(2)}</span>
                                    <div id="${reviewBtnContainerId}" style="display:inline-block; margin-top:0.25rem;"></div>
                                </div>
                            `;
                            completedList.appendChild(item);

                            if (b.status === 'COMPLETED') {
                                // Load rated check for garage
                                setTimeout(async () => {
                                    const btnContainer = document.getElementById(reviewBtnContainerId);
                                    if (btnContainer) {
                                        try {
                                            const existsRes = await fetch(`/api/reviews/booking/${b.id}/exists`);
                                            if (existsRes.ok) {
                                                const check = await existsRes.json();
                                                if (!check.exists) {
                                                    btnContainer.innerHTML = `
                                                        <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" 
                                                            onclick="window.GarageLK.openReviewModal(${b.id})" unique-id="review-btn-${b.id}">
                                                            <i class="fa-solid fa-star"></i> Write Review
                                                        </button>
                                                    `;
                                                } else {
                                                    btnContainer.innerHTML = `<span class="badge badge-approved" style="font-size:0.75rem; padding:0.4rem 0.8rem;"><i class="fa-solid fa-check"></i> Garage Reviewed</span>`;
                                                }
                                            }
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }
                                }, 0);
                            }
                        });
                    }
                }

            } catch (err) {
                console.error("Error loading customer bookings:", err);
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

                this.ownerGarages = garages;

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
                const mechSelect = document.getElementById('owner-mechanics-garage-select');
                if (mechSelect) {
                    mechSelect.innerHTML = '<option value="">-- Choose Garage --</option>';
                    garages.forEach(g => {
                        if (g.status === 'APPROVED') {
                            mechSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`;
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
                        <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem;">
                            <span class="badge ${badgeClass}" id="garage-status-badge-${g.id}" style="display:none;">${g.status === 'APPROVED' ? 'APPROVED' : 'PENDING APPROVAL'}</span>
                            <div style="display:flex; gap:0.5rem; margin-top:0.25rem;">
                                <button class="btn btn-outline" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="window.GarageLK.toggleGarageStatusDisplay('${g.id}', this)" unique-id="toggle-status-btn-${g.id}">
                                    Show Status
                                </button>
                                <button class="btn btn-primary" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="window.GarageLK.openEditGarageModal(${g.id})" unique-id="edit-garage-btn-${g.id}">
                                    Edit
                                </button>
                                <button class="btn btn-outline btn-danger" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="window.GarageLK.handleDeleteGarage(${g.id})" unique-id="delete-garage-btn-${g.id}">
                                    Delete
                                </button>
                            </div>
                        </div>
                    `;
                    list.appendChild(item);
                });

            } catch (err) {
                console.error("Error loading owner garages:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading garages.</p>';
            }
        },
        async loadOwnerBookings() {
            const list = document.getElementById('owner-bookings-list');
            const completedList = document.getElementById('owner-completed-bookings-list');
            const clearBtn = document.getElementById('btn-clear-bookings-history');
            
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading bookings...</p>';
            if (completedList) {
                completedList.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading completed history...</p>';
            }

            try {
                const res = await fetch('/api/bookings/my');
                const bookings = await res.json();
                if (!res.ok) throw new Error();

                const activeBookings = bookings.filter(b => b.status === 'PENDING' || b.status === 'APPROVED');
                const completedBookings = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

                // 1. Render Active Bookings
                if (activeBookings.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No active booking requests found.</p>';
                } else {
                    list.innerHTML = '';
                    activeBookings.forEach(b => {
                        const item = document.createElement('div');
                        item.className = 'table-item';

                        let badgeClass = 'badge-pending';
                        if (b.status === 'APPROVED') badgeClass = 'badge-approved';
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
                }

                // 2. Render Completed Bookings History
                if (completedList) {
                    if (completedBookings.length === 0) {
                        completedList.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No completed booking history found.</p>';
                        if (clearBtn) clearBtn.style.display = 'none';
                    } else {
                        if (clearBtn) clearBtn.style.display = 'inline-block';
                        completedList.innerHTML = '';
                        completedBookings.forEach(b => {
                            const item = document.createElement('div');
                            item.className = 'table-item';

                            let titleHtml = `<h4 style="font-weight:700; margin-bottom:0; color:var(--success);"><i class="fa-solid fa-circle-check"></i> Completed Appointment</h4>`;
                            let badgeClass = 'badge-completed';
                            if (b.status === 'CANCELLED') {
                                titleHtml = `<h4 style="font-weight:700; margin-bottom:0; color:var(--danger);"><i class="fa-solid fa-circle-xmark"></i> Cancelled Appointment</h4>`;
                                badgeClass = 'badge-cancelled';
                            }

                            item.innerHTML = `
                                <div style="flex:1;">
                                    <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:4px;">
                                        ${titleHtml}
                                        <span style="font-size:0.8rem; color:var(--text-muted);">at <strong>${b.garage.name}</strong></span>
                                    </div>
                                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                        <i class="fa-regular fa-calendar"></i> ${b.bookingDate} &bull; <i class="fa-regular fa-clock"></i> ${b.timeSlot}
                                    </p>
                                    <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">
                                        <strong>Customer:</strong> ${b.user.fullName || b.user.username} <br>
                                        <strong>Vehicle:</strong> ${b.vehicleType} (${b.vehicleNo}) <br>
                                        <strong>Details:</strong> ${b.description}
                                    </p>
                                </div>
                                <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; min-width: 180px;">
                                    <span class="badge ${badgeClass}">${b.status}</span>
                                    <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${b.totalPrice.toFixed(2)}</span>
                                    <div style="display:flex; gap:0.5rem; margin-top:0.25rem;">
                                        <button class="btn btn-outline" style="color:var(--danger); border-color:var(--border-color); padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                            onclick="window.GarageLK.deleteBookingHistory(${b.id})" unique-id="delete-booking-btn-${b.id}">
                                            <i class="fa-solid fa-trash-can"></i> Delete
                                        </button>
                                    </div>
                                </div>
                            `;
                            completedList.appendChild(item);
                        });
                    }
                }
            } catch (err) {
                console.error("Error loading owner bookings:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading bookings.</p>';
            }
        },

        async deleteBookingHistory(id) {
            if (!confirm('Are you sure you want to delete this booking from your history?')) return;
            try {
                const res = await fetch(`/api/bookings/${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    this.showToast('Booking history item deleted.', 'success');
                    this.loadOwnerBookings();
                } else {
                    const data = await res.json();
                    this.showToast(data.message || 'Delete failed', 'error');
                }
            } catch (err) {
                console.error("Error deleting booking history item:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async clearAllCompletedBookingsHistory() {
            if (!confirm('Are you sure you want to clear ALL completed bookings history? This action cannot be undone.')) return;
            try {
                const res = await fetch('/api/bookings/history/clear', {
                    method: 'DELETE'
                });
                if (res.ok) {
                    this.showToast('All completed bookings history cleared.', 'success');
                    this.loadOwnerBookings();
                } else {
                    const data = await res.json();
                    this.showToast(data.message || 'Clear failed', 'error');
                }
            } catch (err) {
                console.error("Error clearing bookings history:", err);
                this.showToast('Connection error', 'error');
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
                console.error("Error loading owner services:", err);
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
            const approvedGaragesList = document.getElementById('admin-approved-garages-list');
            const shopList = document.getElementById('admin-shop-approvals-list');
            const approvedShopsList = document.getElementById('admin-approved-shops-list');

            if (list) list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading pending garages...</p>';
            if (approvedGaragesList) approvedGaragesList.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading approved garages...</p>';
            if (shopList) shopList.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading pending shops...</p>';
            if (approvedShopsList) approvedShopsList.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading approved shops...</p>';

            try {
                // Fetch Garages
                const res = await fetch('/api/garages/all');
                if (res.ok) {
                    const allGarages = await res.json();
                    
                    // 1. Pending List
                    const pending = allGarages.filter(g => g.status === 'PENDING_APPROVAL' || g.status === 'PENDING');
                    if (list) {
                        if (pending.length === 0) {
                            list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No garages currently pending approval.</p>';
                        } else {
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
                                                <i class="fa-solid fa-location-dot"></i> ${g.address}, ${g.city} &bull; <i class="fa-solid fa-user"></i> Owner: ${g.owner ? (g.owner.fullName || g.owner.username) : 'N/A'}
                                            </p>
                                            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">${g.description}</p>
                                        </div>
                                    </div>
                                    <div style="display:flex; gap:0.5rem; align-items:center;">
                                        <a href="garage.html?id=${g.id}&isAdminView=true" class="btn btn-outline" style="padding:0.5rem 1rem; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.25rem; text-decoration:none;" unique-id="view-garage-${g.id}">
                                            <i class="fa-solid fa-eye"></i> View
                                        </a>
                                        <button class="btn btn-primary" style="padding:0.5rem 1rem; font-size:0.85rem;" 
                                            onclick="window.GarageLK.handleApproveGarage(${g.id})" unique-id="approve-garage-${g.id}">
                                            <i class="fa-solid fa-check"></i> Approve
                                        </button>
                                        <button class="btn btn-outline btn-danger" style="padding:0.5rem 1rem; font-size:0.85rem;" 
                                            onclick="window.GarageLK.handleRejectGarage(${g.id})" unique-id="reject-garage-${g.id}">
                                            Reject
                                        </button>
                                    </div>
                                `;
                                list.appendChild(item);
                            });
                        }
                    }

                    // 2. Approved List
                    const approved = allGarages.filter(g => g.status === 'APPROVED' || g.status === 'SUSPENDED');
                    if (approvedGaragesList) {
                        if (approved.length === 0) {
                            approvedGaragesList.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No approved garages.</p>';
                        } else {
                            approvedGaragesList.innerHTML = '';
                            approved.forEach(g => {
                                const item = document.createElement('div');
                                item.className = 'table-item';

                                const isActive = g.status === 'APPROVED';
                                const statusBadgeClass = isActive ? 'badge-approved' : 'badge-cancelled';
                                const statusText = isActive ? 'Active' : 'Suspended';
                                
                                const toggleBtnText = isActive ? 'Deactivate' : 'Activate';
                                const toggleBtnIcon = isActive ? 'fa-ban' : 'fa-check';
                                const toggleColor = isActive ? 'var(--warning)' : 'var(--success)';
                                const nextStatus = isActive ? 'SUSPENDED' : 'APPROVED';

                                item.innerHTML = `
                                    <div style="display:flex; gap:1.25rem; align-items:center; flex:1;">
                                        <img src="${g.imageUrl || 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=150'}" style="width:100px; height:75px; object-fit:cover; border-radius:var(--radius-sm);">
                                        <div>
                                            <h4 style="font-weight:700; margin-bottom:2px; display:flex; align-items:center; gap:0.5rem;">
                                                ${g.name}
                                                <span class="badge ${statusBadgeClass}" style="font-size:0.7rem; padding:0.15rem 0.4rem;">${statusText}</span>
                                            </h4>
                                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                                <i class="fa-solid fa-location-dot"></i> ${g.address}, ${g.city} &bull; <i class="fa-solid fa-user"></i> Owner: ${g.owner ? (g.owner.fullName || g.owner.username) : 'N/A'}
                                            </p>
                                            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">${g.description}</p>
                                        </div>
                                    </div>
                                    <div style="display:flex; gap:0.5rem; align-items:center;">
                                        <a href="garage.html?id=${g.id}&isAdminView=true" class="btn btn-outline" style="padding:0.5rem 1rem; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.25rem; text-decoration:none;" unique-id="view-approved-garage-${g.id}">
                                            <i class="fa-solid fa-eye"></i> View
                                        </a>
                                        <button class="btn btn-outline" style="padding:0.5rem 1rem; font-size:0.85rem; color:${toggleColor}; border-color:${toggleColor};" 
                                            onclick="window.GarageLK.toggleGarageActive(${g.id}, '${nextStatus}')" unique-id="toggle-approved-garage-${g.id}">
                                            <i class="fa-solid ${toggleBtnIcon}"></i> ${toggleBtnText}
                                        </button>
                                        <button class="btn btn-danger" style="padding:0.5rem 1rem; font-size:0.85rem;" 
                                            onclick="window.GarageLK.handleCancelGarage(${g.id})" unique-id="cancel-garage-${g.id}">
                                            Cancel Approval
                                        </button>
                                    </div>
                                `;
                                approvedGaragesList.appendChild(item);
                            });
                        }
                    }
                }

                // Fetch Shops
                const shopRes = await fetch('/api/shops/all');
                if (shopRes.ok) {
                    const allShops = await shopRes.json();
                    
                    // 3. Shop Approvals List
                    const pendingShops = allShops.filter(s => s.status === 'PENDING_APPROVAL' || s.status === 'PENDING');
                    if (shopList) {
                        if (pendingShops.length === 0) {
                            shopList.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No shops currently pending approval.</p>';
                        } else {
                            shopList.innerHTML = '';
                            pendingShops.forEach(s => {
                                const item = document.createElement('div');
                                item.className = 'table-item';
                                item.innerHTML = `
                                    <div style="display:flex; gap:1.25rem; align-items:center;">
                                        <img src="${s.imageUrl || 'https://images.unsplash.com/photo-1607603731995-5751e3016848?w=150'}" style="width:100px; height:75px; object-fit:cover; border-radius:var(--radius-sm);">
                                        <div>
                                            <h4 style="font-weight:700; margin-bottom:2px;">${s.name}</h4>
                                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                                <i class="fa-solid fa-location-dot"></i> ${s.address}, ${s.city} &bull; <i class="fa-solid fa-user"></i> Owner: ${s.ownerName || 'N/A'}
                                            </p>
                                            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">${s.description}</p>
                                        </div>
                                    </div>
                                    <div style="display:flex; gap:0.5rem; align-items:center;">
                                        <a href="shop.html?id=${s.id}&isAdminView=true" class="btn btn-outline" style="padding:0.5rem 1rem; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.25rem; text-decoration:none;" unique-id="view-shop-${s.id}">
                                            <i class="fa-solid fa-eye"></i> View
                                        </a>
                                        <button class="btn btn-primary" style="padding:0.5rem 1rem; font-size:0.85rem;" 
                                            onclick="window.GarageLK.handleApproveShop(${s.id})" unique-id="approve-shop-${s.id}">
                                            <i class="fa-solid fa-check"></i> Approve
                                        </button>
                                        <button class="btn btn-outline btn-danger" style="padding:0.5rem 1rem; font-size:0.85rem;" 
                                            onclick="window.GarageLK.handleRejectShop(${s.id})" unique-id="reject-shop-${s.id}">
                                            Reject
                                        </button>
                                    </div>
                                `;
                                shopList.appendChild(item);
                            });
                        }
                    }

                    // 4. Approved Shops List
                    const approvedShops = allShops.filter(s => s.status === 'APPROVED' || s.status === 'SUSPENDED');
                    if (approvedShopsList) {
                        if (approvedShops.length === 0) {
                            approvedShopsList.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No approved shops.</p>';
                        } else {
                            approvedShopsList.innerHTML = '';
                            approvedShops.forEach(s => {
                                const item = document.createElement('div');
                                item.className = 'table-item';

                                const isActive = s.status === 'APPROVED';
                                const statusBadgeClass = isActive ? 'badge-approved' : 'badge-cancelled';
                                const statusText = isActive ? 'Active' : 'Suspended';
                                
                                const toggleBtnText = isActive ? 'Deactivate' : 'Activate';
                                const toggleBtnIcon = isActive ? 'fa-ban' : 'fa-check';
                                const toggleColor = isActive ? 'var(--warning)' : 'var(--success)';
                                const nextStatus = isActive ? 'SUSPENDED' : 'APPROVED';

                                item.innerHTML = `
                                    <div style="display:flex; gap:1.25rem; align-items:center; flex:1;">
                                        <img src="${s.imageUrl || 'https://images.unsplash.com/photo-1607603731995-5751e3016848?w=150'}" style="width:100px; height:75px; object-fit:cover; border-radius:var(--radius-sm);">
                                        <div>
                                            <h4 style="font-weight:700; margin-bottom:2px; display:flex; align-items:center; gap:0.5rem;">
                                                ${s.name}
                                                <span class="badge ${statusBadgeClass}" style="font-size:0.7rem; padding:0.15rem 0.4rem;">${statusText}</span>
                                            </h4>
                                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                                <i class="fa-solid fa-location-dot"></i> ${s.address}, ${s.city} &bull; <i class="fa-solid fa-user"></i> Owner: ${s.ownerName || 'N/A'}
                                            </p>
                                            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">${s.description}</p>
                                        </div>
                                    </div>
                                    <div style="display:flex; gap:0.5rem; align-items:center;">
                                        <a href="shop.html?id=${s.id}&isAdminView=true" class="btn btn-outline" style="padding:0.5rem 1rem; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.25rem; text-decoration:none;" unique-id="view-approved-shop-${s.id}">
                                            <i class="fa-solid fa-eye"></i> View
                                        </a>
                                        <button class="btn btn-outline" style="padding:0.5rem 1rem; font-size:0.85rem; color:${toggleColor}; border-color:${toggleColor};" 
                                            onclick="window.GarageLK.toggleShopActive(${s.id}, '${nextStatus}')" unique-id="toggle-approved-shop-${s.id}">
                                            <i class="fa-solid ${toggleBtnIcon}"></i> ${toggleBtnText}
                                        </button>
                                        <button class="btn btn-danger" style="padding:0.5rem 1rem; font-size:0.85rem;" 
                                            onclick="window.GarageLK.handleCancelShop(${s.id})" unique-id="cancel-shop-${s.id}">
                                            Cancel Approval
                                        </button>
                                    </div>
                                `;
                                approvedShopsList.appendChild(item);
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Error loading admin approvals:", err);
                if (list) list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading admin approvals.</p>';
                if (approvedGaragesList) approvedGaragesList.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading approved list.</p>';
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
                console.error("Error updating booking status:", err);
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
                console.error("Error approving garage:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async handleRejectGarage(id) {
            if (!confirm('Are you sure you want to reject this garage?')) return;
            try {
                const res = await fetch(`/api/garages/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'REJECTED' })
                });

                if (res.ok) {
                    this.showToast('Garage rejected successfully!', 'info');
                    this.loadAdminApprovals();
                } else {
                    this.showToast('Action failed', 'error');
                }
            } catch (err) {
                console.error("Error rejecting garage:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async handleCancelGarage(id) {
            if (!confirm('Are you sure you want to cancel the approval for this garage?')) return;
            try {
                const res = await fetch(`/api/garages/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'CANCELLED' })
                });

                if (res.ok) {
                    this.showToast('Garage approval cancelled successfully!', 'info');
                    this.loadAdminApprovals();
                } else {
                    this.showToast('Action failed', 'error');
                }
            } catch (err) {
                console.error("Error cancelling garage:", err);
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
                console.error("Error deleting service:", err);
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
            
            const fileInput = document.getElementById('garage-image-file');
            let imageUrl = '';

            try {
                if (fileInput && fileInput.files && fileInput.files.length > 0) {
                    this.showToast('Uploading garage image...', 'info');
                    imageUrl = await this.uploadFile(fileInput.files[0]);
                } else {
                    this.showToast('Please select a garage image to upload.', 'error');
                    return;
                }

                const latitude = parseFloat(document.getElementById('garage-lat').value);
                const longitude = parseFloat(document.getElementById('garage-lng').value);

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
                    this.removeSelectedImage(null, 'garage-image-file', 'garage-image-placeholder', 'garage-image-preview-container', 'garage-image');
                    this.loadOwnerGarages();
                    e.target.reset();
                } else {
                    this.showToast(data.message || 'Registration failed', 'error');
                }
            } catch (err) {
                console.error("Error adding garage:", err);
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
                console.error("Error saving service:", err);
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
                console.error("Error submitting review:", err);
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

        openMapPicker(latInputId, lngInputId, citySelectId) {
            this.activeLatInput = latInputId;
            this.activeLngInput = lngInputId;
            
            const latVal = document.getElementById(latInputId).value;
            const lngVal = document.getElementById(lngInputId).value;
            
            let initialLat = parseFloat(latVal);
            let initialLng = parseFloat(lngVal);
            let hasCoords = !isNaN(initialLat) && !isNaN(initialLng);
            
            const cityCoords = {
                'ampara': [7.3019, 81.6747],
                'anuradhapura': [8.3114, 80.4037],
                'badulla': [6.9934, 81.0550],
                'batticaloa': [7.7311, 81.6747],
                'colombo': [6.9271, 79.8612],
                'galle': [6.0535, 80.2117],
                'gampaha': [7.0873, 80.0144],
                'hambantota': [6.1246, 81.1185],
                'jaffna': [9.6615, 80.0255],
                'kalutara': [6.5854, 79.9607],
                'kandy': [7.2906, 80.6337],
                'kegalle': [7.2514, 80.3464],
                'kilinochchi': [9.3803, 80.4037],
                'kurunegala': [7.4863, 80.3647],
                'mannar': [8.9811, 79.9044],
                'matale': [7.4682, 80.6244],
                'matara': [5.9549, 80.5550],
                'moneragala': [6.8714, 81.3486],
                'mullaitivu': [9.2667, 80.8144],
                'nuwara eliya': [6.9497, 80.7891],
                'polonnaruwa': [7.9397, 81.0003],
                'puttalam': [8.0362, 79.8283],
                'ratnapura': [6.6828, 80.3992],
                'trincomalee': [8.5873, 81.2152],
                'vavuniya': [8.7514, 80.4972]
            };
            
            if (!hasCoords) {
                const citySelect = document.getElementById(citySelectId);
                const selectedCity = citySelect ? citySelect.value.toLowerCase() : 'colombo';
                const coords = cityCoords[selectedCity] || cityCoords['colombo'];
                initialLat = coords[0];
                initialLng = coords[1];
            }
            
            this.openModal('modal-map-picker');
            
            setTimeout(() => {
                if (!this.pickerMap) {
                    this.pickerMap = L.map('picker-map', {
                        zoomControl: true,
                        attributionControl: false
                    });
                    
                    const savedTheme = localStorage.getItem('theme') || 'night';
                    const tilesUrl = savedTheme === 'day'
                        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
                        
                    L.tileLayer(tilesUrl, {
                        maxZoom: 20
                    }).addTo(this.pickerMap);
                    
                    this.pickerMap.on('click', (e) => {
                        this.handleMapClick(e.latlng);
                    });
                } else {
                    const savedTheme = localStorage.getItem('theme') || 'night';
                    this.pickerMap.eachLayer(layer => {
                        if (layer instanceof L.TileLayer) {
                            this.pickerMap.removeLayer(layer);
                        }
                    });
                    const tilesUrl = savedTheme === 'day'
                        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
                    L.tileLayer(tilesUrl, { maxZoom: 20 }).addTo(this.pickerMap);
                }
                
                this.pickerMap.setView([initialLat, initialLng], 13);
                this.pickerMap.invalidateSize();
                
                if (hasCoords) {
                    this.handleMapClick(L.latLng(initialLat, initialLng));
                } else {
                    if (this.pickerMarker) {
                        this.pickerMap.removeLayer(this.pickerMarker);
                        this.pickerMarker = null;
                    }
                    document.getElementById('picker-selected-coords').textContent = 'None';
                    document.getElementById('btn-confirm-coords').disabled = true;
                }
            }, 350);
        },
        
        handleMapClick(latlng) {
            if (this.pickerMarker) {
                this.pickerMarker.setLatLng(latlng);
            } else {
                this.pickerMarker = L.marker(latlng).addTo(this.pickerMap);
            }
            
            const lat = latlng.lat.toFixed(6);
            const lng = latlng.lng.toFixed(6);
            
            document.getElementById('picker-selected-coords').textContent = `${lat}, ${lng}`;
            document.getElementById('btn-confirm-coords').disabled = false;
        },
        
        confirmMapSelection() {
            if (this.pickerMarker && this.activeLatInput && this.activeLngInput) {
                const latlng = this.pickerMarker.getLatLng();
                document.getElementById(this.activeLatInput).value = latlng.lat.toFixed(6);
                document.getElementById(this.activeLngInput).value = latlng.lng.toFixed(6);
                this.closeMapPicker();
            }
        },
        
        closeMapPicker() {
            this.closeModal('modal-map-picker');
            this.activeLatInput = null;
            this.activeLngInput = null;
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
                console.error("Error submitting emergency breakdown assist request:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async loadCustomerBreakdowns() {
            const list = document.getElementById('customer-breakdowns-list');
            const completedList = document.getElementById('customer-completed-breakdowns-list');
            if (!list) return;
            
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading requests...</p>';
            if (completedList) {
                completedList.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading completed history...</p>';
            }

            try {
                const res = await fetch('/api/breakdowns/my');
                const breakdowns = await res.json();
                if (!res.ok) throw new Error();

                const activeBreakdowns = breakdowns.filter(b => b.status !== 'COMPLETED');
                const completedBreakdowns = breakdowns.filter(b => b.status === 'COMPLETED');

                // 1. Render Active Emergencies
                if (activeBreakdowns.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No active emergency requests found.</p>';
                } else {
                    list.innerHTML = '';
                    activeBreakdowns.forEach(b => {
                        const item = document.createElement('div');
                        item.className = 'table-item';

                        let badgeClass = 'badge-pending';
                        let responseHtml = '<span style="color:var(--text-muted); font-size:0.85rem;">Searching for response...</span>';
                        if (b.status === 'ACCEPTED') {
                            badgeClass = 'badge-approved';
                            responseHtml = `
                                <div style="font-size:0.85rem; color:var(--secondary); font-weight:500;">
                                    <i class="fa-solid fa-truck-pickup"></i> Dispatched: <strong>${b.acceptedBy.name}</strong> <br>
                                    ${b.assignedMechanic ? `<i class="fa-solid fa-user-gear"></i> Mechanic: <strong>${b.assignedMechanic.name} (${b.assignedMechanic.phone})</strong> <br>` : ''}
                                    <i class="fa-solid fa-phone"></i> Call Rescue: <strong>${b.acceptedBy.phone || 'N/A'}</strong>
                                </div>
                            `;
                        }

                        let actionHtml = `
                            <button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem; border-color:var(--border-color);" 
                                onclick="window.GarageLK.completeBreakdown(${b.id})" unique-id="resolve-breakdown-${b.id}">
                                Mark Resolved
                            </button>
                        `;

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
                }

                // 2. Render Completed / Resolved Emergencies
                if (completedList) {
                    if (completedBreakdowns.length === 0) {
                        completedList.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No completed emergency history found.</p>';
                    } else {
                        completedList.innerHTML = '';
                        completedBreakdowns.forEach(b => {
                            const item = document.createElement('div');
                            item.className = 'table-item';

                            const badgeClass = 'badge-completed';
                            const responseHtml = `
                                <div style="font-size:0.85rem; color:var(--success); font-weight:500;">
                                    <i class="fa-solid fa-check-double"></i> Resolved by <strong>${b.acceptedBy ? `${b.acceptedBy.name} (${b.acceptedBy.phone || 'N/A'})` : 'Customer'}</strong>
                                    ${b.assignedMechanic ? `<br><i class="fa-solid fa-user-gear"></i> Mechanic: <strong>${b.assignedMechanic.name} (${b.assignedMechanic.phone || 'N/A'})</strong>` : ''}
                                </div>
                            `;

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
                                    <span class="badge ${badgeClass}">${b.status}</span>
                                </div>
                            `;
                            completedList.appendChild(item);
                        });
                    }
                }

            } catch (err) {
                console.error("Error loading customer breakdowns:", err);
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

                // 1. Load active (OPEN) alerts in operating cities
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
                                    <strong>Phone:</strong> ${b.contactPhone} &bull; <strong>Vehicle:</strong> ${b.vehicleNo} <br>
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

                // 2. Load assigned (ACCEPTED) active alerts for owner's garages
                const assignedRes = await fetch('/api/breakdowns/assigned');
                if (assignedRes.ok) {
                    const assignedAlerts = await assignedRes.json();
                    assignedAlerts.forEach(b => {
                        alertCount++;
                        const item = document.createElement('div');
                        item.className = 'table-item';

                        item.innerHTML = `
                            <div style="flex:1;">
                                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:4px;">
                                    <h4 style="font-weight:700; color:var(--secondary);"><i class="fa-solid fa-truck-pickup"></i> Dispatched Rescue (Active)</h4>
                                    <span style="font-size:0.8rem; color:var(--text-muted);">${new Date(b.createdAt).toLocaleString()}</span>
                                </div>
                                <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                    <i class="fa-solid fa-location-dot"></i> <strong>Location:</strong> ${b.address}, ${b.city}
                                </p>
                                <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">
                                    <strong>Stranded User:</strong> ${b.user.fullName || b.user.username} <br>
                                    <strong>Phone:</strong> ${b.contactPhone} &bull; <strong>Vehicle:</strong> ${b.vehicleNo} <br>
                                    <strong>Assigned Garage:</strong> ${b.acceptedBy ? b.acceptedBy.name : 'N/A'} <br>
                                    <strong>Assigned Mechanic:</strong> ${b.assignedMechanic ? `${b.assignedMechanic.name} (${b.assignedMechanic.phone})` : 'None'} <br>
                                    <strong>Problem:</strong> ${b.description}
                                </p>
                            </div>
                            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; min-width: 140px;">
                                <span class="badge badge-pending" style="font-size: 0.75rem; padding: 0.3rem 0.65rem; border-radius: 4px; font-weight:700;">
                                    PENDING RESOLVED
                                </span>
                            </div>
                        `;
                        list.appendChild(item);
                    });
                }

                if (alertCount === 0) {
                    list.innerHTML = `<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No active emergency breakdown alerts or active dispatches in your operating cities (${cities.join(', ')}).</p>`;
                }

            } catch (err) {
                console.error("Error loading breakdown alerts:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading alerts.</p>';
            }
            this.loadOwnerBreakdownHistory();
        },

        async loadOwnerBreakdownHistory() {
            const list = document.getElementById('owner-breakdown-history-list');
            const clearBtn = document.getElementById('btn-clear-breakdown-history');
            if (!list) return;

            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading history...</p>';
            if (clearBtn) clearBtn.disabled = true;

            try {
                const res = await fetch('/api/breakdowns/history');
                const history = await res.json();
                if (!res.ok) throw new Error();

                if (history.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No completed rescue history found.</p>';
                    if (clearBtn) clearBtn.style.display = 'none';
                    return;
                }

                if (clearBtn) {
                    clearBtn.style.display = 'inline-block';
                    clearBtn.disabled = false;
                }

                list.innerHTML = '';
                history.forEach(b => {
                    const item = document.createElement('div');
                    item.className = 'table-item';
                    item.innerHTML = `
                        <div style="flex:1;">
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:4px;">
                                <h4 style="font-weight:700; color:var(--success);"><i class="fa-solid fa-circle-check"></i> Completed Rescue</h4>
                                <span style="font-size:0.8rem; color:var(--text-muted);">${new Date(b.createdAt).toLocaleString()}</span>
                            </div>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                <i class="fa-solid fa-location-dot"></i> <strong>Location:</strong> ${b.address}, ${b.city}
                            </p>
                            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">
                                <strong>Stranded User:</strong> ${b.user.fullName || b.user.username} <br>
                                <strong>Phone:</strong> ${b.contactPhone} &bull; <strong>Vehicle:</strong> ${b.vehicleNo} <br>
                                ${b.assignedMechanic ? `<strong>Mechanic:</strong> ${b.assignedMechanic.name} (${b.assignedMechanic.phone}) <br>` : ''}
                                <strong>Problem:</strong> ${b.description}
                            </p>
                        </div>
                        <div>
                            <button class="btn btn-outline" style="color:var(--danger); border-color:var(--border-color); padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                onclick="window.GarageLK.deleteBreakdownHistory(${b.id})" unique-id="delete-history-btn-${b.id}">
                                <i class="fa-solid fa-trash-can"></i> Delete
                            </button>
                        </div>
                    `;
                    list.appendChild(item);
                });
            } catch (err) {
                console.error("Error loading completed history:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading completed history.</p>';
            }
        },

        async deleteBreakdownHistory(id) {
            if (!confirm('Are you sure you want to delete this rescue from your history?')) return;
            try {
                const res = await fetch(`/api/breakdowns/${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    this.showToast('History item deleted.', 'success');
                    this.loadOwnerBreakdownHistory();
                } else {
                    const data = await res.json();
                    this.showToast(data.message || 'Delete failed', 'error');
                }
            } catch (err) {
                console.error("Error deleting history item:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async clearAllBreakdownHistory() {
            if (!confirm('Are you sure you want to clear ALL completed rescue history? This action cannot be undone.')) return;
            try {
                const res = await fetch('/api/breakdowns/history/clear', {
                    method: 'DELETE'
                });
                if (res.ok) {
                    this.showToast('All rescue history cleared.', 'success');
                    this.loadOwnerBreakdownHistory();
                } else {
                    const data = await res.json();
                    this.showToast(data.message || 'Clear failed', 'error');
                }
            } catch (err) {
                console.error("Error clearing history:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async loadOwnerMechanics() {
            const garageId = document.getElementById('owner-mechanics-garage-select') ? document.getElementById('owner-mechanics-garage-select').value : '';
            const list = document.getElementById('owner-mechanics-list');
            if (!list) return;

            const btnAdd = document.getElementById('btn-add-mechanic');

            if (!garageId) {
                list.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:2rem;">Please select a garage to manage mechanics.</p>';
                if (btnAdd) btnAdd.style.display = 'none';
                return;
            }

            if (btnAdd) btnAdd.style.display = 'inline-flex';
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading mechanics...</p>';

            try {
                const res = await fetch(`/api/mechanics?garageId=${garageId}`);
                const mechanics = await res.json();
                if (!res.ok) throw new Error();

                this.ownerMechanics = mechanics;

                if (mechanics.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No mechanics registered yet. Click "Add Mechanic" to build your team.</p>';
                    return;
                }

                list.innerHTML = '';
                mechanics.forEach(m => {
                    const item = document.createElement('div');
                    item.className = 'table-item';

                    let statusBadgeClass = 'badge-pending';
                    if (m.status === 'AVAILABLE') {
                        statusBadgeClass = 'badge-approved';
                    } else if (m.status === 'ON_RESCUE') {
                        statusBadgeClass = 'badge-completed';
                    }

                    item.innerHTML = `
                        <div style="flex:1;">
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:4px;">
                                <h4 style="font-weight:700; color:var(--text-main);">${m.name}</h4>
                                <span class="badge ${statusBadgeClass}">${m.status}</span>
                            </div>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                <i class="fa-solid fa-phone"></i> <strong>Phone:</strong> ${m.phone}
                            </p>
                            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">
                                <i class="fa-solid fa-screwdriver-wrench"></i> <strong>Specialization:</strong> ${m.specialization || 'General Technician'}
                            </p>
                        </div>
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            <button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                onclick="window.GarageLK.openEditMechanicModal(${m.id})" unique-id="edit-mechanic-btn-${m.id}">
                                <i class="fa-solid fa-pen-to-square"></i> Edit
                            </button>
                            <button class="btn btn-outline" style="color:var(--danger); border-color:var(--border-color); padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                onclick="window.GarageLK.handleDeleteMechanic(${m.id})" unique-id="delete-mechanic-btn-${m.id}">
                                <i class="fa-solid fa-trash-can"></i> Delete
                            </button>
                        </div>
                    `;
                    list.appendChild(item);
                });
            } catch (err) {
                console.error("Error loading mechanics:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading mechanics list.</p>';
            }
        },

        openAddMechanicModal() {
            document.getElementById('mechanic-id').value = '';
            document.getElementById('mechanic-name').value = '';
            document.getElementById('mechanic-phone').value = '';
            document.getElementById('mechanic-specialization').value = '';
            document.getElementById('mechanic-status').value = 'AVAILABLE';
            document.getElementById('modal-mechanic-title').innerHTML = '<i class="fa-solid fa-user-plus"></i> Add Mechanic';
            this.openModal('modal-mechanic');
        },

        openEditMechanicModal(id) {
            const m = this.ownerMechanics.find(x => x.id == id);
            if (!m) return;

            document.getElementById('mechanic-id').value = m.id;
            document.getElementById('mechanic-name').value = m.name;
            document.getElementById('mechanic-phone').value = m.phone;
            document.getElementById('mechanic-specialization').value = m.specialization || '';
            document.getElementById('mechanic-status').value = m.status;
            document.getElementById('modal-mechanic-title').innerHTML = '<i class="fa-solid fa-user-gear"></i> Edit Mechanic';
            this.openModal('modal-mechanic');
        },

        async submitMechanicForm(e) {
            e.preventDefault();
            const id = document.getElementById('mechanic-id').value;
            const name = document.getElementById('mechanic-name').value.trim();
            const phone = document.getElementById('mechanic-phone').value.trim();
            const specialization = document.getElementById('mechanic-specialization').value.trim();
            const status = document.getElementById('mechanic-status').value;
            const garageId = document.getElementById('owner-mechanics-garage-select').value;

            const payload = { name, phone, specialization, status, garageId: parseInt(garageId) };
            const url = id ? `/api/mechanics/${id}` : '/api/mechanics';
            const method = id ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    this.showToast(data.message || 'Mechanic saved successfully', 'success');
                    this.closeModal('modal-mechanic');
                    this.loadOwnerMechanics();
                } else {
                    this.showToast(data.message || 'Action failed', 'error');
                }
            } catch (err) {
                console.error("Error saving mechanic:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async handleDeleteMechanic(id) {
            if (!confirm('Are you sure you want to delete this mechanic?')) return;
            try {
                const res = await fetch(`/api/mechanics/${id}`, {
                    method: 'DELETE'
                });
                const data = await res.json();
                if (res.ok) {
                    this.showToast('Mechanic deleted successfully.', 'success');
                    this.loadOwnerMechanics();
                } else {
                    this.showToast(data.message || 'Delete failed', 'error');
                }
            } catch (err) {
                console.error("Error deleting mechanic:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async openAcceptBreakdownModal(requestId, city) {
            document.getElementById('accept-breakdown-id').value = requestId;

            // Populate dropdown with owner's approved garages in this specific city
            const select = document.getElementById('accept-breakdown-garage-select');
            select.innerHTML = '<option value="">-- Select Garage --</option>';

            const mechSelect = document.getElementById('accept-breakdown-mechanic-select');
            if (mechSelect) mechSelect.innerHTML = '<option value="">-- Select Mechanic --</option>';

            try {
                const res = await fetch('/api/garages/my');
                const garages = await res.json();

                const matchedGarages = garages.filter(g => g.status === 'APPROVED' && g.city.toLowerCase() === city.toLowerCase());
                matchedGarages.forEach(g => {
                    select.innerHTML += `<option value="${g.id}">${g.name}</option>`;
                });

                this.openModal('modal-accept-breakdown');
            } catch (err) {
                console.error("Error loading dispatching garages:", err);
                this.showToast('Error loading dispatching garages', 'error');
            }
        },

        async loadDispatchMechanicsDropdown() {
            const garageId = document.getElementById('accept-breakdown-garage-select').value;
            const select = document.getElementById('accept-breakdown-mechanic-select');
            if (!select) return;

            select.innerHTML = '<option value="">-- Select Mechanic --</option>';
            if (!garageId) return;

            try {
                const res = await fetch(`/api/mechanics/available?garageId=${garageId}`);
                const mechanics = await res.json();
                if (res.ok) {
                    if (mechanics.length === 0) {
                        select.innerHTML = '<option value="">-- No available mechanics --</option>';
                    } else {
                        mechanics.forEach(m => {
                            select.innerHTML += `<option value="${m.id}">${m.name} (${m.specialization || 'General'})</option>`;
                        });
                    }
                }
            } catch (err) {
                console.error("Error loading available mechanics:", err);
            }
        },

        async confirmAcceptBreakdown(e) {
            e.preventDefault();
            const id = document.getElementById('accept-breakdown-id').value;
            const garageId = document.getElementById('accept-breakdown-garage-select').value;
            const mechanicId = document.getElementById('accept-breakdown-mechanic-select').value;

            if (!garageId) return;
            if (!mechanicId) {
                this.showToast('Please select a mechanic for the dispatch', 'error');
                return;
            }

            try {
                const res = await fetch(`/api/breakdowns/${id}/accept`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        garageId: parseInt(garageId),
                        mechanicId: parseInt(mechanicId)
                    })
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
                console.error("Error accepting breakdown:", err);
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
                console.error("Error completing breakdown:", err);
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

                const shopsRes = await fetch('/api/shops/all');
                const shops = await shopsRes.ok ? await shopsRes.json() : [];

                const bookingsRes = await fetch('/api/bookings/my'); // Admin gets all bookings
                const bookings = await bookingsRes.json();

                const breakdownsRes = await fetch('/api/breakdowns/all');
                const breakdowns = await breakdownsRes.json();

                const mechanicsRes = await fetch('/api/mechanics/all');
                const mechanics = mechanicsRes.ok ? await mechanicsRes.json() : [];

                const usersRes = await fetch('/api/auth/users');
                const users = usersRes.ok ? await usersRes.json() : [];

                // Store raw data for client-side filtering
                this.adminRawData = { garages, shops, bookings, breakdowns, mechanics, users };

                // Compute system-wide static counts
                document.getElementById('admin-stat-garages').textContent = garages.length;
                const shopStatEl = document.getElementById('admin-stat-shops');
                if (shopStatEl) {
                    shopStatEl.textContent = shops.length;
                }

                const userStatEl = document.getElementById('admin-stat-users');
                if (userStatEl) {
                    userStatEl.textContent = users.length;
                }

                // Sync controls and trigger client-side date filter rendering
                this.applyAdminDateFilter();

            } catch (err) {
                console.error("Error loading admin monitor logs:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading monitor logs.</p>';
            }
        },

        renderAdminBreakdownsList(breakdowns) {
            const list = document.getElementById('admin-breakdowns-list');
            if (!list) return;

            if (breakdowns.length === 0) {
                list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No emergency assist logs recorded for this selection.</p>';
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
                    detailHtml = `<span style="color:var(--success); font-size:0.85rem;"><i class="fa-solid fa-circle-check"></i> Resolved by ${b.acceptedBy ? `${b.acceptedBy.name} (${b.acceptedBy.phone || 'N/A'})` : 'Customer'}</span>`;
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
                            <strong>Vehicle:</strong> ${b.vehicleNo} &bull; <strong>Phone:</strong> ${b.contactPhone} <br>
                            ${b.assignedMechanic ? `<strong>Mechanic:</strong> ${b.assignedMechanic.name} (${b.assignedMechanic.phone}) <br>` : ''}
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
        },

        handleAdminDateFilterTypeChange() {
            const typeVal = document.getElementById('admin-date-filter-type').value;
            const dayGroup = document.getElementById('admin-date-picker-group');
            const monthGroup = document.getElementById('admin-month-picker-group');
            
            if (typeVal === 'ALL') {
                if (dayGroup) dayGroup.style.display = 'none';
                if (monthGroup) monthGroup.style.display = 'none';
            } else if (typeVal === 'DAY') {
                if (dayGroup) dayGroup.style.display = 'inline-flex';
                if (monthGroup) monthGroup.style.display = 'none';
                const dayPicker = document.getElementById('admin-date-picker');
                if (dayPicker && !dayPicker.value) {
                    dayPicker.value = new Date().toISOString().split('T')[0];
                }
            } else if (typeVal === 'MONTH') {
                if (dayGroup) dayGroup.style.display = 'none';
                if (monthGroup) monthGroup.style.display = 'inline-flex';
                const monthPicker = document.getElementById('admin-month-picker');
                if (monthPicker && !monthPicker.value) {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    monthPicker.value = `${year}-${month}`;
                }
            }
            this.applyAdminDateFilter();
        },

        applyAdminDateFilter() {
            if (!this.adminRawData || !this.adminRawData.bookings) return;

            const filterType = document.getElementById('admin-date-filter-type').value;
            let filteredBookings = [...this.adminRawData.bookings];
            let filteredBreakdowns = [...this.adminRawData.breakdowns];

            if (filterType === 'DAY') {
                const selectedDay = document.getElementById('admin-date-picker').value;
                if (selectedDay) {
                    filteredBookings = filteredBookings.filter(b => {
                        const bDate = b.bookingDate ? b.bookingDate.substring(0, 10) : '';
                        return bDate === selectedDay;
                    });
                    filteredBreakdowns = filteredBreakdowns.filter(b => {
                        const bDate = b.createdAt ? b.createdAt.substring(0, 10) : '';
                        return bDate === selectedDay;
                    });
                }
            } else if (filterType === 'MONTH') {
                const selectedMonth = document.getElementById('admin-month-picker').value;
                if (selectedMonth) {
                    filteredBookings = filteredBookings.filter(b => {
                        const bDate = b.bookingDate ? b.bookingDate.substring(0, 7) : '';
                        return bDate === selectedMonth;
                    });
                    filteredBreakdowns = filteredBreakdowns.filter(b => {
                        const bDate = b.createdAt ? b.createdAt.substring(0, 7) : '';
                        return bDate === selectedMonth;
                    });
                }
            }

            // Update stats cards in UI
            document.getElementById('admin-stat-bookings').textContent = filteredBookings.length;
            const activeBreakdowns = filteredBreakdowns.filter(b => b.status !== 'COMPLETED').length;
            document.getElementById('admin-stat-breakdowns').textContent = activeBreakdowns;

            // Render filtered charts
            this.renderAdminMonitorCharts(filteredBreakdowns, this.adminRawData.garages, this.adminRawData.shops, this.adminRawData.mechanics);

            // Render filtered breakdowns list
            this.renderAdminBreakdownsList(filteredBreakdowns);
        },

        exportAdminMonitorToExcel() {
            if (!this.adminRawData) {
                this.showToast("No data to export", "error");
                return;
            }

            const filterTypeVal = document.getElementById('admin-date-filter-type').value;
            let dateStr = "All_Time";
            let filteredBookings = [...this.adminRawData.bookings];
            let filteredBreakdowns = [...this.adminRawData.breakdowns];

            if (filterTypeVal === 'DAY') {
                const selectedDay = document.getElementById('admin-date-picker').value;
                if (selectedDay) {
                    dateStr = selectedDay;
                    filteredBookings = filteredBookings.filter(b => (b.bookingDate ? b.bookingDate.substring(0, 10) : '') === selectedDay);
                    filteredBreakdowns = filteredBreakdowns.filter(b => (b.createdAt ? b.createdAt.substring(0, 10) : '') === selectedDay);
                }
            } else if (filterTypeVal === 'MONTH') {
                const selectedMonth = document.getElementById('admin-month-picker').value;
                if (selectedMonth) {
                    dateStr = selectedMonth;
                    filteredBookings = filteredBookings.filter(b => (b.bookingDate ? b.bookingDate.substring(0, 7) : '') === selectedMonth);
                    filteredBreakdowns = filteredBreakdowns.filter(b => (b.createdAt ? b.createdAt.substring(0, 7) : '') === selectedMonth);
                }
            }

            // Map overview stats to key-value rows
            const overviewRows = [
                { "Metric": "Report Date / Range", "Value": dateStr },
                { "Metric": "Total Registered Users", "Value": this.adminRawData.users ? this.adminRawData.users.length : 0 },
                { "Metric": "Total Registered Garages", "Value": this.adminRawData.garages ? this.adminRawData.garages.length : 0 },
                { "Metric": "Total Spare Part Shops", "Value": this.adminRawData.shops ? this.adminRawData.shops.length : 0 },
                { "Metric": "Total Mechanics Team", "Value": this.adminRawData.mechanics ? this.adminRawData.mechanics.length : 0 },
                { "Metric": "Appointment Bookings (Filtered)", "Value": filteredBookings.length },
                { "Metric": "Emergency Assists (Filtered)", "Value": filteredBreakdowns.length }
            ];

            // Map breakdowns to nice rows
            const breakdownRows = filteredBreakdowns.map(b => ({
                "Request ID": b.id,
                "Customer Name": b.user ? (b.user.fullName || b.user.username) : "N/A",
                "Contact Phone": b.contactPhone || "N/A",
                "Vehicle No": b.vehicleNo || "N/A",
                "Address": b.address || "N/A",
                "City": b.city || "N/A",
                "Description": b.description || "N/A",
                "Status": b.status || "N/A",
                "Dispatched Garage": b.acceptedBy ? (b.acceptedBy.garageName || b.acceptedBy.name) : "N/A",
                "Assigned Mechanic": b.assignedMechanic ? b.assignedMechanic.name : "N/A",
                "Created Time": b.createdAt ? new Date(b.createdAt).toLocaleString() : "N/A"
            }));

            // Map bookings to nice rows
            const bookingRows = filteredBookings.map(b => ({
                "Booking ID": b.id,
                "Customer Name": b.user ? (b.user.fullName || b.user.username) : "N/A",
                "Vehicle No": b.vehicleNo || "N/A",
                "Garage Name": b.garage ? (b.garage.garageName || b.garage.name) : "N/A",
                "Service Type": b.serviceType || "N/A",
                "Date": b.bookingDate || "N/A",
                "Time Slot": b.timeSlot || "N/A",
                "Price (LKR)": b.price || 0.0,
                "Status": b.status || "N/A",
                "Notes": b.notes || ""
            }));

            // Map users to nice rows
            const userRows = (this.adminRawData.users || []).map(u => ({
                "User ID": u.id,
                "Username": u.username || "N/A",
                "Full Name": u.fullName || "N/A",
                "Email": u.email || "N/A",
                "Phone": u.phone || "N/A",
                "Role": u.role || "N/A",
                "Status": u.active ? "Active" : "Suspended"
            }));

            // Map garages to nice rows
            const garageRows = (this.adminRawData.garages || []).map(g => ({
                "Garage ID": g.id,
                "Garage Name": g.garageName || g.name || "N/A",
                "Owner Name": g.ownerName || (g.owner ? (g.owner.fullName || g.owner.username) : "N/A"),
                "District": g.district || "N/A",
                "City": g.city || "N/A",
                "Address": g.address || "N/A",
                "Phone": g.phone || "N/A",
                "Email": g.email || "N/A",
                "Status": g.status || "N/A",
                "Vehicle Specializations": g.vehicleTypes || "N/A",
                "Engine Specializations": g.engineTypes || "N/A"
            }));

            // Map shops to nice rows
            const shopRows = (this.adminRawData.shops || []).map(s => ({
                "Shop ID": s.id,
                "Shop Name": s.shopName || s.name || "N/A",
                "Owner Name": s.ownerName || (s.user ? (s.user.fullName || s.user.username) : "N/A"),
                "District": s.district || "N/A",
                "City": s.city || "N/A",
                "Address": s.address || "N/A",
                "Phone": s.phone || "N/A",
                "Email": s.email || "N/A",
                "Status": s.status || "N/A"
            }));

            // Map mechanics to nice rows
            const mechanicRows = (this.adminRawData.mechanics || []).map(m => {
                let garageName = "N/A";
                if (m.garageId && this.adminRawData.garages) {
                    const gar = this.adminRawData.garages.find(g => g.id === m.garageId);
                    if (gar) {
                        garageName = gar.garageName || gar.name;
                    }
                }
                return {
                    "Mechanic ID": m.id,
                    "Name": m.name || "N/A",
                    "Phone": m.phone || "N/A",
                    "Specialization": m.specialization || "N/A",
                    "Status": m.status || "N/A",
                    "Assigned Garage": garageName
                };
            });

            // Use SheetJS to build workbook
            const wb = XLSX.utils.book_new();

            const wsOverview = XLSX.utils.json_to_sheet(overviewRows);
            XLSX.utils.book_append_sheet(wb, wsOverview, "System Overview");
            
            const wsBreakdowns = XLSX.utils.json_to_sheet(breakdownRows);
            XLSX.utils.book_append_sheet(wb, wsBreakdowns, "Breakdown Requests");

            const wsBookings = XLSX.utils.json_to_sheet(bookingRows);
            XLSX.utils.book_append_sheet(wb, wsBookings, "Appointments Bookings");

            const wsUsers = XLSX.utils.json_to_sheet(userRows);
            XLSX.utils.book_append_sheet(wb, wsUsers, "Registered Users");

            const wsGarages = XLSX.utils.json_to_sheet(garageRows);
            XLSX.utils.book_append_sheet(wb, wsGarages, "Garages Directory");

            const wsShops = XLSX.utils.json_to_sheet(shopRows);
            XLSX.utils.book_append_sheet(wb, wsShops, "Spare Part Shops");

            const wsMechanics = XLSX.utils.json_to_sheet(mechanicRows);
            XLSX.utils.book_append_sheet(wb, wsMechanics, "Mechanics Directory");

            // Write workbook to file
            XLSX.writeFile(wb, `GarageLK_System_Monitor_Report_${dateStr}.xlsx`);
            this.showToast("Excel report downloaded successfully!", "success");
        },

        downloadAdminMonitorAsPDF() {
            const element = document.getElementById('section-admin-monitor');
            if (!element) return;

            const filterType = document.getElementById('admin-date-filter-type').value;
            let dateStr = "All_Time";
            if (filterType === 'DAY') {
                dateStr = document.getElementById('admin-date-picker').value;
            } else if (filterType === 'MONTH') {
                dateStr = document.getElementById('admin-month-picker').value;
            }

            this.showToast("Generating PDF report...", "info");

            const opt = {
                margin: [0.5, 0.5, 0.5, 0.5], // in inches
                filename: `GarageLK_System_Monitor_${dateStr}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true,
                    backgroundColor: '#0f172a' // Dark mode background to match dark mode aesthetics
                },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(element).save()
                .then(() => {
                    this.showToast("PDF report downloaded successfully!", "success");
                })
                .catch(err => {
                    console.error("PDF generation failed:", err);
                    this.showToast("PDF generation failed", "error");
                });
        },

        renderAdminMonitorCharts(breakdowns, garages, shops, mechanics) {
            const getCssVar = (name) => getComputedStyle(document.documentElement || document.body).getPropertyValue(name).trim();

            const breakdownCanvas = document.getElementById('chart-breakdown-status');
            const providersCanvas = document.getElementById('chart-providers-overview');
            const breakdownsByCityCanvas = document.getElementById('chart-breakdowns-by-city');

            if (this.breakdownChart) {
                this.breakdownChart.destroy();
                this.breakdownChart = null;
            }
            if (this.providersChart) {
                this.providersChart.destroy();
                this.providersChart = null;
            }
            if (this.breakdownsByCityChart) {
                this.breakdownsByCityChart.destroy();
                this.breakdownsByCityChart = null;
            }

            if (breakdownCanvas) {
                const pendingCount = breakdowns.filter(b => b.status === 'PENDING').length;
                const dispatchedCount = breakdowns.filter(b => b.status === 'ACCEPTED').length;
                const resolvedCount = breakdowns.filter(b => b.status === 'COMPLETED').length;

                this.breakdownChart = new Chart(breakdownCanvas, {
                    type: 'doughnut',
                    data: {
                        labels: ['Pending Dispatch', 'Dispatched', 'Resolved'],
                        datasets: [{
                            data: [pendingCount, dispatchedCount, resolvedCount],
                            backgroundColor: [
                                getCssVar('--color-warning') || '#f59e0b',
                                getCssVar('--color-customer') || '#3b82f6',
                                getCssVar('--color-garage') || '#10b981'
                            ],
                            borderColor: getCssVar('--bg-card') || 'rgba(17, 24, 39, 0.7)',
                            borderWidth: 2,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: getCssVar('--text-primary') || '#f3f4f6',
                                    font: {
                                        family: 'Outfit',
                                        size: 11
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const val = context.raw || 0;
                                        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                        return ` ${context.label}: ${val} (${pct}%)`;
                                    }
                                }
                            }
                        },
                        cutout: '70%'
                    }
                });
            }

            if (providersCanvas) {
                this.providersChart = new Chart(providersCanvas, {
                    type: 'bar',
                    data: {
                        labels: ['Garages', 'Shops', 'Mechanics'],
                        datasets: [{
                            label: 'Registered Providers',
                            data: [garages.length, shops.length, mechanics.length],
                            backgroundColor: [
                                getCssVar('--color-garage') || '#10b981',
                                getCssVar('--color-admin') || '#8b5cf6',
                                getCssVar('--color-primary') || '#00f2fe'
                            ],
                            borderRadius: 6,
                            borderWidth: 0,
                            barThickness: 30
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return ` Total: ${context.raw}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    color: getCssVar('--text-secondary') || '#9ca3af',
                                    font: {
                                        family: 'Outfit',
                                        size: 11
                                    }
                                }
                            },
                            y: {
                                grid: {
                                    color: getCssVar('--border-color') || 'rgba(255, 255, 255, 0.08)'
                                },
                                ticks: {
                                    color: getCssVar('--text-secondary') || '#9ca3af',
                                    font: {
                                        family: 'Outfit',
                                        size: 11
                                    },
                                    stepSize: 1,
                                    beginAtZero: true
                                }
                            }
                        }
                    }
                });
            }

            if (breakdownsByCityCanvas) {
                const cityCounts = {};
                breakdowns.forEach(b => {
                    if (b.city) {
                        const cityName = b.city.trim();
                        const formattedName = cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();
                        cityCounts[formattedName] = (cityCounts[formattedName] || 0) + 1;
                    }
                });

                let cities = Object.keys(cityCounts).sort((a, b) => cityCounts[b] - cityCounts[a]);
                if (cities.length === 0) {
                    cities = ['Colombo', 'Kandy', 'Galle', 'Kurunegala'];
                }
                const chartData = cities.map(city => cityCounts[city] || 0);

                const baseColors = [
                    '#f87171', // soft red
                    '#fb923c', // soft orange
                    '#fbbf24', // soft yellow
                    '#38bdf8', // soft blue
                    '#a855f7', // soft purple
                    '#4ade80', // soft green
                    '#f472b6', // soft pink
                    '#2dd4bf', // soft teal
                    '#60a5fa'  // soft indigo
                ];

                this.breakdownsByCityChart = new Chart(breakdownsByCityCanvas, {
                    type: 'bar',
                    data: {
                        labels: cities,
                        datasets: [{
                            label: 'Number of Requests',
                            data: chartData,
                            backgroundColor: cities.map((_, i) => baseColors[i % baseColors.length]),
                            borderRadius: 6,
                            borderWidth: 0,
                            barThickness: 18
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return ` Requests: ${context.raw}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: {
                                    color: getCssVar('--border-color') || 'rgba(255, 255, 255, 0.08)'
                                },
                                ticks: {
                                    color: getCssVar('--text-secondary') || '#9ca3af',
                                    font: {
                                        family: 'Outfit',
                                        size: 11
                                    },
                                    stepSize: 1,
                                    beginAtZero: true
                                }
                            },
                            y: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    color: getCssVar('--text-secondary') || '#9ca3af',
                                    font: {
                                        family: 'Outfit',
                                        size: 11,
                                        weight: '600'
                                    }
                                }
                            }
                        }
                    }
                });
            }
        },

        async loadAdminUsers(roleFilter = 'ALL') {
            const list = document.getElementById('admin-users-list');
            if (!list) return;
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading users...</p>';

            try {
                const res = await fetch('/api/auth/users');
                if (!res.ok) throw new Error("Failed to fetch users");
                let users = await res.json();

                if (roleFilter && roleFilter !== 'ALL') {
                    users = users.filter(u => u.role === roleFilter);
                }

                if (users.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No users found matching the filter.</p>';
                    return;
                }

                list.innerHTML = '';
                users.forEach(u => {
                    const item = document.createElement('div');
                    item.className = 'table-item';

                    const initials = u.fullName ?
                        u.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() :
                        u.username.substring(0, 2).toUpperCase();

                    const isSelf = this.currentUser && this.currentUser.id === u.id;

                    const statusBadgeClass = u.active ? 'badge-approved' : 'badge-cancelled';
                    const statusText = u.active ? 'Active' : 'Suspended';

                    // Actions HTML
                    let actionHtml = '';
                    if (isSelf) {
                        actionHtml = `<span style="color:var(--text-muted); font-size:0.85rem; font-style:italic;"><i class="fa-solid fa-user-shield"></i> You (Admin)</span>`;
                    } else {
                        const toggleBtnText = u.active ? 'Deactivate' : 'Activate';
                        const toggleBtnIcon = u.active ? 'fa-ban' : 'fa-check';
                        const toggleColor = u.active ? 'var(--warning)' : 'var(--success)';
                        
                        actionHtml = `
                            <button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem; color:${toggleColor}; border-color:${toggleColor};" 
                                onclick="window.GarageLK.toggleUser(${u.id})" unique-id="toggle-user-btn-${u.id}">
                                <i class="fa-solid ${toggleBtnIcon}"></i> ${toggleBtnText}
                            </button>
                            <button class="btn btn-danger" style="padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                onclick="window.GarageLK.handleDeleteUser(${u.id})" unique-id="delete-user-btn-${u.id}">
                                <i class="fa-solid fa-trash"></i> Delete
                            </button>
                        `;
                    }

                    item.innerHTML = `
                        <div style="display:flex; gap:1.25rem; align-items:center; flex:1;">
                            <div class="user-avatar" style="width:48px; height:48px; min-width:48px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.1rem; box-shadow:var(--shadow-sm);">
                                ${initials}
                            </div>
                            <div>
                                <h4 style="font-weight:700; margin-bottom:2px; display:flex; align-items:center; gap:0.5rem;">
                                    ${u.fullName || u.username}
                                    <span class="badge ${statusBadgeClass}" style="font-size:0.7rem; padding:0.15rem 0.4rem; vertical-align:middle;">${statusText}</span>
                                </h4>
                                <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:2px; line-height:1.4;">
                                    <i class="fa-solid fa-user" style="width:16px;"></i> Username: <strong>${u.username}</strong> &bull; <i class="fa-solid fa-envelope" style="width:16px;"></i> ${u.email}
                                </p>
                                <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4;">
                                    <i class="fa-solid fa-phone" style="width:16px;"></i> Phone: ${u.phone || 'N/A'} &bull; <i class="fa-solid fa-id-badge" style="width:16px;"></i> Role: <strong style="color:var(--secondary);">${u.role}</strong>
                                </p>
                            </div>
                        </div>
                        <div style="display:flex; gap:0.5rem; align-items:center; justify-content:flex-end; min-width:200px;">
                            ${actionHtml}
                        </div>
                    `;
                    list.appendChild(item);
                });
            } catch (err) {
                console.error("Error loading admin users:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading users.</p>';
            }
        },

        async toggleUser(userId) {
            try {
                const res = await fetch(`/api/garages/admin/toggle-user/${userId}`, { method: 'POST' });
                if (!res.ok) throw new Error("Toggle status failed");
                const data = await res.json();
                const msg = data.active ? 'User account has been activated.' : 'User account has been deactivated/suspended.';
                this.showToast(msg, 'success');
                const filterSelect = document.getElementById('admin-user-filter');
                const currentFilter = filterSelect ? filterSelect.value : 'ALL';
                this.loadAdminUsers(currentFilter);
            } catch (err) {
                console.error("Error toggling user:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async handleDeleteUser(userId) {
            if (!confirm("WARNING: Are you sure you want to permanently delete this user?\n\nThis will also cascade delete all their registered garages, spare part shops, mechanic records, services, spare parts inventory, reviews, bookings, and emergency assist logs permanently! This action cannot be undone.")) {
                return;
            }
            try {
                const res = await fetch(`/api/auth/users/${userId}`, { method: 'DELETE' });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || "Deletion failed");
                }
                const data = await res.json();
                this.showToast(data.message || "User deleted successfully", "success");
                const filterSelect = document.getElementById('admin-user-filter');
                const currentFilter = filterSelect ? filterSelect.value : 'ALL';
                this.loadAdminUsers(currentFilter);
            } catch (err) {
                console.error("Error deleting user:", err);
                this.showToast(err.message || 'Connection error', 'error');
            }
        },

        resetAdminUserFilter() {
            const filterSelect = document.getElementById('admin-user-filter');
            if (filterSelect) {
                filterSelect.value = 'ALL';
            }
            this.handleAdminUserFilterChange();
        },

        handleAdminUserFilterChange() {
            const filterValue = document.getElementById('admin-user-filter').value;
            const contentUsers = document.getElementById('admin-users-tab-content');
            const contentMechanics = document.getElementById('admin-mechanics-tab-content');

            if (!contentUsers || !contentMechanics) return;

            // Show/hide Add Admin button
            const addAdminBtn = document.getElementById('btn-add-admin');
            if (addAdminBtn) {
                if (filterValue === 'ADMIN') {
                    addAdminBtn.style.display = 'block';
                } else {
                    addAdminBtn.style.display = 'none';
                }
            }

            if (filterValue === 'MECHANIC') {
                contentUsers.style.display = 'none';
                contentMechanics.style.display = 'block';
                this.loadAdminMechanics();
            } else {
                contentUsers.style.display = 'block';
                contentMechanics.style.display = 'none';
                this.loadAdminUsers(filterValue);
            }
        },

        openAddAdminModal() {
            document.getElementById('admin-reg-username').value = '';
            document.getElementById('admin-reg-password').value = '';
            document.getElementById('admin-reg-fullname').value = '';
            document.getElementById('admin-reg-email').value = '';
            document.getElementById('admin-reg-phone').value = '';
            this.openModal('modal-add-admin');
        },

        async submitAdminForm(event) {
            event.preventDefault();
            const username = document.getElementById('admin-reg-username').value;
            const password = document.getElementById('admin-reg-password').value;
            const fullName = document.getElementById('admin-reg-fullname').value;
            const email = document.getElementById('admin-reg-email').value;
            const phone = document.getElementById('admin-reg-phone').value;

            try {
                const res = await fetch('/api/auth/register/admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, fullName, email, phone })
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || 'Failed to register admin');
                }

                this.showToast('Administrator registered successfully', 'success');
                this.closeModal('modal-add-admin');
                this.loadAdminUsers('ADMIN');
            } catch (err) {
                console.error("Error creating admin:", err);
                this.showToast(err.message || 'Connection error', 'error');
            }
        },

        loadUserProfile() {
            if (!this.currentUser) return;
            document.getElementById('profile-username').value = this.currentUser.username || '';
            document.getElementById('profile-fullname').value = this.currentUser.fullName || '';
            document.getElementById('profile-email').value = this.currentUser.email || '';
            document.getElementById('profile-phone').value = this.currentUser.phone || '';
            document.getElementById('profile-password').value = '';
        },

        async submitUserProfileForm(event) {
            event.preventDefault();
            const fullName = document.getElementById('profile-fullname').value;
            const email = document.getElementById('profile-email').value;
            const phone = document.getElementById('profile-phone').value;
            const password = document.getElementById('profile-password').value;

            try {
                const res = await fetch('/api/auth/profile/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullName, email, phone, password })
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || 'Failed to update profile');
                }

                const updatedUser = await res.json();
                this.currentUser = updatedUser;
                this.showToast('Profile updated successfully', 'success');
                this.updateNavUI();
                this.buildDashboardSidebar();
                this.loadUserProfile();
            } catch (err) {
                console.error("Error updating profile:", err);
                this.showToast(err.message || 'Connection error', 'error');
            }
        },

        async loadAdminMechanics() {
            const list = document.getElementById('admin-mechanics-list');
            if (!list) return;
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading mechanics...</p>';

            try {
                const res = await fetch('/api/mechanics/all');
                if (!res.ok) throw new Error("Failed to fetch mechanics");
                const mechanics = await res.json();

                if (mechanics.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No mechanics found in the system.</p>';
                    return;
                }

                list.innerHTML = '';
                mechanics.forEach(m => {
                    const item = document.createElement('div');
                    item.className = 'table-item';

                    const statusBadgeClass = m.status === 'AVAILABLE' ? 'badge-approved' : 'badge-pending';
                    const statusText = m.status === 'AVAILABLE' ? 'Available' : 'On Rescue';

                    const activeBadgeClass = m.active ? 'badge-approved' : 'badge-cancelled';
                    const activeText = m.active ? 'Active' : 'Suspended';

                    // Actions HTML
                    const toggleBtnText = m.active ? 'Deactivate' : 'Activate';
                    const toggleBtnIcon = m.active ? 'fa-ban' : 'fa-check';
                    const toggleColor = m.active ? 'var(--warning)' : 'var(--success)';

                    item.innerHTML = `
                        <div style="display:flex; gap:1.25rem; align-items:center; flex:1;">
                            <div class="user-avatar" style="width:48px; height:48px; min-width:48px; border-radius:50%; background:var(--secondary); color:white; display:flex; align-items:center; justify-content:center; font-size:1.2rem; box-shadow:var(--shadow-sm);">
                                <i class="fa-solid fa-wrench"></i>
                            </div>
                            <div>
                                <h4 style="font-weight:700; margin-bottom:2px; display:flex; align-items:center; gap:0.5rem;">
                                    ${m.name}
                                    <span class="badge ${statusBadgeClass}" style="font-size:0.7rem; padding:0.15rem 0.4rem; vertical-align:middle;">${statusText}</span>
                                    <span class="badge ${activeBadgeClass}" style="font-size:0.7rem; padding:0.15rem 0.4rem; vertical-align:middle;">${activeText}</span>
                                </h4>
                                <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:2px; line-height:1.4;">
                                    <i class="fa-solid fa-phone" style="width:16px;"></i> Phone: <strong>${m.phone}</strong> &bull; <i class="fa-solid fa-screwdriver-wrench" style="width:16px;"></i> Specialization: ${m.specialization || 'General'}
                                </p>
                                <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4;">
                                    <i class="fa-solid fa-warehouse" style="width:16px;"></i> Garage: <strong style="color:var(--primary);">${m.garage ? m.garage.name : 'N/A'}</strong> (${m.garage ? m.garage.city : 'N/A'})
                                </p>
                            </div>
                        </div>
                        <div style="display:flex; gap:0.5rem; align-items:center; justify-content:flex-end; min-width:200px;">
                            <button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem; color:${toggleColor}; border-color:${toggleColor};" 
                                onclick="window.GarageLK.toggleMechanicActive(${m.id})" unique-id="toggle-mech-btn-${m.id}">
                                <i class="fa-solid ${toggleBtnIcon}"></i> ${toggleBtnText}
                            </button>
                            <button class="btn btn-danger" style="padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                onclick="window.GarageLK.handleDeleteMechanic(${m.id})" unique-id="delete-mechanic-btn-${m.id}">
                                <i class="fa-solid fa-trash"></i> Delete
                            </button>
                        </div>
                    `;
                    list.appendChild(item);
                });
            } catch (err) {
                console.error("Error loading admin mechanics:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading mechanics.</p>';
            }
        },

        async toggleMechanicActive(mechanicId) {
            try {
                const res = await fetch(`/api/mechanics/admin/toggle-active/${mechanicId}`, { method: 'POST' });
                if (!res.ok) throw new Error("Toggle status failed");
                const data = await res.json();
                const msg = data.active ? 'Mechanic account has been activated.' : 'Mechanic account has been deactivated/suspended.';
                this.showToast(msg, 'success');
                this.loadAdminMechanics();
            } catch (err) {
                console.error("Error toggling mechanic active:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async handleDeleteMechanic(mechanicId) {
            if (!confirm("Are you sure you want to permanently delete this mechanic profile?\n\nThis will unassign them from any active emergency breakdown rescue duties they are currently assigned to.")) {
                return;
            }
            try {
                const res = await fetch(`/api/mechanics/${mechanicId}`, { method: 'DELETE' });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || "Deletion failed");
                }
                const data = await res.json();
                this.showToast(data.message || "Mechanic deleted successfully", "success");
                this.loadAdminMechanics();
            } catch (err) {
                console.error("Error deleting mechanic:", err);
                this.showToast(err.message || 'Connection error', 'error');
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

        toggleGarageStatusDisplay(id, button) {
            const badge = document.getElementById(`garage-status-badge-${id}`);
            if (badge) {
                if (badge.style.display === 'none') {
                    badge.style.display = 'inline-block';
                    button.textContent = 'Hide Status';
                } else {
                    badge.style.display = 'none';
                    button.textContent = 'Show Status';
                }
            }
        },

        openEditGarageModal(id) {
            const g = this.ownerGarages.find(x => x.id == id);
            if (!g) return;

            // Populate edit modal fields
            document.getElementById('edit-garage-id').value = g.id;
            document.getElementById('edit-garage-name').value = g.name || g.garageName;
            document.getElementById('edit-garage-desc').value = g.description;
            document.getElementById('edit-garage-address').value = g.address;
            document.getElementById('edit-garage-city').value = g.city;
            document.getElementById('edit-garage-phone').value = g.phone || '';
            document.getElementById('edit-garage-email').value = g.email || '';
            document.getElementById('edit-garage-image').value = g.imageUrl || '';
            document.getElementById('edit-garage-lat').value = g.latitude || 6.9271;
            document.getElementById('edit-garage-lng').value = g.longitude || 79.8612;

            // Populate existing image preview
            const editPlaceholder = document.getElementById('edit-garage-image-placeholder');
            const editPreviewContainer = document.getElementById('edit-garage-image-preview-container');
            const editPreviewImg = document.getElementById('edit-garage-image-preview');
            const editFileInput = document.getElementById('edit-garage-image-file');

            if (editFileInput) editFileInput.value = ''; // Clear file input

            if (g.imageUrl) {
                if (editPreviewImg) editPreviewImg.src = g.imageUrl;
                if (editPlaceholder) editPlaceholder.style.display = 'none';
                if (editPreviewContainer) editPreviewContainer.style.display = 'block';
            } else {
                if (editPlaceholder) editPlaceholder.style.display = 'flex';
                if (editPreviewContainer) editPreviewContainer.style.display = 'none';
            }

            this.openModal('modal-edit-garage');
        },

        async handleUpdateGarage(e) {
            e.preventDefault();
            const id = document.getElementById('edit-garage-id').value;
            const name = document.getElementById('edit-garage-name').value.trim();
            const description = document.getElementById('edit-garage-desc').value.trim();
            const address = document.getElementById('edit-garage-address').value.trim();
            const city = document.getElementById('edit-garage-city').value;
            const phone = document.getElementById('edit-garage-phone').value.trim();
            const email = document.getElementById('edit-garage-email').value.trim();
            
            const fileInput = document.getElementById('edit-garage-image-file');
            let imageUrl = document.getElementById('edit-garage-image').value.trim();

            try {
                if (fileInput && fileInput.files && fileInput.files.length > 0) {
                    this.showToast('Uploading new image...', 'info');
                    imageUrl = await this.uploadFile(fileInput.files[0]);
                } else if (!imageUrl) {
                    this.showToast('Garage image is required.', 'error');
                    return;
                }

                const latitude = parseFloat(document.getElementById('edit-garage-lat').value);
                const longitude = parseFloat(document.getElementById('edit-garage-lng').value);

                const res = await fetch(`/api/garages/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name, description, address, city, phone, email, imageUrl, latitude, longitude
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Garage profile updated successfully! Pending admin approval.', 'success');
                    this.closeModal('modal-edit-garage');
                    this.removeSelectedImage(null, 'edit-garage-image-file', 'edit-garage-image-placeholder', 'edit-garage-image-preview-container', 'edit-garage-image');
                    this.loadOwnerGarages();
                } else {
                    this.showToast(data.message || 'Update failed', 'error');
                }
            } catch (err) {
                console.error("Error updating garage:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async handleDeleteGarage(id) {
            if (!confirm('Are you sure you want to delete this garage? This will permanently delete all associated services, reviews, and bookings.')) return;
            try {
                const res = await fetch(`/api/garages/${id}`, {
                    method: 'DELETE'
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Garage deleted successfully.', 'success');
                    this.loadOwnerGarages();
                } else {
                    this.showToast(data.message || 'Deletion failed', 'error');
                }
            } catch (err) {
                console.error("Error deleting garage:", err);
                this.showToast('Connection error', 'error');
            }
        },

        // --- IMAGE UPLOADS CONTROLLER ---
        initImageUploads() {
            this.setupDragAndDrop(
                'garage-image-zone',
                'garage-image-file',
                'garage-image-placeholder',
                'garage-image-preview-container',
                'garage-image-preview',
                'garage-image'
            );
            this.setupDragAndDrop(
                'edit-garage-image-zone',
                'edit-garage-image-file',
                'edit-garage-image-placeholder',
                'edit-garage-image-preview-container',
                'edit-garage-image-preview',
                'edit-garage-image'
            );
            this.setupDragAndDrop(
                'shop-image-zone',
                'shop-image-file',
                'shop-image-placeholder',
                'shop-image-preview-container',
                'shop-image-preview',
                'shop-image'
            );
            this.setupDragAndDrop(
                'part-image-zone',
                'part-image-file',
                'part-image-placeholder',
                'part-image-preview-container',
                'part-image-preview',
                'part-image'
            );
        },

        setupDragAndDrop(zoneId, fileInputId, placeholderId, previewContainerId, previewImgId, hiddenInputId) {
            const zone = document.getElementById(zoneId);
            const fileInput = document.getElementById(fileInputId);
            const placeholder = document.getElementById(placeholderId);
            const previewContainer = document.getElementById(previewContainerId);
            const previewImg = document.getElementById(previewImgId);
            const hiddenInput = document.getElementById(hiddenInputId);

            if (!zone || !fileInput) return;

            // Handle drag over
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('dragover');
            });

            // Handle drag leave
            zone.addEventListener('dragleave', () => {
                zone.classList.remove('dragover');
            });

            // Handle drop
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('dragover');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    fileInput.files = e.dataTransfer.files;
                    this.handleFileSelected(fileInput.files[0], placeholder, previewContainer, previewImg, hiddenInput);
                }
            });

            // Handle file input change
            fileInput.addEventListener('change', () => {
                if (fileInput.files && fileInput.files.length > 0) {
                    this.handleFileSelected(fileInput.files[0], placeholder, previewContainer, previewImg, hiddenInput);
                }
            });
        },

        handleFileSelected(file, placeholder, previewContainer, previewImg, hiddenInput) {
            if (!file) return;

            // Basic validation
            if (!file.type.startsWith('image/')) {
                this.showToast('Please select a valid image file.', 'error');
                return;
            }

            // Create object URL for preview
            const objectUrl = URL.createObjectURL(file);
            previewImg.src = objectUrl;
            placeholder.style.display = 'none';
            previewContainer.style.display = 'block';

            // Mark hidden input as "file-selected" to satisfy HTML5 required validation
            hiddenInput.value = 'file-selected';
        },

        removeSelectedImage(event, fileInputId, placeholderId, previewContainerId, hiddenInputId) {
            if (event) {
                event.stopPropagation(); // Avoid triggering file select click again
            }

            const fileInput = document.getElementById(fileInputId);
            const placeholder = document.getElementById(placeholderId);
            const previewContainer = document.getElementById(previewContainerId);
            const hiddenInput = document.getElementById(hiddenInputId);

            if (fileInput) fileInput.value = '';
            if (placeholder) placeholder.style.display = 'flex';
            if (previewContainer) previewContainer.style.display = 'none';
            if (hiddenInput) hiddenInput.value = '';
        },

        async uploadFile(file) {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/garages/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'File upload failed');
            }

            const data = await res.json();
            return data.imageUrl;
        },

        // --- SPARE PART SHOPS & INVENTORY CONTROLLERS ---
        openAddShopModal() {
            document.getElementById('edit-shop-id').value = '';
            document.getElementById('shop-name').value = '';
            document.getElementById('shop-desc').value = '';
            document.getElementById('shop-address').value = '';
            document.getElementById('shop-city').value = 'Colombo';
            document.getElementById('shop-phone').value = '';
            document.getElementById('shop-email').value = '';
            document.getElementById('shop-image').value = '';
            document.getElementById('shop-lat').value = '';
            document.getElementById('shop-lng').value = '';

            this.removeSelectedImage(null, 'shop-image-file', 'shop-image-placeholder', 'shop-image-preview-container', 'shop-image');
            const submitBtn = document.getElementById('shop-submit-btn');
            if (submitBtn) submitBtn.textContent = 'Submit Request';
            this.openModal('modal-add-shop');
        },

        openEditShopModal(id) {
            const s = this.ownerShops.find(x => x.id == id);
            if (!s) return;

            document.getElementById('edit-shop-id').value = s.id;
            document.getElementById('shop-name').value = s.shopName;
            document.getElementById('shop-desc').value = s.description;
            document.getElementById('shop-address').value = s.address;
            document.getElementById('shop-city').value = s.city;
            document.getElementById('shop-phone').value = s.phone || '';
            document.getElementById('shop-email').value = s.email || '';
            document.getElementById('shop-image').value = s.imageUrl || '';
            document.getElementById('shop-lat').value = s.latitude || '';
            document.getElementById('shop-lng').value = s.longitude || '';

            const placeholder = document.getElementById('shop-image-placeholder');
            const previewContainer = document.getElementById('shop-image-preview-container');
            const previewImg = document.getElementById('shop-image-preview');
            const fileInput = document.getElementById('shop-image-file');

            if (fileInput) fileInput.value = '';

            if (s.imageUrl) {
                if (previewImg) previewImg.src = s.imageUrl;
                if (placeholder) placeholder.style.display = 'none';
                if (previewContainer) previewContainer.style.display = 'block';
            } else {
                if (placeholder) placeholder.style.display = 'flex';
                if (previewContainer) previewContainer.style.display = 'none';
            }

            const submitBtn = document.getElementById('shop-submit-btn');
            if (submitBtn) submitBtn.textContent = 'Save Changes';
            this.openModal('modal-add-shop');
        },

        async handleAddShop(e) {
            e.preventDefault();
            const editId = document.getElementById('edit-shop-id').value;
            const name = document.getElementById('shop-name').value.trim();
            const description = document.getElementById('shop-desc').value.trim();
            const address = document.getElementById('shop-address').value.trim();
            const city = document.getElementById('shop-city').value;
            const phone = document.getElementById('shop-phone').value.trim();
            const email = document.getElementById('shop-email').value.trim();
            
            const fileInput = document.getElementById('shop-image-file');
            let imageUrl = document.getElementById('shop-image').value.trim();

            try {
                if (fileInput && fileInput.files && fileInput.files.length > 0) {
                    this.showToast('Uploading shop image...', 'info');
                    imageUrl = await this.uploadFile(fileInput.files[0]);
                } else if (!imageUrl) {
                    this.showToast('Shop image is required.', 'error');
                    return;
                }

                const latitude = parseFloat(document.getElementById('shop-lat').value);
                const longitude = parseFloat(document.getElementById('shop-lng').value);

                if (isNaN(latitude) || isNaN(longitude)) {
                    this.showToast('Please select shop coordinates on the map.', 'error');
                    return;
                }

                let url = '/api/shops';
                let method = 'POST';
                if (editId) {
                    url = `/api/shops/${editId}`;
                    method = 'PUT';
                }

                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name, description, address, city, phone, email, imageUrl, latitude, longitude
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast(editId ? 'Shop profile updated successfully! Pending admin approval.' : 'Spare Part Shop registered successfully! Pending admin approval.', 'success');
                    this.closeModal('modal-add-shop');
                    this.removeSelectedImage(null, 'shop-image-file', 'shop-image-placeholder', 'shop-image-preview-container', 'shop-image');
                    await this.loadShopMyShops();
                    this.loadShopInventoryDropdown();
                } else {
                    this.showToast(data.message || 'Operation failed', 'error');
                }
            } catch (err) {
                console.error("Error processing shop registration:", err);
                this.showToast('Connection error', 'error');
            }
        },

        toggleShopStatusDisplay(id, button) {
            const badge = document.getElementById(`shop-status-badge-${id}`);
            if (badge) {
                if (badge.style.display === 'none') {
                    badge.style.display = 'inline-block';
                    button.textContent = 'Hide Status';
                } else {
                    badge.style.display = 'none';
                    button.textContent = 'Show Status';
                }
            }
        },

        async loadShopMyShops() {
            const list = document.getElementById('shop-my-shops-list');
            if (!list) return;
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading shops...</p>';

            try {
                const res = await fetch('/api/shops/my');
                const shops = await res.json();
                if (!res.ok) throw new Error();

                this.ownerShops = shops;

                if (shops.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">You have not registered any spare part shops yet.</p>';
                    return;
                }

                list.innerHTML = '';
                shops.forEach(s => {
                    const item = document.createElement('div');
                    item.className = 'table-item';

                    let badgeClass = 'badge-pending';
                    if (s.status === 'APPROVED') {
                        badgeClass = 'badge-completed';
                    } else if (s.status === 'REJECTED') {
                        badgeClass = 'badge-danger';
                    }

                    item.innerHTML = `
                        <div style="display:flex; gap:1rem; align-items:center;">
                            <img src="${s.imageUrl || 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=150'}" style="width:80px; height:60px; object-fit:cover; border-radius:var(--radius-sm);">
                            <div>
                                <h4 style="font-weight:700;">${s.shopName}</h4>
                                <p style="font-size:0.85rem; color:var(--text-secondary);"><i class="fa-solid fa-location-dot"></i> ${s.address}, ${s.city}</p>
                            </div>
                        </div>
                        <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem;">
                            <span class="badge ${badgeClass}" id="shop-status-badge-${s.id}" style="display:none;">${s.status}</span>
                            <div style="display:flex; gap:0.5rem; margin-top:0.25rem;">
                                <button class="btn btn-outline" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="window.GarageLK.toggleShopStatusDisplay('${s.id}', this)" unique-id="toggle-shop-status-btn-${s.id}">
                                    Show Status
                                </button>
                                <button class="btn btn-primary" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="window.GarageLK.openEditShopModal(${s.id})" unique-id="edit-shop-btn-${s.id}">
                                    Edit
                                </button>
                                <button class="btn btn-outline btn-danger" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="window.GarageLK.handleDeleteShop(${s.id})" unique-id="delete-shop-btn-${s.id}">
                                    Delete
                                </button>
                            </div>
                        </div>
                    `;
                    list.appendChild(item);
                });

            } catch (err) {
                console.error("Error loading owner shops:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading shops.</p>';
            }
        },

        loadShopInventoryDropdown() {
            const select = document.getElementById('shop-inventory-select');
            const btnAddPart = document.getElementById('btn-add-part');
            if (!select) return;

            select.innerHTML = '<option value="">-- Choose Shop --</option>';
            if (this.ownerShops && this.ownerShops.length > 0) {
                this.ownerShops.forEach(s => {
                    const suffix = s.status === 'APPROVED' ? '' : ` (${s.status})`;
                    select.innerHTML += `<option value="${s.id}">${s.shopName}${suffix}</option>`;
                });
            }

            if (btnAddPart) btnAddPart.style.display = 'none';
            this.loadShopInventory();
        },

        async loadShopInventory() {
            const shopId = document.getElementById('shop-inventory-select').value;
            const list = document.getElementById('shop-inventory-list');
            const btnAddPart = document.getElementById('btn-add-part');

            if (!list) return;

            if (!shopId) {
                list.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:2rem;">Please select a shop to manage inventory.</p>';
                if (btnAddPart) btnAddPart.style.display = 'none';
                return;
            }

            if (btnAddPart) btnAddPart.style.display = 'inline-block';
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading inventory...</p>';

            try {
                const res = await fetch(`/api/shops/${shopId}/parts`);
                if (!res.ok) throw new Error();
                const parts = await res.json();
                this.currentInventory = parts;

                if (parts.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No spare parts in this shop\'s inventory yet.</p>';
                    return;
                }

                list.innerHTML = '';
                parts.forEach(p => {
                    const item = document.createElement('div');
                    item.className = 'table-item';

                    item.innerHTML = `
                        <div style="display:flex; gap:1rem; align-items:center; flex:1;">
                            <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=150'}" style="width:80px; height:60px; object-fit:cover; border-radius:var(--radius-sm);">
                            <div>
                                <h4 style="font-weight:700; margin:0;">${p.partName}</h4>
                                <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px; margin-bottom:0;">
                                    <strong>Vehicle Compatibility:</strong> ${p.vehicleModel} (${p.vehicleYear}) &bull; 
                                    <strong>Price:</strong> LKR ${p.price.toFixed(2)} &bull; 
                                    <strong>Stock:</strong> ${p.quantity} units
                                </p>
                            </div>
                        </div>
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            <button class="btn btn-primary" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="window.GarageLK.openEditPartModal(${p.id})" unique-id="edit-part-btn-${p.id}">
                                Edit
                            </button>
                            <button class="btn btn-outline btn-danger" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="window.GarageLK.handleDeletePart(${p.id})" unique-id="delete-part-btn-${p.id}">
                                Delete
                            </button>
                        </div>
                    `;
                    list.appendChild(item);
                });
            } catch (err) {
                console.error("Error loading shop inventory:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading inventory.</p>';
            }
        },

        openAddPartModal() {
            document.getElementById('part-id').value = '';
            document.getElementById('part-name').value = '';
            document.getElementById('part-vehicle-model').value = '';
            document.getElementById('part-vehicle-year').value = '';
            document.getElementById('part-price').value = '';
            document.getElementById('part-quantity').value = '';
            document.getElementById('part-image').value = '';
            this.removeSelectedImage(null, 'part-image-file', 'part-image-placeholder', 'part-image-preview-container', 'part-image');

            const titleEl = document.getElementById('modal-part-title');
            if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-gears"></i> Add Spare Part';
            this.openModal('modal-add-part');
        },

        openEditPartModal(id) {
            const p = this.currentInventory.find(x => x.id == id);
            if (!p) return;

            document.getElementById('part-id').value = p.id;
            document.getElementById('part-name').value = p.partName;
            document.getElementById('part-vehicle-model').value = p.vehicleModel;
            document.getElementById('part-vehicle-year').value = p.vehicleYear;
            document.getElementById('part-price').value = p.price;
            document.getElementById('part-quantity').value = p.quantity;
            document.getElementById('part-image').value = p.imageUrl || '';
            const placeholder = document.getElementById('part-image-placeholder');
            const previewContainer = document.getElementById('part-image-preview-container');
            const previewImg = document.getElementById('part-image-preview');
            const fileInput = document.getElementById('part-image-file');

            if (fileInput) fileInput.value = '';

            if (p.imageUrl) {
                if (previewImg) previewImg.src = p.imageUrl;
                if (placeholder) placeholder.style.display = 'none';
                if (previewContainer) previewContainer.style.display = 'block';
            } else {
                if (placeholder) placeholder.style.display = 'flex';
                if (previewContainer) previewContainer.style.display = 'none';
            }

            const titleEl = document.getElementById('modal-part-title');
            if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-gears"></i> Edit Spare Part';
            this.openModal('modal-add-part');
        },

        async submitPartForm(e) {
            e.preventDefault();
            const shopId = document.getElementById('shop-inventory-select').value;
            if (!shopId) return;

            const partId = document.getElementById('part-id').value;
            const partName = document.getElementById('part-name').value.trim();
            const vehicleModel = document.getElementById('part-vehicle-model').value.trim();
            const vehicleYear = parseInt(document.getElementById('part-vehicle-year').value);
            const price = parseFloat(document.getElementById('part-price').value);
            const quantity = parseInt(document.getElementById('part-quantity').value);

            const fileInput = document.getElementById('part-image-file');
            let imageUrl = document.getElementById('part-image').value.trim();

            try {
                if (fileInput && fileInput.files && fileInput.files.length > 0) {
                    this.showToast('Uploading spare part image...', 'info');
                    imageUrl = await this.uploadFile(fileInput.files[0]);
                }

                const res = await fetch(`/api/shops/${shopId}/parts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: partId ? parseInt(partId) : null,
                        partName, vehicleModel, vehicleYear, price, quantity, imageUrl
                    })
                });

                if (res.ok) {
                    this.showToast('Spare part saved successfully', 'success');
                    this.closeModal('modal-add-part');
                    this.removeSelectedImage(null, 'part-image-file', 'part-image-placeholder', 'part-image-preview-container', 'part-image');
                    this.loadShopInventory();
                } else {
                    const errData = await res.json();
                    this.showToast(errData.message || 'Failed to save spare part', 'error');
                }
            } catch (err) {
                console.error("Error saving spare part:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async handleDeletePart(id) {
            const shopId = document.getElementById('shop-inventory-select').value;
            if (!shopId) return;

            if (!confirm('Are you sure you want to delete this spare part from stock?')) return;

            try {
                const res = await fetch(`/api/shops/${shopId}/parts/${id}`, {
                    method: 'DELETE'
                });

                if (res.ok) {
                    this.showToast('Spare part deleted successfully', 'success');
                    this.loadShopInventory();
                } else {
                    const errData = await res.json();
                    this.showToast(errData.message || 'Deletion failed', 'error');
                }
            } catch (err) {
                console.error("Error deleting spare part:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async handleDeleteShop(shopId) {
            if (!confirm('Are you sure you want to delete this spare part shop? This will also delete all associated spare parts in inventory.')) return;
            try {
                const res = await fetch(`/api/shops/${shopId}`, {
                    method: 'DELETE'
                });

                if (res.ok) {
                    this.showToast('Spare Part Shop deleted successfully', 'success');
                    this.loadShopMyShops();
                    if (typeof this.loadShopInventoryDropdown === 'function') {
                        this.loadShopInventoryDropdown();
                    }
                } else {
                    const data = await res.json();
                    this.showToast(data.message || 'Deletion failed', 'error');
                }
            } catch (err) {
                console.error("Error deleting shop:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async handleApproveShop(id) {
            try {
                const res = await fetch(`/api/shops/${id}/approve`, {
                    method: 'POST'
                });

                if (res.ok) {
                    this.showToast('Shop approved successfully!', 'success');
                    this.loadAdminApprovals();
                } else {
                    this.showToast('Approval failed', 'error');
                }
            } catch (err) {
                console.error("Error approving shop:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async handleRejectShop(id) {
            if (!confirm('Are you sure you want to reject this shop?')) return;
            try {
                const res = await fetch(`/api/shops/${id}/reject`, {
                    method: 'POST'
                });

                if (res.ok) {
                    this.showToast('Shop rejected successfully!', 'info');
                    this.loadAdminApprovals();
                } else {
                    this.showToast('Action failed', 'error');
                }
            } catch (err) {
                console.error("Error rejecting shop:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async handleCancelShop(id) {
            if (!confirm('Are you sure you want to cancel the approval for this shop?')) return;
            try {
                const res = await fetch(`/api/shops/${id}/reject`, {
                    method: 'POST'
                });

                if (res.ok) {
                    this.showToast('Shop approval cancelled successfully!', 'info');
                    this.loadAdminApprovals();
                } else {
                    this.showToast('Action failed', 'error');
                }
            } catch (err) {
                console.error("Error cancelling shop approval:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async toggleGarageActive(id, newStatus) {
            const actionText = newStatus === 'SUSPENDED' ? 'deactivate' : 'activate';
            if (!confirm(`Are you sure you want to ${actionText} this garage?`)) return;
            try {
                const res = await fetch(`/api/garages/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                if (!res.ok) throw new Error("Failed to toggle status");
                const data = await res.json();
                this.showToast(data.message || 'Status updated successfully', 'success');
                this.loadAdminApprovals();
            } catch (err) {
                console.error("Error toggling garage status:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async toggleShopActive(id, newStatus) {
            const actionText = newStatus === 'SUSPENDED' ? 'deactivate' : 'activate';
            if (!confirm(`Are you sure you want to ${actionText} this shop?`)) return;
            try {
                const res = await fetch(`/api/shops/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                if (!res.ok) throw new Error("Failed to toggle status");
                const data = await res.json();
                this.showToast(data.message || 'Status updated successfully', 'success');
                this.loadAdminApprovals();
            } catch (err) {
                console.error("Error toggling shop status:", err);
                this.showToast('Connection error', 'error');
            }
        },

        // --- SPARE PART BOOKINGS / RESERVATIONS ---
        openReservePartModal(partId, partName, price, maxQty) {
            if (!this.currentUser) {
                this.showToast('Please sign in to reserve spare parts.', 'error');
                setTimeout(() => { window.location.href = 'auth.html'; }, 1000);
                return;
            }

            document.getElementById('reserve-part-id').value = partId;
            document.getElementById('reserve-part-name').value = partName;
            document.getElementById('reserve-part-price').value = price.toFixed(2);
            
            const qtyInput = document.getElementById('reserve-quantity');
            qtyInput.value = 1;
            qtyInput.max = maxQty;

            document.getElementById('reserve-notes').value = '';
            
            const pickupInput = document.getElementById('reserve-pickup-date');
            if (pickupInput) {
                const now = new Date();
                const tzoffset = now.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(now.getTime() - tzoffset)).toISOString().slice(0, 16);
                pickupInput.min = localISOTime;
                pickupInput.value = localISOTime;
            }

            this.updateReserveTotalPrice();
            this.openModal('modal-reserve-part');
        },

        updateReserveTotalPrice() {
            const price = parseFloat(document.getElementById('reserve-part-price').value || 0);
            const qty = parseInt(document.getElementById('reserve-quantity').value || 1);
            const total = price * qty;
            document.getElementById('reserve-total-price').textContent = `LKR ${total.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        },

        async submitPartReservation(e) {
            e.preventDefault();
            const partId = parseInt(document.getElementById('reserve-part-id').value);
            const quantity = parseInt(document.getElementById('reserve-quantity').value);
            const pickupDate = document.getElementById('reserve-pickup-date').value;
            const notes = document.getElementById('reserve-notes').value.trim();

            try {
                const res = await fetch('/api/spare-parts/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ partId, quantity, pickupDate, notes })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Spare part reserved successfully!', 'success');
                    this.closeModal('modal-reserve-part');
                    
                    const urlParams = new URLSearchParams(window.location.search);
                    const shopId = urlParams.get('id');
                    if (shopId) {
                        this.initShopDetails();
                    } else {
                        this.loadCustomerReservations();
                        this.switchDashboardTab('customer-reservations');
                    }
                } else {
                    this.showToast(data.message || 'Reservation failed', 'error');
                }
            } catch (err) {
                console.error("Error reserving part:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async loadCustomerReservations() {
            const list = document.getElementById('customer-reservations-list');
            const completedList = document.getElementById('customer-picked-up-list');
            if (!list) return;
            
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading reservations...</p>';
            if (completedList) {
                completedList.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading completed history...</p>';
            }

            try {
                const res = await fetch('/api/spare-parts/bookings/my');
                const bookings = await res.json();
                if (!res.ok) throw new Error();

                const pendingBookings = bookings.filter(b => b.status === 'PENDING' || b.status === 'READY_FOR_PICKUP');
                const completedBookings = bookings.filter(b => b.status === 'PICKED_UP' || b.status === 'CANCELLED');

                // 1. Render Pending Reservations
                if (pendingBookings.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">You have no pending reservations.</p>';
                } else {
                    list.innerHTML = '';
                    pendingBookings.forEach(b => {
                        const item = document.createElement('div');
                        item.className = 'table-item';

                        let badgeClass = 'badge-pending';
                        if (b.status === 'READY_FOR_PICKUP') badgeClass = 'badge-approved';

                        let actionHtml = `
                            <button class="btn btn-outline btn-danger" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" 
                                onclick="window.GarageLK.updatePartReservationStatus(${b.id}, 'CANCELLED')" unique-id="cancel-part-btn-${b.id}">
                                Cancel Reservation
                            </button>
                        `;

                        const formattedPickup = new Date(b.pickupDate).toLocaleString();

                        item.innerHTML = `
                            <div style="flex:1; display:flex; gap:1rem; align-items:center;">
                                <img src="${b.sparePart.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=150'}" style="width:85px; height:65px; object-fit:cover; border-radius:var(--radius-sm);">
                                <div>
                                    <h4 style="font-weight:700; margin:0;">${b.sparePart.partName}</h4>
                                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:2px; margin-bottom:4px;">
                                        <strong>Shop:</strong> ${b.sparePart.shop.shopName} &bull; <strong>Quantity:</strong> ${b.quantity} unit(s)
                                    </p>
                                    <p style="font-size:0.8rem; color:var(--text-muted); margin:0; line-height:1.35;">
                                        <strong>Pickup Estimation:</strong> ${formattedPickup} <br>
                                        ${b.notes ? `<strong>Notes:</strong> ${b.notes}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; min-width:180px;">
                                <span class="badge ${badgeClass}">${b.status.replace(/_/g, ' ')}</span>
                                <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${b.totalPrice.toFixed(2)}</span>
                                ${actionHtml}
                            </div>
                        `;
                        list.appendChild(item);
                    });
                }

                // 2. Render Completed / Picked-Up Reservations
                if (completedList) {
                    if (completedBookings.length === 0) {
                        completedList.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">You have no completed reservations.</p>';
                    } else {
                        completedList.innerHTML = '';
                        completedBookings.forEach(b => {
                            const item = document.createElement('div');
                            item.className = 'table-item';

                            let badgeClass = 'badge-pending';
                            if (b.status === 'PICKED_UP') badgeClass = 'badge-completed';
                            else if (b.status === 'CANCELLED') badgeClass = 'badge-cancelled';

                            let actionHtml = '';
                            if (b.status === 'PICKED_UP') {
                                actionHtml = `<div id="rate-shop-btn-container-${b.id}" style="display:inline-block;"></div>`;
                            }

                            const formattedPickup = new Date(b.pickupDate).toLocaleString();

                            item.innerHTML = `
                                <div style="flex:1; display:flex; gap:1rem; align-items:center;">
                                    <img src="${b.sparePart.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=150'}" style="width:85px; height:65px; object-fit:cover; border-radius:var(--radius-sm);">
                                    <div>
                                        <h4 style="font-weight:700; margin:0;">${b.sparePart.partName}</h4>
                                        <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:2px; margin-bottom:4px;">
                                            <strong>Shop:</strong> ${b.sparePart.shop.shopName} &bull; <strong>Quantity:</strong> ${b.quantity} unit(s)
                                        </p>
                                        <p style="font-size:0.8rem; color:var(--text-muted); margin:0; line-height:1.35;">
                                            <strong>Pickup Estimation:</strong> ${formattedPickup} <br>
                                            ${b.notes ? `<strong>Notes:</strong> ${b.notes}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; min-width:180px;">
                                    <span class="badge ${badgeClass}">${b.status.replace(/_/g, ' ')}</span>
                                    <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${b.totalPrice.toFixed(2)}</span>
                                    ${actionHtml}
                                </div>
                            `;
                            completedList.appendChild(item);

                            if (b.status === 'PICKED_UP') {
                                const rateBtnContainerId = `rate-shop-btn-container-${b.id}`;
                                const shopName = b.sparePart.shop.shopName;
                                setTimeout(async () => {
                                    const btnContainer = document.getElementById(rateBtnContainerId);
                                    if (btnContainer) {
                                        try {
                                            const existsRes = await fetch(`/api/shop-reviews/booking/${b.id}/exists`);
                                            if (existsRes.ok) {
                                                const check = await existsRes.json();
                                                if (!check.exists) {
                                                    btnContainer.innerHTML = `
                                                        <button class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                                            onclick="window.GarageLK.openShopReviewModal(${b.id}, '${shopName.replace(/'/g, "\\'")}')" 
                                                            unique-id="rate-shop-btn-${b.id}">
                                                            <i class="fa-solid fa-star"></i> Write Review
                                                        </button>
                                                    `;
                                                } else {
                                                    btnContainer.innerHTML = `<span class="badge badge-approved" style="font-size:0.75rem; padding:0.4rem 0.8rem;"><i class="fa-solid fa-check"></i> Shop Reviewed</span>`;
                                                }
                                            }
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }
                                }, 0);
                            }
                        });
                    }
                }
            } catch (err) {
                console.error("Error loading customer reservations:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading reservations.</p>';
            }
        },

        async loadShopReservations() {
            const list = document.getElementById('shop-reservations-list');
            const completedList = document.getElementById('shop-completed-reservations-list');
            if (!list) return;

            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading reservations...</p>';
            if (completedList) {
                completedList.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading history...</p>';
            }

            try {
                const res = await fetch('/api/spare-parts/bookings/shop');
                const bookings = await res.json();
                if (!res.ok) throw new Error();

                const incomingBookings = bookings.filter(b => b.status === 'PENDING' || b.status === 'READY_FOR_PICKUP');
                const completedBookings = bookings.filter(b => b.status === 'PICKED_UP' || b.status === 'CANCELLED');

                if (incomingBookings.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No incoming spare part reservations.</p>';
                } else {
                    list.innerHTML = '';
                    incomingBookings.forEach(b => {
                        const item = document.createElement('div');
                        item.className = 'table-item';

                        let badgeClass = 'badge-pending';
                        if (b.status === 'READY_FOR_PICKUP') badgeClass = 'badge-approved';

                        let actionHtml = '';
                        if (b.status === 'PENDING') {
                            actionHtml = `
                                <button class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                    onclick="window.GarageLK.updatePartReservationStatus(${b.id}, 'READY_FOR_PICKUP')" unique-id="ready-btn-${b.id}">
                                    Mark Ready
                                </button>
                                <button class="btn btn-outline btn-danger" style="padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                    onclick="window.GarageLK.updatePartReservationStatus(${b.id}, 'CANCELLED')" unique-id="reject-res-btn-${b.id}">
                                    Reject / Cancel
                                </button>
                            `;
                        } else if (b.status === 'READY_FOR_PICKUP') {
                            actionHtml = `
                                <button class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem; background:var(--success);" 
                                    onclick="window.GarageLK.updatePartReservationStatus(${b.id}, 'PICKED_UP')" unique-id="picked-btn-${b.id}">
                                    Mark Picked Up
                                </button>
                                <button class="btn btn-outline btn-danger" style="padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                    onclick="window.GarageLK.updatePartReservationStatus(${b.id}, 'CANCELLED')" unique-id="reject-res-btn-${b.id}">
                                    Cancel
                                </button>
                            `;
                        }

                        const formattedPickup = new Date(b.pickupDate).toLocaleString();
                        const cust = b.customer.user;

                        item.innerHTML = `
                            <div style="flex:1; display:flex; gap:1rem; align-items:center;">
                                <img src="${b.sparePart.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=150'}" style="width:85px; height:65px; object-fit:cover; border-radius:var(--radius-sm);">
                                <div>
                                    <h4 style="font-weight:700; margin:0;">${b.sparePart.partName} <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">at ${b.sparePart.shop.shopName}</span></h4>
                                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:2px; margin-bottom:4px;">
                                        <strong>Customer:</strong> ${cust.fullName || cust.username} (${cust.phone || 'N/A'}) &bull; <strong>Qty:</strong> ${b.quantity}
                                    </p>
                                    <p style="font-size:0.8rem; color:var(--text-muted); margin:0; line-height:1.35;">
                                        <strong>Requested Pickup:</strong> ${formattedPickup} <br>
                                        ${b.notes ? `<strong>Notes:</strong> ${b.notes}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; min-width:180px;">
                                <span class="badge ${badgeClass}">${b.status.replace(/_/g, ' ')}</span>
                                <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${b.totalPrice.toFixed(2)}</span>
                                <div style="display:flex; gap:0.5rem; margin-top:0.25rem;">
                                    ${actionHtml}
                                </div>
                            </div>
                        `;
                        list.appendChild(item);
                    });
                }

                if (completedList) {
                    if (completedBookings.length === 0) {
                        completedList.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No completed reservation history.</p>';
                    } else {
                        completedList.innerHTML = '';
                        completedBookings.forEach(b => {
                            const item = document.createElement('div');
                            item.className = 'table-item';

                            let badgeClass = b.status === 'PICKED_UP' ? 'badge-completed' : 'badge-cancelled';

                            let actionHtml = `
                                <button class="btn btn-outline" style="color:var(--danger); border-color:var(--border-color); padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                    onclick="window.GarageLK.deleteSparePartBookingHistory(${b.id})" unique-id="delete-part-booking-btn-${b.id}">
                                    <i class="fa-solid fa-trash-can"></i> Delete
                                </button>
                            `;

                            const formattedPickup = new Date(b.pickupDate).toLocaleString();
                            const cust = b.customer.user;

                            item.innerHTML = `
                                <div style="flex:1; display:flex; gap:1rem; align-items:center;">
                                    <img src="${b.sparePart.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=150'}" style="width:85px; height:65px; object-fit:cover; border-radius:var(--radius-sm);">
                                    <div>
                                        <h4 style="font-weight:700; margin:0;">${b.sparePart.partName} <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">at ${b.sparePart.shop.shopName}</span></h4>
                                        <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:2px; margin-bottom:4px;">
                                            <strong>Customer:</strong> ${cust.fullName || cust.username} (${cust.phone || 'N/A'}) &bull; <strong>Qty:</strong> ${b.quantity}
                                        </p>
                                        <p style="font-size:0.8rem; color:var(--text-muted); margin:0; line-height:1.35;">
                                            <strong>Requested Pickup:</strong> ${formattedPickup} <br>
                                            ${b.notes ? `<strong>Notes:</strong> ${b.notes}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; min-width:180px;">
                                    <span class="badge ${badgeClass}">${b.status.replace(/_/g, ' ')}</span>
                                    <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${b.totalPrice.toFixed(2)}</span>
                                    <div style="display:flex; gap:0.5rem; margin-top:0.25rem;">
                                        ${actionHtml}
                                    </div>
                                </div>
                            `;
                            completedList.appendChild(item);
                        });
                    }
                }
            } catch (err) {
                console.error("Error loading shop reservations:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading reservations.</p>';
            }
        },

        async deleteSparePartBookingHistory(id) {
            if (!confirm('Are you sure you want to delete this reservation from your history?')) return;
            try {
                const res = await fetch(`/api/spare-parts/bookings/${id}`, {
                    method: 'DELETE'
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Reservation history item deleted successfully.', 'success');
                    this.loadShopReservations();
                } else {
                    this.showToast(data.message || 'Deletion failed', 'error');
                }
            } catch (err) {
                console.error("Error deleting reservation history:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async updatePartReservationStatus(bookingId, status) {
            const confirmMsg = status === 'CANCELLED' ? 'Are you sure you want to cancel this reservation?' : `Change status to ${status.replace(/_/g, ' ')}?`;
            if (!confirm(confirmMsg)) return;

            try {
                const res = await fetch(`/api/spare-parts/bookings/${bookingId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast(data.message || 'Status updated successfully', 'success');
                    if (this.currentUser.role === 'CUSTOMER') {
                        this.loadCustomerReservations();
                    } else if (this.currentUser.role === 'SHOP_OWNER') {
                        this.loadShopReservations();
                    }
                } else {
                    this.showToast(data.message || 'Action failed', 'error');
                }
            } catch (err) {
                console.error("Error updating reservation status:", err);
                this.showToast('Connection error', 'error');
            }
        },



        // --- SHOP SALES ANALYTICS ---
        async loadShopAnalytics() {
            try {
                // Populate shop selector dropdown first
                const select = document.getElementById('shop-analytics-select');
                if (select) {
                    select.innerHTML = '<option value="">All Shops</option>';
                    if (this.ownerShops && this.ownerShops.length > 0) {
                        this.ownerShops.forEach(s => {
                            const suffix = s.status === 'APPROVED' ? '' : ` (${s.status})`;
                            select.innerHTML += `<option value="${s.id}">${s.shopName}${suffix}</option>`;
                        });
                    }
                }

                // If no date type filter select value exists, default to 'all'
                const dateTypeEl = document.getElementById('shop-analytics-date-type');
                if (dateTypeEl && !dateTypeEl.value) {
                    dateTypeEl.value = 'all';
                }

                // Toggle date filters display dynamically
                this.toggleShopDateFilterType();

                const res = await fetch('/api/spare-parts/bookings/shop');
                if (res.ok) {
                    this.shopBookingsList = await res.json();
                } else {
                    this.shopBookingsList = [];
                }

                this.filterShopAnalytics();
            } catch (err) {
                console.error("Error loading shop analytics:", err);
            }
        },

        toggleShopDateFilterType() {
            const dateTypeEl = document.getElementById('shop-analytics-date-type');
            const dateType = dateTypeEl ? dateTypeEl.value : 'all';
            
            const dayContainer = document.getElementById('container-shop-analytics-day');
            const monthContainer = document.getElementById('container-shop-analytics-month');
            
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            const localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
            
            if (dateType === 'all') {
                if (dayContainer) dayContainer.style.display = 'none';
                if (monthContainer) monthContainer.style.display = 'none';
            } else if (dateType === 'day') {
                if (dayContainer) dayContainer.style.display = 'flex';
                if (monthContainer) monthContainer.style.display = 'none';
                const dayInput = document.getElementById('shop-analytics-date-day');
                if (dayInput && !dayInput.value) {
                    dayInput.value = localISOTime.split('T')[0];
                }
            } else if (dateType === 'month') {
                if (dayContainer) dayContainer.style.display = 'none';
                if (monthContainer) monthContainer.style.display = 'flex';
                const monthInput = document.getElementById('shop-analytics-date-month');
                if (monthInput && !monthInput.value) {
                    monthInput.value = localISOTime.substring(0, 7);
                }
            }
            
            this.filterShopAnalytics();
        },

        filterShopAnalytics() {
            if (!this.shopBookingsList) return;

            const shopSelect = document.getElementById('shop-analytics-select');
            const selectedShopId = shopSelect ? shopSelect.value : '';

            const dateTypeEl = document.getElementById('shop-analytics-date-type');
            const dateType = dateTypeEl ? dateTypeEl.value : 'all';
            const targetDay = document.getElementById('shop-analytics-date-day') ? document.getElementById('shop-analytics-date-day').value : '';
            const targetMonth = document.getElementById('shop-analytics-date-month') ? document.getElementById('shop-analytics-date-month').value : '';

            // Filter bookings: only PICKED_UP (sold) bookings for the shop/month
            let filtered = this.shopBookingsList.filter(b => b.status === 'PICKED_UP');

            if (selectedShopId) {
                filtered = filtered.filter(b => b.sparePart && b.sparePart.shop && b.sparePart.shop.id === parseInt(selectedShopId, 10));
            }

            if (dateType === 'day' && targetDay) {
                filtered = filtered.filter(b => b.bookingDate && b.bookingDate.substring(0, 10) === targetDay);
            } else if (dateType === 'month' && targetMonth) {
                filtered = filtered.filter(b => b.bookingDate && b.bookingDate.substring(0, 7) === targetMonth);
            }

            let totalQuantity = 0;
            let totalRevenue = 0.0;
            const partSalesMap = {}; // partName -> quantity
            const partRevenueMap = {}; // partName -> revenue

            filtered.forEach(b => {
                const partName = (b.sparePart && b.sparePart.partName) || 'Unknown Part';
                const qty = b.quantity || 0;
                const price = b.totalPrice || 0.0;

                totalQuantity += qty;
                totalRevenue += price;

                partSalesMap[partName] = (partSalesMap[partName] || 0) + qty;
                partRevenueMap[partName] = (partRevenueMap[partName] || 0.0) + price;
            });

            // Update stats cards
            const totalRevEl = document.getElementById('shop-stat-total-revenue');
            if (totalRevEl) totalRevEl.textContent = `LKR ${totalRevenue.toFixed(2)}`;
            
            const totalSalesEl = document.getElementById('shop-stat-total-sales');
            if (totalSalesEl) totalSalesEl.textContent = totalQuantity;

            // Find top selling part
            let topPart = 'N/A';
            let maxSales = 0;
            Object.entries(partSalesMap).forEach(([partName, sales]) => {
                if (sales > maxSales) {
                    maxSales = sales;
                    topPart = partName;
                }
            });
            const fastMovingEl = document.getElementById('shop-stat-fast-moving');
            if (fastMovingEl) fastMovingEl.textContent = topPart;

            // Render/Update charts
            const isDarkMode = !document.body.classList.contains('light-mode');
            const textColor = isDarkMode ? '#e2e8f0' : '#1e293b';
            const gridColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

            // 1. Fast-Moving Parts Bar Chart
            const salesCanvas = document.getElementById('chart-shop-sales');
            if (salesCanvas) {
                if (window.shopSalesChart) window.shopSalesChart.destroy();

                const partNames = Object.keys(partSalesMap);
                const salesCounts = Object.values(partSalesMap);

                window.shopSalesChart = new Chart(salesCanvas, {
                    type: 'bar',
                    data: {
                        labels: partNames.length > 0 ? partNames : ['No Data'],
                        datasets: [{
                            label: 'Quantity Sold',
                            data: salesCounts.length > 0 ? salesCounts : [0],
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
                                ticks: { color: textColor, font: { family: 'Outfit', size: 11 }, stepSize: 1 }
                            }
                        }
                    }
                });
            }

            // 2. Revenue Share Pie Chart
            const revenueCanvas = document.getElementById('chart-shop-revenue');
            if (revenueCanvas) {
                if (window.shopRevenueChart) window.shopRevenueChart.destroy();

                const partNames = Object.keys(partRevenueMap);
                const revenues = Object.values(partRevenueMap);
                const hasData = revenues.length > 0;

                const chartColors = [
                    'rgba(16, 185, 129, 0.75)', // emerald
                    'rgba(6, 182, 212, 0.75)',  // cyan
                    'rgba(99, 102, 241, 0.75)',  // indigo
                    'rgba(245, 158, 11, 0.75)',  // amber
                    'rgba(239, 68, 68, 0.75)',   // red
                    'rgba(168, 85, 247, 0.75)',  // purple
                    'rgba(236, 72, 153, 0.75)'   // pink
                ];
                const borderColors = [
                    'rgb(16, 185, 129)',
                    'rgb(6, 182, 212)',
                    'rgb(99, 102, 241)',
                    'rgb(245, 158, 11)',
                    'rgb(239, 68, 68)',
                    'rgb(168, 85, 247)',
                    'rgb(236, 72, 153)'
                ];

                window.shopRevenueChart = new Chart(revenueCanvas, {
                    type: 'pie',
                    data: {
                        labels: hasData ? partNames : ['No Data'],
                        datasets: [{
                            data: hasData ? revenues : [1],
                            backgroundColor: hasData ? chartColors.slice(0, partNames.length) : ['rgba(148, 163, 184, 0.25)'],
                            borderColor: hasData ? borderColors.slice(0, partNames.length) : ['rgba(148, 163, 184, 0.4)'],
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

        exportShopAnalyticsToExcel() {
            if (!this.shopBookingsList) return;

            const shopSelect = document.getElementById('shop-analytics-select');
            const selectedShopId = shopSelect ? shopSelect.value : '';

            const dateTypeEl = document.getElementById('shop-analytics-date-type');
            const dateType = dateTypeEl ? dateTypeEl.value : 'all';
            const targetDay = document.getElementById('shop-analytics-date-day') ? document.getElementById('shop-analytics-date-day').value : '';
            const targetMonth = document.getElementById('shop-analytics-date-month') ? document.getElementById('shop-analytics-date-month').value : '';

            // Filter bookings
            let filtered = this.shopBookingsList.filter(b => b.status === 'PICKED_UP');

            if (selectedShopId) {
                filtered = filtered.filter(b => b.sparePart && b.sparePart.shop && b.sparePart.shop.id === parseInt(selectedShopId, 10));
            }

            if (dateType === 'day' && targetDay) {
                filtered = filtered.filter(b => b.bookingDate && b.bookingDate.substring(0, 10) === targetDay);
            } else if (dateType === 'month' && targetMonth) {
                filtered = filtered.filter(b => b.bookingDate && b.bookingDate.substring(0, 7) === targetMonth);
            }

            // Map spare part sales data to excel rows
            const salesSheetData = filtered.map(b => ({
                'Reservation ID': b.id,
                'Shop Name': b.sparePart && b.sparePart.shop ? b.sparePart.shop.shopName : 'N/A',
                'Part Name': b.sparePart ? b.sparePart.partName : 'N/A',
                'Vehicle Model': b.sparePart ? b.sparePart.vehicleModel : 'N/A',
                'Vehicle Year': b.sparePart ? b.sparePart.vehicleYear : 'N/A',
                'Customer Name': b.customer && b.customer.user ? (b.customer.user.fullName || b.customer.user.username) : 'N/A',
                'Customer Email': b.customer && b.customer.user ? b.customer.user.email : 'N/A',
                'Customer Phone': b.customer && b.customer.user ? b.customer.user.phone : 'N/A',
                'Quantity': b.quantity,
                'Price Per Unit (LKR)': b.sparePart ? b.sparePart.price : 0.0,
                'Total Price (LKR)': b.totalPrice,
                'Booking Date': b.bookingDate ? b.bookingDate.replace('T', ' ') : 'N/A',
                'Pickup Date': b.pickupDate ? b.pickupDate.replace('T', ' ') : 'N/A',
                'Status': b.status,
                'Notes': b.notes || 'N/A'
            }));

            let totalQuantity = 0;
            let totalRevenue = 0.0;
            filtered.forEach(b => {
                totalQuantity += b.quantity || 0;
                totalRevenue += b.totalPrice || 0.0;
            });

            let dateRangeStr = 'All Time';
            if (dateType === 'day') {
                dateRangeStr = `Day: ${targetDay}`;
            } else if (dateType === 'month') {
                dateRangeStr = `Month: ${targetMonth}`;
            }

            const summarySheetData = [
                { 'Metric': 'Export Date', 'Value': new Date().toISOString().split('T')[0] },
                { 'Metric': 'Selected Shop', 'Value': selectedShopId ? (shopSelect?.options[shopSelect.selectedIndex]?.text || selectedShopId) : 'All Shops' },
                { 'Metric': 'Date Range', 'Value': dateRangeStr },
                { 'Metric': 'Total Completed Sales', 'Value': filtered.length },
                { 'Metric': 'Total Parts Sold', 'Value': totalQuantity },
                { 'Metric': 'Total Revenue', 'Value': `LKR ${totalRevenue.toFixed(2)}` }
            ];

            const wb = XLSX.utils.book_new();

            const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Overview Summary');

            const wsSales = XLSX.utils.json_to_sheet(salesSheetData);
            XLSX.utils.book_append_sheet(wb, wsSales, 'Completed Parts Sales');

            XLSX.writeFile(wb, `shop_sales_analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
            this.showToast('Excel file downloaded successfully!', 'success');
        },

        downloadShopAnalyticsPDF() {
            const element = document.getElementById('section-shop-analytics');
            if (!element) return;

            const dateStr = new Date().toISOString().split('T')[0];
            this.showToast("Generating PDF report...", "success");

            const isDarkMode = !document.body.classList.contains('light-mode');
            const bgHex = isDarkMode ? '#0f172a' : '#ffffff';

            const opt = {
                margin: [0.5, 0.5, 0.5, 0.5], // in inches
                filename: `GarageLK_Shop_Sales_Analytics_${dateStr}.pdf`,
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

        // --- SHOP RATING (BY CUSTOMERS) ---
        openShopReviewModal(bookingId, shopName) {
            document.getElementById('rate-shop-booking-id').value = bookingId;
            document.getElementById('rate-shop-name').value = shopName;
            document.getElementById('rate-shop-rating').value = '5';
            document.getElementById('rate-shop-comment').value = '';
            this.openModal('modal-shop-review');
        },

        async submitShopReview(e) {
            e.preventDefault();
            const bookingId = parseInt(document.getElementById('rate-shop-booking-id').value);
            const starRating = parseInt(document.getElementById('rate-shop-rating').value);
            const comment = document.getElementById('rate-shop-comment').value.trim();

            try {
                const res = await fetch('/api/shop-reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookingId, starRating, comment })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Shop review submitted successfully!', 'success');
                    this.closeModal('modal-shop-review');
                    this.loadCustomerReservations();
                } else {
                    this.showToast(data.message || 'Failed to submit review', 'error');
                }
            } catch (err) {
                console.error("Error submitting shop review:", err);
                this.showToast('Connection error', 'error');
            }
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
            if (document.getElementById('admin-breakdowns-list')) {
                this.loadAdminMonitor();
            }
            if (typeof this.filterOwnerAnalytics === 'function' && this.ownerBookingsList) {
                this.filterOwnerAnalytics();
            }
            if (typeof this.filterShopAnalytics === 'function' && this.shopBookingsList) {
                this.filterShopAnalytics();
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
        },

        initLiveDateTime() {
            const toggleBtn = document.querySelector('.theme-toggle');
            if (!toggleBtn) return;

            if (document.getElementById('live-datetime')) return;

            const dtEl = document.createElement('div');
            dtEl.id = 'live-datetime';
            dtEl.style.display = 'inline-flex';
            dtEl.style.flexDirection = 'column';
            dtEl.style.alignItems = 'flex-end';
            dtEl.style.justifyContent = 'center';
            dtEl.style.gap = '2px';
            dtEl.style.fontFamily = '"Outfit", "Inter", monospace';
            dtEl.style.whiteSpace = 'nowrap';
            dtEl.style.background = 'transparent';
            dtEl.style.border = 'none';
            dtEl.style.padding = '0';

            // Create wrapper container to group toggle button and clock together in the corner
            let wrapper = document.getElementById('theme-datetime-wrapper');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.id = 'theme-datetime-wrapper';
                wrapper.style.display = 'inline-flex';
                wrapper.style.alignItems = 'center';
                wrapper.style.gap = '0.75rem';
                
                // Insert wrapper where toggleBtn is, then append toggle button first and clock second (at the very end)
                toggleBtn.parentNode.insertBefore(wrapper, toggleBtn);
                wrapper.appendChild(toggleBtn);
                wrapper.appendChild(dtEl);
            }

            const updateDateTime = () => {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const date = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                
                dtEl.innerHTML = `
                    <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500; text-align: right; line-height: 1.1;">${year}-${month}-${date}</div>
                    <div style="font-size: 0.82rem; color: var(--text-primary); font-weight: 700; text-align: right; line-height: 1.1; margin-top: 1px;">${hours}:${minutes}:${seconds}</div>
                `;
            };
            
            updateDateTime();
            setInterval(updateDateTime, 1000);
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        GarageLK.initTheme();
        GarageLK.initLiveDateTime();
    });

    window.GarageLK = GarageLK;
})();
