import React, { useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import './RazorpayPaymentButton.css';

const RazorpayPaymentButton = ({ onPaymentSuccess, currentUser, userData }) => {
  const buttonContainerRef = useRef(null);

  useEffect(() => {
    if (!buttonContainerRef.current || !currentUser) return;

    // Clear the container first
    buttonContainerRef.current.innerHTML = '';

    // Create the Razorpay payment button form and script element
    const form = document.createElement('form');
    const script = document.createElement('script');
    
    // Configure the script
    script.src = 'https://checkout.razorpay.com/v1/payment-button.js';
    script.setAttribute('data-payment_button_id', 'pl_Qz9w79lQBguY8Q');
    script.async = true;
    
    // Add script to form
    form.appendChild(script);
    
    // Add form to container
    buttonContainerRef.current.appendChild(form);

    // Listen for payment completion via window message
    const handlePaymentMessage = async (event) => {
      // Check if the message is from Razorpay
      if (event.origin !== 'https://checkout.razorpay.com') return;

      try {
        const data = JSON.parse(event.data);
        
        if (data.event === 'payment.success') {
          console.log('Payment successful:', data.payload);
          
          // Create transaction record
          const transaction = {
            paymentId: data.payload.payment.entity.id,
            amount: data.payload.payment.entity.amount / 100, // Convert paise to rupees
            currency: data.payload.payment.entity.currency,
            status: data.payload.payment.entity.status,
            method: data.payload.payment.entity.method,
            createdAt: new Date(data.payload.payment.entity.created_at * 1000),
            description: `UTrack Payment - User: ${currentUser.uid}`,
            type: 'razorpay_payment',
            timestamp: new Date(),
            processedAt: new Date(),
            source: 'razorpay_button',
            displayType: 'Payment'
          };

          // Update user document
          const userRef = doc(db, 'users', currentUser.uid);
          const currentTransactions = userData?.user_transactions || [];
          const currentSpendings = userData?.userspendings || {};
          const budget = userData?.usersettings?.montly_budget || 0;

          // Calculate updated spendings
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
          
          // Call success callback
          if (onPaymentSuccess) {
            onPaymentSuccess(transaction);
          }

          // Show success message
          alert('Payment successful! Your transaction has been recorded.');
        }
      } catch (error) {
        console.error('Error processing payment message:', error);
      }
    };

    // Add event listener for payment messages
    window.addEventListener('message', handlePaymentMessage);

    // Cleanup
    return () => {
      window.removeEventListener('message', handlePaymentMessage);
      if (buttonContainerRef.current) {
        buttonContainerRef.current.innerHTML = '';
      }
    };
  }, [currentUser, userData, onPaymentSuccess]);

  return (
    <div className="razorpay-payment-button-container">
      <div ref={buttonContainerRef} className="razorpay-button-wrapper">
        {/* Fallback button in case script doesn't load */}
        <button 
          className="razorpay-fallback-btn"
          onClick={() => {
            // Try to load the payment button if not already loaded
            const form = document.createElement('form');
            const script = document.createElement('script');
            
            script.src = 'https://checkout.razorpay.com/v1/payment-button.js';
            script.setAttribute('data-payment_button_id', 'pl_Qz9w79lQBguY8Q');
            script.async = true;
            
            form.appendChild(script);
            buttonContainerRef.current.appendChild(form);
            
            // Remove this fallback button
            setTimeout(() => {
              const fallbackBtn = buttonContainerRef.current.querySelector('.razorpay-fallback-btn');
              if (fallbackBtn) fallbackBtn.style.display = 'none';
            }, 2000);
          }}
        >
          💳 Pay with Razorpay
        </button>
      </div>
    </div>
  );
};

export default RazorpayPaymentButton;
