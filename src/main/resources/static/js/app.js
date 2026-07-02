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
        customerCoords: null,
        customerMarker: null,
        routePath: null,
        routeBorder: null,
        routeBadge: null,
        redIcon: null,
        blueIcon: null,
        breakdownRouteMap: null,
        breakdownRouteMarkers: [],
        breakdownRoutePath: null,
        breakdownRouteBorder: null,
        breakdownRouteBadge: null,
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
                    if (this.currentUser && this.currentUser.latitude && this.currentUser.longitude) {
                        this.customerCoords = {
                            lat: parseFloat(this.currentUser.latitude),
                            lng: parseFloat(this.currentUser.longitude)
                        };
                        // Also sync to localStorage
                        localStorage.setItem('customer_coords', JSON.stringify({
                            lat: this.customerCoords.lat,
                            lng: this.customerCoords.lng,
                            timestamp: Date.now()
                        }));
                    }
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
            const formForgot = document.getElementById('form-forgot');

            if (tab === 'login') {
                tabLogin.classList.add('active');
                tabSignup.classList.remove('active');
                formLogin.style.display = 'block';
                formSignup.style.display = 'none';
                if (formForgot) formForgot.style.display = 'none';
            } else if (tab === 'forgot') {
                tabLogin.classList.remove('active');
                tabSignup.classList.remove('active');
                formLogin.style.display = 'none';
                formSignup.style.display = 'none';
                if (formForgot) formForgot.style.display = 'block';
            } else {
                tabSignup.classList.add('active');
                tabLogin.classList.remove('active');
                formSignup.style.display = 'block';
                formLogin.style.display = 'none';
                if (formForgot) formForgot.style.display = 'none';
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

            const executeLogin = async (latitude, longitude) => {
                try {
                    const res = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: usernameInput.value.trim(),
                            password: passwordInput.value,
                            latitude: latitude ? latitude.toString() : null,
                            longitude: longitude ? longitude.toString() : null
                        })
                    });

                    const data = await res.json();
                    if (res.ok) {
                        // Store coordinates if returned or detected
                        const latVal = data.latitude || latitude;
                        const lngVal = data.longitude || longitude;
                        if (latVal && lngVal) {
                            localStorage.setItem('customer_coords', JSON.stringify({
                                lat: parseFloat(latVal),
                                lng: parseFloat(lngVal),
                                timestamp: Date.now()
                            }));
                        }

                        this.showToast('Welcome back, ' + (data.fullName || data.username), 'success');
                        setTimeout(() => {
                            const userRole = data.role || (data.user && data.user.role);
                            if (userRole === 'CUSTOMER') {
                                window.location.href = 'index.html';
                            } else {
                                window.location.href = 'dashboard.html';
                            }
                        }, 1000);
                    } else {
                        this.showToast(data.message || 'Login failed', 'error');
                    }
                } catch (err) {
                    console.error("Login failed:", err);
                    this.showToast('Connection error', 'error');
                }
            };

            // Attempt to get location, with a 4 second timeout
            if (navigator.geolocation) {
                let resolved = false;
                const geoTimeout = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        console.warn("Geolocation timed out. Proceeding with login.");
                        executeLogin(null, null);
                    }
                }, 4000);

                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(geoTimeout);
                            executeLogin(pos.coords.latitude, pos.coords.longitude);
                        }
                    },
                    (err) => {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(geoTimeout);
                            console.warn("Geolocation failed/denied:", err);
                            executeLogin(null, null);
                        }
                    },
                    { enableHighAccuracy: true, timeout: 3500 }
                );
            } else {
                executeLogin(null, null);
            }
        },

        async handleSignup(e) {
            e.preventDefault();
            const username = document.getElementById('signup-username').value.trim();
            const fullName = document.getElementById('signup-fullname').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const phone = document.getElementById('signup-phone').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-reenter-password').value;
            const role = document.getElementById('signup-role').value;

            if (password !== confirmPassword) {
                this.showToast('Passwords do not match', 'error');
                return;
            }

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

        async handleForgotPassword(e) {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value.trim();
            const newPassword = document.getElementById('forgot-new-password').value;
            const confirmPassword = document.getElementById('forgot-confirm-password').value;

            if (!email) {
                this.showToast('Please enter your email address', 'error');
                return;
            }
            if (!newPassword || newPassword.length < 4) {
                this.showToast('Password must be at least 4 characters', 'error');
                return;
            }
            if (newPassword !== confirmPassword) {
                this.showToast('Passwords do not match', 'error');
                return;
            }

            try {
                const res = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, newPassword })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast(data.message || 'Password reset successfully!', 'success');
                    // Clear the form
                    document.getElementById('forgot-email').value = '';
                    document.getElementById('forgot-new-password').value = '';
                    document.getElementById('forgot-confirm-password').value = '';
                    // Switch back to login after a short delay
                    setTimeout(() => {
                        this.switchAuthTab('login');
                    }, 2000);
                } else {
                    this.showToast(data.message || 'Password reset failed', 'error');
                }
            } catch (err) {
                console.error("Password reset failed:", err);
                this.showToast('Connection error. Please try again.', 'error');
            }
        },

        // --- HOMEPAGE / SEARCH PAGE ---
        async initHomepage() {
            await this.checkAuth();
            
            // Read cached coordinates if valid (< 30 minutes)
            try {
                const cached = localStorage.getItem('customer_coords');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    const age = Date.now() - parsed.timestamp;
                    if (age < 30 * 60 * 1000) { // 30 minutes
                        this.customerCoords = { lat: parsed.lat, lng: parsed.lng };
                        const latInput = document.getElementById('breakdown-lat');
                        const lngInput = document.getElementById('breakdown-lng');
                        if (latInput) latInput.value = parsed.lat;
                        if (lngInput) lngInput.value = parsed.lng;
                    }
                }
            } catch (err) {
                console.warn("Failed to load cached customer coordinates:", err);
            }

            this.initMap();

            if (this.customerCoords) {
                this.showCustomerLocationOnMap();
            }

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
                
                // Request customer location in background to update cache/map
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            const newLat = pos.coords.latitude;
                            const newLng = pos.coords.longitude;
                            
                            const latInput = document.getElementById('breakdown-lat');
                            const lngInput = document.getElementById('breakdown-lng');
                            if (latInput) latInput.value = newLat;
                            if (lngInput) lngInput.value = newLng;
                            
                            // Check if coordinates changed significantly (e.g. > 50 meters)
                            let isSignificantChange = true;
                            if (this.customerCoords) {
                                const distanceMoved = this.calculateDistance(
                                    this.customerCoords.lat,
                                    this.customerCoords.lng,
                                    newLat,
                                    newLng
                                );
                                // If moved less than 50 meters (0.05 km), treat it as same location
                                if (distanceMoved < 0.05) {
                                    isSignificantChange = false;
                                }
                            }
                            
                            // Save to local storage cache
                            try {
                                localStorage.setItem('customer_coords', JSON.stringify({
                                    lat: newLat,
                                    lng: newLng,
                                    timestamp: Date.now()
                                }));
                            } catch (e) {
                                console.warn("Failed to cache customer coordinates:", e);
                            }
                            
                            if (isSignificantChange) {
                                this.customerCoords = { lat: newLat, lng: newLng };
                                this.showCustomerLocationOnMap();
                                // Reload garages or spare parts with distance sorting
                                if (urlParams.get('search') === 'parts') {
                                    this.loadSpareParts();
                                } else {
                                    this.loadGarages();
                                }
                            }
                        },
                        (err) => {
                            console.warn("Geolocation query failed/denied:", err);
                            // Fallback default (Colombo) if no cached coordinates are available
                            if (!this.customerCoords) {
                                this.customerCoords = { lat: 6.9271, lng: 79.8612 };
                                this.showCustomerLocationOnMap();
                                if (urlParams.get('search') === 'parts') {
                                    this.loadSpareParts();
                                } else {
                                    this.loadGarages();
                                }
                            }
                        },
                        { timeout: 5000, enableHighAccuracy: true }
                    );
                } else {
                    if (!this.customerCoords) {
                        this.customerCoords = { lat: 6.9271, lng: 79.8612 };
                        this.showCustomerLocationOnMap();
                        if (urlParams.get('search') === 'parts') {
                            this.loadSpareParts();
                        } else {
                            this.loadGarages();
                        }
                    }
                }
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

            // Clear previous map markers and route
            if (this.markers) {
                this.markers.forEach(m => this.map.removeLayer(m));
            }
            this.markers = [];
            if (this.routePath) {
                this.map.removeLayer(this.routePath);
                this.routePath = null;
            }
            if (this.routeBorder) {
                this.map.removeLayer(this.routeBorder);
                this.routeBorder = null;
            }
            if (this.routeBadge) {
                this.map.removeLayer(this.routeBadge);
                this.routeBadge = null;
            }

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
                    if (latitude && longitude) {
                        mapPoints.push([latitude, longitude]);
                    }

                    if (isPartSearch) {
                        const renderedShopIds = new Set();
                        data.forEach(p => {
                            const shop = p.shop;
                            const card = document.createElement('div');
                            card.className = 'garage-card';
                            
                            const distText = (latitude && longitude && p.distance !== undefined)
                                ? `<div class="garage-distance" style="font-size: 0.85rem; color: var(--secondary); font-weight: 600; margin-top: 4px;"><i class="fa-solid fa-route"></i> ${p.distance.toFixed(1)} km away</div>`
                                : '';

                            // Sanitize image urls and handle fallback
                            const partImg = (p.imageUrl && p.imageUrl.trim() !== '' && p.imageUrl !== 'break') ? p.imageUrl : '';
                            const shopImg = (shop.imageUrl && shop.imageUrl.trim() !== '' && shop.imageUrl !== 'break') ? shop.imageUrl : '';
                            const initialImg = partImg || shopImg || 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=400';

                            card.innerHTML = `
                                <img src="${initialImg}" class="garage-card-img" alt="${p.partName}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400';">
                                <div class="garage-card-content">
                                    <div>
                                        <div class="garage-header">
                                            <h3 class="garage-title" style="color:var(--primary); font-size:1.15rem; font-weight:700; margin:0;">${p.partName}</h3>
                                            <div style="font-size:1.2rem; font-weight:800; color:var(--accent);">${p.price.toLocaleString('en-LK', { style: 'currency', currency: 'LKR' })}</div>
                                        </div>
                                        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px; margin-top:4px;">
                                            <strong>Compatibility:</strong> ${p.vehicleModel} (${p.vehicleYear})<br>
                                            <strong>Stock:</strong> <span class="badge ${p.quantity > 0 ? 'badge-completed' : 'badge-cancelled'}">${p.quantity > 0 ? `${p.quantity} Available` : 'Out of Stock'}</span>
                                        </p>
                                        <hr style="border:0; border-top:1px solid var(--border-color); margin:8px 0;">
                                        <div class="garage-address" style="margin-top:4px; display:flex; justify-content:space-between; align-items:center;">
                                            <span><i class="fa-solid fa-store"></i> <strong>${shop.shopName}</strong></span>
                                            <span style="color:#f59e0b; font-weight:700; font-size:0.9rem; white-space:nowrap;"><i class="fa-solid fa-star"></i> ${shop.rating ? shop.rating.toFixed(1) : '0.0'}</span>
                                        </div>
                                        <div class="garage-address">
                                            <i class="fa-solid fa-location-dot"></i> ${shop.address}, ${shop.city}
                                        </div>
                                        ${distText}
                                        <div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px; margin-top:6px; margin-bottom:4px;">
                                            ${shop.openToday ? 
                                                `<span style="display:inline-flex; align-items:center; gap:0.25rem; font-size:0.75rem; font-weight:700; color:#22c55e; background:rgba(34,197,94,0.1); padding:2px 6px; border-radius:10px;"><i class="fa-solid fa-circle-check"></i> Open Today</span>` :
                                                `<span style="display:inline-flex; align-items:center; gap:0.25rem; font-size:0.75rem; font-weight:700; color:#ef4444; background:rgba(239,68,68,0.1); padding:2px 6px; border-radius:10px;"><i class="fa-solid fa-circle-xmark"></i> Closed Today</span>`
                                            }
                                            ${shop.openTime && shop.closeTime ? 
                                                `<span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;"><i class="fa-solid fa-clock"></i> ${shop.openTime} - ${shop.closeTime} ${shop.openDays ? `(${shop.openDays})` : ''}</span>` : 
                                                ''
                                            }
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
                                    this.drawRoute(shop.latitude, shop.longitude);
                                }
                            });

                            container.appendChild(card);

                            if (shop.latitude && shop.longitude && !renderedShopIds.has(shop.id)) {
                                renderedShopIds.add(shop.id);
                                const marker = L.marker([shop.latitude, shop.longitude], { icon: this.blueIcon }).addTo(this.map);
                                marker.on('click', () => {
                                    this.drawRoute(shop.latitude, shop.longitude);
                                });
                                const distValText = (latitude && longitude && p.distance !== undefined)
                                    ? `<p style="font-size:0.8rem; margin-bottom:4px; color:var(--secondary); font-weight:600;"><i class="fa-solid fa-route"></i> ${p.distance.toFixed(1)} km away</p>`
                                    : '';
                                marker.bindPopup(`
                                    <div style="color:var(--text-primary); font-family:var(--font-body); min-width: 165px;">
                                        <h4 style="font-weight:700; margin-bottom:4px; font-family:var(--font-heading); display:flex; justify-content:space-between; align-items:center;">
                                            <span>${shop.shopName}</span>
                                            <span style="color:#f59e0b; margin-left: 10px; white-space: nowrap;"><i class="fa-solid fa-star"></i> ${shop.rating ? shop.rating.toFixed(1) : '0.0'}</span>
                                        </h4>
                                        <p style="font-size:0.8rem; margin-bottom:6px; color:var(--text-secondary);"><i class="fa-solid fa-location-dot"></i> ${shop.address}, ${shop.city}</p>
                                        ${distValText}
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
                                ? `<div class="garage-distance" style="font-size: 0.85rem; color: var(--secondary); font-weight: 600; margin-top: 4px;"><i class="fa-solid fa-route"></i> ${s.distance.toFixed(1)} km away</div>`
                                : '';

                            const shopImg = (s.imageUrl && s.imageUrl.trim() !== '' && s.imageUrl !== 'break') ? s.imageUrl : 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=400';

                            card.innerHTML = `
                                <img src="${shopImg}" class="garage-card-img" alt="${s.shopName}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=400';">
                                <div class="garage-card-content">
                                    <div>
                                        <div class="garage-header" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                            <h3 class="garage-title" style="margin:0;">${s.shopName}</h3>
                                            <span style="color:#f59e0b; font-weight:700; font-size: 0.95rem; white-space: nowrap;"><i class="fa-solid fa-star"></i> ${s.rating ? s.rating.toFixed(1) : '0.0'}</span>
                                        </div>
                                        <div class="garage-address">
                                            <i class="fa-solid fa-location-dot"></i> ${s.address}, ${s.city}
                                        </div>
                                        ${distText}
                                        <div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px; margin-top:8px; margin-bottom:4px;">
                                            ${s.openToday ? 
                                                `<span style="display:inline-flex; align-items:center; gap:0.25rem; font-size:0.8rem; font-weight:700; color:#22c55e; background:rgba(34,197,94,0.1); padding:3px 8px; border-radius:12px;"><i class="fa-solid fa-circle-check"></i> Open Today</span>` :
                                                `<span style="display:inline-flex; align-items:center; gap:0.25rem; font-size:0.8rem; font-weight:700; color:#ef4444; background:rgba(239,68,68,0.1); padding:3px 8px; border-radius:12px;"><i class="fa-solid fa-circle-xmark"></i> Closed Today</span>`
                                            }
                                            ${s.openTime && s.closeTime ? 
                                                `<span style="font-size:0.8rem; color:var(--text-muted); font-weight:500;"><i class="fa-solid fa-clock"></i> ${s.openTime} - ${s.closeTime} ${s.openDays ? `(${s.openDays})` : ''}</span>` : 
                                                ''
                                            }
                                        </div>
                                        <p class="garage-description" style="margin-top: 8px;">${s.description || 'Quality automotive spare parts.'}</p>
                                    </div>
                                    <div class="garage-footer">
                                        <span class="garage-phone"><i class="fa-solid fa-phone"></i> ${s.phone || 'N/A'}</span>
                                        <a href="shop.html?id=${s.id}" class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.85rem;">View Shop</a>
                                    </div>
                                </div>
                            `;

                            card.addEventListener('click', () => {
                                if (s.latitude && s.longitude) {
                                    this.drawRoute(s.latitude, s.longitude);
                                }
                            });

                            container.appendChild(card);

                            if (s.latitude && s.longitude) {
                                const marker = L.marker([s.latitude, s.longitude], { icon: this.blueIcon }).addTo(this.map);
                                marker.on('click', () => {
                                    this.drawRoute(s.latitude, s.longitude);
                                });
                                const distValText = (latitude && longitude && s.distance !== undefined)
                                    ? `<p style="font-size:0.8rem; margin-bottom:6px; color:var(--secondary); font-weight:600;"><i class="fa-solid fa-route"></i> ${s.distance.toFixed(1)} km away</p>`
                                    : '';
                                marker.bindPopup(`
                                    <div style="color:var(--text-primary); font-family:var(--font-body); min-width: 150px;">
                                        <h4 style="font-weight:700; margin-bottom:4px; font-family:var(--font-heading); display:flex; justify-content:space-between; align-items:center;">
                                            <span>${s.shopName}</span>
                                            <span style="color:#f59e0b; margin-left: 10px; white-space: nowrap;"><i class="fa-solid fa-star"></i> ${s.rating ? s.rating.toFixed(1) : '0.0'}</span>
                                        </h4>
                                        <p style="font-size:0.85rem; margin-bottom:4px; color:var(--text-secondary);"><i class="fa-solid fa-location-dot"></i> ${s.city}</p>
                                        ${distValText}
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

            // Use stored customerCoords if available, otherwise query Geolocation API
            if (this.customerCoords) {
                performSearch(this.customerCoords.lat, this.customerCoords.lng);
            } else {
                // Load parts immediately so search doesn't hang on geolocation prompt/errors
                performSearch(null, null);

                // Optionally retrieve coordinates in the background to refine sorting by distance
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            const newLat = pos.coords.latitude;
                            const newLng = pos.coords.longitude;
                            this.customerCoords = { lat: newLat, lng: newLng };
                            try {
                                localStorage.setItem('customer_coords', JSON.stringify({
                                    lat: newLat,
                                    lng: newLng,
                                    timestamp: Date.now()
                                }));
                            } catch (e) {
                                console.warn("Failed to cache customer coordinates from parts search:", e);
                            }
                            this.showCustomerLocationOnMap();
                            performSearch(newLat, newLng);
                        },
                        () => {}, // Silently fail on block/timeout
                        { timeout: 3000 }
                    );
                }
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
                                <strong style="color: var(--secondary);"><i class="fa-solid fa-truck-pickup"></i> Dispatched Garage:</strong> ${active.acceptedBy ? active.acceptedBy.name : 'Unknown Garage'} <br>
                                ${active.assignedMechanic ? `<strong style="color: var(--secondary);"><i class="fa-solid fa-user-gear"></i> Assigned Mechanic:</strong> ${active.assignedMechanic.name} (${active.assignedMechanic.phone}) <br>` : ''}
                                <strong style="color: var(--secondary);"><i class="fa-solid fa-phone"></i> Call Rescue:</strong> <a href="tel:${active.acceptedBy ? active.acceptedBy.phone : ''}" style="color: var(--secondary); font-weight:700; text-decoration: underline;">${active.acceptedBy ? (active.acceptedBy.phone || 'N/A') : 'N/A'}</a>
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

        calculateDistance(lat1, lon1, lat2, lon2) {
            if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
            const R = 6371; // Radius of the earth in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c; // Distance in km
        },

        showCustomerLocationOnMap() {
            if (!this.map || !this.customerCoords) return;

            // Remove existing customer marker if it exists
            if (this.customerMarker) {
                this.map.removeLayer(this.customerMarker);
            }

            // Create a pulsing divIcon for the customer
            const customerIcon = L.divIcon({
                className: 'customer-location-marker',
                html: '<div class="pulse-circle"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            this.customerMarker = L.marker([this.customerCoords.lat, this.customerCoords.lng], { icon: customerIcon })
                .addTo(this.map)
                .bindPopup(`
                    <div style="font-family: var(--font-body); font-size: 0.85rem; color: var(--text-primary); text-align: center; min-width: 140px;">
                        <strong style="color: var(--success);"><i class="fa-solid fa-user-circle"></i> Your Location</strong>
                        <p style="margin-top: 4px; font-size: 0.75rem; color: var(--text-secondary);">Showing nearest services</p>
                    </div>
                `);

            // Center and zoom to customer location
            this.map.setView([this.customerCoords.lat, this.customerCoords.lng], 13);
        },

        async drawRoute(targetLat, targetLng) {
            if (!this.map) return;

            // Clear existing route, casing, and badge if any
            if (this.routePath) {
                this.map.removeLayer(this.routePath);
                this.routePath = null;
            }
            if (this.routeBorder) {
                this.map.removeLayer(this.routeBorder);
                this.routeBorder = null;
            }
            if (this.routeBadge) {
                this.map.removeLayer(this.routeBadge);
                this.routeBadge = null;
            }

            // Update marker icons (Red for selected, Blue for others)
            if (this.markers) {
                this.markers.forEach(m => {
                    const latlng = m.getLatLng();
                    if (latlng.lat === targetLat && latlng.lng === targetLng) {
                        m.setIcon(this.redIcon);
                    } else {
                        m.setIcon(this.blueIcon);
                    }
                });
            }

            if (this.customerCoords && targetLat && targetLng) {
                const startLat = this.customerCoords.lat;
                const startLng = this.customerCoords.lng;

                try {
                    // Query OSRM routing API for real driving directions
                    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${targetLng},${targetLat}?overview=full&geometries=geojson`);
                    if (!response.ok) throw new Error("OSRM API error");

                    const data = await response.json();
                    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                        const route = data.routes[0];
                        // Convert [lng, lat] to [lat, lng] for Leaflet
                        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

                        // Draw path border / shadow casing
                        this.routeBorder = L.polyline(coordinates, {
                            color: '#1557b0', // Classic Google Maps dark blue casing
                            weight: 10,
                            opacity: 0.6
                        }).addTo(this.map);

                        // Draw primary route path
                        this.routePath = L.polyline(coordinates, {
                            color: '#1a73e8', // Classic Google Maps blue
                            weight: 6,
                            opacity: 0.95
                        }).addTo(this.map);

                        // Position duration badge near the route midpoint
                        const midIndex = Math.floor(coordinates.length / 2);
                        const midCoords = coordinates[midIndex];

                        // Convert duration to minutes
                        const durationMin = Math.round(route.duration / 60);

                        // Create duration pill marker
                        const badgeIcon = L.divIcon({
                            className: 'route-badge-container',
                            html: `<div class="route-badge-pill">${durationMin} min</div>`,
                            iconSize: [60, 25],
                            iconAnchor: [30, 25] // Anchor bottom pointer
                        });

                        this.routeBadge = L.marker(midCoords, { icon: badgeIcon }).addTo(this.map);

                        // Adjust zoom/bounds to fit route path
                        this.map.fitBounds(this.routePath.getBounds(), { padding: [50, 50] });
                        return;
                    }
                } catch (error) {
                    console.warn("OSRM routing failed, falling back to straight polyline:", error);
                }

                // Fallback: draw straight dashed polyline if OSRM fails
                this.routePath = L.polyline(
                    [[startLat, startLng], [targetLat, targetLng]],
                    {
                        color: '#06b6d4',
                        weight: 4,
                        dashArray: '8, 8',
                        opacity: 0.85
                    }
                ).addTo(this.map);

                this.map.fitBounds(this.routePath.getBounds(), { padding: [50, 50] });

            } else if (targetLat && targetLng) {
                this.map.setView([targetLat, targetLng], 13);
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

            // Create default theme tile layer
            this.defaultTileLayer = L.tileLayer(tilesUrl, {
                maxZoom: 20
            }).addTo(this.map);

            // Google Maps layers
            this.googleRoadmap = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                attribution: 'Map data &copy; Google'
            });
            this.googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                attribution: 'Map data &copy; Google'
            });
            this.googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                attribution: 'Map data &copy; Google'
            });

            const baseMaps = {
                "Default Theme": this.defaultTileLayer,
                "Google Roadmap": this.googleRoadmap,
                "Google Satellite": this.googleSatellite,
                "Google Hybrid": this.googleHybrid
            };

            L.control.layers(baseMaps, null, { position: 'topright' }).addTo(this.map);

            // Initialize colored markers (Red for selected, Blue for others)
            this.redIcon = new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            this.blueIcon = new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
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

            // Clear previous map markers and route path
            this.markers.forEach(m => this.map.removeLayer(m));
            this.markers = [];
            if (this.routePath) {
                this.map.removeLayer(this.routePath);
                this.routePath = null;
            }
            if (this.routeBorder) {
                this.map.removeLayer(this.routeBorder);
                this.routeBorder = null;
            }
            if (this.routeBadge) {
                this.map.removeLayer(this.routeBadge);
                this.routeBadge = null;
            }

            try {
                let url = '/api/garages';
                const params = [];
                if (city) params.push(`city=${encodeURIComponent(city)}`);
                if (search) params.push(`search=${encodeURIComponent(search)}`);
                if (params.length > 0) url += '?' + params.join('&');

                const res = await fetch(url);
                if (!res.ok) throw new Error("Failed to load garages");
                const garages = await res.json();

                // Calculate distance and sort if customer location is available
                if (this.customerCoords) {
                    garages.forEach(g => {
                        if (g.latitude && g.longitude) {
                            g.distance = this.calculateDistance(this.customerCoords.lat, this.customerCoords.lng, g.latitude, g.longitude);
                        } else {
                            g.distance = Infinity;
                        }
                    });
                    garages.sort((a, b) => a.distance - b.distance);
                }

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
                if (this.customerCoords) {
                    mapPoints.push([this.customerCoords.lat, this.customerCoords.lng]);
                }

                garages.forEach(g => {
                    const distText = (g.distance !== undefined && g.distance !== Infinity)
                        ? `<div class="garage-distance" style="font-size: 0.85rem; color: var(--secondary); font-weight: 600; margin-top: 4px;"><i class="fa-solid fa-route"></i> ${g.distance.toFixed(1)} km away</div>`
                        : '';

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
                                ${distText}
                                <div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px; margin-top:8px; margin-bottom:4px;">
                                    ${g.openToday ? 
                                        `<span style="display:inline-flex; align-items:center; gap:0.25rem; font-size:0.8rem; font-weight:700; color:#22c55e; background:rgba(34,197,94,0.1); padding:3px 8px; border-radius:12px;"><i class="fa-solid fa-circle-check"></i> Open Today</span>` :
                                        `<span style="display:inline-flex; align-items:center; gap:0.25rem; font-size:0.8rem; font-weight:700; color:#ef4444; background:rgba(239,68,68,0.1); padding:3px 8px; border-radius:12px;"><i class="fa-solid fa-circle-xmark"></i> Closed Today</span>`
                                    }
                                    ${g.openTime && g.closeTime ? 
                                        `<span style="font-size:0.8rem; color:var(--text-muted); font-weight:500;"><i class="fa-solid fa-clock"></i> ${g.openTime} - ${g.closeTime} ${g.openDays ? `(${g.openDays})` : ''}</span>` : 
                                        ''
                                    }
                                </div>
                                <p class="garage-description" style="margin-top: 8px;">${g.description}</p>
                            </div>
                            <div class="garage-footer">
                                <span class="garage-phone"><i class="fa-solid fa-phone"></i> ${g.phone || 'N/A'}</span>
                                <a href="garage.html?id=${g.id}" class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.85rem;">View Profile</a>
                            </div>
                        </div>
                    `;

                    // Click card: draw route and zoom/pan
                    card.addEventListener('click', () => {
                        if (g.latitude && g.longitude) {
                            this.drawRoute(g.latitude, g.longitude);
                        }
                    });

                    container.appendChild(card);

                    // Add map marker
                    if (g.latitude && g.longitude) {
                        const popupDistHtml = (g.distance !== undefined && g.distance !== Infinity)
                            ? `<p style="font-size:0.8rem; margin-bottom:6px; color:var(--secondary); font-weight:600;"><i class="fa-solid fa-route"></i> ${g.distance.toFixed(1)} km away</p>`
                            : '';
                        const marker = L.marker([g.latitude, g.longitude], { icon: this.blueIcon }).addTo(this.map);
                        marker.on('click', () => {
                            this.drawRoute(g.latitude, g.longitude);
                        });
                        marker.bindPopup(`
                            <div style="color:var(--text-primary); font-family:var(--font-body); min-width: 150px;">
                                <h4 style="font-weight:700; margin-bottom:4px; font-family:var(--font-heading);">${g.name}</h4>
                                <p style="font-size:0.8rem; margin-bottom:4px; color:var(--text-secondary);"><i class="fa-solid fa-location-dot"></i> ${g.city}</p>
                                ${popupDistHtml}
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
                dateInput.addEventListener('change', () => {
                    this.updateAvailableSlots();
                });
            }

            try {
                const res = await fetch(`/api/garages/${garageId}`);
                if (!res.ok) throw new Error("Garage not found");

                const data = await res.json();
                this.renderGarageProfile(data.garage);
                this.renderGarageServices(data.services);
                this.renderGarageReviews(data.reviews);

                // Fetch bookings for checking slots
                this.garageBookings = [];
                try {
                    const bookingsRes = await fetch(`/api/bookings/garage/${garageId}`);
                    if (bookingsRes.ok) {
                        this.garageBookings = await bookingsRes.json();
                    }
                } catch (bErr) {
                    console.error("Failed to load bookings for slots checking:", bErr);
                }

                this.updateAvailableSlots();

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
                this.shopParts = data.parts;
                const searchInput = document.getElementById('part-search-input');
                if (searchInput) {
                    searchInput.value = '';
                }
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
                card.className = 'part-card';

                let reserveBtnHtml = '';
                if (!this.currentUser || this.currentUser.role === 'CUSTOMER') {
                    const disabledStr = p.quantity <= 0 ? 'disabled' : '';
                    reserveBtnHtml = `
                        <div class="part-card-footer">
                            <button class="btn btn-primary btn-sm" style="width: 100%; font-size: 0.85rem;" 
                                onclick="window.GarageLK.openReservePartModal(${p.id}, '${(p.partName || '').replace(/'/g, "\\'")}', ${p.price}, ${p.quantity})" 
                                ${disabledStr} unique-id="reserve-btn-${p.id}">
                                <i class="fa-solid fa-cart-shopping"></i> Reserve Part
                            </button>
                        </div>
                    `;
                }

                // Render image tag with onerror event
                const imgUrl = p.imageUrl && p.imageUrl.trim() !== '' && p.imageUrl !== 'break' ? p.imageUrl : '';
                const imgHtml = imgUrl 
                    ? `<img src="${imgUrl}" class="part-card-img" alt="${p.partName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` 
                    : '';
                const placeholderDisplay = imgUrl ? 'none' : 'flex';

                card.innerHTML = `
                    <div class="part-card-img-wrapper">
                        ${imgHtml}
                        <div class="part-card-placeholder" style="display: ${placeholderDisplay};">
                            <i class="fa-solid fa-gears"></i>
                            <span>No Image Available</span>
                        </div>
                    </div>
                    <div class="part-card-content">
                        <div>
                            <div class="part-card-header">
                                <h3 class="part-card-title">${p.partName}</h3>
                                <div class="part-card-price">LKR ${p.price.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                            <div class="part-card-details">
                                <strong>Compatibility:</strong> ${p.vehicleModel} (${p.vehicleYear})<br>
                                <div style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                                    <strong>Stock:</strong>
                                    <span class="badge ${p.quantity > 0 ? 'badge-completed' : 'badge-cancelled'}">
                                        ${p.quantity > 0 ? `${p.quantity} Available` : 'Out of Stock'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        ${reserveBtnHtml}
                    </div>
                `;
                container.appendChild(card);
            });
        },

        filterShopParts() {
            const input = document.getElementById('part-search-input');
            if (!input) return;
            const query = input.value.toLowerCase().trim();

            if (!this.shopParts) return;

            const filteredParts = this.shopParts.filter(p => {
                const nameMatch = p.partName ? p.partName.toLowerCase().includes(query) : false;
                const compatMatch = p.vehicleModel ? p.vehicleModel.toLowerCase().includes(query) : false;
                const yearMatch = p.vehicleYear ? String(p.vehicleYear).includes(query) : false;
                return nameMatch || compatMatch || yearMatch;
            });

            this.renderShopParts(filteredParts);
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
            this.updateAvailableSlots();
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

        updateAvailableSlots() {
            const selectElement = document.getElementById('booking-time');
            if (!selectElement) return;

            const dateInput = document.getElementById('booking-date');
            const selectedDate = dateInput ? dateInput.value : '';

            const selectedNames = Array.from(this.selectedServices.values()).map(s => s.name);

            const slotHours = {
                "08:00 AM - 09:00 AM": 8,
                "09:00 AM - 10:00 AM": 9,
                "10:00 AM - 11:00 AM": 10,
                "11:00 AM - 12:00 PM": 11,
                "01:00 PM - 02:00 PM": 13,
                "02:00 PM - 03:00 PM": 14,
                "03:00 PM - 04:00 PM": 15,
                "04:00 PM - 05:00 PM": 16
            };

            const bookings = this.garageBookings || [];

            for (let i = 0; i < selectElement.options.length; i++) {
                const option = selectElement.options[i];
                const val = option.value;
                if (!val) continue;

                // Determine if this option is booked
                let isBooked = false;

                if (selectedDate && selectedNames.length > 0) {
                    isBooked = bookings.some(b => {
                        if (b.status === 'CANCELLED') return false;

                        // Check date (e.g. "2026-06-29")
                        const bDateStr = b.bookingDate ? b.bookingDate.split('T')[0] : '';
                        if (bDateStr !== selectedDate) return false;

                        // Check slot
                        let slotMatch = false;
                        if (b.timeSlot) {
                            slotMatch = (b.timeSlot === val);
                        } else if (b.bookingDate) {
                            const bHour = new Date(b.bookingDate).getHours();
                            slotMatch = (bHour === slotHours[val]);
                        }

                        if (!slotMatch) return false;

                        // Check services overlap
                        const bookedServices = b.serviceType ? b.serviceType.split(',').map(s => s.trim()) : [];
                        const serviceMatch = selectedNames.some(name => bookedServices.includes(name));

                        return serviceMatch;
                    });
                }

                if (isBooked) {
                    option.disabled = true;
                    option.style.opacity = '0.5';
                    option.style.color = 'var(--text-muted)';
                    if (!option.textContent.endsWith(' (Booked)')) {
                        option.textContent = val + ' (Booked)';
                    }
                    if (selectElement.value === val) {
                        selectElement.value = '';
                    }
                } else {
                    option.disabled = false;
                    option.style.opacity = '';
                    option.style.color = '';
                    option.textContent = val;
                }
            }
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

            this.updateNotificationsBadge();
            // Poll for notifications count every 10 seconds
            setInterval(() => {
                this.updateNotificationsBadge();
            }, 10000);

            // Initialize drag and drop image upload handlers
            this.initImageUploads();
            this.initStarPickers();
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
                    <button class="sidebar-btn" id="side-notifications" onclick="window.GarageLK.switchDashboardTab('notifications'); window.GarageLK.loadNotifications();">
                        <i class="fa-solid fa-bell"></i> Notifications <span id="notifications-badge" class="badge-count" style="display:none; margin-left: 0.5rem; background: var(--danger); color: white; padding: 0.1rem 0.4rem; border-radius: var(--radius-full); font-size: 0.75rem;"></span>
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
                    <button class="sidebar-btn" id="side-notifications" onclick="window.GarageLK.switchDashboardTab('notifications'); window.GarageLK.loadNotifications();">
                        <i class="fa-solid fa-bell"></i> Notifications <span id="notifications-badge" class="badge-count" style="display:none; margin-left: 0.5rem; background: var(--danger); color: white; padding: 0.1rem 0.4rem; border-radius: var(--radius-full); font-size: 0.75rem;"></span>
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
                    <button class="sidebar-btn" id="side-notifications" onclick="window.GarageLK.switchDashboardTab('notifications'); window.GarageLK.loadNotifications();">
                        <i class="fa-solid fa-bell"></i> Notifications <span id="notifications-badge" class="badge-count" style="display:none; margin-left: 0.5rem; background: var(--danger); color: white; padding: 0.1rem 0.4rem; border-radius: var(--radius-full); font-size: 0.75rem;"></span>
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
                    <button class="sidebar-btn" id="side-notifications" onclick="window.GarageLK.switchDashboardTab('notifications'); window.GarageLK.loadNotifications();">
                        <i class="fa-solid fa-bell"></i> Notifications <span id="notifications-badge" class="badge-count" style="display:none; margin-left: 0.5rem; background: var(--danger); color: white; padding: 0.1rem 0.4rem; border-radius: var(--radius-full); font-size: 0.75rem;"></span>
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

        async updateNotificationsBadge() {
            try {
                const res = await fetch('/api/notifications/my');
                if (res.ok) {
                    const data = await res.json();
                    const badge = document.getElementById('notifications-badge');
                    if (badge) {
                        const count = data.unreadCount || 0;
                        if (count > 0) {
                            badge.textContent = count;
                            badge.style.display = 'inline-block';
                        } else {
                            badge.style.display = 'none';
                        }
                    }
                }
            } catch (err) {
                console.error("Error updating notifications badge:", err);
            }
        },

        async loadNotifications() {
            const list = document.getElementById('notifications-list');
            if (!list) return;

            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading notifications...</p>';

            try {
                // Auto mark all read when entering notifications tab
                await fetch('/api/notifications/mark-all-read', { method: 'POST' });

                const res = await fetch('/api/notifications/my');
                if (!res.ok) throw new Error();
                const data = await res.json();
                this.notificationsRaw = data.notifications || [];
                this.renderNotificationsFiltered();
                this.updateNotificationsBadge();
            } catch (err) {
                console.error("Error loading notifications:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading notifications.</p>';
            }
        },

        renderNotificationsFiltered() {
            const list = document.getElementById('notifications-list');
            if (!list) return;

            const searchVal = (document.getElementById('notifications-search-input')?.value || '').toLowerCase().trim();
            let notifications = this.notificationsRaw || [];

            if (searchVal) {
                notifications = notifications.filter(n => 
                    (n.message || '').toLowerCase().includes(searchVal) ||
                    new Date(n.createdAt).toLocaleString().toLowerCase().includes(searchVal)
                );
            }

            if (notifications.length === 0) {
                list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No notifications found.</p>';
                return;
            }

            list.innerHTML = '';
            notifications.forEach(n => {
                const item = document.createElement('div');
                item.className = 'table-item';
                const isRead = n.read !== undefined ? n.read : n.isRead;
                if (!isRead) {
                    item.style.borderLeft = '4px solid var(--secondary)';
                    item.style.background = 'rgba(6, 182, 212, 0.03)';
                }

                const dateStr = new Date(n.createdAt).toLocaleString();
                const markReadBtn = !isRead 
                    ? `<button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; height: auto;" onclick="window.GarageLK.markNotificationRead(${n.id})" unique-id="notif-read-btn-${n.id}"><i class="fa-solid fa-check"></i> Mark Read</button>` 
                    : '<span style="font-size: 0.8rem; color: var(--success);"><i class="fa-solid fa-check-double"></i> Read</span>';

                item.innerHTML = `
                    <div style="flex:1;">
                        <p style="font-size:0.95rem; font-weight: 500; margin:0 0 4px 0;">${n.message}</p>
                        <span style="font-size:0.8rem; color:var(--text-muted);">${dateStr}</span>
                    </div>
                    <div style="text-align: right; min-width: 120px;">
                        ${markReadBtn}
                    </div>
                `;
                list.appendChild(item);
            });
        },

        async markNotificationRead(id) {
            try {
                const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
                if (res.ok) {
                    this.loadNotifications();
                } else {
                    this.showToast("Failed to update notification status", "error");
                }
            } catch (err) {
                console.error("Error marking notification as read:", err);
            }
        },

        async markAllNotificationsRead() {
            try {
                const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
                if (res.ok) {
                    this.loadNotifications();
                    this.showToast("All notifications marked as read", "success");
                } else {
                    this.showToast("Failed to update notifications", "error");
                }
            } catch (err) {
                console.error("Error marking all read:", err);
            }
        },

        async clearNotifications() {
            if (!confirm("Are you sure you want to permanently clear all your notifications?")) return;
            try {
                const res = await fetch('/api/notifications/clear', { method: 'POST' });
                if (res.ok) {
                    this.loadNotifications();
                    this.showToast("All notifications cleared", "success");
                } else {
                    this.showToast("Failed to clear notifications", "error");
                }
            } catch (err) {
                console.error("Error clearing notifications:", err);
            }
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

                this.customerBookingsRaw = bookings;
                this.renderCustomerBookingsFiltered();
            } catch (err) {
                console.error("Error loading customer bookings:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading bookings.</p>';
            }
        },

        renderCustomerBookingsFiltered() {
            const list = document.getElementById('customer-bookings-list');
            const completedList = document.getElementById('customer-completed-bookings-list');
            if (!list) return;

            const searchVal = (document.getElementById('customer-booking-search-input')?.value || '').toLowerCase().trim();
            let bookings = this.customerBookingsRaw || [];

            if (searchVal) {
                bookings = bookings.filter(b => 
                    (b.bookingCode || '').toLowerCase().includes(searchVal) ||
                    (b.garage ? b.garage.name || b.garage.garageName || '' : '').toLowerCase().includes(searchVal) ||
                    (b.description || '').toLowerCase().includes(searchVal) ||
                    (b.vehicleNo || '').toLowerCase().includes(searchVal) ||
                    (b.vehicleType || '').toLowerCase().includes(searchVal) ||
                    (b.servicesSelected || '').toLowerCase().includes(searchVal)
                );
            }

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
                            onclick="window.GarageLK.openCancellationModal(${b.id}, 'BOOKING')" unique-id="cancel-btn-${b.id}">
                            Cancel
                        </button>
                    `;

                    item.innerHTML = `
                        <div style="flex:1;">
                            <h4 style="font-weight:700;">${b.garage.name} <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.bookingCode || 'No ID'})</span></h4>
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
                            <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${(b.totalPrice != null ? b.totalPrice : (b.price != null ? b.price : 0)).toFixed(2)}</span>
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

                        const reasonHtml = (b.status === 'CANCELLED' && b.cancellationReason) 
                            ? `<br><strong style="color:var(--danger);">Reason for Cancel:</strong> ${b.cancellationReason}` 
                            : '';

                        item.innerHTML = `
                            <div style="flex:1;">
                                <h4 style="font-weight:700;">${b.garage.name} <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.bookingCode || 'No ID'})</span></h4>
                                <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                    <i class="fa-regular fa-calendar"></i> ${b.bookingDate} &bull; <i class="fa-regular fa-clock"></i> ${b.timeSlot}
                                </p>
                                <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">
                                    <strong>Vehicle:</strong> ${b.vehicleType} (${b.vehicleNo}) <br>
                                    <strong>Details:</strong> ${b.description}
                                    ${reasonHtml}
                                </p>
                            </div>
                            <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; min-width: 150px;">
                                <span class="badge ${badgeClass}">${b.status}</span>
                                <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${(b.totalPrice != null ? b.totalPrice : (b.price != null ? b.price : 0)).toFixed(2)}</span>
                                <div id="${reviewBtnContainerId}" style="display:inline-block; margin-top:0.25rem;"></div>
                            </div>
                        `;
                        completedList.appendChild(item);

                        if (b.status === 'COMPLETED') {
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

                this.renderOwnerGaragesFiltered();
            } catch (err) {
                console.error("Error loading owner garages:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading garages.</p>';
            }
        },

        renderOwnerGaragesFiltered() {
            const list = document.getElementById('owner-garages-list');
            if (!list) return;

            const searchVal = (document.getElementById('owner-garage-search-input')?.value || '').toLowerCase().trim();
            let garages = this.ownerGarages || [];

            if (searchVal) {
                garages = garages.filter(g => 
                    (g.name || '').toLowerCase().includes(searchVal) ||
                    (g.city || '').toLowerCase().includes(searchVal) ||
                    (g.address || '').toLowerCase().includes(searchVal) ||
                    (g.description || '').toLowerCase().includes(searchVal)
                );
            }

            if (garages.length === 0) {
                list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No garages found matching search.</p>';
                return;
            }

            list.innerHTML = '';
            garages.forEach(g => {
                const item = document.createElement('div');
                item.className = 'table-item';

                let badgeClass = 'badge-pending';
                if (g.status === 'APPROVED') badgeClass = 'badge-completed';

                item.innerHTML = `
                    <a href="garage.html?id=${g.id}" class="profile-link" style="display:flex; gap:1rem; align-items:center; text-decoration:none; color:inherit;" unique-id="view-garage-profile-${g.id}">
                        <img src="${g.imageUrl || 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=150'}" style="width:80px; height:60px; object-fit:cover; border-radius:var(--radius-sm);">
                        <div>
                            <h4 style="font-weight:700;">${g.name}</h4>
                            <p style="font-size:0.85rem; color:var(--text-secondary);"><i class="fa-solid fa-location-dot"></i> ${g.address}, ${g.city}</p>
                        </div>
                    </a>
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
        },
        async loadOwnerBookings() {
            const list = document.getElementById('owner-bookings-list');
            const completedList = document.getElementById('owner-completed-bookings-list');
            
            list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading bookings...</p>';
            if (completedList) {
                completedList.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--text-muted);">Loading completed history...</p>';
            }

            try {
                const res = await fetch('/api/bookings/my');
                const bookings = await res.json();
                if (!res.ok) throw new Error();

                this.ownerBookingsRaw = bookings;
                this.renderOwnerBookingsFiltered();
            } catch (err) {
                console.error("Error loading owner bookings:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading bookings.</p>';
            }
        },

        renderOwnerBookingsFiltered() {
            const list = document.getElementById('owner-bookings-list');
            const completedList = document.getElementById('owner-completed-bookings-list');
            const clearBtn = document.getElementById('btn-clear-bookings-history');
            
            if (!list) return;

            if (!this.ownerBookingsRaw) {
                list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No bookings found.</p>';
                return;
            }

            const searchVal = (document.getElementById('owner-booking-search-input')?.value || '').toLowerCase().trim();

            let bookings = this.ownerBookingsRaw;

            if (searchVal) {
                bookings = bookings.filter(b => 
                    (b.bookingCode || '').toLowerCase().includes(searchVal) ||
                    (b.user.fullName || b.user.username || '').toLowerCase().includes(searchVal) ||
                    (b.user.phone || '').toLowerCase().includes(searchVal) ||
                    (b.garage ? b.garage.garageName || b.garage.name || '' : '').toLowerCase().includes(searchVal) ||
                    (b.description || '').toLowerCase().includes(searchVal) ||
                    (b.vehicleNo || '').toLowerCase().includes(searchVal) ||
                    (b.servicesSelected || '').toLowerCase().includes(searchVal)
                );
            }

            const activeBookings = bookings.filter(b => b.status === 'PENDING' || b.status === 'APPROVED');
            const completedBookings = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

            // 1. Render Active Bookings
            if (activeBookings.length === 0) {
                list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No active booking requests found matching search.</p>';
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
                                <h4 style="font-weight:700; margin-bottom:0;">${b.user.fullName || b.user.username} <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.bookingCode || 'No ID'})</span></h4>
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
                            <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${(b.totalPrice != null ? b.totalPrice : (b.price != null ? b.price : 0)).toFixed(2)}</span>
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
                    completedList.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No completed booking history found matching search.</p>';
                    if (clearBtn) clearBtn.style.display = 'none';
                } else {
                    if (clearBtn) clearBtn.style.display = 'inline-block';
                    completedList.innerHTML = '';
                    completedBookings.forEach(b => {
                        const item = document.createElement('div');
                        item.className = 'table-item';

                        let titleHtml = `<h4 style="font-weight:700; margin-bottom:0; color:var(--success);"><i class="fa-solid fa-circle-check"></i> Completed Appointment <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.bookingCode || 'No ID'})</span></h4>`;
                        let badgeClass = 'badge-completed';
                        if (b.status === 'CANCELLED') {
                            titleHtml = `<h4 style="font-weight:700; margin-bottom:0; color:var(--danger);"><i class="fa-solid fa-circle-xmark"></i> Cancelled Appointment <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.bookingCode || 'No ID'})</span></h4>`;
                            badgeClass = 'badge-cancelled';
                        }

                        const reasonHtml = (b.status === 'CANCELLED' && b.cancellationReason) 
                            ? `<br><strong style="color:var(--danger);">Reason for Cancel:</strong> ${b.cancellationReason}` 
                            : '';

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
                                    ${reasonHtml}
                                </p>
                            </div>
                            <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; min-width: 180px;">
                                <span class="badge ${badgeClass}">${b.status}</span>
                                <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${(b.totalPrice != null ? b.totalPrice : (b.price != null ? b.price : 0)).toFixed(2)}</span>
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

                this.renderOwnerServicesFiltered();
            } catch (err) {
                console.error("Error loading owner services:", err);
                container.innerHTML = '<p style="color:var(--danger);">Error loading services.</p>';
            }
        },

        renderOwnerServicesFiltered() {
            const garageId = document.getElementById('owner-services-garage-select')?.value;
            const container = document.getElementById('owner-services-container');
            if (!container) return;

            if (!garageId) {
                container.innerHTML = '<p style="color:var(--text-muted);">Please select a garage to manage services.</p>';
                return;
            }

            const searchVal = (document.getElementById('owner-service-search-input')?.value || '').toLowerCase().trim();
            let services = this.ownerServices || [];

            if (searchVal) {
                services = services.filter(s => 
                    (s.serviceName || '').toLowerCase().includes(searchVal) ||
                    (s.description || '').toLowerCase().includes(searchVal)
                );
            }

            if (services.length === 0) {
                container.innerHTML = '<p style="color:var(--text-muted);">No services found matching search.</p>';
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

                // Fetch mechanics
                const resMechanics = await fetch('/api/mechanics');
                const mechanics = await resMechanics.json();
                if (resMechanics.ok) {
                    this.ownerMechanicsList = mechanics;
                } else {
                    this.ownerMechanicsList = [];
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

            // Filter mechanics
            let filteredMechanics = this.ownerMechanicsList || [];
            if (selectedGarageId) {
                filteredMechanics = filteredMechanics.filter(m => m.garage && m.garage.id === parseInt(selectedGarageId, 10));
            }
            let mechanicsCount = filteredMechanics.length;
            const statTotalMechanics = document.getElementById('stat-total-mechanics');
            if (statTotalMechanics) {
                statTotalMechanics.textContent = mechanicsCount;
            }

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

            // Filter mechanics
            let filteredMechanics = this.ownerMechanicsList || [];
            if (selectedGarageId) {
                filteredMechanics = filteredMechanics.filter(m => m.garage && m.garage.id === parseInt(selectedGarageId, 10));
            }
            const mechanicsCount = filteredMechanics.length;

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
                { 'Metric': 'Completed Rescues', 'Value': completedRescuesCount },
                { 'Metric': 'Total Mechanics', 'Value': mechanicsCount }
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
                    this.adminGaragesRaw = await res.json();
                    this.renderAdminApprovalsFiltered();
                }

                // Fetch Shops
                const shopRes = await fetch('/api/shops/all');
                if (shopRes.ok) {
                    this.adminShopsRaw = await shopRes.json();
                    this.renderAdminShopApprovalsFiltered();
                }
            } catch (err) {
                console.error("Error loading admin approvals:", err);
                if (list) list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading admin approvals.</p>';
                if (approvedGaragesList) approvedGaragesList.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading approved list.</p>';
            }
        },

        renderAdminApprovalsFiltered() {
            const list = document.getElementById('admin-approvals-list');
            const approvedGaragesList = document.getElementById('admin-approved-garages-list');
            if (!this.adminGaragesRaw) return;

            const searchVal = (document.getElementById('admin-garage-search-input')?.value || '').toLowerCase().trim();
            let garages = this.adminGaragesRaw;

            if (searchVal) {
                garages = garages.filter(g => 
                    (g.name || '').toLowerCase().includes(searchVal) ||
                    (g.city || '').toLowerCase().includes(searchVal) ||
                    (g.address || '').toLowerCase().includes(searchVal) ||
                    (g.description || '').toLowerCase().includes(searchVal) ||
                    (g.owner && (g.owner.fullName || g.owner.username || '').toLowerCase().includes(searchVal))
                );
            }

            const pending = garages.filter(g => g.status === 'PENDING_APPROVAL' || g.status === 'PENDING');
            const approved = garages.filter(g => g.status === 'APPROVED' || g.status === 'SUSPENDED');

            // Render pending list
            if (list) {
                if (pending.length === 0) {
                    list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No garages found matching search.</p>';
                } else {
                    list.innerHTML = '';
                    pending.forEach(g => {
                        const item = document.createElement('div');
                        item.className = 'table-item';
                        item.innerHTML = `
                            <a href="garage.html?id=${g.id}&isAdminView=true" style="text-decoration:none; color:inherit; display:flex; gap:1.25rem; align-items:center; flex:1;" unique-id="click-garage-approval-${g.id}">
                                <img src="${g.imageUrl || 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=150'}" style="width:100px; height:75px; object-fit:cover; border-radius:var(--radius-sm);">
                                <div>
                                    <h4 style="font-weight:700; margin-bottom:2px;">${g.name}</h4>
                                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                        <i class="fa-solid fa-location-dot"></i> ${g.address}, ${g.city} &bull; <i class="fa-solid fa-user"></i> Owner: ${g.owner ? (g.owner.fullName || g.owner.username) : 'N/A'} &bull; <i class="fa-solid fa-id-card"></i> BRN: <strong style="color:var(--text-primary); font-family:monospace;">${g.businessRegNo || 'N/A'}</strong>
                                    </p>
                                    <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">${g.description}</p>
                                </div>
                            </a>
                            <div style="display:flex; gap:0.5rem; align-items:center;">
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

            // Render approved list
            if (approvedGaragesList) {
                if (approved.length === 0) {
                    approvedGaragesList.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No approved garages found matching search.</p>';
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
                            <a href="garage.html?id=${g.id}&isAdminView=true" style="text-decoration:none; color:inherit; display:flex; gap:1.25rem; align-items:center; flex:1;" unique-id="click-approved-garage-${g.id}">
                                <img src="${g.imageUrl || 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?w=150'}" style="width:100px; height:75px; object-fit:cover; border-radius:var(--radius-sm);">
                                <div>
                                    <h4 style="font-weight:700; margin-bottom:2px; display:flex; align-items:center; gap:0.5rem;">
                                        ${g.name}
                                        <span class="badge ${statusBadgeClass}" style="font-size:0.7rem; padding:0.15rem 0.4rem;">${statusText}</span>
                                    </h4>
                                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                        <i class="fa-solid fa-location-dot"></i> ${g.address}, ${g.city} &bull; <i class="fa-solid fa-user"></i> Owner: ${g.owner ? (g.owner.fullName || g.owner.username) : 'N/A'} &bull; <i class="fa-solid fa-id-card"></i> BRN: <strong style="color:var(--text-primary); font-family:monospace;">${g.businessRegNo || 'N/A'}</strong>
                                    </p>
                                    <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">${g.description}</p>
                                </div>
                            </a>
                            <div style="display:flex; gap:0.5rem; align-items:center;">
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
        },

        renderAdminShopApprovalsFiltered() {
            const shopList = document.getElementById('admin-shop-approvals-list');
            const approvedShopsList = document.getElementById('admin-approved-shops-list');
            if (!this.adminShopsRaw) return;

            const searchVal = (document.getElementById('admin-shop-search-input')?.value || '').toLowerCase().trim();
            let shops = this.adminShopsRaw;

            if (searchVal) {
                shops = shops.filter(s => 
                    (s.name || s.shopName || '').toLowerCase().includes(searchVal) ||
                    (s.city || '').toLowerCase().includes(searchVal) ||
                    (s.address || '').toLowerCase().includes(searchVal) ||
                    (s.description || '').toLowerCase().includes(searchVal) ||
                    (s.ownerName || '').toLowerCase().includes(searchVal)
                );
            }

            const pendingShops = shops.filter(s => s.status === 'PENDING_APPROVAL' || s.status === 'PENDING');
            const approvedShops = shops.filter(s => s.status === 'APPROVED' || s.status === 'SUSPENDED');

            // Render pending list
            if (shopList) {
                if (pendingShops.length === 0) {
                    shopList.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No shops found matching search.</p>';
                } else {
                    shopList.innerHTML = '';
                    pendingShops.forEach(s => {
                        const item = document.createElement('div');
                        item.className = 'table-item';
                        item.innerHTML = `
                            <a href="shop.html?id=${s.id}&isAdminView=true" style="text-decoration:none; color:inherit; display:flex; gap:1.25rem; align-items:center; flex:1;" unique-id="click-shop-approval-${s.id}">
                                <img src="${s.imageUrl || 'https://images.unsplash.com/photo-1607603731995-5751e3016848?w=150'}" style="width:100px; height:75px; object-fit:cover; border-radius:var(--radius-sm);">
                                <div>
                                    <h4 style="font-weight:700; margin-bottom:2px;">${s.name || s.shopName}</h4>
                                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                        <i class="fa-solid fa-location-dot"></i> ${s.address}, ${s.city} &bull; <i class="fa-solid fa-user"></i> Owner: ${s.ownerName || 'N/A'} &bull; <i class="fa-solid fa-id-card"></i> BRN: <strong style="color:var(--text-primary); font-family:monospace;">${s.businessRegNo || 'N/A'}</strong>
                                    </p>
                                    <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">${s.description}</p>
                                </div>
                            </a>
                            <div style="display:flex; gap:0.5rem; align-items:center;">
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

            // Render approved list
            if (approvedShopsList) {
                if (approvedShops.length === 0) {
                    approvedShopsList.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No approved shops found matching search.</p>';
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
                            <a href="shop.html?id=${s.id}&isAdminView=true" style="text-decoration:none; color:inherit; display:flex; gap:1.25rem; align-items:center; flex:1;" unique-id="click-approved-shop-${s.id}">
                                <img src="${s.imageUrl || 'https://images.unsplash.com/photo-1607603731995-5751e3016848?w=150'}" style="width:100px; height:75px; object-fit:cover; border-radius:var(--radius-sm);">
                                <div>
                                    <h4 style="font-weight:700; margin-bottom:2px; display:flex; align-items:center; gap:0.5rem;">
                                        ${s.name || s.shopName}
                                        <span class="badge ${statusBadgeClass}" style="font-size:0.7rem; padding:0.15rem 0.4rem;">${statusText}</span>
                                    </h4>
                                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                                        <i class="fa-solid fa-location-dot"></i> ${s.address}, ${s.city} &bull; <i class="fa-solid fa-user"></i> Owner: ${s.ownerName || 'N/A'} &bull; <i class="fa-solid fa-id-card"></i> BRN: <strong style="color:var(--text-primary); font-family:monospace;">${s.businessRegNo || 'N/A'}</strong>
                                    </p>
                                    <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.3;">${s.description}</p>
                                </div>
                            </a>
                            <div style="display:flex; gap:0.5rem; align-items:center;">
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
            const businessRegNo = document.getElementById('garage-business-reg-no').value.trim();
            
            const openTime = document.getElementById('garage-open-time').value;
            const closeTime = document.getElementById('garage-close-time').value;
            const openDays = document.getElementById('garage-open-days').value.trim();
            const openToday = document.getElementById('garage-open-today').checked;
            
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
                        name, description, address, city, phone, email, imageUrl, latitude, longitude, openTime, closeTime, openDays, openToday, businessRegNo
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
            const bookingIdVal = document.getElementById('review-booking-id').value;
            const breakdownIdVal = document.getElementById('review-breakdown-id').value;
            const rating = parseFloat(document.getElementById('review-rating').value);
            const comment = document.getElementById('review-comment').value.trim();

            const payload = { rating, comment };
            if (bookingIdVal) {
                payload.bookingId = bookingIdVal;
            } else if (breakdownIdVal) {
                payload.breakdownRequestId = breakdownIdVal;
            }

            try {
                const res = await fetch('/api/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Review submitted successfully!', 'success');
                    this.closeModal('modal-review');
                    if (bookingIdVal) {
                        this.loadCustomerBookings();
                    } else {
                        this.loadCustomerBreakdowns();
                    }
                    e.target.reset();
                    document.getElementById('review-booking-id').value = '';
                    document.getElementById('review-breakdown-id').value = '';
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
                        
                    this.pickerDefaultTileLayer = L.tileLayer(tilesUrl, {
                        maxZoom: 20
                    }).addTo(this.pickerMap);
                    
                    const googleRoadmap = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                        maxZoom: 20,
                        attribution: 'Map data &copy; Google'
                    });
                    const googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                        maxZoom: 20,
                        attribution: 'Map data &copy; Google'
                    });
                    const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                        maxZoom: 20,
                        attribution: 'Map data &copy; Google'
                    });
                    
                    const baseMaps = {
                        "Default Theme": this.pickerDefaultTileLayer,
                        "Google Roadmap": googleRoadmap,
                        "Google Satellite": googleSatellite,
                        "Google Hybrid": googleHybrid
                    };
                    
                    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(this.pickerMap);
                    
                    this.pickerMap.on('click', (e) => {
                        this.handleMapClick(e.latlng);
                    });
                } else {
                    const savedTheme = localStorage.getItem('theme') || 'night';
                    const tilesUrl = savedTheme === 'day'
                        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
                    if (this.pickerDefaultTileLayer) {
                        this.pickerDefaultTileLayer.setUrl(tilesUrl);
                    }
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
                    
                    // Auto-locate user's location and set selected marker
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                const userLat = position.coords.latitude;
                                const userLng = position.coords.longitude;
                                if (this.pickerMap) {
                                    this.pickerMap.setView([userLat, userLng], 15);
                                    this.handleMapClick(L.latLng(userLat, userLng));
                                    this.showUserLocationOnPickerMap(userLat, userLng);
                                }
                            },
                            (error) => {
                                console.log("Auto-locate error or denied permission:", error);
                            },
                            { enableHighAccuracy: true, timeout: 5000 }
                        );
                    }
                }

                // Always try to display user device location as a pulsing green dot on pickerMap
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const userLat = position.coords.latitude;
                            const userLng = position.coords.longitude;
                            if (this.pickerMap) {
                                this.showUserLocationOnPickerMap(userLat, userLng);
                            }
                        },
                        (error) => {
                            console.log("Device location lookup failed:", error);
                        },
                        { enableHighAccuracy: true, timeout: 5000 }
                    );
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
        
        locateUserOnPickerMap() {
            if (navigator.geolocation) {
                this.showToast('Locating your position...', 'info');
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const userLat = position.coords.latitude;
                        const userLng = position.coords.longitude;
                        if (this.pickerMap) {
                            this.pickerMap.setView([userLat, userLng], 15);
                            this.showUserLocationOnPickerMap(userLat, userLng);
                            this.handleMapClick(L.latLng(userLat, userLng));
                            this.showToast('Location found!', 'success');
                        }
                    },
                    (error) => {
                        console.error("Geolocation error:", error);
                        this.showToast('Could not access your location. Please check browser permissions.', 'error');
                    },
                    { enableHighAccuracy: true, timeout: 7000 }
                );
            } else {
                this.showToast('Geolocation is not supported by your browser.', 'error');
            }
        },

        showUserLocationOnPickerMap(lat, lng) {
            const userLocIcon = L.divIcon({
                className: 'user-location-marker-container',
                html: '<div class="user-location-marker"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            if (this.pickerUserLocationMarker) {
                this.pickerUserLocationMarker.setLatLng([lat, lng]);
            } else {
                this.pickerUserLocationMarker = L.marker([lat, lng], { icon: userLocIcon }).addTo(this.pickerMap);
            }
        },
        
        closeMapPicker() {
            this.closeModal('modal-map-picker');
            this.activeLatInput = null;
            this.activeLngInput = null;
            if (this.pickerUserLocationMarker) {
                if (this.pickerMap) {
                    this.pickerMap.removeLayer(this.pickerUserLocationMarker);
                }
                this.pickerUserLocationMarker = null;
            }
        },

        async viewBreakdownOnMap(customerLat, customerLng, breakdownId, breakdownCity) {
            try {
                const res = await fetch('/api/garages/my');
                if (!res.ok) throw new Error("Failed to fetch owner garages");
                const garages = await res.json();
                
                const approvedGarages = garages.filter(g => g.status === 'APPROVED');
                if (approvedGarages.length === 0) {
                    this.showToast("You don't have any approved garages to route from.", "error");
                    return;
                }
                
                // Find the closest approved garage
                let closestGarage = null;
                let minDistance = Infinity;
                
                approvedGarages.forEach(g => {
                    if (g.latitude !== null && g.longitude !== null && g.latitude !== undefined && g.longitude !== undefined) {
                        const dist = this.calculateDistance(customerLat, customerLng, g.latitude, g.longitude);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestGarage = g;
                        }
                    }
                });
                
                if (!closestGarage) {
                    this.showToast("None of your approved garages have coordinates set.", "error");
                    return;
                }
                
                // Open modal
                this.openModal('modal-view-breakdown-route');
                
                // Wait for modal display transitions to complete
                setTimeout(async () => {
                    const savedTheme = localStorage.getItem('theme') || 'night';
                    
                    // Initialize map if not yet done
                    if (!this.breakdownRouteMap) {
                        this.breakdownRouteMap = L.map('breakdown-route-map', {
                            zoomControl: true,
                            attributionControl: false
                        });
                        
                        const savedTheme = localStorage.getItem('theme') || 'night';
                        const tilesUrl = savedTheme === 'day'
                            ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
                            
                        this.breakdownDefaultTileLayer = L.tileLayer(tilesUrl, {
                            maxZoom: 20
                        }).addTo(this.breakdownRouteMap);
                        
                        const googleRoadmap = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                            maxZoom: 20,
                            attribution: 'Map data &copy; Google'
                        });
                        const googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                            maxZoom: 20,
                            attribution: 'Map data &copy; Google'
                        });
                        const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                            maxZoom: 20,
                            attribution: 'Map data &copy; Google'
                        });
                        
                        const baseMaps = {
                            "Default Theme": this.breakdownDefaultTileLayer,
                            "Google Roadmap": googleRoadmap,
                            "Google Satellite": googleSatellite,
                            "Google Hybrid": googleHybrid
                        };
                        
                        L.control.layers(baseMaps, null, { position: 'topright' }).addTo(this.breakdownRouteMap);
                    } else {
                        const savedTheme = localStorage.getItem('theme') || 'night';
                        const tilesUrl = savedTheme === 'day'
                            ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
                        if (this.breakdownDefaultTileLayer) {
                            this.breakdownDefaultTileLayer.setUrl(tilesUrl);
                        }
                    }
                    
                    // Clear existing layers
                    if (this.breakdownRouteMarkers) {
                        this.breakdownRouteMarkers.forEach(m => this.breakdownRouteMap.removeLayer(m));
                    }
                    this.breakdownRouteMarkers = [];
                    
                    if (this.breakdownRoutePath) {
                        this.breakdownRouteMap.removeLayer(this.breakdownRoutePath);
                        this.breakdownRoutePath = null;
                    }
                    if (this.breakdownRouteBorder) {
                        this.breakdownRouteMap.removeLayer(this.breakdownRouteBorder);
                        this.breakdownRouteBorder = null;
                    }
                    if (this.breakdownRouteBadge) {
                        this.breakdownRouteMap.removeLayer(this.breakdownRouteBadge);
                        this.breakdownRouteBadge = null;
                    }
                    
                    // Red marker for customer, Blue marker for garage
                    if (!this.redIcon) {
                        this.redIcon = new L.Icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                            shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                            shadowSize: [41, 41]
                        });
                    }
                    if (!this.blueIcon) {
                        this.blueIcon = new L.Icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                            shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                            shadowSize: [41, 41]
                        });
                    }
                    
                    // Add markers to breakdownRouteMarkers array & map
                    const garageMarker = L.marker([closestGarage.latitude, closestGarage.longitude], { icon: this.blueIcon })
                        .addTo(this.breakdownRouteMap)
                        .bindPopup(`<strong>Your Garage: ${closestGarage.name}</strong>`);
                    const customerMarker = L.marker([customerLat, customerLng], { icon: this.redIcon })
                        .addTo(this.breakdownRouteMap)
                        .bindPopup(`<strong>Stranded Customer (ID: ${breakdownId})</strong>`);
                        
                    this.breakdownRouteMarkers.push(garageMarker);
                    this.breakdownRouteMarkers.push(customerMarker);
                    
                    this.breakdownRouteMap.invalidateSize();
                    
                    // Let's draw the route!
                    const startLat = closestGarage.latitude;
                    const startLng = closestGarage.longitude;
                    const endLat = customerLat;
                    const endLng = customerLng;
                    
                    try {
                        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`);
                        if (!response.ok) throw new Error("OSRM API error");
                        
                        const data = await response.json();
                        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                            const route = data.routes[0];
                            const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                            
                            // Draw casing
                            this.breakdownRouteBorder = L.polyline(coordinates, {
                                color: '#1557b0',
                                weight: 10,
                                opacity: 0.6
                            }).addTo(this.breakdownRouteMap);
                            
                            // Draw primary route path
                            this.breakdownRoutePath = L.polyline(coordinates, {
                                color: '#1a73e8',
                                weight: 6,
                                opacity: 0.95
                            }).addTo(this.breakdownRouteMap);
                            
                            // Position duration badge near the route midpoint
                            const midIndex = Math.floor(coordinates.length / 2);
                            const midCoords = coordinates[midIndex];
                            const durationMin = Math.round(route.duration / 60);
                            
                            const badgeIcon = L.divIcon({
                                className: 'route-badge-container',
                                html: `<div class="route-badge-pill">${durationMin} min</div>`,
                                iconSize: [60, 25],
                                iconAnchor: [30, 25]
                            });
                            
                            this.breakdownRouteBadge = L.marker(midCoords, { icon: badgeIcon }).addTo(this.breakdownRouteMap);
                            
                            this.breakdownRouteMap.fitBounds(this.breakdownRoutePath.getBounds(), { padding: [50, 50] });
                            return;
                        }
                    } catch (err) {
                        console.warn("OSRM routing on dashboard failed, falling back to straight polyline:", err);
                    }
                    
                    // Fallback to straight dashed line
                    this.breakdownRoutePath = L.polyline(
                        [[startLat, startLng], [endLat, endLng]],
                        {
                            color: '#06b6d4',
                            weight: 4,
                            dashArray: '8, 8',
                            opacity: 0.85
                        }
                    ).addTo(this.breakdownRouteMap);
                    
                    this.breakdownRouteMap.fitBounds(this.breakdownRoutePath.getBounds(), { padding: [50, 50] });
                }, 350);
                
            } catch (err) {
                console.error("Error drawing breakdown route map:", err);
                this.showToast("Error loading breakdown route.", "error");
            }
        },
        
        closeBreakdownRouteMap() {
            this.closeModal('modal-view-breakdown-route');
        },

        // --- EMERGENCY BREAKDOWN ASSIST ---
        openEmergencyModal() {
            if (!this.currentUser) {
                this.showToast('Please Sign In to submit an emergency assist request.', 'error');
                setTimeout(() => { window.location.href = 'auth.html'; }, 1000);
                return;
            }
            if (this.customerCoords) {
                const latInput = document.getElementById('breakdown-lat');
                const lngInput = document.getElementById('breakdown-lng');
                if (latInput) latInput.value = this.customerCoords.lat;
                if (lngInput) lngInput.value = this.customerCoords.lng;
            } else {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            const newLat = pos.coords.latitude;
                            const newLng = pos.coords.longitude;
                            this.customerCoords = { lat: newLat, lng: newLng };
                            const latInput = document.getElementById('breakdown-lat');
                            const lngInput = document.getElementById('breakdown-lng');
                            if (latInput) latInput.value = newLat;
                            if (lngInput) lngInput.value = newLng;
                            this.showCustomerLocationOnMap();
                        },
                        () => {},
                        { timeout: 5000, enableHighAccuracy: true }
                    );
                }
            }
            this.openModal('modal-breakdown');
        },

        detectLocation() {
            if (navigator.geolocation) {
                this.showToast("Retrieving GPS coordinates...", "success");
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const newLat = position.coords.latitude;
                        const newLng = position.coords.longitude;
                        document.getElementById('breakdown-lat').value = newLat;
                        document.getElementById('breakdown-lng').value = newLng;
                        this.showToast("GPS Location auto-detected!", "success");

                        // Also cache it so the main homepage has access to it immediately
                        try {
                            localStorage.setItem('customer_coords', JSON.stringify({
                                lat: newLat,
                                lng: newLng,
                                timestamp: Date.now()
                            }));
                        } catch (e) {
                            console.warn("Failed to cache customer coordinates from emergency detection:", e);
                        }
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

                this.customerBreakdownsRaw = breakdowns;
                this.renderCustomerBreakdownsFiltered();
            } catch (err) {
                console.error("Error loading customer breakdowns:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading emergencies.</p>';
            }
        },

        renderCustomerBreakdownsFiltered() {
            const list = document.getElementById('customer-breakdowns-list');
            const completedList = document.getElementById('customer-completed-breakdowns-list');
            if (!list) return;

            const searchVal = (document.getElementById('customer-breakdown-search-input')?.value || '').toLowerCase().trim();
            let breakdowns = this.customerBreakdownsRaw || [];

            if (searchVal) {
                breakdowns = breakdowns.filter(b => 
                    (b.breakdownCode || '').toLowerCase().includes(searchVal) ||
                    (b.acceptedBy ? b.acceptedBy.name || b.acceptedBy.garageName || '' : '').toLowerCase().includes(searchVal) ||
                    (b.description || '').toLowerCase().includes(searchVal) ||
                    (b.vehicleNo || '').toLowerCase().includes(searchVal) ||
                    (b.address || '').toLowerCase().includes(searchVal) ||
                    (b.city || '').toLowerCase().includes(searchVal)
                );
            }

            const activeBreakdowns = breakdowns.filter(b => b.status !== 'COMPLETED' && b.status !== 'CANCELLED');
            const completedBreakdowns = breakdowns.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

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
                                <i class="fa-solid fa-truck-pickup"></i> Dispatched: <strong>${b.acceptedBy ? b.acceptedBy.name : 'Unknown Garage'}</strong> <br>
                                ${b.assignedMechanic ? `<i class="fa-solid fa-user-gear"></i> Mechanic: <strong>${b.assignedMechanic.name} (${b.assignedMechanic.phone})</strong> <br>` : ''}
                                <i class="fa-solid fa-phone"></i> Call Rescue: <strong>${b.acceptedBy ? (b.acceptedBy.phone || 'N/A') : 'N/A'}</strong>
                            </div>
                        `;
                    }

                    let actionHtml = `
                        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                            <button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem; border-color:var(--border-color);" 
                                onclick="window.GarageLK.completeBreakdown(${b.id})" unique-id="resolve-breakdown-${b.id}">
                                Mark Resolved
                            </button>
                            <button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem; color:var(--danger); border-color:var(--danger);" 
                                onclick="window.GarageLK.openCancellationModal(${b.id}, 'BREAKDOWN')" unique-id="cancel-breakdown-${b.id}">
                                Cancel
                            </button>
                        </div>
                    `;

                    item.innerHTML = `
                        <div style="flex:1;">
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:4px;">
                                <h4 style="font-weight:700; color:#f87171;">Emergency Assist Alert <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.breakdownCode || 'No ID'})</span></h4>
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

                        const badgeClass = b.status === 'CANCELLED' ? 'badge-cancelled' : 'badge-completed';
                        const reasonText = (b.status === 'CANCELLED' && b.cancellationReason) 
                            ? `<br><strong style="color:var(--danger);">Reason for Cancel:</strong> ${b.cancellationReason}` 
                            : '';
                        const responseHtml = b.status === 'CANCELLED'
                            ? `
                                <div style="font-size:0.85rem; color:var(--danger); font-weight:500;">
                                    <i class="fa-solid fa-ban"></i> Request Cancelled by Customer
                                    ${reasonText}
                                </div>
                              `
                            : `
                                <div style="font-size:0.85rem; color:var(--success); font-weight:500;">
                                    <i class="fa-solid fa-check-double"></i> Resolved by <strong>${b.acceptedBy ? `${b.acceptedBy.name} (${b.acceptedBy.phone || 'N/A'})` : 'Customer'}</strong>
                                    ${b.assignedMechanic ? `<br><i class="fa-solid fa-user-gear"></i> Mechanic: <strong>${b.assignedMechanic.name} (${b.assignedMechanic.phone || 'N/A'})</strong>` : ''}
                                </div>
                              `;

                        item.innerHTML = `
                            <div style="flex:1;">
                                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:4px;">
                                    <h4 style="font-weight:700; color:#f87171;">Emergency Assist Alert <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.breakdownCode || 'No ID'})</span></h4>
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
                            <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; min-width: 150px;">
                                <span class="badge ${badgeClass}">${b.status}</span>
                                <div id="breakdown-review-btn-container-${b.id}" style="display:inline-block; margin-top:0.25rem;"></div>
                            </div>
                        `;
                        completedList.appendChild(item);

                        if (b.status === 'COMPLETED' && b.acceptedBy) {
                            setTimeout(async () => {
                                const btnContainer = document.getElementById(`breakdown-review-btn-container-${b.id}`);
                                if (btnContainer) {
                                    try {
                                        const existsRes = await fetch(`/api/reviews/breakdown/${b.id}/exists`);
                                        if (existsRes.ok) {
                                            const check = await existsRes.json();
                                            if (!check.exists) {
                                                btnContainer.innerHTML = `
                                                    <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size:0.8rem;" 
                                                        onclick="window.GarageLK.openBreakdownReviewModal(${b.id})" unique-id="breakdown-review-btn-${b.id}">
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

                let alertsList = [];

                // 1. Load active (OPEN) alerts in operating cities
                for (const city of cities) {
                    const res = await fetch(`/api/breakdowns/active?city=${encodeURIComponent(city)}`);
                    const alerts = await res.json();
                    if (!res.ok) continue;
                    alertsList = alertsList.concat(alerts);
                }
                this.ownerBreakdownsRaw = alertsList;

                // 2. Load assigned (ACCEPTED) active alerts for owner's garages
                const assignedRes = await fetch('/api/breakdowns/assigned');
                if (assignedRes.ok) {
                    this.ownerAssignedBreakdownsRaw = await assignedRes.json();
                } else {
                    this.ownerAssignedBreakdownsRaw = [];
                }

                this.renderOwnerBreakdownsFiltered();

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

                this.ownerBreakdownsHistoryRaw = history;
                this.renderOwnerBreakdownsFiltered();
            } catch (err) {
                console.error("Error loading completed history:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading completed history.</p>';
            }
        },

        renderOwnerBreakdownsFiltered() {
            const list = document.getElementById('owner-breakdowns-list');
            const historyList = document.getElementById('owner-breakdown-history-list');
            const clearBtn = document.getElementById('btn-clear-breakdown-history');
            if (!list) return;

            const searchVal = (document.getElementById('owner-breakdown-search-input')?.value || '').toLowerCase().trim();

            let alerts = this.ownerBreakdownsRaw || [];
            let assigned = this.ownerAssignedBreakdownsRaw || [];
            let history = this.ownerBreakdownsHistoryRaw || [];

            if (searchVal) {
                const filterFn = b => 
                    (b.breakdownCode || '').toLowerCase().includes(searchVal) ||
                    (b.user.fullName || b.user.username || '').toLowerCase().includes(searchVal) ||
                    (b.contactPhone || '').toLowerCase().includes(searchVal) ||
                    (b.vehicleNo || '').toLowerCase().includes(searchVal) ||
                    (b.description || '').toLowerCase().includes(searchVal) ||
                    (b.city || '').toLowerCase().includes(searchVal) ||
                    (b.address || '').toLowerCase().includes(searchVal);

                alerts = alerts.filter(filterFn);
                assigned = assigned.filter(filterFn);
                history = history.filter(filterFn);
            }

            list.innerHTML = '';
            let alertCount = 0;

            // Render active open alerts
            alerts.forEach(b => {
                alertCount++;
                const item = document.createElement('div');
                item.className = 'table-item';

                let viewOnMapBtn = '';
                if (b.latitude !== null && b.longitude !== null && b.latitude !== undefined && b.longitude !== undefined) {
                    viewOnMapBtn = `
                        <button class="btn btn-outline" style="color:var(--secondary); border-color:var(--secondary); padding:0.4rem 0.8rem; font-size:0.8rem;" 
                            onclick="window.GarageLK.viewBreakdownOnMap(${b.latitude}, ${b.longitude}, ${b.id}, '${b.city}')" unique-id="view-map-btn-${b.id}">
                            <i class="fa-solid fa-map-location-dot"></i> View on Map
                        </button>
                    `;
                }

                item.innerHTML = `
                    <div style="flex:1;">
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:4px;">
                            <h4 style="font-weight:700; color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Emergency Breakdown Alert <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.breakdownCode || 'No ID'})</span></h4>
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
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        ${viewOnMapBtn}
                        <button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem; border-color:var(--border-color);" 
                            onclick="window.GarageLK.quickLookupID('${b.breakdownCode}')" unique-id="lookup-breakdown-btn-${b.id}">
                            <i class="fa-solid fa-search"></i> Lookup Details
                        </button>
                        <button class="btn btn-primary" style="background:#ef4444; box-shadow:0 0 10px rgba(239,68,68,0.25); padding:0.4rem 0.8rem; font-size:0.8rem;" 
                            onclick="window.GarageLK.openAcceptBreakdownModal(${b.id}, '${b.city}')" unique-id="accept-breakdown-btn-${b.id}">
                            Accept & Dispatch
                        </button>
                    </div>
                `;
                list.appendChild(item);
            });

            // Render assigned active alerts
            assigned.forEach(b => {
                alertCount++;
                const item = document.createElement('div');
                item.className = 'table-item';

                let viewOnMapBtnAssigned = '';
                if (b.latitude !== null && b.longitude !== null && b.latitude !== undefined && b.longitude !== undefined) {
                    viewOnMapBtnAssigned = `
                        <button class="btn btn-outline" style="color:var(--secondary); border-color:var(--secondary); padding:0.4rem 0.8rem; font-size:0.8rem; width:100%; text-align:center;" 
                            onclick="window.GarageLK.viewBreakdownOnMap(${b.latitude}, ${b.longitude}, ${b.id}, '${b.city}')" unique-id="view-map-assigned-btn-${b.id}">
                            <i class="fa-solid fa-map-location-dot"></i> View on Map
                        </button>
                    `;
                }

                item.innerHTML = `
                    <div style="flex:1;">
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:4px;">
                            <h4 style="font-weight:700; color:var(--secondary);"><i class="fa-solid fa-truck-pickup"></i> Dispatched Rescue (Active) <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.breakdownCode || 'No ID'})</span></h4>
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
                    <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 0.5rem; min-width: 140px;">
                        <span class="badge badge-pending" style="font-size: 0.75rem; padding: 0.3rem 0.65rem; border-radius: 4px; font-weight:700;">
                            PENDING RESOLVED
                        </span>
                        ${viewOnMapBtnAssigned}
                        <button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem; width:100%; text-align:center;" 
                            onclick="window.GarageLK.quickLookupID('${b.breakdownCode}')" unique-id="lookup-assigned-btn-${b.id}">
                            <i class="fa-solid fa-search"></i> Lookup Details
                        </button>
                    </div>
                `;
                list.appendChild(item);
            });

            if (alertCount === 0) {
                list.innerHTML = `<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No active emergency breakdown alerts or active dispatches matching search.</p>`;
            }

            // Render completed history
            if (historyList) {
                if (history.length === 0) {
                    historyList.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No completed rescue history found matching search.</p>';
                    if (clearBtn) clearBtn.style.display = 'none';
                } else {
                    if (clearBtn) {
                        clearBtn.style.display = 'inline-block';
                        clearBtn.disabled = false;
                    }
                    historyList.innerHTML = '';
                    history.forEach(b => {
                        const item = document.createElement('div');
                        item.className = 'table-item';

                        let titleHtml = `<h4 style="font-weight:700; color:var(--success);"><i class="fa-solid fa-circle-check"></i> Completed Rescue <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.breakdownCode || 'No ID'})</span></h4>`;
                        if (b.status === 'CANCELLED') {
                            titleHtml = `<h4 style="font-weight:700; color:var(--danger);"><i class="fa-solid fa-circle-xmark"></i> Cancelled Request <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.breakdownCode || 'No ID'})</span></h4>`;
                        }

                        const reasonHtml = (b.status === 'CANCELLED' && b.cancellationReason) 
                            ? `<br><strong style="color:var(--danger);">Reason for Cancel:</strong> ${b.cancellationReason}` 
                            : '';

                        item.innerHTML = `
                            <div style="flex:1;">
                                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:4px;">
                                    ${titleHtml}
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
                                    ${reasonHtml}
                                </p>
                            </div>
                            <div style="display:flex; gap:0.5rem; align-items:center;">
                                <button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                    onclick="window.GarageLK.quickLookupID('${b.breakdownCode}')" unique-id="lookup-history-btn-${b.id}">
                                    <i class="fa-solid fa-search"></i> Lookup Details
                                </button>
                                <button class="btn btn-outline" style="color:var(--danger); border-color:var(--border-color); padding:0.4rem 0.8rem; font-size:0.8rem;" 
                                    onclick="window.GarageLK.deleteBreakdownHistory(${b.id})" unique-id="delete-history-btn-${b.id}">
                                    <i class="fa-solid fa-trash-can"></i> Delete
                                </button>
                            </div>
                        `;
                        historyList.appendChild(item);
                    });
                }
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
                this.renderOwnerMechanicsFiltered();
            } catch (err) {
                console.error("Error loading mechanics:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading mechanics list.</p>';
            }
        },

        renderOwnerMechanicsFiltered() {
            const garageId = document.getElementById('owner-mechanics-garage-select') ? document.getElementById('owner-mechanics-garage-select').value : '';
            const list = document.getElementById('owner-mechanics-list');
            if (!list) return;

            if (!garageId) {
                list.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:2rem;">Please select a garage to manage mechanics.</p>';
                return;
            }

            const searchVal = (document.getElementById('owner-mechanic-search-input')?.value || '').toLowerCase().trim();
            let mechanics = this.ownerMechanics || [];

            if (searchVal) {
                mechanics = mechanics.filter(m => 
                    (m.name || '').toLowerCase().includes(searchVal) ||
                    (m.phone || '').toLowerCase().includes(searchVal) ||
                    (m.specialization || '').toLowerCase().includes(searchVal) ||
                    (m.status || '').toLowerCase().includes(searchVal)
                );
            }

            if (mechanics.length === 0) {
                list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No mechanics found matching search.</p>';
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

        async cancelBreakdown(id) {
            if (!confirm('Are you sure you want to cancel this emergency assist request?')) return;
            try {
                const res = await fetch(`/api/breakdowns/${id}/cancel`, { method: 'PUT' });
                if (res.ok) {
                    this.showToast('Emergency request cancelled.', 'success');

                    const role = this.currentUser.role;
                    if (role === 'CUSTOMER') {
                        this.loadCustomerBreakdowns();
                    } else if (role === 'ADMIN') {
                        this.loadAdminMonitor();
                    }
                } else {
                    this.showToast('Failed to cancel request', 'error');
                }
            } catch (err) {
                console.error("Error cancelling breakdown:", err);
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

                const sparePartBookingsRes = await fetch('/api/spare-parts/bookings/all');
                const sparePartBookings = sparePartBookingsRes.ok ? await sparePartBookingsRes.json() : [];

                // Store raw data for client-side filtering
                this.adminRawData = { garages, shops, bookings, breakdowns, mechanics, users, sparePartBookings };

                // Populate Garage dropdown for admin monitor (approved only)
                const monitorGarageSelect = document.getElementById('admin-monitor-garage-select');
                if (monitorGarageSelect) {
                    monitorGarageSelect.innerHTML = '<option value="">Select a Garage...</option>';
                    garages.forEach(g => {
                        if (g.status === 'APPROVED') {
                            monitorGarageSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`;
                        }
                    });
                }

                // Populate Shop dropdown for admin monitor (approved only)
                const monitorShopSelect = document.getElementById('admin-monitor-shop-select');
                if (monitorShopSelect) {
                    monitorShopSelect.innerHTML = '<option value="">Select a Shop...</option>';
                    shops.forEach(s => {
                        if (s.status === 'APPROVED') {
                            monitorShopSelect.innerHTML += `<option value="${s.id}">${s.shopName || s.name}</option>`;
                        }
                    });
                }

                // Reset individual views
                const garageDetails = document.getElementById('admin-monitor-garage-details');
                const garagePlaceholder = document.getElementById('admin-monitor-garage-placeholder');
                if (garageDetails) garageDetails.style.display = 'none';
                if (garagePlaceholder) garagePlaceholder.style.display = 'block';

                const shopDetails = document.getElementById('admin-monitor-shop-details');
                const shopPlaceholder = document.getElementById('admin-monitor-shop-placeholder');
                if (shopDetails) shopDetails.style.display = 'none';
                if (shopPlaceholder) shopPlaceholder.style.display = 'block';

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
                    detailHtml = `<span style="color:var(--secondary); font-size:0.85rem;"><i class="fa-solid fa-truck-pickup"></i> Dispatched: <strong>${b.acceptedBy ? b.acceptedBy.name : 'Unknown Garage'}</strong></span>`;
                } else if (b.status === 'COMPLETED') {
                    badgeClass = 'badge-completed';
                    detailHtml = `<span style="color:var(--success); font-size:0.85rem;"><i class="fa-solid fa-circle-check"></i> Resolved by ${b.acceptedBy ? `${b.acceptedBy.name} (${b.acceptedBy.phone || 'N/A'})` : 'Customer'}</span>`;
                } else if (b.status === 'CANCELLED') {
                    badgeClass = 'badge-cancelled';
                    const reasonHtml = b.cancellationReason 
                        ? `<br><strong style="color:var(--danger);">Reason for Cancel:</strong> ${b.cancellationReason}` 
                        : '';
                    detailHtml = `<span style="color:var(--danger); font-size:0.85rem;"><i class="fa-solid fa-ban"></i> Cancelled by Customer${reasonHtml}</span>`;
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
            let filteredSparePartBookings = this.adminRawData.sparePartBookings ? [...this.adminRawData.sparePartBookings] : [];

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
                    filteredSparePartBookings = filteredSparePartBookings.filter(b => {
                        const bDate = b.bookingDate ? b.bookingDate.substring(0, 10) : '';
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
                    filteredSparePartBookings = filteredSparePartBookings.filter(b => {
                        const bDate = b.bookingDate ? b.bookingDate.substring(0, 7) : '';
                        return bDate === selectedMonth;
                    });
                }
            }

            // Update stats cards in UI
            document.getElementById('admin-stat-bookings').textContent = filteredBookings.length;
            const activeBreakdowns = filteredBreakdowns.filter(b => b.status !== 'COMPLETED').length;
            document.getElementById('admin-stat-breakdowns').textContent = activeBreakdowns;

            // Compute platform-wide income
            let garageIncome = 0.0;
            filteredBookings.forEach(b => {
                if (b.status === 'COMPLETED') {
                    garageIncome += (b.totalPrice || b.price || 0.0);
                }
            });

            let shopIncome = 0.0;
            filteredSparePartBookings.forEach(b => {
                if (b.status === 'PICKED_UP') {
                    shopIncome += (b.totalPrice || 0.0);
                }
            });

            let totalIncome = garageIncome + shopIncome;

            const totalIncomeEl = document.getElementById('admin-stat-total-income');
            if (totalIncomeEl) totalIncomeEl.textContent = `LKR ${totalIncome.toFixed(2)}`;

            const garageIncomeEl = document.getElementById('admin-stat-garage-income');
            if (garageIncomeEl) garageIncomeEl.textContent = `LKR ${garageIncome.toFixed(2)}`;

            const shopIncomeEl = document.getElementById('admin-stat-shop-income');
            if (shopIncomeEl) shopIncomeEl.textContent = `LKR ${shopIncome.toFixed(2)}`;

            // Render filtered charts
            this.renderAdminMonitorCharts(
                filteredBreakdowns, 
                this.adminRawData.garages, 
                this.adminRawData.shops, 
                this.adminRawData.mechanics,
                filteredBookings,
                filteredSparePartBookings
            );

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
            let filteredSparePartBookings = this.adminRawData.sparePartBookings ? [...this.adminRawData.sparePartBookings] : [];

            if (filterTypeVal === 'DAY') {
                const selectedDay = document.getElementById('admin-date-picker').value;
                if (selectedDay) {
                    dateStr = selectedDay;
                    filteredBookings = filteredBookings.filter(b => (b.bookingDate ? b.bookingDate.substring(0, 10) : '') === selectedDay);
                    filteredBreakdowns = filteredBreakdowns.filter(b => (b.createdAt ? b.createdAt.substring(0, 10) : '') === selectedDay);
                    filteredSparePartBookings = filteredSparePartBookings.filter(b => (b.bookingDate ? b.bookingDate.substring(0, 10) : '') === selectedDay);
                }
            } else if (filterTypeVal === 'MONTH') {
                const selectedMonth = document.getElementById('admin-month-picker').value;
                if (selectedMonth) {
                    dateStr = selectedMonth;
                    filteredBookings = filteredBookings.filter(b => (b.bookingDate ? b.bookingDate.substring(0, 7) : '') === selectedMonth);
                    filteredBreakdowns = filteredBreakdowns.filter(b => (b.createdAt ? b.createdAt.substring(0, 7) : '') === selectedMonth);
                    filteredSparePartBookings = filteredSparePartBookings.filter(b => (b.bookingDate ? b.bookingDate.substring(0, 7) : '') === selectedMonth);
                }
            }

            // Calculate current filtered incomes for Excel overview
            let garageIncome = 0.0;
            filteredBookings.forEach(b => {
                if (b.status === 'COMPLETED') {
                    garageIncome += (b.totalPrice || b.price || 0.0);
                }
            });

            let shopIncome = 0.0;
            filteredSparePartBookings.forEach(b => {
                if (b.status === 'PICKED_UP') {
                    shopIncome += (b.totalPrice || 0.0);
                }
            });

            let totalIncome = garageIncome + shopIncome;

            // Map overview stats to key-value rows
            const overviewRows = [
                { "Metric": "Report Date / Range", "Value": dateStr },
                { "Metric": "Total Registered Users", "Value": this.adminRawData.users ? this.adminRawData.users.length : 0 },
                { "Metric": "Total Registered Garages", "Value": this.adminRawData.garages ? this.adminRawData.garages.length : 0 },
                { "Metric": "Total Spare Part Shops", "Value": this.adminRawData.shops ? this.adminRawData.shops.length : 0 },
                { "Metric": "Total Mechanics Team", "Value": this.adminRawData.mechanics ? this.adminRawData.mechanics.length : 0 },
                { "Metric": "Appointment Bookings (Filtered)", "Value": filteredBookings.length },
                { "Metric": "Emergency Assists (Filtered)", "Value": filteredBreakdowns.length },
                { "Metric": "Total Platform Income (LKR)", "Value": totalIncome },
                { "Metric": "Garage Earnings (LKR)", "Value": garageIncome },
                { "Metric": "Shop Earnings (LKR)", "Value": shopIncome }
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

            // Map spare part bookings to nice rows
            const sparePartBookingRows = filteredSparePartBookings.map(b => ({
                "Reservation ID": b.id,
                "Booking Code": b.bookingCode || "N/A",
                "Customer Name": b.customer ? (b.customer.user.fullName || b.customer.user.username) : "N/A",
                "Shop Name": b.sparePart && b.sparePart.shop ? b.sparePart.shop.shopName : "N/A",
                "Part Name": b.sparePart ? b.sparePart.partName : "N/A",
                "Quantity": b.quantity || 0,
                "Price (LKR)": b.totalPrice || 0.0,
                "Status": b.status || "N/A",
                "Booking Date": b.bookingDate || "N/A",
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

            const wsSpareParts = XLSX.utils.json_to_sheet(sparePartBookingRows);
            XLSX.utils.book_append_sheet(wb, wsSpareParts, "Spare Part Reservations");

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

        handleAdminGarageSelectChange() {
            const select = document.getElementById('admin-monitor-garage-select');
            const garageId = select ? select.value : '';
            const detailsDiv = document.getElementById('admin-monitor-garage-details');
            const placeholder = document.getElementById('admin-monitor-garage-placeholder');

            if (!garageId) {
                if (detailsDiv) detailsDiv.style.display = 'none';
                if (placeholder) placeholder.style.display = 'block';
                return;
            }

            const numericId = parseInt(garageId, 10);
            const garage = this.adminRawData.garages.find(g => g.id === numericId);

            if (!garage) return;

            // Update details
            document.getElementById('admin-garage-detail-name').textContent = garage.garageName || garage.name || '-';
            document.getElementById('admin-garage-detail-owner').textContent = garage.ownerName || (garage.owner ? (garage.owner.fullName || garage.owner.username) : '-');
            document.getElementById('admin-garage-detail-phone').textContent = garage.phone || '-';
            document.getElementById('admin-garage-detail-location').textContent = `${garage.address || ''}, ${garage.city || ''}`;
            document.getElementById('admin-garage-detail-specialization').textContent = `${garage.vehicleTypes || 'All'} (${garage.engineTypes || 'All'})`;

            // Compute statistics
            const garageBookings = (this.adminRawData.bookings || []).filter(b => b.garage && b.garage.id === numericId);
            const completedBookings = garageBookings.filter(b => b.status === 'COMPLETED');
            
            let revenue = 0.0;
            const revenueMap = {};
            completedBookings.forEach(b => {
                revenue += (b.totalPrice || b.price || 0.0);
                const type = b.serviceType || 'Other';
                revenueMap[type] = (revenueMap[type] || 0) + (b.totalPrice || b.price || 0.0);
            });

            const garageMechanics = (this.adminRawData.mechanics || []).filter(m => m.garage && m.garage.id === numericId);
            const garageRescues = (this.adminRawData.breakdowns || []).filter(b => b.assignedGarage && b.assignedGarage.id === numericId && b.status === 'COMPLETED');

            // Render stats
            document.getElementById('admin-garage-stat-bookings').textContent = garageBookings.length;
            document.getElementById('admin-garage-stat-revenue').textContent = `LKR ${revenue.toFixed(2)}`;
            document.getElementById('admin-garage-stat-completed').textContent = completedBookings.length;
            document.getElementById('admin-garage-stat-mechanics').textContent = garageMechanics.length;
            document.getElementById('admin-garage-stat-rescues').textContent = garageRescues.length;

            // Render Charts
            const revenueCanvas = document.getElementById('admin-chart-garage-revenue');
            if (revenueCanvas) {
                if (window.adminGarageRevenueChart) window.adminGarageRevenueChart.destroy();
                
                const isDarkMode = !document.body.classList.contains('light-mode');
                const textColor = isDarkMode ? '#e2e8f0' : '#1e293b';
                const gridColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
                
                const revenueLabels = Object.keys(revenueMap);
                const revenueValues = Object.values(revenueMap);

                window.adminGarageRevenueChart = new Chart(revenueCanvas, {
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
                                ticks: { color: textColor, font: { family: 'Outfit', size: 10 } }
                            },
                            y: {
                                grid: { color: gridColor },
                                ticks: { color: textColor, font: { family: 'Outfit', size: 10 } }
                            }
                        }
                    }
                });
            }

            const completionsCanvas = document.getElementById('admin-chart-garage-completions');
            if (completionsCanvas) {
                if (window.adminGarageCompletionsChart) window.adminGarageCompletionsChart.destroy();

                const isDarkMode = !document.body.classList.contains('light-mode');
                const textColor = isDarkMode ? '#e2e8f0' : '#1e293b';

                const completedCount = completedBookings.length;
                const completedRescuesCount = garageRescues.length;
                const hasData = completedCount > 0 || completedRescuesCount > 0;

                window.adminGarageCompletionsChart = new Chart(completionsCanvas, {
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
                                labels: { color: textColor, font: { family: 'Outfit', size: 10 } }
                            }
                        }
                    }
                });
            }

            if (detailsDiv) detailsDiv.style.display = 'flex';
            if (placeholder) placeholder.style.display = 'none';
        },

        handleAdminShopSelectChange() {
            const select = document.getElementById('admin-monitor-shop-select');
            const shopId = select ? select.value : '';
            const detailsDiv = document.getElementById('admin-monitor-shop-details');
            const placeholder = document.getElementById('admin-monitor-shop-placeholder');

            if (!shopId) {
                if (detailsDiv) detailsDiv.style.display = 'none';
                if (placeholder) placeholder.style.display = 'block';
                return;
            }

            const numericId = parseInt(shopId, 10);
            const shop = this.adminRawData.shops.find(s => s.id === numericId);

            if (!shop) return;

            // Update details
            document.getElementById('admin-shop-detail-name').textContent = shop.shopName || shop.name || '-';
            document.getElementById('admin-shop-detail-owner').textContent = shop.ownerName || (shop.user ? (shop.user.fullName || shop.user.username) : '-');
            document.getElementById('admin-shop-detail-phone').textContent = shop.phone || '-';
            document.getElementById('admin-shop-detail-location').textContent = `${shop.address || ''}, ${shop.city || ''}`;
            document.getElementById('admin-shop-detail-desc').textContent = shop.description || '-';

            // Compute statistics
            const shopBookings = (this.adminRawData.sparePartBookings || []).filter(b => b.sparePart && b.sparePart.shop && b.sparePart.shop.id === numericId);
            const pickedUpBookings = shopBookings.filter(b => b.status === 'PICKED_UP');

            let revenue = 0.0;
            let partsSold = 0;
            const partSalesCount = {};
            const partRevenueMap = {};

            pickedUpBookings.forEach(b => {
                revenue += (b.totalPrice || 0.0);
                partsSold += (b.quantity || 0);
                
                const partName = b.sparePart ? b.sparePart.partName : 'Unknown';
                partSalesCount[partName] = (partSalesCount[partName] || 0) + (b.quantity || 0);
                partRevenueMap[partName] = (partRevenueMap[partName] || 0.0) + (b.totalPrice || 0.0);
            });

            // Find top selling part
            let topPart = 'N/A';
            let maxQty = 0;
            for (const [part, qty] of Object.entries(partSalesCount)) {
                if (qty > maxQty) {
                    maxQty = qty;
                    topPart = part;
                }
            }

            // Render stats
            document.getElementById('admin-shop-stat-revenue').textContent = `LKR ${revenue.toFixed(2)}`;
            document.getElementById('admin-shop-stat-sales').textContent = partsSold;
            document.getElementById('admin-shop-stat-top').textContent = topPart;

            // Render Charts
            const salesCanvas = document.getElementById('admin-chart-shop-sales');
            if (salesCanvas) {
                if (window.adminShopSalesChart) window.adminShopSalesChart.destroy();

                const isDarkMode = !document.body.classList.contains('light-mode');
                const textColor = isDarkMode ? '#e2e8f0' : '#1e293b';
                const gridColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

                const partNames = Object.keys(partSalesCount);
                const salesCounts = Object.values(partSalesCount);

                window.adminShopSalesChart = new Chart(salesCanvas, {
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
                                ticks: { color: textColor, font: { family: 'Outfit', size: 10 } }
                            },
                            y: {
                                grid: { color: gridColor },
                                ticks: { color: textColor, font: { family: 'Outfit', size: 10 }, stepSize: 1 }
                            }
                        }
                    }
                });
            }

            const revenueCanvas = document.getElementById('admin-chart-shop-revenue');
            if (revenueCanvas) {
                if (window.adminShopRevenueChart) window.adminShopRevenueChart.destroy();

                const isDarkMode = !document.body.classList.contains('light-mode');
                const textColor = isDarkMode ? '#e2e8f0' : '#1e293b';

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

                window.adminShopRevenueChart = new Chart(revenueCanvas, {
                    type: 'pie',
                    data: {
                        labels: hasData ? partNames : ['No Data'],
                        datasets: [{
                            data: hasData ? revenues : [1],
                            backgroundColor: hasData ? chartColors.slice(0, revenues.length) : ['rgba(148, 163, 184, 0.25)'],
                            borderColor: hasData ? borderColors.slice(0, revenues.length) : ['rgba(148, 163, 184, 0.4)'],
                            borderWidth: 1.5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { color: textColor, font: { family: 'Outfit', size: 10 } }
                            }
                        }
                    }
                });
            }

            if (detailsDiv) detailsDiv.style.display = 'flex';
            if (placeholder) placeholder.style.display = 'none';
        },

        renderAdminMonitorCharts(breakdowns, garages, shops, mechanics, bookings = [], sparePartBookings = []) {
            const isDarkMode = !document.body.classList.contains('light-mode');
            const textColorPrimary = isDarkMode ? '#e2e8f0' : '#0f172a';
            const textColorSecondary = isDarkMode ? '#94a3b8' : '#475569';
            const gridBorderColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
            const bgCardColor = isDarkMode ? '#161e2f' : '#ffffff';

            const breakdownCanvas = document.getElementById('chart-breakdown-status');
            const providersCanvas = document.getElementById('chart-providers-overview');
            const breakdownsByCityCanvas = document.getElementById('chart-breakdowns-by-city');
            const monthlyIncomeCanvas = document.getElementById('chart-monthly-income');

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
            if (this.monthlyIncomeChart) {
                this.monthlyIncomeChart.destroy();
                this.monthlyIncomeChart = null;
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
                                '#f59e0b',
                                '#3b82f6',
                                '#10b981'
                            ],
                            borderColor: bgCardColor,
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
                                    color: textColorPrimary,
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
                                '#10b981',
                                '#8b5cf6',
                                '#00f2fe'
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
                                    color: textColorSecondary,
                                    font: {
                                        family: 'Outfit',
                                        size: 11
                                    }
                                }
                            },
                            y: {
                                grid: {
                                    color: gridBorderColor
                                },
                                ticks: {
                                    color: textColorSecondary,
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
                                    color: gridBorderColor
                                },
                                ticks: {
                                    color: textColorSecondary,
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
                                    color: textColorSecondary,
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

            if (monthlyIncomeCanvas) {
                const garageIncomeMap = {};
                const shopIncomeMap = {};
                const allMonthsSet = new Set();

                bookings.forEach(b => {
                    if (b.status === 'COMPLETED' && b.bookingDate) {
                        const month = b.bookingDate.substring(0, 7);
                        allMonthsSet.add(month);
                        garageIncomeMap[month] = (garageIncomeMap[month] || 0) + (b.totalPrice || b.price || 0.0);
                    }
                });

                sparePartBookings.forEach(b => {
                    if (b.status === 'PICKED_UP' && b.bookingDate) {
                        const month = b.bookingDate.substring(0, 7);
                        allMonthsSet.add(month);
                        shopIncomeMap[month] = (shopIncomeMap[month] || 0) + (b.totalPrice || 0.0);
                    }
                });

                // Sort months chronologically
                const sortedMonths = Array.from(allMonthsSet).sort();

                // If empty, put default month
                if (sortedMonths.length === 0) {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    sortedMonths.push(`${year}-${month}`);
                }

                const garageData = sortedMonths.map(m => garageIncomeMap[m] || 0);
                const shopData = sortedMonths.map(m => shopIncomeMap[m] || 0);
                const totalData = sortedMonths.map(m => (garageIncomeMap[m] || 0) + (shopIncomeMap[m] || 0));

                const ctx = monthlyIncomeCanvas.getContext('2d');
                
                // Gradients for rich aesthetics!
                const garageGrad = ctx.createLinearGradient(0, 0, 0, 200);
                garageGrad.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
                garageGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

                const shopGrad = ctx.createLinearGradient(0, 0, 0, 200);
                shopGrad.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
                shopGrad.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

                this.monthlyIncomeChart = new Chart(monthlyIncomeCanvas, {
                    type: 'line',
                    data: {
                        labels: sortedMonths,
                        datasets: [
                            {
                                label: 'Garage Earnings',
                                data: garageData,
                                borderColor: '#10b981',
                                backgroundColor: garageGrad,
                                fill: true,
                                tension: 0.35,
                                borderWidth: 2,
                                pointBackgroundColor: '#10b981'
                            },
                            {
                                label: 'Shop Earnings',
                                data: shopData,
                                borderColor: '#8b5cf6',
                                backgroundColor: shopGrad,
                                fill: true,
                                tension: 0.35,
                                borderWidth: 2,
                                pointBackgroundColor: '#8b5cf6'
                            },
                            {
                                label: 'Total Platform Income',
                                data: totalData,
                                borderColor: '#f59e0b',
                                borderDash: [5, 5],
                                fill: false,
                                tension: 0.35,
                                borderWidth: 2.5,
                                pointBackgroundColor: '#f59e0b',
                                pointRadius: 4
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: textColorPrimary,
                                    font: { family: 'Outfit', size: 10 }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return ` ${context.dataset.label}: LKR ${context.raw.toFixed(2)}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { color: textColorSecondary, font: { family: 'Outfit', size: 10 } }
                            },
                            y: {
                                grid: { color: gridBorderColor },
                                ticks: { color: textColorSecondary, font: { family: 'Outfit', size: 10 } }
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
                const users = await res.json();
                this.adminUsersRaw = users;
                this.renderAdminUsersFiltered();
            } catch (err) {
                console.error("Error loading admin users:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading users.</p>';
            }
        },

        renderAdminUsersFiltered() {
            const list = document.getElementById('admin-users-list');
            if (!list) return;

            if (!this.adminUsersRaw) {
                list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No users found.</p>';
                return;
            }

            const roleFilter = document.getElementById('admin-user-filter').value;
            const searchVal = (document.getElementById('admin-user-search-input')?.value || '').toLowerCase().trim();

            let users = this.adminUsersRaw;

            if (roleFilter && roleFilter !== 'ALL') {
                users = users.filter(u => u.role === roleFilter);
            }

            if (searchVal) {
                users = users.filter(u => 
                    String(u.id).includes(searchVal) ||
                    (u.fullName || '').toLowerCase().includes(searchVal) ||
                    (u.username || '').toLowerCase().includes(searchVal) ||
                    (u.email || '').toLowerCase().includes(searchVal) ||
                    (u.phone || '').toLowerCase().includes(searchVal)
                );
            }

            if (users.length === 0) {
                list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No users match the search/filter criteria.</p>';
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
                    <div onclick="window.GarageLK.showUserDetails(${u.id})" style="display:flex; gap:1.25rem; align-items:center; flex:1; cursor:pointer;" unique-id="click-user-card-${u.id}">
                        <div class="user-avatar" style="width:48px; height:48px; min-width:48px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.1rem; box-shadow:var(--shadow-sm);">
                            ${initials}
                        </div>
                        <div>
                            <h4 style="font-weight:700; margin-bottom:2px; display:flex; align-items:center; gap:0.5rem;">
                                ${u.fullName || u.username}
                                <span class="badge ${statusBadgeClass}" style="font-size:0.7rem; padding:0.15rem 0.4rem; vertical-align:middle;">${statusText}</span>
                            </h4>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:2px; line-height:1.4;">
                                <i class="fa-solid fa-hashtag" style="width:16px;"></i> User ID: <strong>${u.id}</strong> &bull; <i class="fa-solid fa-user" style="width:16px;"></i> Full Name: <strong>${u.fullName || 'N/A'}</strong> &bull; <i class="fa-solid fa-envelope" style="width:16px;"></i> ${u.email}
                            </p>
                            <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4;">
                                <i class="fa-solid fa-phone" style="width:16px;"></i> Phone: ${u.phone || 'N/A'} &bull; <i class="fa-solid fa-user-tag" style="width:16px;"></i> Role: <strong style="text-transform: capitalize;">${u.role.replace('_', ' ').toLowerCase()}</strong>
                            </p>
                        </div>
                    </div>
                    <div style="display:flex; gap:0.5rem; align-items:center; justify-content:flex-end; min-width:200px;">
                        ${actionHtml}
                    </div>
                `;
                list.appendChild(item);
            });
        },

        filterAdminUsers() {
            const filterValue = document.getElementById('admin-user-filter').value;
            if (filterValue === 'MECHANIC') {
                this.renderAdminMechanicsFiltered();
            } else {
                this.renderAdminUsersFiltered();
            }
        },

        async showUserDetails(userId) {
            const user = this.adminUsersRaw.find(u => u.id === userId);
            if (!user) return;

            const contentDiv = document.getElementById('user-details-content');
            contentDiv.innerHTML = '<p style="text-align:center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading details...</p>';
            this.openModal('modal-user-details');

            try {
                let extraHtml = '';
                if (user.role === 'GARAGE_OWNER') {
                    const res = await fetch('/api/garages/all');
                    if (res.ok) {
                        const garages = await res.json();
                        const ownerGarages = garages.filter(g => {
                            const ownerId = g.owner ? g.owner.id : (g.user ? g.user.id : null);
                            return ownerId === userId;
                        });
                        extraHtml = `
                            <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                                <h4 style="font-weight: 700; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;"><i class="fa-solid fa-warehouse"></i> Garages Owned (${ownerGarages.length})</h4>
                                ${ownerGarages.length > 0 ? `
                                    <ul style="padding-left: 1.25rem; margin: 0;">
                                        ${ownerGarages.map(g => `<li style="margin-bottom: 0.35rem;"><strong>${g.name || g.garageName}</strong> (${g.city} &bull; <span class="badge ${g.status === 'APPROVED' ? 'badge-approved' : 'badge-pending'}" style="font-size:0.65rem; padding:0.1rem 0.3rem;">${g.status}</span>)</li>`).join('')}
                                    </ul>
                                ` : '<p style="color: var(--text-muted); font-style: italic; margin: 0;">No garages registered.</p>'}
                            </div>
                        `;
                    }
                } else if (user.role === 'SHOP_OWNER') {
                    const res = await fetch('/api/shops/all');
                    if (res.ok) {
                        const shops = await res.json();
                        const ownerShops = shops.filter(s => {
                            const ownerId = s.user ? s.user.id : null;
                            return ownerId === userId;
                        });
                        extraHtml = `
                            <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                                <h4 style="font-weight: 700; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;"><i class="fa-solid fa-shop"></i> Spare Part Shops Owned (${ownerShops.length})</h4>
                                ${ownerShops.length > 0 ? `
                                    <ul style="padding-left: 1.25rem; margin: 0;">
                                        ${ownerShops.map(s => `<li style="margin-bottom: 0.35rem;"><strong>${s.name || s.shopName}</strong> (${s.city} &bull; <span class="badge ${s.status === 'APPROVED' ? 'badge-approved' : 'badge-pending'}" style="font-size:0.65rem; padding:0.1rem 0.3rem;">${s.status}</span>)</li>`).join('')}
                                    </ul>
                                ` : '<p style="color: var(--text-muted); font-style: italic; margin: 0;">No shops registered.</p>'}
                            </div>
                        `;
                    }
                }

                const initials = user.fullName ?
                    user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() :
                    user.username.substring(0, 2).toUpperCase();

                contentDiv.innerHTML = `
                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 1rem; align-items: center; margin-bottom: 1.25rem;">
                        <div style="width: 54px; height: 54px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.25rem; box-shadow: var(--shadow-sm);">
                            ${initials}
                        </div>
                        <div>
                            <h3 style="font-weight: 700; font-size: 1.2rem; margin: 0; color: var(--text-primary);">${user.fullName || user.username}</h3>
                            <span class="badge ${user.active ? 'badge-approved' : 'badge-cancelled'}" style="margin-top: 0.25rem; display: inline-block;">${user.active ? 'Active' : 'Suspended'}</span>
                        </div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.9rem;">
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 0.6rem 0; font-weight: 600; color: var(--text-secondary); width: 120px;">User ID</td>
                            <td style="padding: 0.6rem 0; color: var(--text-primary);"><strong>${user.id}</strong></td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 0.6rem 0; font-weight: 600; color: var(--text-secondary);">Full Name</td>
                            <td style="padding: 0.6rem 0; color: var(--text-primary);">${user.fullName || 'N/A'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 0.6rem 0; font-weight: 600; color: var(--text-secondary);">Username</td>
                            <td style="padding: 0.6rem 0; color: var(--text-primary);">${user.username}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 0.6rem 0; font-weight: 600; color: var(--text-secondary);">Email</td>
                            <td style="padding: 0.6rem 0; color: var(--text-primary);">${user.email}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 0.6rem 0; font-weight: 600; color: var(--text-secondary);">Phone</td>
                            <td style="padding: 0.6rem 0; color: var(--text-primary);">${user.phone || 'N/A'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 0.6rem 0; font-weight: 600; color: var(--text-secondary);">Role</td>
                            <td style="padding: 0.6rem 0; text-transform: capitalize; color: var(--text-primary);">${user.role.replace('_', ' ').toLowerCase()}</td>
                        </tr>
                    </table>
                    ${extraHtml}
                `;
            } catch (err) {
                console.error("Error loading user details:", err);
                contentDiv.innerHTML = '<p style="color: var(--danger);">Failed to load user details.</p>';
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
            const profileReenterInput = document.getElementById('profile-reenter-password');
            if (profileReenterInput) profileReenterInput.value = '';
        },

        async submitUserProfileForm(event) {
            event.preventDefault();
            const fullName = document.getElementById('profile-fullname').value;
            const email = document.getElementById('profile-email').value;
            const phone = document.getElementById('profile-phone').value;
            const password = document.getElementById('profile-password').value;
            const reenterPasswordInput = document.getElementById('profile-reenter-password');
            const reenterPassword = reenterPasswordInput ? reenterPasswordInput.value : '';

            if (password && password !== reenterPassword) {
                this.showToast('Passwords do not match', 'error');
                return;
            }

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
                this.adminMechanicsRaw = mechanics;
                this.renderAdminMechanicsFiltered();
            } catch (err) {
                console.error("Error loading admin mechanics:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading mechanics.</p>';
            }
        },

        renderAdminMechanicsFiltered() {
            const list = document.getElementById('admin-mechanics-list');
            if (!list) return;

            if (!this.adminMechanicsRaw) {
                list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No mechanics found.</p>';
                return;
            }

            const searchVal = (document.getElementById('admin-user-search-input')?.value || '').toLowerCase().trim();

            let mechanics = this.adminMechanicsRaw;

            if (searchVal) {
                mechanics = mechanics.filter(m => 
                    (m.name || '').toLowerCase().includes(searchVal) ||
                    (m.phone || '').toLowerCase().includes(searchVal) ||
                    (m.specialization || '').toLowerCase().includes(searchVal) ||
                    (m.garage ? m.garage.garageName || m.garage.name || '' : '').toLowerCase().includes(searchVal)
                );
            }

            if (mechanics.length === 0) {
                list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No mechanics match the search criteria.</p>';
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
                                <i class="fa-solid fa-warehouse" style="width:16px;"></i> Garage: <strong style="color:var(--primary);">${m.garage ? m.garage.garageName || m.garage.name : 'N/A'}</strong> (${m.garage ? m.garage.city : 'N/A'})
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
            document.getElementById('review-breakdown-id').value = '';
            const ratingInput = document.getElementById('review-rating');
            if (ratingInput) ratingInput.value = '5';
            this.setStarPickerValue('garage-star-picker', 5);
            this.openModal('modal-review');
        },

        openBreakdownReviewModal(breakdownId) {
            document.getElementById('review-booking-id').value = '';
            document.getElementById('review-breakdown-id').value = breakdownId;
            const ratingInput = document.getElementById('review-rating');
            if (ratingInput) ratingInput.value = '5';
            this.setStarPickerValue('garage-star-picker', 5);
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
            document.getElementById('edit-garage-business-reg-no').value = g.businessRegNo || '';
            document.getElementById('edit-garage-image').value = g.imageUrl || '';
            document.getElementById('edit-garage-lat').value = g.latitude || 6.9271;
            document.getElementById('edit-garage-lng').value = g.longitude || 79.8612;
            
            document.getElementById('edit-garage-open-time').value = g.openTime || '08:00';
            document.getElementById('edit-garage-close-time').value = g.closeTime || '17:30';
            document.getElementById('edit-garage-open-days').value = g.openDays || 'Monday - Saturday';
            document.getElementById('edit-garage-open-today').checked = g.openToday !== false;

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
            const businessRegNo = document.getElementById('edit-garage-business-reg-no').value.trim();
            
            const openTime = document.getElementById('edit-garage-open-time').value;
            const closeTime = document.getElementById('edit-garage-close-time').value;
            const openDays = document.getElementById('edit-garage-open-days').value.trim();
            const openToday = document.getElementById('edit-garage-open-today').checked;
            
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
                        name, description, address, city, phone, email, imageUrl, latitude, longitude, openTime, closeTime, openDays, openToday, businessRegNo
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast(data.message || 'Garage profile updated successfully!', 'success');
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

        initStarPickers() {
            const bindPicker = (pickerId, hiddenInputId) => {
                const picker = document.getElementById(pickerId);
                const hiddenInput = document.getElementById(hiddenInputId);
                if (!picker || !hiddenInput) return;

                const stars = picker.querySelectorAll('.star-icon');

                const updateStars = (val) => {
                    stars.forEach(star => {
                        const starVal = parseInt(star.getAttribute('data-value'), 10);
                        if (starVal <= val) {
                            star.classList.add('active');
                        } else {
                            star.classList.remove('active');
                        }
                    });
                };

                stars.forEach(star => {
                    star.addEventListener('mouseenter', () => {
                        const val = parseInt(star.getAttribute('data-value'), 10);
                        updateStars(val);
                    });

                    star.addEventListener('click', () => {
                        const val = parseInt(star.getAttribute('data-value'), 10);
                        hiddenInput.value = val;
                        updateStars(val);
                    });
                });

                picker.addEventListener('mouseleave', () => {
                    const currentVal = parseInt(hiddenInput.value, 10) || 5;
                    updateStars(currentVal);
                });

                // Set initial state
                updateStars(parseInt(hiddenInput.value, 10) || 5);
            };

            bindPicker('garage-star-picker', 'review-rating');
            bindPicker('shop-star-picker', 'rate-shop-rating');
        },

        setStarPickerValue(pickerId, val) {
            const picker = document.getElementById(pickerId);
            if (!picker) return;
            const stars = picker.querySelectorAll('.star-icon');
            stars.forEach(star => {
                const starVal = parseInt(star.getAttribute('data-value'), 10);
                if (starVal <= val) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
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
            document.getElementById('shop-business-reg-no').value = '';
            document.getElementById('shop-image').value = '';
            document.getElementById('shop-lat').value = '';
            document.getElementById('shop-lng').value = '';
            
            document.getElementById('shop-open-time').value = '08:30';
            document.getElementById('shop-close-time').value = '18:00';
            document.getElementById('shop-open-days').value = 'Monday - Saturday';
            document.getElementById('shop-open-today').checked = true;

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
            document.getElementById('shop-business-reg-no').value = s.businessRegNo || '';
            document.getElementById('shop-image').value = s.imageUrl || '';
            document.getElementById('shop-lat').value = s.latitude || '';
            document.getElementById('shop-lng').value = s.longitude || '';
            
            document.getElementById('shop-open-time').value = s.openTime || '08:30';
            document.getElementById('shop-close-time').value = s.closeTime || '18:00';
            document.getElementById('shop-open-days').value = s.openDays || 'Monday - Saturday';
            document.getElementById('shop-open-today').checked = s.openToday !== false;

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
            const businessRegNo = document.getElementById('shop-business-reg-no').value.trim();
            
            const openTime = document.getElementById('shop-open-time').value;
            const closeTime = document.getElementById('shop-close-time').value;
            const openDays = document.getElementById('shop-open-days').value.trim();
            const openToday = document.getElementById('shop-open-today').checked;
            
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
                        name, description, address, city, phone, email, imageUrl, latitude, longitude, openTime, closeTime, openDays, openToday, businessRegNo
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast(data.message || (editId ? 'Shop profile updated successfully!' : 'Spare Part Shop registered successfully!'), 'success');
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

                this.renderShopMyShopsFiltered();
            } catch (err) {
                console.error("Error loading owner shops:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading shops.</p>';
            }
        },

        renderShopMyShopsFiltered() {
            const list = document.getElementById('shop-my-shops-list');
            if (!list) return;

            const searchVal = (document.getElementById('shop-my-shops-search-input')?.value || '').toLowerCase().trim();
            let shops = this.ownerShops || [];

            if (searchVal) {
                shops = shops.filter(s => 
                    (s.shopName || '').toLowerCase().includes(searchVal) ||
                    (s.city || '').toLowerCase().includes(searchVal) ||
                    (s.address || '').toLowerCase().includes(searchVal)
                );
            }

            if (shops.length === 0) {
                list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No shops found matching search.</p>';
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
                    <a href="shop.html?id=${s.id}" class="profile-link" style="display:flex; gap:1rem; align-items:center; text-decoration:none; color:inherit;" unique-id="view-shop-profile-${s.id}">
                        <img src="${s.imageUrl || 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=150'}" style="width:80px; height:60px; object-fit:cover; border-radius:var(--radius-sm);">
                        <div>
                            <h4 style="font-weight:700;">${s.shopName}</h4>
                            <p style="font-size:0.85rem; color:var(--text-secondary);"><i class="fa-solid fa-location-dot"></i> ${s.address}, ${s.city}</p>
                        </div>
                    </a>
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
                this.renderShopInventoryFiltered();
            } catch (err) {
                console.error("Error loading shop inventory:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading inventory.</p>';
            }
        },

        renderShopInventoryFiltered() {
            const list = document.getElementById('shop-inventory-list');
            if (!list) return;

            if (!this.currentInventory) {
                list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No inventory found.</p>';
                return;
            }

            const searchVal = (document.getElementById('shop-inventory-search-input')?.value || '').toLowerCase().trim();

            let parts = this.currentInventory;

            if (searchVal) {
                parts = parts.filter(p => 
                    (p.partName || '').toLowerCase().includes(searchVal) ||
                    (p.vehicleModel || '').toLowerCase().includes(searchVal) ||
                    (p.vehicleYear || '').toLowerCase().includes(searchVal)
                );
            }

            if (parts.length === 0) {
                list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No spare parts match the search criteria.</p>';
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

                this.customerReservationsRaw = bookings;
                this.renderCustomerReservationsFiltered();
            } catch (err) {
                console.error("Error loading customer reservations:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading reservations.</p>';
            }
        },

        renderCustomerReservationsFiltered() {
            const list = document.getElementById('customer-reservations-list');
            const completedList = document.getElementById('customer-picked-up-list');
            if (!list) return;

            const searchVal = (document.getElementById('customer-reservation-search-input')?.value || '').toLowerCase().trim();
            let bookings = this.customerReservationsRaw || [];

            if (searchVal) {
                bookings = bookings.filter(b => 
                    (b.bookingCode || '').toLowerCase().includes(searchVal) ||
                    (b.sparePart && b.sparePart.partName || '').toLowerCase().includes(searchVal) ||
                    (b.sparePart && b.sparePart.shop && b.sparePart.shop.shopName || '').toLowerCase().includes(searchVal) ||
                    (b.notes || '').toLowerCase().includes(searchVal) ||
                    (b.status || '').toLowerCase().includes(searchVal)
                );
            }

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
                            onclick="window.GarageLK.openCancellationModal(${b.id}, 'PART_RESERVATION')" unique-id="cancel-part-btn-${b.id}">
                            Cancel Reservation
                        </button>
                    `;

                    const formattedPickup = new Date(b.pickupDate).toLocaleString();

                    item.innerHTML = `
                        <div style="flex:1; display:flex; gap:1rem; align-items:center;">
                            <img src="${b.sparePart.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=150'}" style="width:85px; height:65px; object-fit:cover; border-radius:var(--radius-sm);">
                            <div>
                                <h4 style="font-weight:700; margin:0;">${b.sparePart.partName} <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.bookingCode || 'No ID'})</span></h4>
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
                            <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${(b.totalPrice != null ? b.totalPrice : (b.price != null ? b.price : 0)).toFixed(2)}</span>
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

                        const reasonHtml = (b.status === 'CANCELLED' && b.cancellationReason) 
                            ? `<br><strong style="color:var(--danger);">Reason for Cancel:</strong> ${b.cancellationReason}` 
                            : '';

                        item.innerHTML = `
                            <div style="flex:1; display:flex; gap:1rem; align-items:center;">
                                <img src="${b.sparePart.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=150'}" style="width:85px; height:65px; object-fit:cover; border-radius:var(--radius-sm);">
                                <div>
                                    <h4 style="font-weight:700; margin:0;">${b.sparePart.partName} <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.bookingCode || 'No ID'})</span></h4>
                                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:2px; margin-bottom:4px;">
                                        <strong>Shop:</strong> ${b.sparePart.shop.shopName} &bull; <strong>Quantity:</strong> ${b.quantity} unit(s)
                                    </p>
                                    <p style="font-size:0.8rem; color:var(--text-muted); margin:0; line-height:1.35;">
                                        <strong>Pickup Estimation:</strong> ${formattedPickup} <br>
                                        ${b.notes ? `<strong>Notes:</strong> ${b.notes}` : ''}
                                        ${reasonHtml}
                                    </p>
                                </div>
                            </div>
                            <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; min-width:180px;">
                                <span class="badge ${badgeClass}">${b.status.replace(/_/g, ' ')}</span>
                                <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${(b.totalPrice != null ? b.totalPrice : (b.price != null ? b.price : 0)).toFixed(2)}</span>
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

                this.shopReservationsRaw = bookings;
                this.renderShopReservationsFiltered();
            } catch (err) {
                console.error("Error loading shop reservations:", err);
                list.innerHTML = '<p style="text-align:center; padding: 2rem; color:var(--danger);">Error loading reservations.</p>';
            }
        },

        renderShopReservationsFiltered() {
            const list = document.getElementById('shop-reservations-list');
            const completedList = document.getElementById('shop-completed-reservations-list');
            if (!list) return;

            const searchVal = (document.getElementById('shop-reservation-search-input')?.value || '').toLowerCase().trim();

            let bookings = this.shopReservationsRaw || [];

            if (searchVal) {
                bookings = bookings.filter(b => 
                    (b.bookingCode || '').toLowerCase().includes(searchVal) ||
                    (b.sparePart.partName || '').toLowerCase().includes(searchVal) ||
                    (b.sparePart.shop.shopName || '').toLowerCase().includes(searchVal) ||
                    (b.customer.user.fullName || b.customer.user.username || '').toLowerCase().includes(searchVal) ||
                    (b.customer.user.phone || '').toLowerCase().includes(searchVal) ||
                    (b.notes || '').toLowerCase().includes(searchVal)
                );
            }

            const incomingBookings = bookings.filter(b => b.status === 'PENDING' || b.status === 'READY_FOR_PICKUP');
            const completedBookings = bookings.filter(b => b.status === 'PICKED_UP' || b.status === 'CANCELLED');

            if (incomingBookings.length === 0) {
                list.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No incoming spare part reservations matching search.</p>';
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
                                <h4 style="font-weight:700; margin:0;">${b.sparePart.partName} <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.bookingCode || 'No ID'})</span> <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">at ${b.sparePart.shop.shopName}</span></h4>
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
                            <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${(b.totalPrice != null ? b.totalPrice : (b.price != null ? b.price : 0)).toFixed(2)}</span>
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
                    completedList.innerHTML = '<p style="text-align:center; padding: 3rem; color:var(--text-muted);">No completed reservation history matching search.</p>';
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

                        const reasonHtml = (b.status === 'CANCELLED' && b.cancellationReason) 
                            ? `<br><strong style="color:var(--danger);">Reason for Cancel:</strong> ${b.cancellationReason}` 
                            : '';

                        item.innerHTML = `
                            <div style="flex:1; display:flex; gap:1rem; align-items:center;">
                                <img src="${b.sparePart.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=150'}" style="width:85px; height:65px; object-fit:cover; border-radius:var(--radius-sm);">
                                <div>
                                    <h4 style="font-weight:700; margin:0;">${b.sparePart.partName} <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${b.bookingCode || 'No ID'})</span> <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">at ${b.sparePart.shop.shopName}</span></h4>
                                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:2px; margin-bottom:4px;">
                                        <strong>Customer:</strong> ${cust.fullName || cust.username} (${cust.phone || 'N/A'}) &bull; <strong>Qty:</strong> ${b.quantity}
                                    </p>
                                    <p style="font-size:0.8rem; color:var(--text-muted); margin:0; line-height:1.35;">
                                        <strong>Requested Pickup:</strong> ${formattedPickup}
                                        ${b.notes ? `<br><strong>Notes:</strong> ${b.notes}` : ''}
                                        ${reasonHtml}
                                    </p>
                                </div>
                            </div>
                            <div style="text-align: right; display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; min-width:180px;">
                                <span class="badge ${badgeClass}">${b.status.replace(/_/g, ' ')}</span>
                                <span style="font-weight:bold; color:var(--secondary); font-size:0.95rem;">LKR ${(b.totalPrice != null ? b.totalPrice : (b.price != null ? b.price : 0)).toFixed(2)}</span>
                                <div style="display:flex; gap:0.5rem; margin-top:0.25rem;">
                                    ${actionHtml}
                                </div>
                            </div>
                        `;
                        completedList.appendChild(item);
                    });
                }
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
            this.setStarPickerValue('shop-star-picker', 5);
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
            const tilesUrl = theme === 'day'
                ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
            
            if (this.defaultTileLayer) {
                this.defaultTileLayer.setUrl(tilesUrl);
            }
            if (this.pickerDefaultTileLayer) {
                this.pickerDefaultTileLayer.setUrl(tilesUrl);
            }
            if (this.breakdownDefaultTileLayer) {
                this.breakdownDefaultTileLayer.setUrl(tilesUrl);
            }
        },

        cancellationReasons: {
            BOOKING: [
                "Found a better price elsewhere",
                "Rescheduled for a different date/time",
                "Changed my mind / no longer needed",
                "Vehicle issue resolved independently",
                "Garage location is too far/inconvenient"
            ],
            PART_RESERVATION: [
                "Purchased the part from another shop",
                "Part no longer required for my vehicle",
                "Found a cheaper alternative",
                "Ordered wrong compatibility by mistake",
                "Delay in pickup date / scheduling conflict"
            ],
            BREAKDOWN: [
                "Vehicle started / resolved the issue myself",
                "Found another mechanic/tow truck nearby",
                "Long wait time / helper taking too long",
                "Friends/family arrived to help",
                "Decided to call a personal contact/insurance tow"
            ]
        },

        openCancellationModal(id, type) {
            document.getElementById('cancel-item-id').value = id;
            document.getElementById('cancel-item-type').value = type;
            
            const selectEl = document.getElementById('cancel-reason-select');
            if (!selectEl) return;
            selectEl.innerHTML = '';
            
            const reasons = this.cancellationReasons[type] || [];
            reasons.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.textContent = r;
                selectEl.appendChild(opt);
            });
            
            this.openModal('modal-cancellation');
        },

        async submitCancellation(e) {
            e.preventDefault();
            const id = parseInt(document.getElementById('cancel-item-id').value);
            const type = document.getElementById('cancel-item-type').value;
            const reason = document.getElementById('cancel-reason-select').value;
            
            this.closeModal('modal-cancellation');
            
            if (type === 'BOOKING') {
                await this.performBookingCancellation(id, reason);
            } else if (type === 'PART_RESERVATION') {
                await this.performPartReservationCancellation(id, reason);
            } else if (type === 'BREAKDOWN') {
                await this.performBreakdownCancellation(id, reason);
            }
        },

        async performBookingCancellation(id, cancellationReason) {
            try {
                const res = await fetch(`/api/bookings/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'CANCELLED', cancellationReason })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Appointment cancelled successfully', 'success');
                    this.loadCustomerBookings();
                } else {
                    this.showToast(data.message || 'Cancellation failed', 'error');
                }
            } catch (err) {
                console.error("Error cancelling booking:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async performPartReservationCancellation(bookingId, cancellationReason) {
            try {
                const res = await fetch(`/api/spare-parts/bookings/${bookingId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'CANCELLED', cancellationReason })
                });

                const data = await res.json();
                if (res.ok) {
                    this.showToast('Reservation cancelled successfully', 'success');
                    this.loadCustomerReservations();
                } else {
                    this.showToast(data.message || 'Cancellation failed', 'error');
                }
            } catch (err) {
                console.error("Error cancelling reservation:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async performBreakdownCancellation(id, cancellationReason) {
            try {
                const res = await fetch(`/api/breakdowns/${id}/cancel`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cancellationReason })
                });
                if (res.ok) {
                    this.showToast('Emergency request cancelled.', 'success');
                    this.loadCustomerBreakdowns();
                } else {
                    this.showToast('Failed to cancel request', 'error');
                }
            } catch (err) {
                console.error("Error cancelling breakdown:", err);
                this.showToast('Connection error', 'error');
            }
        },

        async quickLookupID(inputIdOrCode) {
            let code = '';
            if (typeof inputIdOrCode === 'string' && (inputIdOrCode.startsWith('GBK-') || inputIdOrCode.startsWith('SPB-') || inputIdOrCode.startsWith('EMB-'))) {
                code = inputIdOrCode.trim();
            } else {
                const inputEl = document.getElementById(inputIdOrCode);
                if (!inputEl) return;
                code = inputEl.value.trim();
            }
            if (!code) {
                this.showToast('Please enter an ID code.', 'error');
                return;
            }

            const contentEl = document.getElementById('search-details-content');
            if (!contentEl) return;

            contentEl.innerHTML = '<div style="text-align:center; padding:2rem;"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; color:var(--primary);"></i><p style="margin-top:1rem; color:var(--text-secondary);">Retrieving details...</p></div>';
            this.openModal('modal-search-details');

            try {
                const res = await fetch(`/api/search/code/${encodeURIComponent(code)}`);
                const data = await res.json();

                if (!res.ok) {
                    contentEl.innerHTML = `
                        <div style="text-align:center; padding:2rem;">
                            <i class="fa-solid fa-circle-exclamation" style="font-size:3rem; color:var(--danger); margin-bottom:1rem;"></i>
                            <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:0.5rem; color:var(--text-primary);">Search Failed</h3>
                            <p style="color:var(--text-secondary); margin-bottom:0;">${data.message || 'Could not retrieve request details.'}</p>
                        </div>
                    `;
                    return;
                }

                // Render based on request type
                let badgeClass = 'badge-pending';
                if (data.status === 'APPROVED' || data.status === 'READY_FOR_PICKUP' || data.status === 'ACCEPTED') {
                    badgeClass = 'badge-approved';
                } else if (data.status === 'COMPLETED' || data.status === 'PICKED_UP' || data.status === 'RESOLVED') {
                    badgeClass = 'badge-completed';
                } else if (data.status === 'CANCELLED') {
                    badgeClass = 'badge-cancelled';
                }

                let headerTitle = '';
                let headerIcon = '';
                let detailsHtml = '';

                if (data.type === 'BOOKING') {
                    headerIcon = '<i class="fa-solid fa-calendar-check" style="color:var(--primary);"></i>';
                    headerTitle = 'Garage Booking Appointment';
                    
                    const priceVal = data.totalPrice ? `LKR ${parseFloat(data.totalPrice).toFixed(2)}` : 'LKR 0.00';
                    const notesText = data.notes ? data.notes : '<em style="color:var(--text-muted);">None</em>';
                    const descText = data.description ? data.description : '<em style="color:var(--text-muted);">None</em>';
                    
                    detailsHtml = `
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Garage Name</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${data.garageName}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Service Type</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${data.serviceType || 'N/A'}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Booking Date & Time</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${data.bookingDate} &bull; ${data.timeSlot}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Total Cost</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--secondary); font-size:1.1rem;">${priceVal}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Vehicle Info</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${data.vehicleType} (${data.vehicleNo})</p>
                            </div>
                        </div>
                        
                        <div style="border-top: 1px solid var(--border-color); padding-top:1rem; margin-bottom:1.5rem;">
                            <h4 style="font-size:0.9rem; font-weight:700; margin:0 0 0.5rem 0; color:var(--text-primary);">Description & Instructions</h4>
                            <p style="font-size:0.85rem; color:var(--text-secondary); background:var(--bg-surface-tint); padding:0.75rem; border-radius:var(--radius-sm); margin:0;">${descText}</p>
                        </div>
                        
                        <div style="border-top: 1px solid var(--border-color); padding-top:1rem; margin-bottom:1.5rem;">
                            <h4 style="font-size:0.9rem; font-weight:700; margin:0 0 0.5rem 0; color:var(--text-primary);">Additional Notes</h4>
                            <p style="font-size:0.85rem; color:var(--text-secondary); background:var(--bg-surface-tint); padding:0.75rem; border-radius:var(--radius-sm); margin:0;">${notesText}</p>
                        </div>
                    `;
                } else if (data.type === 'SPARE_PART') {
                    headerIcon = '<i class="fa-solid fa-gears" style="color:var(--primary);"></i>';
                    headerTitle = 'Spare Part Reservation';
                    
                    const priceVal = data.totalPrice ? `LKR ${parseFloat(data.totalPrice).toFixed(2)}` : 'LKR 0.00';
                    const notesText = data.notes ? data.notes : '<em style="color:var(--text-muted);">None</em>';
                    
                    detailsHtml = `
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Shop Name</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${data.shopName}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Part Name</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${data.partName}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Quantity Reserved</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${data.quantity} units</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Total Price</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--secondary); font-size:1.1rem;">${priceVal}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Pickup Deadline</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${new Date(data.pickupDate).toLocaleString()}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Reserved Date</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${new Date(data.bookingDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                        
                        <div style="border-top: 1px solid var(--border-color); padding-top:1rem; margin-bottom:1.5rem;">
                            <h4 style="font-size:0.9rem; font-weight:700; margin:0 0 0.5rem 0; color:var(--text-primary);">Buyer Notes</h4>
                            <p style="font-size:0.85rem; color:var(--text-secondary); background:var(--bg-surface-tint); padding:0.75rem; border-radius:var(--radius-sm); margin:0;">${notesText}</p>
                        </div>
                    `;
                } else if (data.type === 'BREAKDOWN') {
                    headerIcon = '<i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i>';
                    headerTitle = 'Emergency Breakdown Request';
                    
                    const mechInfo = data.assignedMechanicName 
                        ? `<p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${data.assignedMechanicName} (${data.assignedMechanicPhone || 'N/A'})</p>`
                        : '<p style="color:var(--text-muted); margin:2px 0 0 0;">None assigned yet</p>';

                    detailsHtml = `
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Location City</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${data.locationCity}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Full Address</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${data.address}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Vehicle Plate No.</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${data.vehicleNo}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Contact Phone</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${data.contactPhone}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Dispatched Garage</span>
                                <p style="font-weight:700; margin:2px 0 0 0; color:var(--text-primary);">${data.assignedGarageName || 'None'}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Assigned Mechanic</span>
                                ${mechInfo}
                            </div>
                        </div>

                        <div style="border-top: 1px solid var(--border-color); padding-top:1rem; margin-bottom:1.5rem;">
                            <h4 style="font-size:0.9rem; font-weight:700; margin:0 0 0.5rem 0; color:var(--text-primary);">Stranded Situation</h4>
                            <p style="font-size:0.85rem; color:var(--text-secondary); background:var(--bg-surface-tint); padding:0.75rem; border-radius:var(--radius-sm); margin:0;">${data.description}</p>
                        </div>
                    `;
                }

                // Common customer detail section
                const custName = data.customerName;
                const custPhone = data.customerPhone || 'N/A';
                const custEmail = data.customerEmail || 'N/A';

                const customerSectionHtml = `
                    <div style="border-top: 1px solid var(--border-color); padding-top:1rem; margin-bottom:1.5rem;">
                        <h4 style="font-size:0.9rem; font-weight:700; margin:0 0 0.75rem 0; color:var(--text-primary);"><i class="fa-solid fa-user-tag"></i> Customer Information</h4>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:0.75rem;">
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted);">Name</span>
                                <p style="font-weight:600; margin:2px 0 0 0; font-size:0.85rem; color:var(--text-primary);">${custName}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted);">Phone Number</span>
                                <p style="font-weight:600; margin:2px 0 0 0; font-size:0.85rem; color:var(--text-primary);">${custPhone}</p>
                            </div>
                            <div>
                                <span style="font-size:0.75rem; color:var(--text-muted);">Email Address</span>
                                <p style="font-weight:600; margin:2px 0 0 0; font-size:0.85rem; color:var(--text-primary);">${custEmail}</p>
                            </div>
                        </div>
                    </div>
                `;

                // Cancellation reason section (if cancelled)
                let cancellationHtml = '';
                if (data.status === 'CANCELLED') {
                    cancellationHtml = `
                        <div style="background:rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius:var(--radius-md); padding:1rem; margin-bottom:1.5rem;">
                            <h4 style="font-size:0.9rem; font-weight:700; margin:0 0 0.5rem 0; color:#ef4444;"><i class="fa-solid fa-ban"></i> Reason for Cancellation</h4>
                            <p style="font-size:0.85rem; color:#f87171; margin:0; line-height:1.4;">${data.cancellationReason || 'No reason provided.'}</p>
                        </div>
                    `;
                }

                contentEl.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:1rem; margin-bottom:1.5rem; flex-wrap:wrap; gap:0.5rem;">
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                            <div style="font-size:1.75rem; width:45px; height:45px; display:flex; align-items:center; justify-content:center; background:var(--bg-surface-tint); border-radius:var(--radius-md);">
                                ${headerIcon}
                            </div>
                            <div>
                                <h3 style="font-size:1.15rem; font-weight:700; margin:0; color:var(--text-primary);">${headerTitle}</h3>
                                <span style="font-size:0.8rem; color:var(--text-muted); font-family:monospace; font-weight:700;">Code: ${data.code}</span>
                            </div>
                        </div>
                        <span class="badge ${badgeClass}" style="padding:0.4rem 0.8rem; font-size:0.8rem;">${data.status.replace(/_/g, ' ')}</span>
                    </div>

                    ${cancellationHtml}
                    ${detailsHtml}
                    ${customerSectionHtml}
                `;

                // Handle scroll buttons check dynamically
                setTimeout(() => {
                    const scrollUpBtn = document.querySelector('.modal-scroll-btn.scroll-up');
                    const scrollDownBtn = document.querySelector('.modal-scroll-btn.scroll-down');
                    if (contentEl && scrollUpBtn && scrollDownBtn) {
                        const checkScroll = () => {
                            const isScrollable = contentEl.scrollHeight > contentEl.clientHeight;
                            scrollUpBtn.style.display = (isScrollable && contentEl.scrollTop > 10) ? 'flex' : 'none';
                            scrollDownBtn.style.display = (isScrollable && contentEl.scrollTop + contentEl.clientHeight < contentEl.scrollHeight - 10) ? 'flex' : 'none';
                        };
                        contentEl.removeEventListener('scroll', contentEl._checkScrollFn);
                        contentEl._checkScrollFn = checkScroll;
                        contentEl.addEventListener('scroll', checkScroll);
                        checkScroll();
                    }
                }, 100);

            } catch (err) {
                console.error("Lookup error:", err);
                contentEl.innerHTML = `
                    <div style="text-align:center; padding:2rem;">
                        <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem; color:var(--danger); margin-bottom:1rem;"></i>
                        <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:0.5rem; color:var(--text-primary);">Lookup Error</h3>
                        <p style="color:var(--text-secondary); margin-bottom:0;">An unexpected network error occurred. Please check your connection and try again.</p>
                    </div>
                `;
            }
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

        // Register enter keypress handlers for lookup inputs
        const ownerSearch = document.getElementById('owner-quick-search-id');
        if (ownerSearch) {
            ownerSearch.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    GarageLK.quickLookupID('owner-quick-search-id');
                }
            });
        }
        const shopSearch = document.getElementById('shop-quick-search-id');
        if (shopSearch) {
            shopSearch.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    GarageLK.quickLookupID('shop-quick-search-id');
                }
            });
        }
        const breakdownSearch = document.getElementById('breakdown-quick-search-id');
        if (breakdownSearch) {
            breakdownSearch.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    GarageLK.quickLookupID('breakdown-quick-search-id');
                }
            });
        }

        // Register window scroll listener for Scroll-to-Top button
        window.addEventListener('scroll', () => {
            const btn = document.getElementById('btn-scroll-to-top');
            if (btn) {
                if (window.scrollY > 300) {
                    btn.style.display = 'flex';
                } else {
                    btn.style.display = 'none';
                }
            }
        });

        // Register window resize listener to update Leaflet maps
        window.addEventListener('resize', () => {
            if (window.GarageLK) {
                if (window.GarageLK.map) window.GarageLK.map.invalidateSize();
                if (window.GarageLK.pickerMap) window.GarageLK.pickerMap.invalidateSize();
                if (window.GarageLK.breakdownRouteMap) window.GarageLK.breakdownRouteMap.invalidateSize();
            }
        });
    });

    window.GarageLK = GarageLK;
})();
