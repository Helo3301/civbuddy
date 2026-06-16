// Save games manager
var SaveGames = {
    games: [],
    selectedGameId: null,

    init: function() {
        var self = this;

        // Open saves window
        document.getElementById('btn-open-saves').addEventListener('click', function() {
            WindowManager.show('saves-window');
            document.getElementById('taskbar-saves').style.display = '';
            self.loadGames();
        });

        // Game selector
        document.getElementById('game-select').addEventListener('change', function() {
            self.selectedGameId = this.value ? parseInt(this.value) : null;
            self.loadSaves();
        });

        // New game
        document.getElementById('btn-new-game').addEventListener('click', function() {
            WindowManager.show('new-game-dialog');
        });

        document.getElementById('btn-create-game').addEventListener('click', function() {
            var name = document.getElementById('new-game-name').value.trim();
            if (!name) return;
            self.createGame(name);
            WindowManager.hide('new-game-dialog');
            document.getElementById('new-game-name').value = '';
        });

        // File upload
        document.getElementById('btn-choose-file').addEventListener('click', function() {
            document.getElementById('file-input').click();
        });

        document.getElementById('file-input').addEventListener('change', function() {
            if (this.files.length > 0) self.uploadFile(this.files[0]);
        });

        // Drag and drop
        var uploadArea = document.getElementById('upload-area');
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', function() {
            this.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) self.uploadFile(e.dataTransfer.files[0]);
        });

        // Refresh
        document.getElementById('btn-refresh-saves').addEventListener('click', function() {
            self.loadSaves();
        });

        // WS notifications
        WS.on('save_uploaded', function(data) {
            SoundManager.play('newmail');
            ChatWindow.addSystemMessage(data.uploader_name + ' uploaded save for turn ' + data.turn_number + '!');
            if (self.selectedGameId === data.game_id) {
                self.loadSaves();
            }
        });

        WS.on('your_turn', function(data) {
            self.loadGames();
        });
    },

    loadGames: function() {
        var self = this;
        fetch('/api/games').then(function(r) { return r.json(); }).then(function(games) {
            self.games = games;
            var select = document.getElementById('game-select');
            var currentVal = select.value;

            // Clear and rebuild with safe DOM methods
            while (select.options.length > 0) select.remove(0);
            var defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = '-- Select Game --';
            select.appendChild(defaultOpt);

            games.forEach(function(g) {
                var opt = document.createElement('option');
                opt.value = g.id;
                opt.textContent = g.name + (g.current_turn_user_id === App.user.id ? ' (YOUR TURN)' : '');
                select.appendChild(opt);
            });
            if (currentVal) select.value = currentVal;
        });
    },

    loadSaves: function() {
        var self = this;
        if (!this.selectedGameId) {
            document.getElementById('saves-tbody').textContent = '';
            document.getElementById('your-turn-banner').classList.remove('active');
            return;
        }

        // Check turn
        var game = this.games.find(function(g) { return g.id === self.selectedGameId; });
        var banner = document.getElementById('your-turn-banner');
        if (game && game.current_turn_user_id === App.user.id) {
            banner.classList.add('active');
        } else {
            banner.classList.remove('active');
        }

        fetch('/api/games/' + this.selectedGameId + '/saves').then(function(r) { return r.json(); }).then(function(saves) {
            var tbody = document.getElementById('saves-tbody');
            tbody.textContent = '';

            saves.forEach(function(s) {
                var tr = document.createElement('tr');
                var date = new Date(s.uploaded_at + (s.uploaded_at.includes('Z') ? '' : 'Z'));
                var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                var sizeStr = (s.file_size / 1024).toFixed(0) + ' KB';

                var cells = [
                    s.turn_number,
                    s.uploader_name,
                    s.filename,
                    sizeStr,
                    dateStr
                ];

                cells.forEach(function(text) {
                    var td = document.createElement('td');
                    td.textContent = text;
                    tr.appendChild(td);
                });

                // Download button cell
                var actionTd = document.createElement('td');
                var dlBtn = document.createElement('button');
                dlBtn.textContent = 'Download';
                dlBtn.addEventListener('click', function() {
                    window.location.href = '/api/games/' + self.selectedGameId + '/saves/' + s.id + '/download';
                });
                actionTd.appendChild(dlBtn);
                tr.appendChild(actionTd);

                tbody.appendChild(tr);
            });
        });
    },

    createGame: function(name) {
        var self = this;
        fetch('/api/games', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: name})
        }).then(function(r) { return r.json(); }).then(function(game) {
            self.loadGames();
            setTimeout(function() {
                document.getElementById('game-select').value = game.id;
                self.selectedGameId = game.id;
                self.loadSaves();
            }, 200);
        });
    },

    uploadFile: function(file) {
        if (!this.selectedGameId) {
            alert('Please select a game first.');
            return;
        }

        var self = this;
        var formData = new FormData();
        formData.append('file', file);

        var progressDiv = document.getElementById('upload-progress');
        var progressBar = document.getElementById('upload-bar');
        var statusText = document.getElementById('upload-status');

        progressDiv.classList.add('active');
        progressBar.value = 0;
        statusText.textContent = 'Uploading ' + file.name + '...';

        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/games/' + this.selectedGameId + '/saves');

        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                var pct = Math.round((e.loaded / e.total) * 100);
                progressBar.value = pct;
                statusText.textContent = 'Uploading... ' + pct + '%';
            }
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                statusText.textContent = 'Upload complete!';
                SoundManager.play('imsend');
                self.loadSaves();
                self.loadGames();
                setTimeout(function() {
                    progressDiv.classList.remove('active');
                }, 2000);
            } else {
                statusText.textContent = 'Upload failed!';
                setTimeout(function() {
                    progressDiv.classList.remove('active');
                }, 3000);
            }
        };

        xhr.onerror = function() {
            statusText.textContent = 'Upload error!';
            setTimeout(function() {
                progressDiv.classList.remove('active');
            }, 3000);
        };

        xhr.send(formData);
        document.getElementById('file-input').value = '';
    }
};
