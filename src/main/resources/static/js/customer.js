/* customer.js - Manages Customer dashboard: search/filter, bookings, emergencies, and reviews */

const customer = {
    garages: [],
    gpsCoords: null, // Stores { lat, lng } from GPS if user grants permission

    init() {
        this.loadGarages();
        this.loadBookings();
        this.loadEmergencies();

        // Pre-fill phone number in emergency form from profile
        if (app.user && app.user.phone) {
            document.getElementById('em-phone').value = app.user.phone;
        }
    },

    // =========================================================
    // 1. SEARCH & FILTER GARAGES
    // =========================================================
    async loadGarages() {
        const district    = document.getElementById('filter-district').value;
        const city        = document.getElementById('search-city').value.trim();
        const service     = document.getElementById('filter-service').value;
        const vehicleType = document.getElementById('filter-vehicle-type').value;
        const engineType  = document.getElementById('filter-engine-type').value;

        let query = '';
        const params = [];

        if (service)     params.push(`serviceType=${encodeURIComponent(service)}`);
        if (city)        params.push(`city=${encodeURIComponent(city)}`);
        if (district)    params.push(`district=${encodeURIComponent(district)}`);
        if (vehicleType) params.push(`vehicleType=${encodeURIComponent(vehicleType)}`);
        if (engineType)  params.push(`engineType=${encodeURIComponent(engineType)}`);

        if (params.length > 0) query = '?' + params.join('&');

        try {
            const data = await app.get(`/api/garages${query}`);
            if (data) {
                this.garages = data;
                this.renderGarages();
            }
        } catch(e) {}
    },

    filterGarages() {
        this.loadGarages();
    },

    renderGarages() {
        const list = document.getElementById('garages-list-container');
        list.innerHTML = '';

        if (this.garages.length === 0) {
            list.innerHTML = `
                <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
                    <h3>No garages found matching your criteria</h3>
                    <p style="margin-top: 10px;">Try adjusting your filters or searching for different locations in Sri Lanka.</p>
                </div>
            `;
            return;
        }

        this.garages.forEach(g => {
            // Build star display
            const ratingHtml = this._buildRatingBadge(g.averageRating, g.reviewCount);

            // Build type tags
            const vehicleTags = g.vehicleTypes
                ? g.vehicleTypes.split(',').map(t => `<span class="type-tag">${t.trim()}</span>`).join('')
                : '';
            const engineTags = g.engineTypes
                ? g.engineTypes.split(',').map(t => `<span class="type-tag engine">${t.trim()}</span>`).join('')
                : '';
            const typesHtml = (vehicleTags || engineTags)
                ? `<div class="type-tags">${vehicleTags}${engineTags}</div>`
                : '';

            const card = document.createElement('div');
            card.className = 'glass-card garage-card';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <h3 class="garage-card-title" style="margin-bottom: 0;">${g.garageName}</h3>
                    ${ratingHtml}
                </div>
                <div class="garage-card-location">📍 ${g.city}, ${g.district} District</div>
                ${typesHtml}
                <p class="garage-card-desc">${g.description || 'No description available.'}</p>
                <div style="margin-top: auto; display: flex; gap: 10px;">
                    <button class="btn btn-primary btn-sm" onclick="customer.viewGarageDetails(${g.id})">View Services &amp; Reviews</button>
                </div>
            `;
            list.appendChild(card);
        });
    },

    _buildRatingBadge(avg, count) {
        if (!count || count === 0) {
            return `<span class="rating-no-reviews">No reviews yet</span>`;
        }
        const stars = this._buildStarDisplay(avg);
        return `<span class="rating-badge">★ ${avg.toFixed(1)} <span style="font-weight:400; opacity:0.7;">(${count})</span></span>`;
    },

    _buildStarDisplay(rating) {
        let html = '<span class="star-display">';
        for (let i = 1; i <= 5; i++) {
            html += `<span class="star ${i <= Math.round(rating) ? 'filled' : ''}">★</span>`;
        }
        html += '</span>';
        return html;
    },

    async viewGarageDetails(id) {
        try {
            const data = await app.get(`/api/garages/${id}`);
            if (data) {
                const g = data.garage;
                const services = data.services;
                const avg = data.averageRating || 0;
                const reviewCount = data.reviewCount || 0;

                document.getElementById('detail-garage-name').innerText = g.garageName;
                document.getElementById('detail-garage-desc').innerText = g.description || 'No description provided.';
                document.getElementById('detail-garage-address').innerText = `📍 Address: ${g.address}, ${g.city}`;
                document.getElementById('detail-garage-phone').innerText = `📞 Contact: ${g.user ? g.user.phone : 'N/A'}`;

                // Rating bar under title
                const ratingBarEl = document.getElementById('detail-garage-rating-bar');
                if (reviewCount > 0) {
                    ratingBarEl.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${this._buildStarDisplay(avg)}
                            <span style="color: #f59e0b; font-weight: 700;">${avg.toFixed(1)}</span>
                            <span style="color: var(--text-muted); font-size: 0.82rem;">${reviewCount} review${reviewCount !== 1 ? 's' : ''}</span>
                        </div>
                    `;
                } else {
                    ratingBarEl.innerHTML = `<span class="rating-no-reviews">No reviews yet</span>`;
                }

                // Vehicle/engine type tags
                const typesEl = document.getElementById('detail-garage-types');
                const vTags = g.vehicleTypes ? g.vehicleTypes.split(',').map(t => `<span class="type-tag">${t.trim()}</span>`).join('') : '';
                const eTags = g.engineTypes ? g.engineTypes.split(',').map(t => `<span class="type-tag engine">${t.trim()}</span>`).join('') : '';
                typesEl.innerHTML = (vTags || eTags) ? `<div class="type-tags">${vTags}${eTags}</div>` : '';

                // Services list
                const servicesList = document.getElementById('detail-services-list');
                servicesList.innerHTML = '';

                if (services.length === 0) {
                    servicesList.innerHTML = `<p style="color: var(--text-secondary); text-align: center;">This garage has not listed any service pricing yet.</p>`;
                } else {
                    services.forEach(s => {
                        const item = document.createElement('div');
                        item.className = 'price-list-item';
                        item.innerHTML = `
                            <div>
                                <strong style="color: var(--text-primary);">${s.serviceType}</strong>
                                <div style="color: var(--text-muted); font-size: 0.8rem;">Ready for booking</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <span style="font-weight: 700; color: var(--color-primary);">LKR ${s.price.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                                <button class="btn btn-primary btn-sm" onclick="customer.openBookingModal(${g.id}, '${(g.garageName || '').replace(/'/g, "\\'")}', '${s.serviceType}', ${s.price})">Book Now</button>
                            </div>
                        `;
                        servicesList.appendChild(item);
                    });
                }

                // Load reviews
                await this.loadGarageReviews(id, reviewCount, avg);

                app.openModal('modal-garage-details');
            }
        } catch(e) {}
    },

    async loadGarageReviews(garageId, reviewCount, avgRating) {
        const container = document.getElementById('detail-reviews-container');
        container.innerHTML = '';

        try {
            const reviews = await app.get(`/api/reviews/garage/${garageId}`);
            if (!reviews || reviews.length === 0) {
                container.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 20px 0;">No reviews yet. Be the first to review this garage!</p>`;
                return;
            }

            // Summary bar
            const summaryBar = document.createElement('div');
            summaryBar.className = 'review-summary-bar';
            summaryBar.innerHTML = `
                <div class="review-avg-score">${avgRating.toFixed(1)}</div>
                <div>
                    ${this._buildStarDisplay(avgRating)}
                    <div class="review-avg-label">${reviewCount} verified review${reviewCount !== 1 ? 's' : ''}</div>
                </div>
            `;
            container.appendChild(summaryBar);

            reviews.forEach(r => {
                const date = new Date(r.createdAt);
                const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

                const card = document.createElement('div');
                card.className = 'review-card';
                card.innerHTML = `
                    <div class="review-card-header">
                        <div>
                            <div class="review-author">${r.customerName}</div>
                            <div class="review-meta">🚗 ${r.vehicleType} &nbsp;•&nbsp; ${r.serviceType}</div>
                        </div>
                        <div style="text-align: right;">
                            ${this._buildStarDisplay(r.starRating)}
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${dateStr}</div>
                        </div>
                    </div>
                    ${r.comment ? `<p class="review-comment">"${r.comment}"</p>` : ''}
                `;
                container.appendChild(card);
            });
        } catch(e) {
            container.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 10px 0;">Could not load reviews.</p>`;
        }
    },

    // =========================================================
    // 2. BOOKINGS
    // =========================================================
    openBookingModal(garageId, garageName, serviceType, price) {
        app.closeModal('modal-garage-details');
        document.getElementById('book-garage-id').value = garageId;
        document.getElementById('book-garage-name').value = garageName;
        document.getElementById('book-service-type').value = serviceType;
        document.getElementById('book-service-price').value = price;
        document.getElementById('book-service-cost').value = `LKR ${price.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById('book-notes').value = '';

        // Default to tomorrow at 9 AM
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        document.getElementById('book-datetime').value = tomorrow.toISOString().slice(0, 16);

        app.openModal('modal-booking');
    },

    async submitBooking(event) {
        event.preventDefault();
        const garageId    = document.getElementById('book-garage-id').value;
        const serviceType = document.getElementById('book-service-type').value;
        const price       = document.getElementById('book-service-price').value;
        const bookingDate = document.getElementById('book-datetime').value;
        const notes       = document.getElementById('book-notes').value;

        try {
            await app.post('/api/bookings', { garageId, serviceType, price, bookingDate, notes });
            app.closeModal('modal-booking');
            app.showToast('Service appointment request submitted!', 'success');
            this.loadBookings();
            app.showPage('customer-bookings', 'My Bookings');
            document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
            const a = document.getElementById('nav-customer-bookings');
            if (a) a.classList.add('active');
        } catch(e) {}
    },

    async loadBookings() {
        try {
            const data = await app.get('/api/bookings/my');
            if (data) {
                const tbody = document.getElementById('customer-bookings-tbody');
                tbody.innerHTML = '';

                if (data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 30px;">No appointments found. Book a service first!</td></tr>`;
                    return;
                }

                data.forEach(b => {
                    const date = new Date(b.bookingDate);
                    const formattedDate = date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

                    let actionBtns = '';
                    if (b.status === 'PENDING') {
                        actionBtns = `<button class="btn btn-secondary btn-sm" style="color: var(--color-emergency); border-color: rgba(239, 68, 68, 0.2);" onclick="customer.cancelBooking(${b.id})">Cancel</button>`;
                    }
                    if (b.status === 'COMPLETED') {
                        actionBtns += `<button class="btn btn-sm" style="background: rgba(245,158,11,0.12); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3);" onclick="customer.openReviewModal(${b.id}, ${b.garage.id}, '${(b.garage.garageName || '').replace(/'/g, "\\'")}')">⭐ Review</button>`;
                    }

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight: 600;">${b.garage.garageName}</td>
                        <td>${b.serviceType}</td>
                        <td>${formattedDate}</td>
                        <td style="font-weight: 700;">LKR ${b.price.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        <td><span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></td>
                        <td><div style="display: flex; gap: 6px; flex-wrap: wrap;">${actionBtns}</div></td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        } catch(e) {}
    },

    async cancelBooking(id) {
        if (!confirm('Are you sure you want to cancel this booking request?')) return;
        try {
            await app.post(`/api/bookings/${id}/status`, { status: 'CANCELLED' });
            app.showToast('Booking cancelled.', 'info');
            this.loadBookings();
        } catch(e) {}
    },

    // =========================================================
    // 3. REVIEWS
    // =========================================================
    async openReviewModal(bookingId, garageId, garageName) {
        // Check if already reviewed
        try {
            const res = await app.get(`/api/reviews/booking/${bookingId}/exists`);
            if (res && res.exists) {
                app.showToast('You have already submitted a review for this service.', 'info');
                return;
            }
        } catch(e) {}

        document.getElementById('review-booking-id').value = bookingId;
        document.getElementById('review-garage-id').value = garageId;
        document.getElementById('review-garage-name').value = garageName;
        document.getElementById('review-comment').value = '';

        // Reset star picker
        document.querySelectorAll('#star-picker-container input[type="radio"]').forEach(r => r.checked = false);

        app.openModal('modal-review');
    },

    async submitReview(event) {
        event.preventDefault();

        const bookingId = document.getElementById('review-booking-id').value;
        const garageId  = document.getElementById('review-garage-id').value;
        const comment   = document.getElementById('review-comment').value;

        const selectedStar = document.querySelector('#star-picker-container input[type="radio"]:checked');
        if (!selectedStar) {
            app.showToast('Please select a star rating before submitting.', 'warning');
            return;
        }

        const starRating = selectedStar.value;

        try {
            await app.post('/api/reviews', { bookingId, garageId, starRating, comment });
            app.closeModal('modal-review');
            app.showToast('Review submitted! Thank you for your feedback. ⭐', 'success');
            this.loadBookings();
        } catch(e) {}
    },

    // =========================================================
    // 4. EMERGENCIES
    // =========================================================
    useGpsLocation() {
        if (!navigator.geolocation) {
            app.showToast('GPS is not supported by your browser.', 'warning');
            return;
        }

        app.showToast('Requesting GPS location...', 'info');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.gpsCoords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                const statusEl = document.getElementById('gps-status');
                const statusText = document.getElementById('gps-status-text');
                statusEl.style.display = 'flex';
                statusText.innerText = `GPS detected: ${this.gpsCoords.lat.toFixed(4)}, ${this.gpsCoords.lng.toFixed(4)}`;

                app.showToast('GPS location captured successfully!', 'success');
            },
            (error) => {
                let msg = 'Could not get GPS location.';
                if (error.code === error.PERMISSION_DENIED) msg = 'GPS access denied. Please allow location access.';
                app.showToast(msg, 'error');
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    },

    async publishEmergency(event) {
        event.preventDefault();
        const locationCity  = document.getElementById('em-city').value;
        const contactPhone  = document.getElementById('em-phone').value;
        const description   = document.getElementById('em-desc').value;

        // Use real GPS if captured, otherwise use city-based mock coordinates
        let lat, lng;
        if (this.gpsCoords) {
            lat = this.gpsCoords.lat;
            lng = this.gpsCoords.lng;
        } else {
            const coords = auth.getMockCoordinates(locationCity.split(' ')[0]);
            lat = coords.lat;
            lng = coords.lng;
        }

        try {
            await app.post('/api/breakdowns', {
                locationCity,
                contactPhone,
                description,
                latitude: lat.toString(),
                longitude: lng.toString()
            });

            document.getElementById('em-desc').value = '';
            this.gpsCoords = null;
            document.getElementById('gps-status').style.display = 'none';
            app.showToast('Emergency request published! Nearby garages notified. 🚨', 'success');
            this.loadEmergencies();
        } catch(e) {}
    },

    async loadEmergencies() {
        try {
            const data = await app.get('/api/breakdowns/my');
            if (data) {
                const list = document.getElementById('customer-emergencies-list');
                list.innerHTML = '';

                if (data.length === 0) {
                    list.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 20px;">You have no active emergency alerts.</p>`;
                    return;
                }

                data.forEach(em => {
                    const date = new Date(em.createdTime);
                    const timeStr = date.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });

                    let responseHtml = '';
                    if (em.status === 'OPEN') {
                        responseHtml = `<div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 10px;">Waiting for a service responder...</div>`;
                    } else if (em.status === 'RESPONDED') {
                        responseHtml = `
                            <div class="glass-card" style="margin-top: 12px; background: rgba(59, 130, 246, 0.05); border-color: rgba(59, 130, 246, 0.2); padding: 12px;">
                                <strong style="color: var(--color-customer);">⚡ Responder Garage:</strong> ${em.assignedGarage.garageName}
                                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">📍 ${em.assignedGarage.address}</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary);">📞 ${em.assignedGarage.user.phone}</div>
                                <button class="btn btn-success btn-sm" style="margin-top: 10px;" onclick="customer.resolveEmergency(${em.id})">Mark Resolved ✓</button>
                            </div>
                        `;
                    } else if (em.status === 'RESOLVED') {
                        responseHtml = `
                            <div style="font-size: 0.85rem; color: var(--color-garage); margin-top: 10px; font-weight: 600;">
                                ✅ Resolved with assistance from ${em.assignedGarage ? em.assignedGarage.garageName : 'our partner'}
                            </div>
                        `;
                    }

                    const card = document.createElement('div');
                    card.className = 'glass-card breakdown-card';
                    card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <span class="pulse-dot" style="display: ${em.status === 'OPEN' ? 'inline-block' : 'none'}; margin-right: 6px;"></span>
                                <strong>📍 Location: ${em.locationCity}</strong>
                            </div>
                            <span class="badge badge-${em.status.toLowerCase()}">${em.status}</span>
                        </div>
                        <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 8px;">"${em.description}"</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">Reported on: ${timeStr}</div>
                        ${responseHtml}
                    `;
                    list.appendChild(card);
                });
            }
        } catch(e) {}
    },

    async resolveEmergency(id) {
        try {
            await app.post(`/api/breakdowns/${id}/resolve`, {});
            app.showToast('Emergency resolved. Stay safe! ✅', 'success');
            this.loadEmergencies();
        } catch(e) {}
    }
};
