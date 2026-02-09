// Auth middleware - dodaj to do wszystkich stron które wymagają logowania
(function() {
  fetch('/api/auth/status')
    .then(r => r.json())
    .then(data => {
      if (!data.authenticated) {
        window.location.href = '/login.html';
      } else {
        // User is authenticated
        console.log('Authenticated as:', data.user.username);
        // Można wyświetlić username itp
        document.addEventListener('DOMContentLoaded', () => {
          const userElement = document.querySelector('.user-info');
          if (userElement) {
            userElement.textContent = `Zalogowany: ${data.user.username}`;
          }
        });
      }
    })
    .catch(() => {
      // Server error, redirect to login
      window.location.href = '/login.html';
    });
})();

// Logout function
async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
}
