// Login page logic
(function() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');

    // Check if already logged in
    fetch('/api/auth/me').then(r => {
        if (r.ok) window.location.href = '/app.html';
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorEl.textContent = '';

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            errorEl.textContent = 'Please enter screen name and password.';
            return;
        }

        // Start connecting animation
        startDialup(username, password);
    });
})();
