// ===== Clerk integration shim (mockup) =====
// In the live app, ClerkMount.svelte handles this:
//   const clerk = await loadBrowserClerk(publishableKey);
//   clerk.mountSignIn(document.getElementById('clerk-signin'), {
//     routing: 'path', path: '/login', signUpUrl: '/signup',
//     fallbackRedirectUrl: '/dashboard', appearance: { ...red theme... }
//   });
// If no key is present, it shows the "not configured" notice instead.
(function () {
	var slot = document.getElementById('clerk-signin');
	if (!slot) return;

	// Demo: the static form just routes into the member app.
	var form = slot.querySelector('.clerk-fallback');
	if (form) {
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			if (window.SWSession && window.SWSession.signIn) {
				try {
					window.SWSession.signIn();
				} catch (_) {}
			}
			window.location.href = slot.getAttribute('data-clerk-redirect') || 'dashboard.html';
		});
		slot.querySelectorAll('.cf-oauth').forEach(function (b) {
			b.addEventListener('click', function () {
				window.location.href = slot.getAttribute('data-clerk-redirect') || 'dashboard.html';
			});
		});
	}
})();
