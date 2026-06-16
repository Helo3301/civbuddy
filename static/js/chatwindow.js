// Chat window
var ChatWindow = {
    typingTimeout: null,
    isTyping: false,

    init: function() {
        var self = this;

        // Load message history
        this.loadHistory();

        // Send button
        document.getElementById('btn-send').addEventListener('click', function() {
            self.sendMessage();
        });

        // Enter to send (Shift+Enter for newline)
        document.getElementById('chat-input').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                self.sendMessage();
            }
        });

        // Typing indicator
        document.getElementById('chat-input').addEventListener('input', function() {
            if (!self.isTyping) {
                self.isTyping = true;
                WS.send({type: 'typing_start'});
            }
            clearTimeout(self.typingTimeout);
            self.typingTimeout = setTimeout(function() {
                self.isTyping = false;
                WS.send({type: 'typing_stop'});
            }, 2000);
        });

        // Listen for messages
        WS.on('chat_message', function(data) {
            self.appendMessage(data);
            if (data.sender_id !== App.user.id) {
                SoundManager.play('imrcv');
            }
        });

        // Typing from buddy
        WS.on('buddy_typing', function(data) {
            var indicator = document.getElementById('typing-indicator');
            if (data.typing) {
                indicator.textContent = data.display_name + ' is typing...';
            } else {
                indicator.textContent = '';
            }
        });
    },

    open: function() {
        WindowManager.show('chat-window');
        document.getElementById('taskbar-chat').style.display = '';
        document.getElementById('chat-input').focus();
    },

    loadHistory: function() {
        fetch('/api/messages?limit=50').then(function(r) { return r.json(); }).then(function(msgs) {
            var container = document.getElementById('chat-messages');
            container.textContent = '';
            msgs.forEach(function(msg) {
                ChatWindow.appendMessage(msg, true);
            });
            container.scrollTop = container.scrollHeight;
        });
    },

    appendMessage: function(msg, noScroll) {
        var container = document.getElementById('chat-messages');
        var div = document.createElement('div');
        div.className = 'chat-msg';

        var time = new Date(msg.timestamp + (msg.timestamp.includes('Z') ? '' : 'Z'));
        var timeStr = time.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', second: '2-digit'});

        var nameSpan = document.createElement('span');
        nameSpan.className = 'msg-name ' + (msg.sender_id === App.user.id ? 'self' : 'other');
        nameSpan.textContent = msg.sender_name;

        var timeSpan = document.createElement('span');
        timeSpan.className = 'msg-time';
        timeSpan.textContent = ' (' + timeStr + ')';

        var textSpan = document.createElement('span');
        textSpan.className = 'msg-text';
        textSpan.textContent = ': ' + msg.content;

        div.appendChild(nameSpan);
        div.appendChild(timeSpan);
        div.appendChild(textSpan);
        container.appendChild(div);

        // Clear typing indicator
        if (msg.sender_id !== App.user.id) {
            document.getElementById('typing-indicator').textContent = '';
        }

        if (!noScroll) {
            container.scrollTop = container.scrollHeight;
        }
    },

    addSystemMessage: function(text) {
        var container = document.getElementById('chat-messages');
        var div = document.createElement('div');
        div.className = 'system-msg';
        div.textContent = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    sendMessage: function() {
        var input = document.getElementById('chat-input');
        var content = input.value.trim();
        if (!content) return;

        WS.send({type: 'chat_message', content: content});
        SoundManager.play('imsend');
        input.value = '';

        // Stop typing
        this.isTyping = false;
        clearTimeout(this.typingTimeout);
        WS.send({type: 'typing_stop'});
    }
};
