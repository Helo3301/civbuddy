// WebSocket connection with reconnect
var WS = {
    socket: null,
    reconnectDelay: 1000,
    maxDelay: 30000,
    handlers: {},

    connect: function() {
        var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        var url = proto + '//' + location.host + '/ws';
        var self = this;

        this.socket = new WebSocket(url);

        this.socket.onopen = function() {
            self.reconnectDelay = 1000;
            // Start heartbeat
            self._heartbeat = setInterval(function() {
                self.send({type: 'heartbeat'});
            }, 30000);
        };

        this.socket.onmessage = function(e) {
            try {
                var data = JSON.parse(e.data);
                var type = data.type;
                if (self.handlers[type]) {
                    self.handlers[type].forEach(function(fn) { fn(data); });
                }
            } catch (err) {
                console.error('WS message error:', err);
            }
        };

        this.socket.onclose = function(e) {
            clearInterval(self._heartbeat);
            if (e.code === 4001) {
                // Auth failed, go back to login
                window.location.href = '/';
                return;
            }
            // Reconnect with backoff
            setTimeout(function() {
                self.reconnectDelay = Math.min(self.reconnectDelay * 2, self.maxDelay);
                self.connect();
            }, self.reconnectDelay);
        };

        this.socket.onerror = function() {};
    },

    send: function(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    },

    on: function(type, fn) {
        if (!this.handlers[type]) this.handlers[type] = [];
        this.handlers[type].push(fn);
    }
};
