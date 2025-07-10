// ui-helpers.js

export function showToast(message, duration = 3000) {
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "#333";
  toast.style.color = "#fff";
  toast.style.padding = "10px 20px";
  toast.style.borderRadius = "5px";
  toast.style.opacity = "1";
  toast.style.transition = "opacity 0.5s ease";
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 600);
  }, duration);
}

export function setupNavigation() {
  const buttons = document.querySelectorAll("[data-nav]");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      if (target) {
        history.pushState({ page: target }, "", `#${target}`);
        window.dispatchEvent(new PopStateEvent("popstate", { state: { page: target } }));
      }
    });
  });
}