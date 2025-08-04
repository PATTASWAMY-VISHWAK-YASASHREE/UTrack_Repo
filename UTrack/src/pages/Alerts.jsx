import React from 'react';
import FloatingPayCard from '../components/FloatingPayCard';
import './PageStyles.css';

const Alerts = () => {
  return (
    <div className="page alerts-page clean-layout">
      {/* Floating Pay Card with integrated title */}
      <FloatingPayCard />
    </div>
  );
};

export default Alerts;
