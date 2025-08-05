import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import BottomNav from '../components/BottomNav';
import SimpleRazorpayButton from '../components/SimpleRazorpayButton';
import './PageStyles.css';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'razorpay', 'bills'
  const [paymentAmount, setPaymentAmount] = useState(100); // Default payment amount
  const [customAmount, setCustomAmount] = useState(''); // For input field

  const handlePaymentSuccess = (transaction) => {
    // The transaction will be automatically updated via Firebase listener
    console.log('Payment completed successfully:', transaction);
    // Optional: You can add any additional UI feedback here
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // Listen for real-time user data updates
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeDoc = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            setUserData(userData); // Store userData for payment button
            
            // Combine different types of transactions
            const allTransactions = [];
            
            // Add Razorpay transactions
            if (userData.user_transactions) {
              userData.user_transactions.forEach(transaction => {
                allTransactions.push({
                  ...transaction,
                  source: 'razorpay',
                  displayType: 'Payment'
                });
              });
            }
            
            // Add bill/receipt transactions
            if (userData.user_bills) {
              userData.user_bills.forEach(bill => {
                const amount = parseFloat(
                  typeof bill.json.total_amount === 'string' 
                    ? bill.json.total_amount.match(/\d+(\.\d+)?/)?.[0] || 0
                    : bill.json.total_amount || 0
                );
                
                allTransactions.push({
                  id: bill.json.bill_number || Date.now(),
                  amount: amount,
                  description: `Bill from ${bill.json.merchant_name || 'Unknown'}`,
                  createdAt: new Date(bill.json.time_stamp || Date.now()),
                  type: 'bill_expense',
                  source: 'bill_scan',
                  displayType: 'Expense',
                  paymentMethod: bill.json.payment_method || 'N/A',
                  merchant: bill.json.merchant_name,
                  billData: bill
                });
              });
            }
            
            // Sort by creation date (newest first)
            allTransactions.sort((a, b) => {
              const dateA = new Date(a.createdAt || a.timestamp);
              const dateB = new Date(b.createdAt || b.timestamp);
              return dateB - dateA;
            });
            
            setTransactions(allTransactions);
          }
          setLoading(false);
        });
        
        return unsubscribeDoc;
      } else {
        setTransactions([]);
        setUserData(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    if (filter === 'razorpay') return transaction.source === 'razorpay';
    if (filter === 'bills') return transaction.source === 'bill_scan';
    return true;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Invalid Date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return '₹0.00';
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  const getTransactionIcon = (transaction) => {
    switch (transaction.source) {
      case 'razorpay':
        return (
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        );
      case 'bill_scan':
        return (
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>

        {/* Quick Payment Section */}
        {currentUser && (
          <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6 mb-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Make a Quick Payment</h3>
              <p className="text-gray-300 mb-4">Add a new transaction to your history</p>
              
              {/* Amount Selection */}
              <div className="mb-4 max-w-md mx-auto">
                {/* Predefined amounts */}
                <div className="flex flex-wrap gap-2 justify-center mb-3">
                  {[50, 100, 200, 500, 1000].map(amount => (
                    <button
                      key={amount}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        paymentAmount === amount
                          ? 'bg-blue-500 text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      onClick={() => handlePredefinedAmount(amount)}
                    >
                      ₹{amount}
                    </button>
                  ))}
                </div>
                
                {/* Custom amount input */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="number"
                    placeholder="Enter custom amount"
                    value={customAmount}
                    onChange={handleAmountChange}
                    min="1"
                    max="100000"
                    className="w-full pl-8 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                {/* Current amount display */}
                <div className="mt-3 p-2 bg-blue-900/50 rounded-lg">
                  <span className="text-blue-400 font-semibold">Amount: ₹{paymentAmount}</span>
                </div>
              </div>
              
              <SimpleRazorpayButton 
                onPaymentSuccess={handlePaymentSuccess}
                currentUser={currentUser}
                userData={userData}
                amount={paymentAmount}
              />
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
          {[
            { key: 'all', label: 'All', count: transactions.length },
            { key: 'razorpay', label: 'Payments', count: transactions.filter(t => t.source === 'razorpay').length },
            { key: 'bills', label: 'Bills', count: transactions.filter(t => t.source === 'bill_scan').length }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">No transactions found</h3>
              <p className="text-gray-500 mb-6">
                {filter === 'all' 
                  ? "You haven't made any transactions yet" 
                  : `No ${filter} transactions found`}
              </p>
              
              {/* Payment Button */}
              {filter === 'all' || filter === 'razorpay' ? (
                <div className="mt-6">
                  <p className="text-gray-300 mb-4">Make your first payment:</p>
                  
                  {/* Amount Selection for empty state */}
                  <div className="mb-4 max-w-sm mx-auto">
                    <div className="flex flex-wrap gap-2 justify-center mb-3">
                      {[50, 100, 200, 500].map(amount => (
                        <button
                          key={amount}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            paymentAmount === amount
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                          onClick={() => handlePredefinedAmount(amount)}
                        >
                          ₹{amount}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <SimpleRazorpayButton 
                    onPaymentSuccess={handlePaymentSuccess}
                    currentUser={currentUser}
                    userData={userData}
                    amount={paymentAmount}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            filteredTransactions.map((transaction, index) => (
              <div key={transaction.id || index} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getTransactionIcon(transaction)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white truncate">
                          {transaction.description || `${transaction.displayType} - User: ${transaction.userId || 'Unknown'}`}
                        </h3>
                        <span className={`text-sm font-medium ${
                          transaction.source === 'razorpay' ? 'text-blue-400' : 'text-green-400'
                        }`}>
                          -{formatAmount(transaction.amount)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-gray-400">
                          {formatDate(transaction.createdAt || transaction.timestamp)}
                        </p>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400 capitalize">
                          {transaction.source === 'razorpay' ? 'Razorpay' : 'Bill Scan'}
                        </span>
                        {transaction.status && (
                          <>
                            <span className="text-xs text-gray-500">•</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              transaction.status === 'captured' 
                                ? 'bg-green-900 text-green-300' 
                                : 'bg-gray-700 text-gray-300'
                            }`}>
                              {transaction.status}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Additional transaction details */}
                {transaction.paymentId && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="text-xs text-gray-500">
                      Payment ID: {transaction.paymentId}
                    </div>
                  </div>
                )}
                
                {transaction.merchant && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="text-xs text-gray-500">
                      Merchant: {transaction.merchant}
                    </div>
                    {transaction.paymentMethod && (
                      <div className="text-xs text-gray-500 mt-1">
                        Payment Method: {transaction.paymentMethod}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default TransactionHistory;
