const app = {
    stompClient: null,
    userId: null,
    userName: '',
    reconnectDelay: 1000,
    maxReconnectDelay: 10000,
    isReconnecting: false,
    reconnectTimeout: null,
    messageQueue: JSON.parse(localStorage.getItem('crisis_message_queue') || '[]'),

    init() {
        // Try to recover identity from storage
        const storedId = localStorage.getItem('crisis_user_id');
        const storedName = localStorage.getItem('crisis_user_name');

        if (storedId) {
            this.userId = storedId;
        } else {
            this.userId = this.generateUUID();
            localStorage.setItem('crisis_user_id', this.userId);
        }

        this.cacheDOM();

        if (storedName) {
            this.userName = storedName;
            this.dom.nameInput.value = storedName;
            this.showToast(`Welcome back, ${this.userName}`, 'info');
        }

        // Show QR and Clear Buttons always
        try {
            document.getElementById('btnShowQR').style.display = 'block';
            document.getElementById('btnClearChat').style.display = 'block';
        } catch (e) { }

        this.bindEvents();

        // Only connect if we have an identity
        if (this.userName) {
            this.connect();
        }

        // Polling for stats mainly, real-time updates come via WebSocket
        setInterval(() => this.updateStats(), 5000);
    },

    switchTab(tab) {
        const sidebar = document.querySelector('.app-sidebar');
        const chatArea = document.querySelector('.chat-area');
        const tabs = document.querySelectorAll('.nav-item');

        tabs.forEach(t => t.classList.remove('active'));

        if (tab === 'chat') {
            sidebar.classList.remove('active');
            chatArea.classList.remove('hidden');
            tabs[0].classList.add('active');
        } else {
            sidebar.classList.add('active');
            chatArea.classList.add('hidden');
            tabs[1].classList.add('active');
        }
    },

    cacheDOM() {
        this.dom = {
            statusBadge: document.getElementById('connectionStatus'),
            messagesContainer: document.getElementById('messagesContainer'),
            statusList: document.getElementById('statusList'),
            messageInput: document.getElementById('messageInput'),
            nameInput: document.getElementById('userNameInput'),

            btnSend: document.getElementById('btnSend'),
            btnSOS: document.getElementById('btnSOS'),
            btnConnect: document.getElementById('btnConnect'),
            btnClearChat: document.getElementById('btnClearChat'),
            btnDisconnect: document.getElementById('btnDisconnect'),
            statusSelect: document.getElementById('myStatus'),
            stats: {
                users: document.getElementById('statUsers'),
                messages: document.getElementById('statMessages'),
                critical: document.getElementById('statCritical')
            }
        };
    },

    bindEvents() {
        this.dom.btnSend.addEventListener('click', () => this.sendMessage());
        this.dom.btnSOS.addEventListener('click', () => this.sendEmergency());
        this.dom.statusSelect.addEventListener('change', () => this.updateMyStatus());
        this.dom.btnConnect.addEventListener('click', () => this.connect());
        this.dom.btnDisconnect.addEventListener('click', () => this.disconnect());
        document.getElementById('btnShareLoc').addEventListener('click', () => this.shareLocation());

        // QR Events
        document.getElementById('btnShowQR').addEventListener('click', () => this.showQRCode());
        if (this.dom.btnClearChat) {
            this.dom.btnClearChat.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear chat history for all users?')) {
                    this.requestClearHistory();
                }
            });
        }
        document.getElementById('btnCloseQR').addEventListener('click', () => {
            document.getElementById('qrModal').style.display = 'none';
        });

        // Modal Events
        document.getElementById('btnConfirmLoc').addEventListener('click', () => this.confirmShareLocation());
        document.getElementById('btnCancelLoc').addEventListener('click', () => {
            document.getElementById('locationModal').style.display = 'none';
        });

        document.getElementById('manualLocationInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.confirmShareLocation();
            }
        });

        this.dom.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Network Status Listeners
        window.addEventListener('online', () => {
            this.showToast('Network connected. Reconnecting services...', 'info');
            this.setConnectionStatus(true); // Optimistic update
            if (!this.stompClient || !this.stompClient.connected) {
                this.connect();
            }
            this.processQueue();
        });

        window.addEventListener('offline', () => {
            this.showToast('Network disconnected. You are offline.', 'error');
            this.setConnectionStatus(false);
        });
        window.addEventListener('offline', () => {
            this.showToast('Network disconnected. You are offline.', 'error');
            this.setConnectionStatus(false);
        });

        // Clean up on tab close
        window.addEventListener('beforeunload', () => {
            if (this.stompClient) {
                this.disconnect();
            }
        });

        // Identity Modal Events
        const btnJoin = document.getElementById('btnJoin');
        const nameInput = document.getElementById('modalNameInput');

        const joinAction = () => {
            const name = nameInput.value.trim();
            if (name) {
                this.userName = name;
                localStorage.setItem('crisis_user_name', name);
                document.getElementById('identityModal').style.display = 'none';
                this.connect();
                this.showToast(`Welcome, ${name}!`, 'success');
            } else {
                this.showToast('Please enter your name', 'error');
            }
        };

        if (btnJoin) {
            btnJoin.addEventListener('click', joinAction);
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') joinAction();
            });
        }
    },

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    connect() {
        if (this.stompClient && this.stompClient.connected) return;

        // Use relative URL to allow connection from any host (localhost, LAN IP, etc.)
        const socket = new SockJS('/ws-crisis');
        this.stompClient = Stomp.over(socket);
        this.stompClient.debug = null; // Disable debug logs for cleaner console

        this.stompClient.connect({}, (frame) => {
            console.log('Connected to CrisisConnect Network');
            this.setConnectionStatus(true);
            this.showToast('Connected to network', 'success');

            // Stop Reconnecting UI
            this.isReconnecting = false;
            this.reconnectDelay = 1000;
            this.showReconnectingBanner(false);

            // Subscriptions
            this.stompClient.subscribe('/topic/messages', (message) => {
                const msg = JSON.parse(message.body);
                if (msg.type === 'SYSTEM' && msg.content === 'CLEAR_HISTORY') {
                    this.clearDOMMessages();
                    this.showToast('Chat history cleared', 'info');
                } else {
                    this.displayMessage(msg);
                }
            });

            this.stompClient.subscribe('/topic/status', (status) => {
                this.updateStatusBoard(JSON.parse(status.body));
            });

            this.stompClient.subscribe('/topic/status/removed', (id) => {
                const el = document.getElementById(`status-${id.body}`);
                if (el) el.remove();
            });

            // Initial Load
            this.loadHistory();
            this.processQueue();
        }, (error) => {
            console.error('Connection lost', error);
            this.setConnectionStatus(false);
            this.handleReconnection();
        });
    },

    handleReconnection() {
        if (this.isReconnecting) return;
        this.isReconnecting = true;

        this.showReconnectingBanner(true);
        // Force update UI to show Cancel button
        this.setConnectionStatus(false);

        const retry = () => {
            if (!this.isReconnecting) return;

            if (this.stompClient && this.stompClient.connected) {
                this.isReconnecting = false;
                this.reconnectDelay = 1000; // Reset
                this.showReconnectingBanner(false);
                return;
            }

            console.log(`Reconnecting in ${this.reconnectDelay}ms...`);
            this.reconnectTimeout = setTimeout(() => {
                this.connect();
                // Check if connection succeeded shortly after
                setTimeout(() => {
                    if ((!this.stompClient || !this.stompClient.connected) && this.isReconnecting) {
                        // Increase delay (exponential backoff)
                        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
                        retry();
                    }
                }, 500); // Wait a bit for connect attempt
            }, this.reconnectDelay);
        };

        retry();
    },

    showReconnectingBanner(show) {
        let banner = document.getElementById('reconnectBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'reconnectBanner';
            banner.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%;
                background: var(--warning-color); color: black; font-weight: bold;
                text-align: center; padding: 0.5rem; z-index: 2000;
                transform: translateY(-100%); transition: transform 0.3s;
            `;
            banner.textContent = '⚠️ Connection lost. Reconnecting...';
            document.body.appendChild(banner);
        }

        if (show) {
            banner.style.transform = 'translateY(0)';
        } else {
            banner.style.transform = 'translateY(-100%)';
        }
    },


    disconnect() {
        // Stop any pending reconnection
        this.isReconnecting = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.showReconnectingBanner(false);

        if (this.stompClient) {
            this.stompClient.disconnect(() => {
                console.log('Disconnected');
                this.setConnectionStatus(false);
                this.showToast('Disconnected from network', 'info');
            });
        } else {
            // Force UI update if client was already null
            this.setConnectionStatus(false);
        }

        // Tell backend to remove us
        if (this.userId) {
            this.post('/api/disconnect', { userId: this.userId });
        }
    },

    setConnectionStatus(connected) {
        const badge = this.dom.statusBadge;
        if (connected) {
            badge.classList.remove('disconnected');
            badge.classList.add('connected');
            badge.innerHTML = '<span class="indicator"></span> Online';

            this.dom.btnConnect.style.display = 'none';
            this.dom.btnDisconnect.style.display = 'block';
            this.dom.btnDisconnect.innerHTML = '<i class="ph-bold ph-plugs"></i> Disconnect';

        } else {
            badge.classList.remove('connected');
            badge.classList.add('disconnected');
            badge.innerHTML = '<span class="indicator"></span> Offline';

            if (this.isReconnecting) {
                // Reconnecting state: Show Cancel button
                this.dom.btnConnect.style.display = 'none';
                this.dom.btnDisconnect.style.display = 'block';
                this.dom.btnDisconnect.innerHTML = '<i class="ph-bold ph-x"></i> Cancel Retry';
            } else {
                // Normal offline state
                this.dom.btnConnect.style.display = 'block';
                this.dom.btnDisconnect.style.display = 'none';
            }
        }
    },

    checkConnection() {
        if (!this.stompClient || !this.stompClient.connected) {
            this.showToast('Device is disconnected. Please connect first.', 'error');
            return false;
        }
        return true;
    },

    validateUser() {
        const name = this.dom.nameInput.value.trim();
        if (!name) {
            this.showToast('Please identify yourself first', 'error');
            this.dom.nameInput.focus();
            return false;
        }
        this.userName = name;
        localStorage.setItem('crisis_user_name', name);

        return this.checkConnection();
    },

    sendMessage() {
        if (!this.validateUser()) return;

        const content = this.dom.messageInput.value.trim();
        if (!content) return;

        const message = {
            senderId: this.userId,
            senderName: this.userName,
            content: content,
            type: 'TEXT',
            priority: 'NORMAL'
        };

        this.post('/api/messages', message)
            .then(() => {
                this.dom.messageInput.value = '';
                this.scrollToBottom();
            });
    },

    sendEmergency() {
        if (!this.validateUser()) return;

        const message = {
            senderId: this.userId,
            senderName: this.userName,
            content: '🚨 EMERGENCY! I need immediate help!',
            type: 'EMERGENCY',
            priority: 'CRITICAL'
        };

        this.post('/api/messages', message);
    },

    shareLocation() {
        if (!this.validateUser()) return;

        // Show Modal
        const modal = document.getElementById('locationModal');
        const input = document.getElementById('manualLocationInput');

        modal.style.display = 'flex';
        input.value = '';
        input.focus();
    },

    confirmShareLocation() {
        if (!this.checkConnection()) return;

        const modal = document.getElementById('locationModal');
        const input = document.getElementById('manualLocationInput');
        const manualText = input.value.trim();

        modal.style.display = 'none';

        const shareTextOnly = () => {
            if (manualText) {
                const message = {
                    senderId: this.userId,
                    senderName: this.userName,
                    content: `📍 ${manualText}`,
                    type: 'LOCATION',
                    priority: 'NORMAL'
                };
                this.post('/api/messages', message);

                const statusEntry = {
                    userId: this.userId,
                    userName: this.userName,
                    status: this.dom.statusSelect.value,
                    message: `📍 ${manualText}`,
                    hasInternet: navigator.onLine
                };
                this.post('/api/status', statusEntry);

                this.showToast('Location shared (Text Only)', 'warning');
            } else {
                this.showToast('Unable to share location without permissions or text', 'error');
            }
        };

        if (!navigator.geolocation) {
            shareTextOnly();
            return;
        }

        this.showToast('Acquiring location...', 'info');

        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;

            const locationText = manualText ? `📍 ${manualText}` : `📍 Shared Location`;

            // 1. Send as a message
            const message = {
                senderId: this.userId,
                senderName: this.userName,
                content: `${locationText} (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
                type: 'LOCATION',
                priority: 'NORMAL',
                latitude: latitude,
                longitude: longitude
            };
            this.post('/api/messages', message);

            // 2. Update status with location
            const statusEntry = {
                userId: this.userId,
                userName: this.userName,
                status: this.dom.statusSelect.value,
                message: manualText ? `📍 ${manualText}` : '📍 Location updated',
                hasInternet: navigator.onLine,
                latitude: latitude,
                longitude: longitude
            };
            this.post('/api/status', statusEntry);

            this.showToast('Location shared successfully', 'success');

        }, (err) => {
            console.error(err);
            shareTextOnly();
        });
    },

    updateMyStatus() {
        if (!this.validateUser()) return;

        const select = this.dom.statusSelect;
        const statusEntry = {
            userId: this.userId,
            userName: this.userName,
            status: select.value,
            message: select.options[select.selectedIndex].text,
            hasInternet: navigator.onLine,
            // We don't auto-update location on status change to save battery/privacy,
            // unless we cache it. For now, separate share location button is better.
        };

        this.post('/api/status', statusEntry);
    },



    updateStatusBoard(entry) {
        let item = document.getElementById(`status-${entry.userId}`);

        if (!item) {
            item = document.createElement('div');
            item.id = `status-${entry.userId}`;
            this.dom.statusList.appendChild(item);
        }

        let statusClass = '';
        if (entry.status === 'CRITICAL') statusClass = 'critical';
        if (entry.status === 'NEED_HELP') statusClass = 'help';
        if (entry.status === 'OFFLINE') statusClass = 'offline';

        const locationBadge = (entry.latitude && entry.longitude)
            ? `<a href="https://www.google.com/maps?q=${entry.latitude},${entry.longitude}" target="_blank" title="View Location" style="color: var(--accent-color); margin-left: auto;">
                 <i class="ph-fill ph-map-pin"></i>
               </a>`
            : '';

        item.className = `status-card ${statusClass}`;
        // Dim offline users
        item.style.opacity = (entry.status === 'OFFLINE') ? '0.5' : '1';

        const displayStatus = (entry.status === 'OFFLINE') ? 'Offline' : (entry.message || entry.status);

        item.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between;">
                <div class="status-user-name">${entry.userName}</div>
                ${locationBadge}
            </div>
            <div class="status-user-msg">${displayStatus}</div>
        `;
    },

    loadHistory() {
        const baseUrl = '';
        fetch(`${baseUrl}/api/messages`).then(r => r.json()).then(msgs => {
            // Remove empty state if messages exist
            if (msgs.length > 0) {
                this.dom.messagesContainer.innerHTML = '';
                msgs.forEach(m => this.displayMessage(m));
            } else {
                // If 0 messages, keep empty state (or restore it) - implementation simplified
                // this.dom.messagesContainer.innerHTML = '...empty state html...';
            }
        }).catch(e => console.error('Error loading history:', e));

        fetch(`${baseUrl}/api/status`).then(r => r.json()).then(statuses => {
            statuses.forEach(s => {
                this.updateStatusBoard(s);
                // Sync my own status if found
                if (s.userId === this.userId) {
                    this.dom.statusSelect.value = s.status;
                }
            });
        });

        this.updateStats();
    },

    updateStats() {
        fetch('/api/stats').then(r => r.json()).then(data => {
            this.dom.stats.users.textContent = data.activeUsers;
            this.dom.stats.messages.textContent = data.totalMessages;
            this.dom.stats.critical.textContent = data.criticalUsers;
        }).catch(() => { });
    },

    processQueue() {
        if (!this.messageQueue.length) return;

        this.showToast(`Syncing ${this.messageQueue.length} offline messages...`, 'info');

        const queueBackup = [...this.messageQueue];
        this.messageQueue = []; // Clear main queue to avoid double sends
        localStorage.setItem('crisis_message_queue', JSON.stringify([]));

        queueBackup.forEach(item => {
            this.post(item.url, item.data).catch(() => {
                // If it fails again, put it back
                this.messageQueue.push(item);
                localStorage.setItem('crisis_message_queue', JSON.stringify(this.messageQueue));
            });
        });
    },

    post(url, data) {
        // Use relative URL to allow connection from any host (localhost, LAN IP, etc.)
        const fullUrl = url;

        // "Offline-First" for Local Network:
        // Always try to fetch first. Only queue if the network request actually fails.
        // This handles cases where device has Wi-Fi (LAN) but no Internet (WAN), 
        // where navigator.onLine might be misleading or irrelevant for our local server.

        return fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(response => {
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            return response.json();
        }).catch(err => {
            console.warn('Network request failed, queuing message:', err);

            // Queue the message
            this.messageQueue.push({ url, data });
            localStorage.setItem('crisis_message_queue', JSON.stringify(this.messageQueue));

            // Optimistically show message in chat if it's a message
            if (url.includes('/messages')) {
                const offlineMsg = { ...data, timestamp: new Date().toISOString() };
                this.displayMessage(offlineMsg, true);
                // Suppress annoying toast for messages since we show optimistic UI
            } else {
                this.showToast('Network unreachable. Action queued.', 'warning');
            }
        });
    },

    requestClearHistory() {
        if (!this.userId) {
            this.showToast('You must be connected to clear history', 'error');
            return;
        }

        fetch('/api/messages', {
            method: 'DELETE'
        }).then(response => {
            if (response.ok) {
                // Success - wait for WebSocket broadcast
            } else {
                this.showToast('Failed to clear history', 'error');
            }
        }).catch(err => {
            console.error('Error clearing history:', err);
            this.showToast('Error clearing history', 'error');
        });
    },

    clearDOMMessages() {
        this.dom.messagesContainer.innerHTML = '';
        this.dom.messagesContainer.innerHTML = `
            <div class="empty-state" style="margin: auto; text-align: center; color: var(--text-secondary); opacity: 0.5;">
                <i class="ph-duotone ph-chat-circle-dots" style="font-size: 4rem; margin-bottom: 1rem;"></i>
                <p>No messages yet. Start the conversation.</p>
            </div>
        `;
        this.dom.stats.messages.textContent = '0';
    },

    displayMessage(msg, isOffline = false) {
        // Remove empty state if present
        const emptyState = this.dom.messagesContainer.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const div = document.createElement('div');
        const isMe = msg.senderId === this.userId;
        const msgType = (msg.type || 'TEXT').toLowerCase();

        div.className = `message-bubble ${msgType} ${isMe ? 'is-me' : ''}`;
        if (isOffline) div.style.opacity = '0.7';

        const time = new Date(msg.timestamp || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const offlineLabel = isOffline ? ' <span style="font-size:0.8em">🕒 (Pending)</span>' : '';

        div.innerHTML = `
            <div class="message-header">
                <span class="sender-name">${msg.senderName}</span>
                <span class="msg-time">${time}${offlineLabel}</span>
            </div>
            <div class="message-content">
                ${msg.type === 'LOCATION' && msg.latitude ?
                `<a href="https://www.google.com/maps?q=${msg.latitude},${msg.longitude}" target="_blank" style="color: ${isMe ? 'white' : 'var(--accent-color)'}; text-decoration: underline;">
                     <i class="ph-bold ph-map-pin"></i> View on Map
                   </a><br>` : ''}
                ${msg.content}
            </div>
        `;

        this.dom.messagesContainer.appendChild(div);
        this.scrollToBottom();

        // Update local count
        const currentCount = parseInt(this.dom.stats.messages.textContent) || 0;
        this.dom.stats.messages.textContent = currentCount + 1;
    },

    scrollToBottom() {
        this.dom.messagesContainer.scrollTop = this.dom.messagesContainer.scrollHeight;
    },

    showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 90px; left: 50%; transform: translateX(-50%); padding: 1rem 2rem;
            background: ${type === 'error' ? '#ef4444' : (type === 'warning' ? '#f59e0b' : '#3b82f6')};
            color: white; border-radius: 8px; z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2); animation: fadeIn 0.3s;
        `;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    showQRCode() {
        // Fetch server info
        fetch('/api/server-info')
            .then(r => r.json())
            .then(data => {
                const url = data.url || 'http://localhost:8080';
                const modal = document.getElementById('qrModal');
                const qrContainer = document.getElementById('qrcode');
                const urlContainer = document.getElementById('serverUrl');

                qrContainer.innerHTML = ''; // Clear previous
                urlContainer.textContent = url;
                modal.style.display = 'flex';

                // Use QRCode global from script
                if (typeof QRCode !== 'undefined') {
                    try {
                        new QRCode(qrContainer, {
                            text: url,
                            width: 128,
                            height: 128
                        });
                        this.showToast('QR Code Generated', 'success');
                    } catch (err) {
                        console.error(err);
                        qrContainer.innerHTML = 'Error generating QR';
                        this.showToast('QR Error: ' + err.message, 'error');
                    }
                } else {
                    qrContainer.innerHTML = '<div style="padding:20px; border:1px dashed #ccc;">QR Code Library Not Loaded<br>(Download qrcode.min.js)</div>';
                    this.showToast('QR Library Missing', 'error');
                }
            })
            .catch(e => {
                this.showToast('Could not fetch IP. Using localhost.', 'warning');
                console.error(e);

                // Fallback rendering
                const url = 'http://localhost:8080';
                const modal = document.getElementById('qrModal');
                const qrContainer = document.getElementById('qrcode');
                const urlContainer = document.getElementById('serverUrl');

                qrContainer.innerHTML = '';
                urlContainer.textContent = url;
                modal.style.display = 'flex';

                if (typeof QRCode !== 'undefined') {
                    try {
                        new QRCode(qrContainer, {
                            text: url,
                            width: 128,
                            height: 128
                        });
                        this.showToast('Fallback QR Generated', 'warning');
                    } catch (err) {
                        this.showToast('Fallback QR Error: ' + err.message, 'error');
                    }
                } else {
                    this.showToast('QR Library Missing (Fallback)', 'error');
                }
            });
    }
};

window.addEventListener('DOMContentLoaded', () => app.init());
