// src/components/HomeSkeleton.jsx
import React from "react";
import "./SkeletonLayout.css";

const HomeSkeleton = () => {
  return (
    <div className="skeleton-container">
      {/* Progress Cards */}
      <div className="progress-grid">
        {[1, 2, 3, 4].map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-circle" />
            <div className="skeleton-line short" />
            <div className="skeleton-line" />
          </div>
        ))}
      </div>

      {/* Recent Receipts */}
      <h3 className="skeleton-title" />
      <div className="receipts-row">
        {[1, 2, 3].map((_, i) => (
          <div key={i} className="receipt-card">
            <div className="skeleton-line" />
            <div className="skeleton-button" />
          </div>
        ))}
      </div>

      {/* Recent Chat */}
      <h3 className="skeleton-title" />
      <div className="chat-box" />
      
      {/* Bottom Nav */}
      <div className="bottom-nav">
        {[1, 2, 3, 4].map((_, i) => (
          <div key={i} className="nav-icon" />
        ))}
      </div>
    </div>
  );
};

export default HomeSkeleton;
