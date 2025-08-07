import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSession } from "../App"; // Your session context/hook
import "./NavBar.css"; // Import your CSS file

// Demo: replace with real school branding context/provider!
const useBranding = () => ({
  logoUrl: "/default-logo.svg",
  name: "CDL Trainer",
});

export default function NavBar() {
  const { role, email, avatarUrl, logout, notifications = 0 } = useSession?.() || {};
  const branding = useBranding();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef();

  // Accessibility: close dropdown on outside click or ESC
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileOpen && profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    function handleEsc(e) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [profileOpen]);

  // Role-based nav links
  const roleLinks = {
    student: [
      { to: "/student/dashboard", label: "Dashboard" },
      { to: "/student/checklists", label: "Checklists" },
      { to: "/student/practice-tests", label: "Practice Tests" },
      { to: "/student/walkthrough", label: "Walkthrough" },
    ],
    instructor: [
      { to: "/instructor/dashboard", label: "Dashboard" },
      { to: "/instructor/checklist-review", label: "Checklist Review" },
    ],
    admin: [
      { to: "/admin/dashboard", label: "Dashboard" },
      { to: "/admin/users", label: "Users" },
      { to: "/admin/companies", label: "Companies" },
      { to: "/admin/reports", label: "Reports" },
    ],
    superadmin: [
      { to: "/superadmin/dashboard", label: "Super Admin" },
      // Add more superadmin links as needed
    ],
  };

  // Construct links
  let navLinks = [
    { to: "/", label: "Home", always: true },
  ];
  if (role && roleLinks[role]) {
    navLinks = [...navLinks, ...roleLinks[role]];
  }
  if (!role) {
    navLinks.push({ to: "/login", label: "Login" });
    navLinks.push({ to: "/signup", label: "Sign Up" });
  }

  // Profile dropdown options
  const userMenu = [
    { label: "Profile", action: () => navigate(`/${role}/profile`) },
    { label: "Logout", action: logout },
  ];

  // Hamburger toggle
  function handleMenuToggle() {
    setMenuOpen((v) => !v);
  }

  // Keyboard menu open
  function handleAvatarKey(e) {
    if (e.key === "Enter" || e.key === " ") setProfileOpen((v) => !v);
  }

  // Theme switcher (optional, add state/context for actual theme toggle)
  function handleThemeSwitch() {
    document.body.classList.toggle("dark-mode");
  }

  return (
    <nav className="navbar" aria-label="Main Navigation">
      {/* Branding/Logo */}
      <div className="navbar-left">
        <img
          src={branding.logoUrl}
          alt="School Logo"
          className="navbar-logo"
        />
        <span className="navbar-brand">{branding.name}</span>
      </div>

      {/* Desktop nav links */}
      <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              "navbar-link" + (isActive ? " active" : "")
            }
            tabIndex={0}
            onClick={() => setMenuOpen(false)}
            end
          >
            {link.label}
          </NavLink>
        ))}
        {/* Optional theme switcher */}
        <button
          className="navbar-theme-btn"
          aria-label="Toggle theme"
          onClick={handleThemeSwitch}
          tabIndex={0}
        >
          <span role="img" aria-label="Theme">🌓</span>
        </button>
      </div>

      {/* User avatar/profile menu */}
      {role && (
        <div className="navbar-user" ref={profileRef}>
          <button
            className="navbar-avatar-btn"
            onClick={() => setProfileOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={profileOpen}
            tabIndex={0}
            onKeyDown={handleAvatarKey}
            aria-label="Open user menu"
          >
            <img
              src={avatarUrl || "/default-avatar.svg"}
              alt="User Avatar"
              className="navbar-avatar"
            />
            {/* Notifications badge */}
            {notifications > 0 && (
              <span className="navbar-notif-badge">{notifications}</span>
            )}
          </button>
          {profileOpen && (
            <div className="navbar-dropdown" role="menu">
              <div className="navbar-dropdown-user">
                <span className="navbar-dropdown-email">{email}</span>
                <span className="navbar-dropdown-role">{role}</span>
              </div>
              {userMenu.map((item) => (
                <button
                  key={item.label}
                  className="navbar-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    item.action();
                    setProfileOpen(false);
                  }}
                  tabIndex={0}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hamburger for mobile */}
      <button
        className={`navbar-burger${menuOpen ? " open" : ""}`}
        onClick={handleMenuToggle}
        aria-label="Toggle navigation menu"
        aria-controls="main-navigation"
        aria-expanded={menuOpen}
      >
        <span />
        <span />
        <span />
      </button>
    </nav>
  );
}