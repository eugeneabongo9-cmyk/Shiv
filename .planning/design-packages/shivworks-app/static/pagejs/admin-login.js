document.getElementById('login-form').addEventListener('submit', (e) => {
	e.preventDefault();
	window.SWSession.signInAdmin({
		name: document.getElementById('login-name').value.trim() || 'Administrator',
		email: document.getElementById('login-email').value.trim()
	});
	window.location.href = 'admin.html';
});
