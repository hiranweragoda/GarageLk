/* garage.js - Manages Garage dashboard: booking queue, service rates, and active breakdown alerts */

const garage = {
    bookings: [],
    services: [],
    emergencies: [],

    init() {
        this.loadBookings();
        this.loadServices();
        this.loadEmergencies();
    },

    // =========================================================
    // 1. MANAGE BOOKINGS
    // =========================================================
    async loadBookings() {
        try {
            const data = await app.get('/api/bookings/my');
            if (data) {
                this.bookings = data;
                this.renderBookings();
            }
        } catch(e) {}
    },

    renderBookings() {
        const tbody = document.getElementById('garage-bookings-tbody');
        tbody.innerHTML = '';

        if (this.bookings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 30px;">No appointments in your queue yet.</td></tr>`;
            return;
        }

        this.bookings.forEach(b => {
            const date = new Date(b.bookingDate);
            const dateStr = date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

            let actions = '';
            if (b.status === 'PENDING') {
                actions = `
                    <button class="btn btn-success btn-sm" onclick="garage.updateBookingStatus(${b.id}, 'CONFIRMED')">Accept ✓</button>
                    <button class="btn btn-secondary btn-sm" style="color: var(--color-emergency); border-color: rgba(239,68,68,0.2);" onclick="garage.updateBookingStatus(${b.id}, 'CANCELLED')">Reject</button>
                `;
            } else if (b.status === 'CONFIRMED') {
                actions = `
                    <button class="btn btn-primary btn-sm" onclick="garage.updateBookingStatus(${b.id}, 'COMPLETED')">Mark Done ✓</button>
                `;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600;">${b.customer.user.username}</td>
                <td>
                    <div style="font-weight: 500;">${b.customer.vehicleType}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${b.customer.vehicleNo} (${b.customer.fuelType})</div>
                </td>
                <td>${b.serviceType}</td>
                <td>${dateStr}</td>
                <td style="font-size: 0.85rem; color: var(--text-secondary); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${b.notes || ''}">
                    ${b.notes || '-'}
                </td>
                <td><span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></td>
                <td><div style="display: flex; gap: 6px;">${actions}</div></td>
            `;
            tbody.appendChild(tr);
        });
    },

    async updateBookingStatus(id, status) {
        try {
            await app.post(`/api/bookings/${id}/status`, { status });
            app.showToast(`Booking ${status.toLowerCase()} successfully.`, 'success');
            this.loadBookings();
        } catch(e) {}
    },

    // =========================================================
    // 2. SERVICE MANAGEMENT
    // =========================================================
    async loadServices() {
        try {
            const data = await app.get('/api/garages/services');
            if (data) {
                this.services = data;
                this.renderServices();
            }
        } catch(e) {}
    },

    renderServices() {
        const list = document.getElementById('garage-prices-list');
        list.innerHTML = '';

        if (this.services.length === 0) {
            list.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 20px;">You have no services listed. Add pricing to start receiving bookings!</p>`;
            return;
        }

        this.services.forEach(s => {
            const item = document.createElement('div');
            item.className = 'price-list-item';
            item.innerHTML = `
                <div>
                    <strong style="color: var(--text-primary);">${s.serviceType}</strong>
                    <div style="color: var(--text-muted); font-size: 0.8rem;">Price registered</div>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="font-weight: 700; color: var(--color-garage);">LKR ${s.price.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    <button class="btn btn-secondary btn-sm" style="color: var(--color-emergency); padding: 4px 8px;" onclick="garage.deleteService(${s.id})">Remove</button>
                </div>
            `;
            list.appendChild(item);
        });
    },

    async saveService(event) {
        event.preventDefault();
        const serviceType = document.getElementById('service-select-type').value;
        const price       = document.getElementById('service-price').value;

        try {
            await app.post('/api/garages/services', { serviceType, price });
            document.getElementById('service-price').value = '';
            app.showToast('Service price saved!', 'success');
            this.loadServices();
        } catch(e) {}
    },

    async deleteService(id) {
        if (!confirm('Remove this service rate? Customers won\'t be able to book this service.')) return;
        try {
            await app.delete(`/api/garages/services/${id}`);
            app.showToast('Service rate deleted.', 'info');
            this.loadServices();
        } catch(e) {}
    },

    // =========================================================
    // 3. ROADSIDE EMERGENCY ALERTS
    // =========================================================
    async loadEmergencies() {
        try {
            const data = await app.get('/api/breakdowns/active');
            if (data) {
                this.emergencies = data;
                this.renderEmergencies();
            }
        } catch(e) {}
    },

    renderEmergencies() {
        const list = document.getElementById('garage-emergency-list');
        list.innerHTML = '';

        if (this.emergencies.length === 0) {
            list.innerHTML = `
                <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
                    <h3>No active emergency requests right now</h3>
                    <p style="margin-top: 10px;">Roadside distress calls in Sri Lanka will appear here in real-time.</p>
                </div>
            `;
            return;
        }

        this.emergencies.forEach(em => {
            const date = new Date(em.createdTime);
            const timeStr = date.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });

            const card = document.createElement('div');
            card.className = 'glass-card breakdown-card';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <span class="pulse-dot" style="margin-right: 6px;"></span>
                        <strong style="color: var(--text-primary);">📍 Location: ${em.locationCity}</strong>
                    </div>
                    <span class="badge badge-open">${em.status}</span>
                </div>
                <div style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 14px;">"${em.description}"</div>

                <div style="font-size: 0.85rem; border-top: 1px solid var(--border-color); padding-top: 12px; margin-bottom: 14px;">
                    <div>👤 Customer: <strong>${em.customer.user.username}</strong></div>
                    <div>🚗 Vehicle: ${em.customer.vehicleType} — ${em.customer.vehicleNo} (${em.customer.fuelType})</div>
                    <div>📞 Phone: <a href="tel:${em.contactPhone}" style="color: var(--color-primary); font-weight: 600;">${em.contactPhone}</a></div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${timeStr}</span>
                    <button class="btn btn-emergency btn-sm" onclick="garage.respondToBreakdown(${em.id})">Respond with Help ⚡</button>
                </div>
            `;
            list.appendChild(card);
        });
    },

    async respondToBreakdown(id) {
        if (!confirm('Are you ready to respond to this customer? Your contact info will be shared.')) return;
        try {
            await app.post(`/api/breakdowns/${id}/respond`, {});
            app.showToast('You have accepted this breakdown rescue request! ⚡', 'success');
            this.loadEmergencies();
        } catch(e) {}
    }
};
