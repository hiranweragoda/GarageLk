/* chatbot.js - Floating Chatbot UI Widget with Guided Search Flow */

(function () {
    // Inject Stylesheet link
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/chatbot.css';
    document.head.appendChild(link);

    // Initialize when DOM is ready
    function initWidget() {
        if (document.getElementById('chatbot-fab-btn')) return; // Already initialized

        // Create container and inject HTML structure
        const widgetContainer = document.createElement('div');
        widgetContainer.innerHTML = `
            <!-- Floating Button -->
            <button class="chatbot-fab" id="chatbot-fab-btn" title="GarageLK AI Assistant" unique-id="chatbot-fab">
                <i class="fa-solid fa-robot"></i>
            </button>
            
            <!-- Chat Drawer Window -->
            <div class="chatbot-window" id="chatbot-chat-window">
                <div class="chatbot-header">
                    <div class="chatbot-header-info">
                        <div class="chatbot-header-avatar">
                            <i class="fa-solid fa-robot"></i>
                        </div>
                        <div>
                            <div class="chatbot-header-title">GarageLK AI Assistant</div>
                            <div class="chatbot-header-subtitle">Guided Search & AI Helper</div>
                        </div>
                    </div>
                    <button class="chatbot-close-btn" id="chatbot-close-window-btn" unique-id="chatbot-close-btn">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="chatbot-messages" id="chatbot-messages-box">
                    <!-- Welcoming dynamic bubbles injected by code -->
                </div>
                <div class="chatbot-input-container">
                    <button class="chatbot-reset-btn" id="chatbot-reset-flow-btn" title="Start New Search" unique-id="chatbot-reset-btn">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>
                    <input type="text" class="chatbot-input" id="chatbot-text-input" placeholder="Type your answer..." unique-id="chatbot-input-field">
                    <button class="chatbot-send-btn" id="chatbot-send-msg-btn" unique-id="chatbot-send-btn">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(widgetContainer);

        // UI References
        const fab = document.getElementById('chatbot-fab-btn');
        const windowEl = document.getElementById('chatbot-chat-window');
        const closeBtn = document.getElementById('chatbot-close-window-btn');
        const messageBox = document.getElementById('chatbot-messages-box');
        const textInput = document.getElementById('chatbot-text-input');
        const sendBtn = document.getElementById('chatbot-send-msg-btn');
        const resetBtn = document.getElementById('chatbot-reset-flow-btn');

        // State Machine for Guided Flow
        // Steps: 'welcome' -> 'await_district' -> 'await_part_name' -> 'await_part_model' -> 'await_part_year' -> 'await_query'
        let chatState = {
            step: 'welcome',
            type: null,       // 'garage' or 'parts'
            district: null,   // e.g. 'Colombo'
            partName: null,
            partModel: null,
            partYear: null
        };

        let chatHistory = [];
        let suggestionsContainer = null;
        let userCoords = null;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    userCoords = {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    };
                },
                (err) => {
                    console.log("Chatbot geolocation error/denied:", err);
                }
            );
        }
        const districtsList = [
            "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", 
            "Nuwara Eliya", "Galle", "Matara", "Hambantota", "Jaffna", 
            "Kilinochchi", "Mannar", "Vavuniya", "Mullaitivu", "Batticaloa", 
            "Ampara", "Trincomalee", "Kurunegala", "Puttalam", "Anuradhapura", 
            "Polonnaruwa", "Badulla", "Moneragala", "Ratnapura", "Kegalle"
        ];

        // Open/Close toggle
        fab.addEventListener('click', () => {
            windowEl.classList.toggle('open');
            if (windowEl.classList.contains('open')) {
                textInput.focus();
                scrollToBottom();
            }
        });

        closeBtn.addEventListener('click', () => {
            windowEl.classList.remove('open');
        });

        // Trigger welcome flow initially
        triggerWelcome();

        function triggerWelcome() {
            chatState = { step: 'welcome', type: null, district: null, partName: null, partModel: null, partYear: null };
            chatHistory = [];
            messageBox.innerHTML = '';
            
            appendBubble('assistant', "Ayu-bowan! 🙏 Welcome to GarageLK! Let me help you find the best services. What are you looking for today?");
            
            // Show interactive option buttons
            appendOptions([
                { text: "🔍 Find a Garage / Service", value: "garage" },
                { text: "⚙️ Find Spare Parts Shop", value: "parts" }
            ], (val) => {
                selectType(val);
            });
            scrollToBottom();
        }

        function selectType(typeVal) {
            chatState.type = typeVal;
            chatState.step = 'await_district';
            
            const displayType = typeVal === 'garage' ? "Garages & Services" : "Spare Parts Shops";
            appendBubble('user', displayType);
            
            appendBubble('assistant', `Great! Let's search for **${displayType}**. Which **District** are you in? Select a popular one or type any district.`);
            
            // Show district quick replies (all 25 districts of Sri Lanka)
            appendOptions(districtsList.map(d => ({ text: d, value: d })), (val) => {
                selectDistrict(val);
            });
            scrollToBottom();
        }

        async function selectDistrict(districtVal) {
            chatState.district = districtVal;
            chatState.step = 'await_query';
            
            appendBubble('user', districtVal);
            
            // Add typing indicator
            const typingIndicator = appendTypingIndicator();
            scrollToBottom();

            try {
                // Call backend to fetch matching providers in this district
                const mockQuery = `Show me ${chatState.type === 'garage' ? 'garages' : 'shops'} in ${districtVal}`;
                const response = await fetch('/api/chatbot/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        message: mockQuery, 
                        searchType: chatState.type, 
                        district: districtVal,
                        history: []
                    })
                });

                typingIndicator.remove();

                if (response.ok) {
                    const data = await response.json();
                    appendBubble('assistant', data.reply);
                    
                    if (data.providers && data.providers.length > 0) {
                        renderProviders(data.providers);
                    }
                    
                    if (chatState.type === 'garage') {
                        chatState.step = 'await_query';
                        appendBubble('assistant', "What specific **Service** do you need? Type it below!");
                        textInput.placeholder = "Enter service (e.g. General Service, Wheel Alignment)";
                    } else {
                        chatState.step = 'await_part_name';
                        appendBubble('assistant', "What specific **Spare Part** do you need? Please enter the part name (e.g., Brake Pad, Alternator):");
                        textInput.placeholder = "Enter part name...";
                    }
                } else {
                    appendBubble('assistant', 'Sorry, I failed to load local providers. Please try again.');
                }
            } catch (err) {
                console.error("Chatbot district fetch error:", err);
                typingIndicator.remove();
                appendBubble('assistant', 'Connection error. Please try again.');
            }
            scrollToBottom();
        }

        // Submit message action (typing in box or clicking send)
        const submitMessage = async () => {
            const val = textInput.value.trim();
            if (!val) return;

            textInput.value = '';
            
            // State-based handling of free text typing
            if (chatState.step === 'welcome') {
                const lower = val.toLowerCase();
                if (lower.includes('garage') || lower.includes('service') || lower.includes('repair')) {
                    selectType('garage');
                } else if (lower.includes('part') || lower.includes('shop') || lower.includes('spare')) {
                    selectType('parts');
                } else {
                    appendBubble('user', val);
                    appendBubble('assistant', "I didn't quite get that. Please select whether you want a Garage or Spare Parts Shop.");
                    appendOptions([
                        { text: "🔍 Find a Garage / Service", value: "garage" },
                        { text: "⚙️ Find Spare Parts Shop", value: "parts" }
                    ], (val) => selectType(val));
                }
                return;
            }

            if (chatState.step === 'await_district') {
                // Capitalize first letter of typed district
                const formattedDistrict = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
                removeSuggestions();
                selectDistrict(formattedDistrict);
                return;
            }

            if (chatState.step === 'await_part_name') {
                chatState.partName = val;
                appendBubble('user', val);
                
                chatState.step = 'await_part_model';
                appendBubble('assistant', "Got it! Now, please enter the **Vehicle Model** (e.g., Civic, Axio, Prius):");
                textInput.placeholder = "Enter vehicle model...";
                scrollToBottom();
                return;
            }

            if (chatState.step === 'await_part_model') {
                chatState.partModel = val;
                appendBubble('user', val);
                
                chatState.step = 'await_part_year';
                appendBubble('assistant', "Thanks! Lastly, please enter the **Manufacturing Year** (e.g., 2018, 2020):");
                textInput.placeholder = "Enter vehicle year...";
                scrollToBottom();
                return;
            }

            let promptVal = val;
            if (chatState.step === 'await_part_year') {
                chatState.partYear = val;
                appendBubble('user', val);
                scrollToBottom();
                chatState.step = 'await_query';
                promptVal = `Find ${chatState.partName} for ${chatState.partModel} (${chatState.partYear})`;
            } else {
                appendBubble('user', val);
                scrollToBottom();
            }

            const typingIndicator = appendTypingIndicator();
            scrollToBottom();

            try {
                const formattedHistory = chatHistory.map(h => ({
                    role: h.role,
                    content: h.content
                }));

                const payload = { 
                    message: promptVal, 
                    searchType: chatState.type, 
                    district: chatState.district,
                    history: formattedHistory 
                };

                if (chatState.type === 'parts') {
                    payload.partName = chatState.partName;
                    payload.partModel = chatState.partModel;
                    payload.partYear = chatState.partYear;
                }

                const response = await fetch('/api/chatbot/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                typingIndicator.remove();

                if (response.ok) {
                    const data = await response.json();
                    appendBubble('assistant', data.reply);

                    if (data.providers && data.providers.length > 0) {
                        renderProviders(data.providers);
                    }
                    
                    chatHistory.push({ role: 'user', content: promptVal });
                    chatHistory.push({ role: 'model', content: data.reply });
                    if (chatHistory.length > 20) chatHistory = chatHistory.slice(chatHistory.length - 20);

                    if (chatState.type === 'parts') {
                        chatState.step = 'await_part_name';
                        chatState.partName = null;
                        chatState.partModel = null;
                        chatState.partYear = null;
                        appendBubble('assistant', "Would you like to search for another **Spare Part**? Please enter the part name:");
                        textInput.placeholder = "Enter part name...";
                    }

                } else {
                    appendBubble('assistant', 'Sorry, I couldn\'t process that request. Please try again.');
                }
            } catch (err) {
                console.error("Chatbot query error:", err);
                typingIndicator.remove();
                appendBubble('assistant', 'Connection error. Please check your network and try again.');
            }
            scrollToBottom();
        };

        sendBtn.addEventListener('click', submitMessage);
        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitMessage();
            }
        });

        resetBtn.addEventListener('click', () => {
            textInput.value = '';
            removeSuggestions();
            triggerWelcome();
        });

        textInput.addEventListener('input', () => {
            if (chatState.step === 'await_district') {
                const query = textInput.value.trim().toLowerCase();
                if (query.length >= 3) {
                    const matched = districtsList.filter(d => d.toLowerCase().includes(query));
                    if (matched.length > 0) {
                        showDistrictSuggestions(matched);
                    } else {
                        removeSuggestions();
                    }
                } else {
                    removeSuggestions();
                }
            }
        });

        // Helper to append bubble
        function appendBubble(role, text) {
            const bubble = document.createElement('div');
            bubble.className = `chatbot-bubble ${role}`;
            
            if (role === 'assistant') {
                bubble.innerHTML = formatMarkdown(text);
            } else {
                bubble.innerText = text;
            }
            
            messageBox.appendChild(bubble);
            return bubble;
        }

        // Helper to append interactive options
        function appendOptions(options, callback) {
            const container = document.createElement('div');
            container.className = 'chatbot-options-container';
            
            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'chatbot-option-btn';
                btn.innerText = opt.text;
                btn.addEventListener('click', () => {
                    container.remove(); // Clean options after selection
                    callback(opt.value);
                });
                container.appendChild(btn);
            });
            
            messageBox.appendChild(container);
            scrollToBottom();
        }

        function showDistrictSuggestions(matched) {
            removeSuggestions();

            suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'chatbot-options-container suggestions';
            
            matched.forEach(dist => {
                const btn = document.createElement('button');
                btn.className = 'chatbot-option-btn';
                btn.innerText = dist;
                btn.addEventListener('click', () => {
                    textInput.value = '';
                    removeSuggestions();
                    selectDistrict(dist);
                });
                suggestionsContainer.appendChild(btn);
            });
            
            messageBox.appendChild(suggestionsContainer);
            scrollToBottom();
        }

        function removeSuggestions() {
            if (suggestionsContainer) {
                suggestionsContainer.remove();
                suggestionsContainer = null;
            }
        }

        function getDistanceString(lat1, lon1, lat2, lon2) {
            if (!lat1 || !lon1 || !lat2 || !lon2) return "";
            const R = 6371; // km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const d = R * c;
            return d.toFixed(1) + " km";
        }

        function renderProviders(providers) {
            providers.forEach(p => {
                const card = document.createElement('div');
                card.className = 'chatbot-provider-card clickable';
                card.title = `Click to view profile of ${p.name}`;
                card.addEventListener('click', () => {
                    const url = p.type === 'garage' ? `/garage.html?id=${p.id}` : `/shop.html?id=${p.id}`;
                    window.location.href = url;
                });
                
                let ratingHtml = '';
                if (p.rating) {
                    ratingHtml = `<span class="chatbot-provider-rating"><i class="fa-solid fa-star"></i> ${p.rating}</span>`;
                }

                let distanceHtml = '';
                if (userCoords && p.latitude && p.longitude) {
                    const distStr = getDistanceString(userCoords.latitude, userCoords.longitude, p.latitude, p.longitude);
                    if (distStr) {
                        distanceHtml = `<span class="chatbot-provider-distance"><i class="fa-solid fa-route"></i> ${distStr} away</span>`;
                    }
                }
                
                let addressHtml = '';
                if (p.address) {
                    addressHtml = `<div class="chatbot-provider-address"><i class="fa-solid fa-map-location-dot"></i> ${p.address}</div>`;
                }
                
                let itemsHtml = '';
                if (p.items && p.items.length > 0) {
                    const label = p.label || (p.type === 'garage' ? 'Services' : 'In stock');
                    itemsHtml = `
                        <div class="chatbot-provider-items">
                            <strong>${label}:</strong>
                            <ul>
                                ${p.items.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }
                
                card.innerHTML = `
                    <div class="chatbot-provider-header">
                        <div class="chatbot-provider-title-row">
                            <span class="chatbot-provider-name">${p.name}</span>
                            ${ratingHtml}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; width: 100%;">
                            <span class="chatbot-provider-city"><i class="fa-solid fa-location-dot"></i> ${p.city}</span>
                            ${distanceHtml}
                        </div>
                        ${addressHtml}
                    </div>
                    <div class="chatbot-provider-body">
                        <p class="chatbot-provider-desc">${p.description}</p>
                        <div class="chatbot-provider-phone"><i class="fa-solid fa-phone"></i> ${p.phone}</div>
                        ${itemsHtml}
                    </div>
                `;
                messageBox.appendChild(card);
            });
            scrollToBottom();
        }

        function appendTypingIndicator() {
            const bubble = document.createElement('div');
            bubble.className = 'chatbot-typing-bubble';
            bubble.id = 'chatbot-typing-loader';
            bubble.innerHTML = `
                <div class="chatbot-typing-dot"></div>
                <div class="chatbot-typing-dot"></div>
                <div class="chatbot-typing-dot"></div>
            `;
            messageBox.appendChild(bubble);
            return bubble;
        }

        function scrollToBottom() {
            setTimeout(() => {
                messageBox.scrollTop = messageBox.scrollHeight;
            }, 50);
        }

        // Format Markdown text to HTML safely
        function formatMarkdown(text) {
            if (!text) return "";
            
            let formatted = text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            
            formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
            formatted = formatted.replace(/(?:^|\n)\s*[*+-]\s+(.*?)(?=\n|$)/g, "<li>$1</li>");
            formatted = formatted.replace(/(<li>.*?<\/li>)+/g, "<ul>$&</ul>");
            formatted = formatted.replace(/\n\n/g, "<br><br>");
            formatted = formatted.replace(/\n/g, "<br>");
            
            return formatted;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }
})();
