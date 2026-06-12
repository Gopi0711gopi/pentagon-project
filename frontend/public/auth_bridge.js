/**
 * Ecomind Auth Bridge
 * Attaches login/signup logic to the Kimi UI.
 */

(function () {
    console.log("🧠 Ecomind Auth Bridge Initialized");

    function attachListeners() {
        // Find Login Button
        // The buttons are dynamically rendered by React, so we need to check periodically or use a MutationObserver.
        const loginButtons = Array.from(document.querySelectorAll('button')).filter(b => b.innerText === 'Log In');
        const signupButtons = Array.from(document.querySelectorAll('button')).filter(b => b.innerText === 'Create Account');

        loginButtons.forEach(btn => {
            if (btn.dataset.bridgeAttached) return;
            btn.addEventListener('click', async (e) => {
                const emailInput = document.getElementById('email');
                const passwordInput = document.getElementById('password');

                if (!emailInput || !passwordInput) return;

                const email = emailInput.value;
                const password = passwordInput.value;

                if (!email || !password) return;

                console.log("Attempting login for:", email);
                btn.innerText = "Authenticating...";
                btn.disabled = true;

                try {
                    const formData = new URLSearchParams();
                    formData.append('username', email); // Mapping email to username for now
                    formData.append('password', password);

                    const res = await fetch('/api/auth/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: formData.toString()
                    });

                    if (res.ok) {
                        const data = await res.json();
                        localStorage.setItem('ecomind_token', data.access_token);
                        console.log("Login successful! Redirecting...");
                        window.location.href = '/dashboard';
                    } else {
                        const data = await res.json();
                        console.error("Login failed response:", data);
                        alert("Login Failed: " + (data.detail || "Check your credentials"));
                        btn.innerText = "Log In";
                        btn.disabled = false;
                    }
                } catch (err) {
                    console.error("Login error:", err);
                    alert("System Error during authentication");
                    btn.innerText = "Log In";
                    btn.disabled = false;
                }
            });
            btn.dataset.bridgeAttached = "true";
        });

        signupButtons.forEach(btn => {
            if (btn.dataset.bridgeAttached) return;
            btn.addEventListener('click', async (e) => {
                const nameInput = document.getElementById('signup-name');
                const emailInput = document.getElementById('signup-email');
                const passwordInput = document.getElementById('signup-password');

                if (!nameInput || !emailInput || !passwordInput) return;

                const name = nameInput.value;
                const email = emailInput.value;
                const password = passwordInput.value;

                if (!name || !email || !password) return;

                console.log("Attempting signup for:", email);
                btn.innerText = "Initializing...";
                btn.disabled = true;

                try {
                    const res = await fetch('/api/auth/signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: name,
                            email: email,
                            password: password
                        })
                    });

                    if (res.ok) {
                        alert("Account created successfully! Please log in.");
                        window.location.reload();
                    } else {
                        const data = await res.json();
                        alert("Signup Failed: " + (data.detail || "Try a different name/email"));
                        btn.innerText = "Create Account";
                        btn.disabled = false;
                    }
                } catch (err) {
                    console.error("Signup error:", err);
                    alert("System Error during registration");
                    btn.innerText = "Create Account";
                    btn.disabled = false;
                }
            });
            btn.dataset.bridgeAttached = "true";
        });
    }

    // Polling is simpler than MutationObserver for this specific use case
    setInterval(attachListeners, 1000);
})();
