import React, { useEffect, useRef } from 'react';
import BottomNav from '../components/BottomNav';
import './PageStyles.css'; // Ensure this exists and supports global styles

const Alerts = () => {
  const razorpayContainerRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://checkout.razorpay.com/v1/payment-button.js";
    script.setAttribute("data-payment_button_id", "pl_Qz9w79lQBguY8Q");
    script.async = true;

    if (razorpayContainerRef.current) {
      razorpayContainerRef.current.innerHTML = '';
      razorpayContainerRef.current.appendChild(script);
    }

    return () => {
      if (razorpayContainerRef.current) {
        razorpayContainerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="page alerts-page">
      <div className="centered-container">
        <h2 className="payment-heading">Pay with UTrack</h2>
        <div ref={razorpayContainerRef}></div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Alerts;
