import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PageStyles.css';

const Alerts = () => {
  const navigate = useNavigate();

  const handleGoToTransactions = () => {
    navigate('/transactions');
  };

  return (
    <div className="page alerts-page clean-layout">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold mb-3 text-white">
          Payment & Transaction Center
        </h2>
        
        <p className="text-gray-400 mb-6">
          All payment functionality has been consolidated into the Transactions page for a better user experience.
        </p>
        
        <button
          onClick={handleGoToTransactions}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 mx-auto"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          <span>Go to Transactions & Payments</span>
        </button>
      </div>
    </div>
  );
};

export default Alerts;
