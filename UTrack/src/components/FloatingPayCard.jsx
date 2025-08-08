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
  const [userData, setUserData] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(100); // Default amount in rupees
  const [customAmount, setCustomAmount] = useState(''); // For input field
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
  const handlePaymentSuccess = useCallback(async (response) => {
    console.log('Payment successful:', response);
    setPaymentStatus('success');
    
    try {
      if (currentUser) {
        // Create a local transaction record immediately for instant UI update
        const localTransaction = {
          paymentId: response.razorpay_payment_id,
          amount: paymentAmount, // Use dynamic payment amount
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
        const currentTransactions = userData?.user_transactions || [];
        const currentSpendings = userData?.userspendings || {};
        const budget = userData?.usersettings?.montly_budget || 0;

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
  }, [currentUser, userData, paymentAmount]);

  // Handle payment failure
  const handlePaymentFailure = (response) => {
    console.error('Payment failed:', response);
    setPaymentStatus('failed');
    alert('Payment failed. Please try again.');
  };

  // Initialize Razorpay payment button as specified in problem statement
  const loadPaymentButton = useCallback(() => {
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

    // Enhanced Razorpay integration with proper callback handling (using Razorpay Checkout)
    const initializeRazorpay = () => {
      // Option 1: Use Razorpay Checkout (recommended for better control)
      const razorpayButton = document.createElement('button');
      razorpayButton.type = 'button';
      razorpayButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
        Pay with Razorpay
      `;
      razorpayButton.className = 'razorpay-fallback-btn enhanced-razorpay-btn';
      
      razorpayButton.onclick = () => {
        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!razorpayKey) {
          console.error('Razorpay key not configured');
          alert('Payment service not configured. Please contact support.');
          return;
        }
        
        const options = {
          key: razorpayKey,
          amount: paymentAmount * 100, // Convert rupees to paise (dynamic amount)
          currency: 'INR',
          name: 'UTrack',
          description: `Payment for UTrack services - User: ${currentUser.uid}`,
          image: '/logo.png', // Your app logo
          handler: handlePaymentSuccess,
          prefill: {
            name: currentUser.displayName || 'User',
            email: currentUser.email, // Use currentUser.email
            contact: userData?.phoneNumber || ''
          },
          notes: {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            timestamp: new Date().toISOString()
          },
          theme: {
            color: '#007AFF'
          },
          modal: {
            ondismiss: () => {
              console.log('Payment modal dismissed');
              setPaymentStatus('dismissed');
            }
          }
        };

        if (window.Razorpay) {
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', handlePaymentFailure);
          rzp.open();
        } else {
          console.error('Razorpay not loaded');
          alert('Payment service not available. Please try again later.');
        }
      };

      form.innerHTML = '';
      form.appendChild(razorpayButton);
    };

    // Load Razorpay script (checkout.js, not payment-button.js)
    const script = document.createElement('script');
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = initializeRazorpay;
    script.onerror = () => {
      console.error('Failed to load Razorpay script');
      // Fallback button
      form.innerHTML = `
        <button type="button" class="razorpay-fallback-btn" onclick="alert('Payment service temporarily unavailable. Please try again later.')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          Payment Unavailable
        </button>
      `;
      setPaymentStatus('error');
    };
    document.head.appendChild(script);

  }, [currentUser, userData, handlePaymentSuccess, paymentAmount]);

  useEffect(() => {
    if (!isVisible || !currentUser) return;

    // If Razorpay is already loaded, initialize directly
    if (window.Razorpay) {
      loadPaymentButton();
      setPaymentStatus('ready');
      return;
    }

    // Otherwise, load the script and then initialize
    const script = document.createElement('script');
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      loadPaymentButton();
      setPaymentStatus('ready');
    };
    script.onerror = () => {
      console.error('Failed to load Razorpay script');
      setPaymentStatus('error');
    };
    document.head.appendChild(script);

    return () => {
      // Store reference to avoid stale closure
      const containerRef = razorpayContainerRef.current;
      if (containerRef) {
        containerRef.innerHTML = '';
      }
    };
  }, [isVisible, currentUser, userData, paymentAmount, loadPaymentButton]);

  const handleClose = () => {
    setIsVisible(false);
  };

  // Handle amount change
  const handleAmountChange = (e) => {
    const value = e.target.value;
    setCustomAmount(value);
    
    // Update payment amount if valid
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setPaymentAmount(numValue);
    }
  };

  // Handle predefined amount selection
  const handlePredefinedAmount = (amount) => {
    setPaymentAmount(amount);
    setCustomAmount(amount.toString());
  };

  // Get payment status message
  const getPaymentStatusMessage = () => {
    if (paymentStatus === 'success') return '✅ Payment Successful!';
    if (paymentStatus === 'failed') return '❌ Payment Failed';
    return 'Secure payment powered by Razorpay';
  };

  if (!isVisible) return null;

  return (
    <div
      ref={cardRef}
      className="floating-pay-card"
      role="dialog"
      aria-label="Payment card"
      aria-modal="true"
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
            <p>{getPaymentStatusMessage()}</p>
          </div>
        </div>
        
        <div className="floating-pay-card__body">
          {/* Amount Selection Section */}
          <div className="amount-selection">
            <h3>Select Amount</h3>
            
            {/* Predefined amounts */}
            <div className="predefined-amounts">
              {[50, 100, 200, 500, 1000].map(amount => (
                <button
                  key={amount}
                  type="button"
                  className={`amount-btn ${paymentAmount === amount ? 'active' : ''}`}
                  onClick={() => handlePredefinedAmount(amount)}
                >
                  ₹{amount}
                </button>
              ))}
            </div>
            
            {/* Custom amount input */}
            <div className="custom-amount">
              <label htmlFor="customAmount">Or enter custom amount:</label>
              <div className="amount-input-wrapper">
                <span className="currency-symbol">₹</span>
                <input
                  id="customAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={handleAmountChange}
                  min="1"
                  max="100000"
                  className="amount-input"
                />
              </div>
            </div>
            
            {/* Current amount display */}
            <div className="current-amount">
              <strong>Amount to pay: ₹{paymentAmount}</strong>
            </div>
          </div>
          
          {/* Payment Button */}
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
