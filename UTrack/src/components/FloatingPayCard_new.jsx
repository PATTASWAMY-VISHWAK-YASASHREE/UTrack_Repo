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

  // Handle payment success callback
  const handlePaymentSuccess = useCallback(async (response) => {
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
  }, [currentUser, userData]);

  // Initialize Razorpay script with enhanced integration
  useEffect(() => {
    if (!razorpayContainerRef.current || !currentUser) return;

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

    // Enhanced Razorpay integration with proper callback handling
    const initializeRazorpay = () => {
      // Create Razorpay button using environment variables
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
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Use environment variable
          amount: 10000, // Amount in paise (₹100)
          currency: 'INR',
          name: 'UTrack',
          description: `Payment for UTrack services - User: ${currentUser.uid}`,
          image: '/logo.png', // Your app logo
          handler: handlePaymentSuccess,
          prefill: {
            name: currentUser.displayName || 'User',
            email: currentUser.email,
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
          rzp.on('payment.failed', (response) => {
            console.error('Payment failed:', response);
            setPaymentStatus('failed');
            alert('Payment failed. Please try again.');
          });
          rzp.open();
        } else {
          console.error('Razorpay not loaded');
          alert('Payment service not available. Please try again later.');
        }
      };

      form.innerHTML = '';
      form.appendChild(razorpayButton);
    };

    // Load Razorpay script
    if (!window.Razorpay) {
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
      };
      document.head.appendChild(script);
    } else {
      initializeRazorpay();
    }

    return () => {
      if (razorpayContainerRef.current) {
        razorpayContainerRef.current.innerHTML = '';
      }
    };
  }, [isVisible, currentUser, userData, handlePaymentSuccess]);

  const handleClose = () => {
    setIsVisible(false);
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
