import React, { useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import './SimpleRazorpayButton.css';

const SimpleRazorpayButton = ({ onPaymentSuccess, currentUser, userData, amount = 100 }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !currentUser) return;

    // Clear container
    containerRef.current.innerHTML = '';

    // Create a simple redirect button
    const button = document.createElement('button');
    button.className = 'simple-razorpay-btn';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
      Pay with Razorpay
    `;

    button.onclick = () => {
      // Check if we have the Razorpay key
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      
      if (!razorpayKey) {
        alert('Payment configuration not available. Please contact support.');
        return;
      }

      // Load Razorpay script and open checkout
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = openRazorpayCheckout;
        script.onerror = () => {
          alert('Failed to load payment service. Please try again later.');
        };
        document.head.appendChild(script);
      } else {
        openRazorpayCheckout();
      }

      function openRazorpayCheckout() {
        const options = {
          key: razorpayKey,
          amount: amount * 100, // Convert rupees to paise (dynamic amount)
          currency: 'INR',
          name: 'UTrack',
          description: `Payment for UTrack services - ₹${amount} - User: ${currentUser.uid}`,
          image: '/logo.png',
          handler: function(response) {
            // Handle successful payment
            const transaction = {
              paymentId: response.razorpay_payment_id,
              amount: amount, // Dynamic amount in rupees
              currency: 'INR',
              status: 'captured',
              method: 'razorpay',
              createdAt: new Date(),
              description: `UTrack Payment - User: ${currentUser.uid}`,
              type: 'razorpay_payment',
              timestamp: new Date(),
              processedAt: new Date(),
              source: 'razorpay_checkout',
              displayType: 'Payment'
            };

            updateTransactionData(transaction);
          },
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
            ondismiss: function() {
              console.log('Payment modal dismissed');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function(response) {
          console.error('Payment failed:', response);
          alert('Payment failed. Please try again.');
        });
        rzp.open();
      }
    };

    const updateTransactionData = async (transaction) => {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const currentTransactions = userData?.user_transactions || [];
        const currentSpendings = userData?.userspendings || {};
        const budget = userData?.usersettings?.montly_budget || 0;

        const newAmount = transaction.amount;
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
          user_transactions: [...currentTransactions, transaction],
          userspendings: updatedSpendings,
          lastTransactionAt: new Date()
        });

        console.log('✅ Transaction data updated successfully');
        
        if (onPaymentSuccess) {
          onPaymentSuccess(transaction);
        }

        alert('Payment successful! Your transaction has been recorded.');
      } catch (error) {
        console.error('Error updating transaction:', error);
        alert('Payment completed but failed to save. Please contact support.');
      }
    };

    containerRef.current.appendChild(button);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [currentUser, userData, onPaymentSuccess, amount]); // Add amount to dependencies

  return (
    <div className="simple-razorpay-container">
      <div ref={containerRef} className="simple-razorpay-wrapper"></div>
    </div>
  );
};

export default SimpleRazorpayButton;
