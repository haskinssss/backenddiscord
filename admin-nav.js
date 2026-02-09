(function () {
  const adminDiscordId = "1150337681310625842";
  fetch("/api/auth/status", { credentials: "include" })
    .then((response) => response.json())
    .then((data) => {
      if (data.authenticated && data.user && data.user.id === adminDiscordId) {
        document.querySelectorAll(".admin-only").forEach((el) => {
          el.classList.add("is-visible");
        });
      }
    })
    .catch(() => {
      // Silent fail for public views.
    });
})();
