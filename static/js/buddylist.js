// Buddy list management
var BuddyList = {
    buddies: {},

    init: function() {
        var self = this;

        // Load initial presence
        fetch('/api/presence').then(function(r) { return r.json(); }).then(function(list) {
            list.forEach(function(b) {
                self.buddies[b.user_id] = b;
            });
            self.render();
        });

        // Listen for presence changes
        WS.on('presence_change', function(data) {
            var prev = self.buddies[data.user_id];
            var prevStatus = prev ? prev.status : 'offline';

            self.buddies[data.user_id] = {
                user_id: data.user_id,
                username: data.username,
                display_name: data.display_name,
                status: data.status,
                away_message: data.away_message || null
            };

            // Only play sounds for OTHER users
            if (data.user_id !== App.user.id) {
                if (data.status === 'online' && prevStatus !== 'online') {
                    SoundManager.play('dooropen');
                    ChatWindow.addSystemMessage(data.display_name + ' has signed on.');
                } else if (data.status === 'offline' && prevStatus !== 'offline') {
                    SoundManager.play('doorslam');
                    ChatWindow.addSystemMessage(data.display_name + ' has signed off.');
                }
            }

            self.render();
        });

        // Toggle group
        document.getElementById('buddies-header').addEventListener('click', function() {
            this.classList.toggle('collapsed');
            var entries = document.getElementById('buddy-entries');
            entries.style.display = this.classList.contains('collapsed') ? 'none' : '';
        });
    },

    render: function() {
        var container = document.getElementById('buddy-entries');
        container.textContent = ''; // Clear safely
        var onlineCount = 0;
        var totalCount = 0;

        var sortedBuddies = Object.values(this.buddies)
            .filter(function(b) { return b.user_id !== App.user.id; })
            .sort(function(a, b) {
                var order = {online: 0, away: 1, offline: 2};
                return (order[a.status] || 2) - (order[b.status] || 2);
            });

        sortedBuddies.forEach(function(buddy) {
            totalCount++;
            if (buddy.status !== 'offline') onlineCount++;

            var entry = document.createElement('div');
            entry.className = 'buddy-entry';
            entry.setAttribute('data-userid', buddy.user_id);
            entry.addEventListener('dblclick', function() { ChatWindow.open(); });

            var icon = document.createElement('span');
            icon.className = 'buddy-icon ' + buddy.status;
            icon.textContent = buddy.status === 'online' ? '\u25CF' :
                               buddy.status === 'away' ? '\u25D0' : '\u25CB';

            var name = document.createElement('span');
            name.className = buddy.status === 'away' ? 'buddy-name away-name' : 'buddy-name';
            name.textContent = buddy.display_name;

            entry.appendChild(icon);
            entry.appendChild(name);
            container.appendChild(entry);
        });

        document.getElementById('buddies-header').textContent = 'Buddies (' + onlineCount + '/' + totalCount + ')';
        document.getElementById('online-count').textContent = onlineCount + ' buddy online';
    },

    getBuddy: function(userId) {
        return this.buddies[userId];
    }
};
