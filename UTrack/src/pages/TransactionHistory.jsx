import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import BottomNav from '../components/BottomNav';
import './PageStyles.css';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'razorpay', 'bills'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // Listen for real-time user data updates
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeDoc = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            
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
            
            // Sort by date (newest first)
            allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            setTransactions(allTransactions);
            setLoading(false);
          }
        });
        
        return unsubscribeDoc;
      } else {
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  const getTransactionIcon = (transaction) => {
    if (transaction.source === 'razorpay') {
      return (
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Please log in to view transactions</p>
          <a href="/login" className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600">
            Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-black rounded-full"></div>
            </div>
            <span className="text-xl text-white font-semibold">Transaction History</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All ({transactions.length})
          </button>
          <button
            onClick={() => setFilter('razorpay')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'razorpay' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Payments ({transactions.filter(t => t.source === 'razorpay').length})
          </button>
          <button
            onClick={() => setFilter('bills')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'bills' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Bills ({transactions.filter(t => t.source === 'bill_scan').length})
          </button>
        </div>

        {/* Transaction List */}
        <div className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
              <p className="text-gray-400">
                {filter === 'all' 
                  ? 'Start by making a payment or scanning a bill to see your transaction history.'
                  : `No ${filter} transactions found. Try a different filter.`
                }
              </p>
            </div>
          ) : (
            filteredTransactions.map((transaction, index) => (
              <div key={transaction.id || index} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getTransactionIcon(transaction)}
                    <div>
                      <h3 className="font-semibold text-white">
                        {transaction.description || `${transaction.displayType} Transaction`}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <span>{formatDate(transaction.createdAt)}</span>
                        <span>•</span>
                        <span className="capitalize">{transaction.source.replace('_', ' ')}</span>
                        {transaction.paymentMethod && (
                          <>
                            <span>•</span>
                            <span>{transaction.paymentMethod}</span>
                          </>
                        )}
                      </div>
                      {transaction.merchant && (
                        <p className="text-sm text-gray-400">From: {transaction.merchant}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${
                      transaction.source === 'razorpay' ? 'text-blue-400' : 'text-red-400'
                    }`}>
                      {transaction.source === 'razorpay' ? '-' : '-'}{formatAmount(transaction.amount)}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                      transaction.status === 'captured' || transaction.status === 'success'
                        ? 'bg-green-500/20 text-green-400'
                        : transaction.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {transaction.status || 'completed'}
                    </div>
                  </div>
                </div>
                
                {/* Additional details for bill transactions */}
                {transaction.billData && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <button 
                      onClick={() => {
                        // Show bill details modal - implement as needed
                        console.log('Show bill details:', transaction.billData);
                      }}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      View Bill Details →
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {filteredTransactions.length > 0 && (
          <div className="mt-8 bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Total Transactions</p>
                <p className="text-xl font-semibold">{filteredTransactions.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Amount</p>
                <p className="text-xl font-semibold text-red-400">
                  -{formatAmount(filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0))}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
};

export default TransactionHistory;