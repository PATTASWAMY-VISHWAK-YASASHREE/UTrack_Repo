// components/LogoutButton.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const LogoutButton = ({ onLogout, label = "Logout", className = "" }) => {
  const navigate=useNavigate()  
  const handleClick = async () => {
    try {
      await onLogout();
      navigate('/')
      localStorage.removeItem("user");

    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition ${className}`}
    >
      {label}
    </button>
  );
};

export default LogoutButton;
