/* auth.js - Handles Login, Registration, and Sign Out operations */

const auth = {
    currentRole: null, // "CUSTOMER", "GARAGE_OWNER", "ADMIN"
    currentTab: 'login', // "login" or "register"

    init(role) {
        this.currentRole = role;
        this.setTab('login');
        
        const logo = document.getElementById('auth-logo');
        const subtitle = document.getElementById('auth-subtitle');
        const tabRegister = document.getElementById('tab-register');
        const tabsContainer = document.getElementById('auth-tabs-container');

        // Customize layout based on role
        if (role === 'CUSTOMER') {
            logo.innerText = 'Vehicle Owner Portal';
            subtitle.innerText = 'Sign in to schedule service or request roadside help';
            tabsContainer.style.display = 'flex';
            tabRegister.style.display = 'block';
        } else if (role === 'GARAGE_OWNER') {
            logo.innerText = 'Garage Partner Portal';
            subtitle.innerText = 'Manage bookings and list your services';
            tabsContainer.style.display = 'flex';
            tabRegister.style.display = 'block';
        } else if (role === 'ADMIN') {
            logo.innerText = 'System Control Panel';
            subtitle.innerText = 'Enter administrator credentials';
            // Administrators cannot register themselves via web UI for security
            tabsContainer.style.display = 'none';
        }

        // Reset forms
        document.getElementById('form-login').reset();
        document.getElementById('form-register').reset();
    },

    setTab(tab) {
        this.currentTab = tab;
        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');
        const formLogin = document.getElementById('form-login');
        const formRegister = document.getElementById('form-register');

        // Toggle active tabs
        if (tab === 'login') {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            formLogin.style.display = 'block';
            formRegister.style.display = 'none';
        } else {
            tabLogin.classList.remove('active');
            tabRegister.classList.add('active');
            formLogin.style.display = 'none';
            formRegister.style.display = 'block';
            
            // Adjust fields inside register form
            const fieldsCust = document.getElementById('fields-customer');
            const fieldsGar = document.getElementById('fields-garage');
            
            if (this.currentRole === 'CUSTOMER') {
                fieldsCust.style.display = 'block';
                fieldsGar.style.display = 'none';
                
                // Toggle required fields
                document.getElementById('cust-vehicletype').required = true;
                document.getElementById('cust-fueltype').required = true;
                
                document.getElementById('gar-name').required = false;
                document.getElementById('gar-owner').required = false;
                document.getElementById('gar-address').required = false;
                document.getElementById('gar-city').required = false;
            } else {
                fieldsCust.style.display = 'none';
                fieldsGar.style.display = 'none'; // Do not display garage fields at registration
                
                document.getElementById('cust-vehicletype').required = false;
                document.getElementById('cust-fueltype').required = false;
                
                document.getElementById('gar-name').required = false;
                document.getElementById('gar-owner').required = false;
                document.getElementById('gar-address').required = false;
                document.getElementById('gar-city').required = false;
            }
        }
    },

    async handleLogin(event) {
        event.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const data = await app.post('/api/auth/login', { username, password });
            if (data && data.user) {
                app.user = data.user;
                app.role = data.user.role;
                app.showToast('Successfully logged in!', 'success');
                app.renderDashboard();
            }
        } catch(e) {
            // Error handled by app.request toast
        }
    },

    async handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const email = document.getElementById('reg-email').value;
        const phone = document.getElementById('reg-phone').value;

        let payload = { username, password, email, phone };

        try {
            if (this.currentRole === 'CUSTOMER') {
                payload.vehicleNo = document.getElementById('cust-vehicleno').value;
                payload.vehicleType = document.getElementById('cust-vehicletype').value;
                payload.fuelType = document.getElementById('cust-fueltype').value;

                await app.post('/api/auth/register/customer', payload);
                app.showToast('Account registered successfully! You can login now.', 'success');
                this.setTab('login');
            } else {
                // Register garage owner user account only
                await app.post('/api/auth/register/garage', payload);
                app.showToast('Garage owner account created. Please sign in to register your garage.', 'success');
                this.setTab('login');
            }
        } catch (e) {
            // Errors handled by app.request toast
        }
    },

    async handleLogout() {
        try {
            await app.post('/api/auth/logout', {});
            app.showToast('Successfully logged out.', 'info');
            app.showLanding();
        } catch(e) {
            app.showLanding();
        }
    },

    // Mock coordinates generator for Sri Lanka districts
    getMockCoordinates(district) {
        if (!district) return { lat: 6.9271, lng: 79.8612 };
        const key = district.trim().charAt(0).toUpperCase() + district.trim().slice(1).toLowerCase();
        const coords = {
            'Ampara': { lat: 7.3019, lng: 81.6747 },
            'Anuradhapura': { lat: 8.3114, lng: 80.4037 },
            'Badulla': { lat: 6.9934, lng: 81.0550 },
            'Batticaloa': { lat: 7.7311, lng: 81.6747 },
            'Colombo': { lat: 6.9271, lng: 79.8612 },
            'Galle': { lat: 6.0535, lng: 80.2117 },
            'Gampaha': { lat: 7.0873, lng: 80.0144 },
            'Hambantota': { lat: 6.1246, lng: 81.1185 },
            'Jaffna': { lat: 9.6615, lng: 80.0255 },
            'Kalutara': { lat: 6.5854, lng: 79.9607 },
            'Kandy': { lat: 7.2906, lng: 80.6337 },
            'Kegalle': { lat: 7.2514, lng: 80.3464 },
            'Kilinochchi': { lat: 9.3803, lng: 80.4037 },
            'Kurunegala': { lat: 7.4863, lng: 80.3647 },
            'Mannar': { lat: 8.9811, lng: 79.9044 },
            'Matale': { lat: 7.4682, lng: 80.6244 },
            'Matara': { lat: 5.9549, lng: 80.5550 },
            'Moneragala': { lat: 6.8714, lng: 81.3486 },
            'Mullaitivu': { lat: 9.2667, lng: 80.8144 },
            'Nuwara Eliya': { lat: 6.9497, lng: 80.7891 },
            'Polonnaruwa': { lat: 7.9397, lng: 81.0003 },
            'Puttalam': { lat: 8.0362, lng: 79.8283 },
            'Ratnapura': { lat: 6.6828, lng: 80.3992 },
            'Trincomalee': { lat: 8.5873, lng: 81.2152 },
            'Vavuniya': { lat: 8.7514, lng: 80.4972 }
        };
        return coords[key] || { lat: 6.9271, lng: 79.8612 };
    }
};
