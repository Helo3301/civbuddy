// Draggable window system with z-index management
var WindowManager = {
    topZ: 100,
    windows: {},

    init: function() {
        var self = this;
        // Set up all windows
        document.querySelectorAll('.app-window').forEach(function(win) {
            self.windows[win.id] = win;
            self.makeDraggable(win);

            // Focus on click
            win.addEventListener('mousedown', function() {
                self.focus(win.id);
            });
        });

        // Close buttons
        document.querySelectorAll('[data-close]').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var winId = btn.getAttribute('data-close');
                self.hide(winId);
            });
        });

        // Minimize buttons
        document.querySelectorAll('[data-minimize]').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var winId = btn.getAttribute('data-minimize');
                self.minimize(winId);
            });
        });

        // Taskbar buttons
        document.querySelectorAll('.taskbar-btn[data-window]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var winId = btn.getAttribute('data-window');
                self.toggleFromTaskbar(winId);
            });
        });
    },

    makeDraggable: function(win) {
        var titleBar = win.querySelector('.title-bar');
        if (!titleBar) return;

        var isDragging = false;
        var offsetX, offsetY;

        titleBar.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            offsetX = e.clientX - win.offsetLeft;
            offsetY = e.clientY - win.offsetTop;
            win.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            var x = e.clientX - offsetX;
            var y = e.clientY - offsetY;
            // Keep on screen
            x = Math.max(0, Math.min(x, window.innerWidth - 50));
            y = Math.max(0, Math.min(y, window.innerHeight - 60));
            win.style.left = x + 'px';
            win.style.top = y + 'px';
        });

        document.addEventListener('mouseup', function() {
            isDragging = false;
            win.style.userSelect = '';
        });
    },

    focus: function(winId) {
        var win = this.windows[winId];
        if (!win) return;

        // Remove focus from all
        Object.values(this.windows).forEach(function(w) {
            w.classList.remove('focused');
        });

        win.classList.add('focused');
        this.topZ++;
        win.style.zIndex = this.topZ;

        // Update taskbar
        document.querySelectorAll('.taskbar-btn[data-window]').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-window') === winId);
        });
    },

    show: function(winId) {
        var win = this.windows[winId];
        if (!win) return;
        win.style.display = '';
        win.classList.remove('minimized');
        this.focus(winId);

        // Show taskbar button
        var tbBtn = document.querySelector('.taskbar-btn[data-window="' + winId + '"]');
        if (tbBtn) tbBtn.style.display = '';
    },

    hide: function(winId) {
        var win = this.windows[winId];
        if (!win) return;
        win.style.display = 'none';

        // Hide taskbar button (except buddy list)
        if (winId !== 'buddy-list-window') {
            var tbBtn = document.querySelector('.taskbar-btn[data-window="' + winId + '"]');
            if (tbBtn) tbBtn.style.display = 'none';
        }
    },

    minimize: function(winId) {
        var win = this.windows[winId];
        if (!win) return;
        win.classList.add('minimized');
        win.style.display = 'none';
    },

    toggleFromTaskbar: function(winId) {
        var win = this.windows[winId];
        if (!win) return;

        if (win.style.display === 'none' || win.classList.contains('minimized')) {
            this.show(winId);
        } else if (win.classList.contains('focused')) {
            this.minimize(winId);
        } else {
            this.focus(winId);
        }
    }
};
