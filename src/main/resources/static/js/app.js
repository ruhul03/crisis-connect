const app = {
    stompClient: null,
    userId: null,
    userName: '',

    init() {
        this.userId = this.generateUUID();
        this.cacheDOM();
        this.bindEvents();
        this.connect();

        // Polling for stats mainly, real-time updates come via WebSocket
        setInterval(() => this.updateStats(), 5000);
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
        });

        window.addEventListener('offline', () => {
            this.showToast('Network disconnected. You are offline.', 'error');
            this.setConnectionStatus(false);
        });
    },

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    connect() {
        // Use absolute URL to allow running from file:// for demo purposes
        const socket = new SockJS('http://localhost:8080/ws-crisis');
        this.stompClient = Stomp.over(socket);
        this.stompClient.debug = null; // Disable debug logs for cleaner console

        this.stompClient.connect({}, (frame) => {
            console.log('Connected to CrisisConnect Network');
            this.setConnectionStatus(true);

            // Subscriptions
            this.stompClient.subscribe('/topic/messages', (message) => {
                this.displayMessage(JSON.parse(message.body));
            });

            this.stompClient.subscribe('/topic/status', (status) => {
                this.updateStatusBoard(JSON.parse(status.body));
            });

            // Initial Load
            this.loadHistory();
        }, (error) => {
            console.error('Connection lost', error);
            this.setConnectionStatus(false);
            setTimeout(() => this.connect(), 5000); // Auto-reconnect
        });
    },

    setConnectionStatus(connected) {
        const badge = this.dom.statusBadge;
        if (connected) {
            badge.classList.remove('disconnected');
            badge.classList.add('connected');
            badge.innerHTML = '<span class="indicator"></span> Online';
        } else {
            badge.classList.remove('connected');
            badge.classList.add('disconnected');
            badge.innerHTML = '<span class="indicator"></span> Offline';
        }
    },

    validateUser() {
        const name = this.dom.nameInput.value.trim();
        if (!name) {
            this.showToast('Please identify yourself first', 'error');
            this.dom.nameInput.focus();
            return false;
        }
        this.userName = name;
        return true;
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

    updateMyStatus() {
        if (!this.validateUser()) return;

        const select = this.dom.statusSelect;
        const statusEntry = {
            userId: this.userId,
            userName: this.userName,
            status: select.value,
            message: select.options[select.selectedIndex].text,
            hasInternet: navigator.onLine
        };

        this.post('/api/status', statusEntry);
    },

    displayMessage(msg) {
        const div = document.createElement('div');
        div.className = `message-bubble ${msg.type.toLowerCase()}`;

        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        div.innerHTML = `
            <div class="message-header">
                <span class="sender-name">${msg.senderName}</span>
                <span class="msg-time">${time}</span>
            </div>
            <div class="message-content">${msg.content}</div>
        `;

        this.dom.messagesContainer.appendChild(div);
        this.scrollToBottom();

        // Update local count
        const currentCount = parseInt(this.dom.stats.messages.textContent) || 0;
        this.dom.stats.messages.textContent = currentCount + 1;
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

        item.className = `status-card ${statusClass}`;
        item.innerHTML = `
            <div class="status-user-name">${entry.userName}</div>
            <div class="status-user-msg">${entry.message || entry.status}</div>
        `;
    },

    loadHistory() {
        const baseUrl = 'http://localhost:8080';
        fetch(`${baseUrl}/api/messages`).then(r => r.json()).then(msgs => {
            this.dom.messagesContainer.innerHTML = ''; // Clear existing
            msgs.forEach(m => this.displayMessage(m));
        }).catch(e => console.error('Error loading history:', e));

        fetch(`${baseUrl}/api/status`).then(r => r.json()).then(statuses => {
            statuses.forEach(s => this.updateStatusBoard(s));
        });

        this.updateStats();
    },

    updateStats() {
        fetch('http://localhost:8080/api/stats').then(r => r.json()).then(data => {
            this.dom.stats.users.textContent = data.activeUsers;
            this.dom.stats.messages.textContent = data.totalMessages;
            this.dom.stats.critical.textContent = data.criticalUsers;
        }).catch(() => { });
    },

    post(url, data) {
        // Handle absolute vs relative URL
        const fullUrl = url.startsWith('http') ? url : `http://localhost:8080${url}`;

        return fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(err => {
            console.error('API Error:', err);
            this.showToast('Failed to send data (Server may be offline)', 'error');
        });
    },

    scrollToBottom() {
        this.dom.messagesContainer.scrollTop = this.dom.messagesContainer.scrollHeight;
    },

    showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 1rem 2rem;
            background: ${type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white; border-radius: 8px; z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2); animation: fadeIn 0.3s;
        `;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

window.addEventListener('DOMContentLoaded', () => app.init());
