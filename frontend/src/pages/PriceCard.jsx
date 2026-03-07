import React from "react";
import { FaExternalLinkAlt, FaTag, FaStore } from "react-icons/fa";

const PriceCard = ({ marketData }) => {
  if (!marketData || marketData.length === 0) return null;

  const formatINR = (price) => {
    if (!price) return "N/A";
    // Removes non-numeric characters to ensure Intl can format it
    const numericValue = typeof price === 'string' 
      ? parseFloat(price.replace(/[^0-9.]/g, '')) 
      : price;

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0, 
    }).format(numericValue);
  };

  return (
    <div style={styles.priceContainer}>
      <p style={styles.priceHeader}>
        <FaTag size={10} style={{ marginRight: '6px' }} /> LIVE MARKET PRICES
      </p>
      
      {marketData.map((item, index) => (
        <a 
          key={index} 
          href={item.link || "#"} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{
            ...styles.priceRow,
            borderBottom: index === marketData.length - 1 ? 'none' : '1px solid #f1f5f9'
          }}
        >
          <div style={styles.sourceGroup}>
            <FaStore size={12} color="#94a3b8" style={{marginRight: '8px'}} />
            {/* Using item.source to match the backend change */}
            <span style={styles.sourceName}>{item.source || "Retailer"}</span>
          </div>
          
          <div style={styles.priceGroup}>
            <span style={styles.priceText}>{formatINR(item.price)}</span>
            <FaExternalLinkAlt size={10} color="#94a3b8" />
          </div>
        </a>
      ))}
    </div>
  );
};

const styles = {
  priceContainer: {
    marginTop: '15px',
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
  },
  priceHeader: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: '0.05em',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    textDecoration: 'none',
    transition: 'background-color 0.2s ease',
  },
  sourceGroup: { display: 'flex', alignItems: 'center' },
  sourceName: { fontSize: '13px', color: '#475569', fontWeight: '600' },
  priceGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  priceText: { fontSize: '14px', fontWeight: '800', color: '#059669' }
};

export default PriceCard;