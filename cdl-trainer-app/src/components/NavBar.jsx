import React from "react";
import { Link } from "react-router-dom";

function NavBar() {
  return (
    <nav style={{ padding: "1em", background: "#222" }}>
      <Link to="/" style={{ color: "#fff", marginRight: "1em" }}>Welcome</Link>
      <Link to="/student-dashboard" style={{ color: "#fff", marginRight: "1em" }}>Student</Link>
      <Link to="/instructor-dashboard" style={{ color: "#fff", marginRight: "1em" }}>Instructor</Link>
      <Link to="/admin-dashboard" style={{ color: "#fff", marginRight: "1em" }}>Admin</Link>
      <Link to="/superadmin-dashboard" style={{ color: "#fff", marginRight: "1em" }}>SuperAdmin</Link>
      <Link to="/login" style={{ color: "#fff", marginRight: "1em" }}>Login</Link>
      <Link to="/signup" style={{ color: "#fff" }}>Signup</Link>
    </nav>
  );
}

export default NavBar;
