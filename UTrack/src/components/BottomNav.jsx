// src/components/BottomNav.jsx
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaUser, FaHistory, FaQrcode } from "react-icons/fa";
import { MdOutlineStars } from "react-icons/md";
import "./BottomNav.css";

const BottomNav = () => {
  const location = useLocation();
  const navItems = [
    { name: "Home", icon: <FaHome />, path: "/dashboard" },
    { name: "Ask", icon: <MdOutlineStars />, path: "/chat" },
    { name: "Scan", icon: <FaQrcode />, path: "/scan", center: true },
    { name: "History", icon: <FaHistory />, path: "/transactions" },
    { name: "You", icon: <FaUser />, path: "/profile" },
  ];

  return (
    <nav className="bottom-nav-mobile">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`nav-mobile-item${location.pathname === item.path ? " active" : ""}${item.center ? " nav-mobile-center" : ""}`}
        >
          <span className="nav-mobile-icon">{item.icon}</span>
        </Link>
      ))}
    </nav>
  );
};

export default BottomNav;
