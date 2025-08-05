import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db } from '../firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import './FloatingPayCard.css';

const FloatingPayCard = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [transform, setTransform] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [currentUser, setCurrentUser] = useState(null);
  const [userdata, setUserData] = useState(null);
  const cardRef = useRef(null);
  const razorpayContainerRef = useRef(null);

  // Show card after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // Listen for real-time user data updates
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeDoc = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data());
          }
        });
        
        return unsubscribeDoc;
      }
    });

    return unsubscribe;
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

  // Handle payment success callback (currently for compatibility - can be used with webhook integration)
  const _handlePaymentSuccess = async (response) => {
    console.log('Payment successful:', response);
    setPaymentStatus('success');
    
    try {
      if (currentUser) {
        // Create a local transaction record immediately for instant UI update
        const localTransaction = {
          paymentId: response.razorpay_payment_id,
          amount: 100, // This should match your actual payment amount
          currency: 'INR',
          status: 'captured',
          method: 'razorpay',
          createdAt: new Date(),
          description: `UTrack Payment - User: ${currentUser.uid}`,
          type: 'razorpay_payment',
          timestamp: new Date(),
          processedAt: new Date(),
          source: 'frontend_success'
        };

        // Update user document immediately
        const userRef = doc(db, 'users', currentUser.uid);
        const currentTransactions = userdata?.user_transactions || [];
        const currentSpendings = userdata?.userspendings || {};
        const budget = userdata?.usersettings?.montly_budget || 0;

        // Calculate updated spendings
        const newAmount = localTransaction.amount;
        const updatedSpendings = {
          today: {
            spent: (currentSpendings.today?.spent || 0) + newAmount,
            budget: Math.round(budget / 30)
          },
          this_week: {
            spent: (currentSpendings.this_week?.spent || 0) + newAmount,
            budget: Math.round(budget / 4)
          },
          this_month: {
            spent: (currentSpendings.this_month?.spent || 0) + newAmount,
            budget: budget
          },
          overall: {
            spent: (currentSpendings.overall?.spent || 0) + newAmount,
            budget: budget
          }
        };

        await updateDoc(userRef, {
          user_transactions: [...currentTransactions, localTransaction],
          userspendings: updatedSpendings,
          lastTransactionAt: new Date()
        });

        console.log('✅ Local transaction data updated immediately');
        
        // Show success message
        setTimeout(() => {
          alert('Payment successful! Your transaction has been recorded.');
          setIsVisible(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Error updating local transaction:', error);
    }
  };

  // Handle payment failure (currently for compatibility - can be used with webhook integration)
  const _handlePaymentFailure = (response) => {
    console.error('Payment failed:', response);
    setPaymentStatus('failed');
    alert('Payment failed. Please try again.');
  };

  // Initialize Razorpay payment button as specified in problem statement
  useEffect(() => {
    if (!razorpayContainerRef.current || !currentUser) return;

    // Clear the container first
    razorpayContainerRef.current.innerHTML = '';

    // Create form element with the exact button code from problem statement
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

    // Load the payment button script as specified in problem statement
    const loadPaymentButton = () => {
      const script = document.createElement('script');
      script.src = "https://checkout.razorpay.com/v1/payment-button.js";
      script.setAttribute('data-payment_button_id', 'pl_Qz9w79lQBguY8Q');
      script.async = true;
      
      script.onload = () => {
        console.log('✅ Razorpay payment button loaded successfully');
        // Clear loading state and show the button
        form.innerHTML = '';
        form.appendChild(script);
        setPaymentStatus('ready');
      };
      
      script.onerror = () => {
        console.error('❌ Failed to load Razorpay payment button script');
        form.innerHTML = `
          <div class="payment-error">
            <p class="text-red-400 text-sm mb-3">Payment service temporarily unavailable</p>
            <button type="button" class="razorpay-fallback-btn" onclick="location.reload()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 009-9 9.75 9.75 0 00-6.74 2.74L3 7.5"></path>
                <path d="M3 7.5h4.5v4.5"></path>
              </svg>
              Retry
            </button>
          </div>
        `;
        setPaymentStatus('error');
      };

      return script;
    };

    // Initialize with timeout to ensure proper loading
    const timer = setTimeout(() => {
      const paymentScript = loadPaymentButton();
      form.appendChild(paymentScript);
    }, 100);

    return () => {
      clearTimeout(timer);
      const containerRef = razorpayContainerRef.current;
      if (containerRef) {
        containerRef.innerHTML = '';
      }
    };
  }, [isVisible, currentUser]);

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
            <p>
              {paymentStatus === 'success' ? '✅ Payment Successful!' :
               paymentStatus === 'failed' ? '❌ Payment Failed' :
               'Secure payment powered by Razorpay'}
            </p>
          </div>
        </div>
        
        <div className="floating-pay-card__body">
          <div ref={razorpayContainerRef} className="floating-pay-card__razorpay"></div>
          
          {currentUser && (
            <div className="payment-info">
              <p className="text-sm text-gray-400 text-center mt-3">
                Logged in as: {currentUser.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FloatingPayCard;
