// Presence / away message management
var Presence = {
    init: function() {
        var self = this;

        // Status dropdown
        document.getElementById('status-select').addEventListener('change', function() {
            var status = this.value;
            if (status === 'away') {
                WindowManager.show('away-dialog');
            } else {
                self.setStatus('online', null);
            }
        });

        // Away dialog buttons
        document.getElementById('btn-go-away').addEventListener('click', function() {
            var msg = document.getElementById('away-message-input').value.trim();
            self.setStatus('away', msg || 'I am away from my computer.');
            WindowManager.hide('away-dialog');
        });

        document.getElementById('btn-come-back').addEventListener('click', function() {
            self.setStatus('online', null);
            document.getElementById('status-select').value = 'online';
            WindowManager.hide('away-dialog');
        });
    },

    setStatus: function(status, awayMessage) {
        fetch('/api/presence/status', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({status: status, away_message: awayMessage})
        });
    }
};
