(function () {
  const container = document.querySelector(".user-info");
  if (!container) {
    return;
  }

  fetch("/api/auth/status")
    .then((response) => response.json())
    .then((data) => {
      if (!data.authenticated || !data.user) {
        container.style.display = "none";
        return;
      }

      const nameEl = container.querySelector(".user-name");
      if (nameEl) {
        nameEl.textContent = data.user.username || "-";
      }

      const avatarEl = container.querySelector(".user-avatar");
      if (avatarEl && data.user.avatar) {
        avatarEl.src = `https://cdn.discordapp.com/avatars/${data.user.id}/${data.user.avatar}.png?size=64`;
        avatarEl.alt = data.user.username ? `Avatar ${data.user.username}` : "Avatar";
        avatarEl.hidden = false;
      }
    })
    .catch(() => {
      container.style.display = "none";
    });
})();
