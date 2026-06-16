// Dialup connecting animation
var dialupCancelled = false;

function startDialup(username, password) {
    dialupCancelled = false;
    var overlay = document.getElementById('connecting-overlay');
    var steps = document.getElementById('connect-steps').children;
    var progress = document.getElementById('connect-progress');
    var dialupSound = document.getElementById('snd-dialup');
    var cancelBtn = document.getElementById('connect-cancel-btn');

    overlay.classList.add('active');

    // Reset steps
    for (var i = 0; i < steps.length; i++) {
        steps[i].className = '';
    }
    progress.value = 0;

    // Play dialup sound
    dialupSound.currentTime = 0;
    dialupSound.play().catch(function() {});

    cancelBtn.onclick = function() {
        dialupCancelled = true;
        dialupSound.pause();
        dialupSound.currentTime = 0;
        overlay.classList.remove('active');
    };

    // Lurchy step animation
    var delays = [800, 1500, 2200, 3200, 4000];
    var progressVals = [15, 35, 60, 80, 95];

    delays.forEach(function(delay, idx) {
        setTimeout(function() {
            if (dialupCancelled) return;
            // Mark previous as done
            for (var j = 0; j < idx; j++) {
                steps[j].className = 'done';
            }
            steps[idx].className = 'active';
            progress.value = progressVals[idx];
        }, delay);
    });

    // Actually login after animation
    setTimeout(function() {
        if (dialupCancelled) return;
        doLogin(username, password);
    }, 4500);
}

async function doLogin(username, password) {
    var overlay = document.getElementById('connecting-overlay');
    var errorEl = document.getElementById('login-error');
    var steps = document.getElementById('connect-steps').children;
    var progress = document.getElementById('connect-progress');
    var dialupSound = document.getElementById('snd-dialup');

    try {
        var resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: username, password: password})
        });

        if (!resp.ok) {
            var data = await resp.json();
            dialupSound.pause();
            dialupSound.currentTime = 0;
            overlay.classList.remove('active');
            errorEl.textContent = data.error || 'Sign on failed.';
            return;
        }

        // Success - complete animation
        for (var i = 0; i < steps.length; i++) {
            steps[i].className = 'done';
        }
        progress.value = 100;

        setTimeout(function() {
            dialupSound.pause();
            dialupSound.currentTime = 0;
            window.location.href = '/app.html';
        }, 500);
    } catch (err) {
        dialupSound.pause();
        dialupSound.currentTime = 0;
        overlay.classList.remove('active');
        errorEl.textContent = 'Connection failed. Try again.';
    }
}
