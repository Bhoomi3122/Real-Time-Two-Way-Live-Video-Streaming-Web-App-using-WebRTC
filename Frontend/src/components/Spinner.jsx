import React from 'react';
import '../styles/Spinner.css';

const Loader = ({ message = 'Loading...' }) => {
  return (
    <div className="loader-container">
      <div className="spinner" />
      {message && <p className="loader-message">{message}</p>}
    </div>
  );
};

export default Loader;
