// app.js
alert("🚀 app.js loaded");

// Simple renderWelcome to prove DOM injection
function renderWelcome() {
  const appEl = document.getElementById("app");
  if (!appEl) {
    alert("❌ #app not found");
    return;
  }
  appEl.innerHTML = `
    <div style="padding:20px; text-align:center;">
      <h1>Welcome!</h1>
      <button id="login-btn">🚀 Login</button>
    </div>
  `;
  document.getElementById("login-btn").onclick = () => alert("🔑 Login clicked");
}

// Run it
renderWelcome();