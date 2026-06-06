/* admin.js - Manages Admin dashboard statistics, approvals, and user accounts */

const admin = {
    stats: {
        garages: 0,
        customers: 0,
        bookings: 0,
        emergencies: 0
    },

    init() {
        this.loadStats();
        this.loadPendingGarages();
        this.loadUsers();
    },

    // 1. Load Statistics
    async loadStats() {
        try {
            // Get all garages
            const garages = await app.get('/api/garages/admin/all') || [];
            this.stats.garages = garages.length;
            document.getElementById('stat-total-garages').innerText = this.stats.garages;

            // Get all users to calculate customers count
            const users = await app.get('/api/auth/users') || [];
            this.stats.customers = users.filter(u => u.role === 'CUSTOMER').length;
            document.getElementById('stat-total-customers').innerText = this.stats.customers;

            // Get all bookings
            const bookings = await app.get('/api/bookings/my') || [];
            // Count active bookings (PENDING, CONFIRMED)
            this.stats.bookings = bookings.filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED').length;
            document.getElementById('stat-total-bookings').innerText = this.stats.bookings;

            // Get active emergencies
            const activeBreakdowns = await app.get('/api/breakdowns/active') || [];
            this.stats.emergencies = activeBreakdowns.length;
            document.getElementById('stat-unresolved-emergencies').innerText = this.stats.emergencies;
        } catch(e) {}
    },

    // 2. Pending Garage Approvals
    async loadPendingGarages() {
        try {
            const data = await app.get('/api/garages/pending');
            if (data) {
                const tbody = document.getElementById('admin-approvals-tbody');
                tbody.innerHTML = '';

                if (data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 30px;">No pending garage registration approvals.</td></tr>`;
                    return;
                }

                data.forEach(g => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight: 600;">${g.garageName}</td>
                        <td>${g.ownerName}</td>
                        <td>📍 ${g.city}, ${g.district}</td>
                        <td style="font-size: 0.85rem; color: var(--text-secondary);">${g.address}</td>
                        <td style="font-size: 0.85rem; color: var(--text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${g.description || ''}">
                            ${g.description || '-'}
                        </td>
                        <td>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-success btn-sm" onclick="admin.approveGarage(${g.id})">Approve</button>
                                <button class="btn btn-secondary btn-sm" style="color: var(--color-emergency); border-color: rgba(239, 68, 68, 0.2);" onclick="admin.rejectGarage(${g.id})">Reject</button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        } catch(e) {}
    },

    async approveGarage(id) {
        if (!confirm('Are you sure you want to approve this garage registration?')) return;
        try {
            await app.post(`/api/garages/${id}/approve`, {});
            app.showToast('Garage profile approved and activated.', 'success');
            this.loadStats();
            this.loadPendingGarages();
            this.loadUsers();
        } catch(e) {}
    },

    async rejectGarage(id) {
        if (!confirm('Are you sure you want to reject this garage application?')) return;
        try {
            await app.post(`/api/garages/${id}/reject`, {});
            app.showToast('Garage registration rejected.', 'info');
            this.loadStats();
            this.loadPendingGarages();
            this.loadUsers();
        } catch(e) {}
    },

    // 3. User Management
    async loadUsers() {
        try {
            const data = await app.get('/api/auth/users');
            if (data) {
                const tbody = document.getElementById('admin-users-tbody');
                tbody.innerHTML = '';

                data.forEach(u => {
                    // Do not show action for the logged in admin user
                    let actionBtn = '';
                    if (u.id !== app.user.id) {
                        const btnText = u.active ? 'Deactivate' : 'Activate';
                        const btnColorClass = u.active ? 'color: var(--color-emergency); border-color: rgba(239, 68, 68, 0.2);' : 'color: var(--color-garage); border-color: rgba(16, 185, 129, 0.2);';
                        actionBtn = `<button class="btn btn-secondary btn-sm" style="${btnColorClass}" onclick="admin.toggleUser(${u.id})">${btnText}</button>`;
                    }

                    const statusBadge = u.active 
                        ? `<span class="badge badge-completed">Active</span>` 
                        : `<span class="badge badge-cancelled">Suspended</span>`;

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${u.id}</td>
                        <td style="font-weight: 600;">${u.username}</td>
                        <td>${u.email}</td>
                        <td>${u.phone || '-'}</td>
                        <td><span style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary);">${u.role}</span></td>
                        <td>${statusBadge}</td>
                        <td>${actionBtn}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        } catch(e) {}
    },

    async toggleUser(userId) {
        try {
            const res = await app.post(`/api/garages/admin/toggle-user/${userId}`, {});
            const msg = res.active ? 'User account activated.' : 'User account suspended.';
            app.showToast(msg, 'info');
            this.loadStats();
            this.loadUsers();
            this.loadPendingGarages();
        } catch(e) {}
    }
};
