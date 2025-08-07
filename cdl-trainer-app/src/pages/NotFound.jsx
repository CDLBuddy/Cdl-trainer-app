import React from "react";
import { useNavigate } from "react-router-dom";
export default function NotFound() {
  const nav = useNavigate();
  return (
    <div style={{ textAlign: "center", marginTop: "6em" }}>
      <h2>404 – Page Not Found</h2>
      <p>The page you’re looking for doesn’t exist.</p>
      <button className="btn" onClick={() => nav("/")}>Go Home</button>
    </div>
  );
}