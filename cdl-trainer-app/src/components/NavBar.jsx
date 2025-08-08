import React, { useState, useRef, useEffect, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSession } from "../App"; // exposes { loading, isLoggedIn, role, user }
import {
  getCachedBrandingSummary,
  subscribeBrandingUpdated,
} from "../utils/school-branding";
import { getDashboardRoute } from "../utils/navigation";
import "./NavBar.css";

export default function NavBar() {
  const session = useSession?.() || {};
  const { role, user, logout } = session;
  const email = user?.email || session.email || "";
  const avatarUrl = user?.photoURL || session.avatarUrl || "/default-avatar.svg";
  const notifications = session.notifications ?? 0;

  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Branding (logo + name) that updates instantly on school switch
  const [brand, setBrand] = useState(() => getCachedBrandingSummary());
  useEffect(() => {
    const unsub = subscribeBrandingUpdated((detail) => {
      setBrand((prev) => ({
        logoUrl: detail?.logoUrl ?? prev.logoUrl ?? "/default-logo.svg",
        schoolName: detail?.schoolName ?? prev.schoolName ?? "CDL Trainer",
        primaryColor: detail?.primaryColor ?? prev.primaryColor ?? "",
      }));
    });
    return unsub;
  }, []);

  // Accessibility: close dropdown on outside click or ESC
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileOpen && profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    function handleEsc(e) {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [profileOpen]);

  // Role-based links
  const roleLinks = useMemo(() => {
    return {
      student: [
        { to: "/student/dashboard", label: "Dashboard" },
        { to: "/student/checklists", label: "Checklists" },
        { to: "/student/practice-tests", label: "Practice Tests" },
        { to: "/student/walkthrough", label: "Walkthrough" },
        { to: "/student/flashcards", label: "Flashcards" },
      ],
      instructor: [
        { to: "/instructor/dashboard", label: "Dashboard" },
        { to: "/instructor/checklists", label: "Checklists" },
        { to: "/instructor/checklist-review", label: "Checklist Review" },
      ],
      admin: [
        { to: "/admin/dashboard", label: "Dashboard" },
        { to: "/admin/users", label: "Users" },
        { to: "/admin/companies", label: "Companies" },
        { to: "/admin/reports", label: "Reports" },
      ],
      superadmin: [
        { to: "/superadmin/dashboard", label: "Dashboard" },
        { to: "/superadmin/schools", label: "Schools" },
        { to: "/superadmin/users", label: "Users" },
        { to: "/superadmin/compliance", label: "Compliance" },
        { to: "/superadmin/billing", label: "Billing" },
        { to: "/superadmin/settings", label: "Settings" },
        { to: "/superadmin/logs", label: "Logs" },
      ],
    };
  }, []);

  // Build visible nav
  const links = useMemo(() => {
    const base = [{ to: "/", label: "Home", always: true }];
    if (role && roleLinks[role]) return [...base, ...roleLinks[role]];
    return [...base, { to: "/login", label: "Login" }, { to: "/signup", label: "Sign Up" }];
  }, [role, roleLinks]);

  // Profile dropdown options
  const userMenu = useMemo(() => {
    if (!role) return [];
    return [
      { label: "Profile", action: () => navigate(`/${role}/profile`) },
      { label: "Dashboard", action: () => navigate(getDashboardRoute(role)) },
      { label: "Logout", action: () => (typeof logout === "function" ? logout() : navigate("/login")) },
    ];
  }, [navigate, role, logout]);

  // Handlers
  function handleMenuToggle() {
    setMenuOpen((v) => !v);
  }
  function handleAvatarKey(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setProfileOpen((v) => !v);
    }
  }
  function handleThemeSwitch() {
    document.body.classList.toggle("dark-mode");
  }

  return (
    <nav className="navbar" aria-label="Main Navigation">
      {/* Branding/Logo */}
      <div className="navbar-left" onClick={() => navigate(role ? getDashboardRoute(role) : "/")}>
        <img
          src={brand.logoUrl || "/default-logo.svg"}
          alt="School Logo"
          className="navbar-logo"
          loading="lazy"
          decoding="async"
        />
        <span className="navbar-brand">{brand.schoolName || "CDL Trainer"}</span>
      </div>

      {/* Desktop nav links */}
      <div className={`navbar-links ${menuOpen ? "open" : ""}`} id="main-navigation">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
            onClick={() => setMenuOpen(false)}
            end
          >
            {link.label}
          </NavLink>
        ))}
        <button
          className="navbar-theme-btn"
          aria-label="Toggle theme"
          onClick={handleThemeSwitch}
          type="button"
        >
          <span role="img" aria-label="Theme">🌓</span>
        </button>
      </div>

      {/* User avatar/profile menu */}
      {role ? (
        <div className="navbar-user" ref={profileRef}>
          <button
            className="navbar-avatar-btn"
            onClick={() => setProfileOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onKeyDown={handleAvatarKey}
            aria-label="Open user menu"
            type="button"
          >
            <img src={avatarUrl} alt="User Avatar" className="navbar-avatar" />
            {notifications > 0 && <span className="navbar-notif-badge">{notifications}</span>}
          </button>
          {profileOpen && (
            <div className="navbar-dropdown" role="menu">
              <div className="navbar-dropdown-user">
                <span className="navbar-dropdown-email" title={email}>{email}</span>
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
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Hamburger for mobile */}
      <button
        className={`navbar-burger${menuOpen ? " open" : ""}`}
        onClick={handleMenuToggle}
        aria-label="Toggle navigation menu"
        aria-controls="main-navigation"
        aria-expanded={menuOpen}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>
    </nav>
  );
}