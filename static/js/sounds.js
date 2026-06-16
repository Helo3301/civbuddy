// Sound manager
var SoundManager = {
    muted: false,

    play: function(id) {
        if (this.muted) return;
        var el = document.getElementById('snd-' + id);
        if (el) {
            el.currentTime = 0;
            el.play().catch(function() {});
        }
    },

    toggle: function() {
        this.muted = !this.muted;
        var icon = document.getElementById('tray-sound');
        if (icon) icon.textContent = this.muted ? '🔇' : '🔊';

        // Update buddy list status bar icon too
        var statusIcons = document.querySelectorAll('.buddy-status-bar span:last-child');
        statusIcons.forEach(function(el) {
            el.textContent = SoundManager.muted ? '🔇' : '🔊';
        });
    }
};
