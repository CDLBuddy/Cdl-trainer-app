// minimal-app.js

console.log("✅ minimal-app.js loaded!");

// Show a visible proof of JS execution
const app = document.getElementById("app");
if (app) {
  app.innerHTML = `
    <h1 style="text-align:center;color:#00e676;margin-top:3em;">CDL Trainer Minimal App.js Loaded!</h1>
    <p style="text-align:center;">If you see this, JS module imports work!<br>Now you can gradually add more features.</p>
  `;
} else {
  document.body.innerHTML += '<div style="color:red">[error] #app element not found!</div>';
}