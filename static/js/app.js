// Utility - safe HTML escaping (used only for textContent, but kept for compatibility)
function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.textContent;
}

// App orchestrator
var App = {
    user: null,

    init: function() {
        var self = this;

        // Check auth
        fetch('/api/auth/me').then(function(r) {
            if (!r.ok) {
                window.location.href = '/';
                return;
            }
            return r.json();
        }).then(function(user) {
            if (!user) return;
            self.user = user;
            document.getElementById('my-screen-name').textContent = user.display_name;
            document.title = 'CivBuddy - ' + user.display_name;

            // Start systems
            WindowManager.init();
            WS.connect();
            BuddyList.init();
            ChatWindow.init();
            Presence.init();
            SaveGames.init();
            self.startClock();
            self.setupTray();

            // Auto-open chat
            ChatWindow.open();
        });
    },

    startClock: function() {
        function updateClock() {
            var now = new Date();
            document.getElementById('tray-clock').textContent =
                now.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true});
        }
        updateClock();
        setInterval(updateClock, 60000);
    },

    setupTray: function() {
        document.getElementById('tray-sound').addEventListener('click', function() {
            SoundManager.toggle();
        });
    }
};

// Start
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
