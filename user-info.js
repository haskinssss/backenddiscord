(function () {
  const container = document.querySelector(".user-info");
  if (!container) {
    return;
  }

  fetch("/api/auth/status", { credentials: "include" })
    .then((response) => response.json())
    .then((data) => {
      const nameEl = container.querySelector(".user-name");
      const avatarEl = container.querySelector(".user-avatar");

      if (!data.authenticated || !data.user) {
        if (nameEl) {
          nameEl.textContent = "Brak sesji";
        }
        if (avatarEl) {
          avatarEl.hidden = true;
        }
        return;
      }

      if (nameEl) {
        nameEl.textContent = data.user.username || "-";
      }

      if (avatarEl && data.user.avatar) {
        avatarEl.src = `https://cdn.discordapp.com/avatars/${data.user.id}/${data.user.avatar}.png?size=64`;
        avatarEl.alt = data.user.username ? `Avatar ${data.user.username}` : "Avatar";
        avatarEl.hidden = false;
      } else if (avatarEl) {
        avatarEl.hidden = true;
      }
    })
    .catch(() => {
      const nameEl = container.querySelector(".user-name");
      if (nameEl) {
        nameEl.textContent = "Brak sesji";
      }
    });
})();
