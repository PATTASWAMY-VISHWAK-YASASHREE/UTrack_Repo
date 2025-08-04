import React, { useState, useEffect, useRef } from 'react';
import './FloatingPayCard.css';

const FloatingPayCard = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [transform, setTransform] = useState('');
  const cardRef = useRef(null);
  const razorpayContainerRef = useRef(null);

  // Show card after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Handle mouse move for 3D tilt effect
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    // Calculate mouse position relative to card center
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - cardCenterX;
    const mouseY = e.clientY - cardCenterY;
    
    // Calculate rotation angles (limit the tilt)
    const rotateX = (mouseY / rect.height) * -10; // Max 10 degrees
    const rotateY = (mouseX / rect.width) * 10;   // Max 10 degrees
    
    // Apply smooth transform with centered positioning
    setTransform(`
      translate(-50%, -50%) 
      perspective(1000px) 
      rotateX(${rotateX}deg) 
      rotateY(${rotateY}deg) 
      translateZ(20px)
    `);
  };

  // Reset transform when mouse leaves
  const handleMouseLeave = () => {
    setTransform('translate(-50%, -50%) perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
  };

  // Initialize Razorpay script
  useEffect(() => {
    if (!razorpayContainerRef.current) return;

    // Clear the container first
    razorpayContainerRef.current.innerHTML = '';

    // Create form element
    const form = document.createElement('form');
    
    // Add loading state initially
    form.innerHTML = `
      <div class="razorpay-loading">
        <div class="loading-spinner"></div>
        <span>Loading payment...</span>
      </div>
    `;

    // Add form to container
    razorpayContainerRef.current.appendChild(form);

    // Create script element
    const script = document.createElement('script');
    script.src = "https://checkout.razorpay.com/v1/payment-button.js";
    script.setAttribute("data-payment_button_id", "pl_Qz9w79lQBguY8Q");
    script.async = true;

    let hasLoaded = false;

    // Add event listeners
    script.onload = () => {
      console.log('Razorpay script loaded successfully');
      hasLoaded = true;
      // Remove loading state - let Razorpay replace it
    };

    script.onerror = () => {
      console.error('Failed to load Razorpay script');
      if (!hasLoaded) {
        // Replace with fallback button only if script failed to load
        form.innerHTML = `
          <button type="button" class="razorpay-fallback-btn" onclick="alert('Razorpay integration would work here with valid credentials')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Pay with Razorpay
          </button>
        `;
      }
    };

    // Append script to form AFTER setting up loading state
    form.appendChild(script);

    // Extended fallback timeout - only trigger if script hasn't loaded
    const fallbackTimeout = setTimeout(() => {
      if (!hasLoaded && form.querySelector('.razorpay-loading')) {
        console.log('Razorpay script timeout, showing fallback');
        form.innerHTML = `
          <button type="button" class="razorpay-fallback-btn" onclick="alert('Click to integrate with your Razorpay account')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Pay with Razorpay
          </button>
        `;
      }
    }, 10000); // Increased timeout to 10 seconds

    return () => {
      clearTimeout(fallbackTimeout);
      if (razorpayContainerRef.current) {
        razorpayContainerRef.current.innerHTML = '';
      }
    };
  }, [isVisible]);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      ref={cardRef}
      className="floating-pay-card"
      style={{
        transform: transform,
        transition: 'transform 0.1s ease-out'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >      
      {/* Card content */}
      <div className="floating-pay-card__content">
        <button 
          className="floating-pay-card__close"
          onClick={handleClose}
        >
          ×
        </button>
        
        <div className="floating-pay-card__header">
          <div className="floating-pay-card__main-title">
            <h2>Pay with UTrack</h2>
            <p>Secure payment powered by Razorpay</p>
          </div>
        </div>
        
        <div className="floating-pay-card__body">
          <div ref={razorpayContainerRef} className="floating-pay-card__razorpay"></div>
        </div>
      </div>
    </div>
  );
};

export default FloatingPayCard;
