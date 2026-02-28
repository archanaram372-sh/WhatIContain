import { useState, useEffect } from "react";
import { FaCloudUploadAlt, FaLeaf, FaUtensils, FaMedkit, FaBoxOpen, FaArrowLeft, FaHistory, FaTrash, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";

function App() {
  const [view, setView] = useState("dashboard");
  const [category, setCategory] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem("scanHistory") || "[]");
    setHistory(savedHistory);
  }, []);

  const saveToHistory = (newScan) => {
    const updatedHistory = [newScan, ...history].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem("scanHistory", JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("scanHistory");
  };

  const categories = [
    { id: "cosmetics", title: "Cosmetics", icon: <FaLeaf />, color: "#2ecc71", desc: "Skincare & Beauty" },
    { id: "food", title: "Food Products", icon: <FaUtensils />, color: "#e67e22", desc: "Nutrition & Additives" },
    { id: "healthcare", title: "Healthcare", icon: <FaMedkit />, color: "#e74c3c", desc: "Medicine & Vitamins" },
    { id: "processed", title: "Processed Items", icon: <FaBoxOpen />, color: "#3498db", desc: "Daily Essentials" },
  ];

  return (
    <div style={styles.appWrapper}>
      {view === "dashboard" && (
        <div style={styles.container}>
          <Dashboard categories={categories} onSelect={(cat) => { setCategory(cat); setView("scan"); }} />
          {history.length > 0 && (
            <button onClick={() => setView("history")} style={styles.historyBtn}>
              <FaHistory /> View Recent Scans ({history.length})
            </button>
          )}
        </div>
      )}

      {view === "scan" && (
        <ScanPage 
          category={category} 
          onBack={() => setView("dashboard")} 
          onSave={saveToHistory} 
        />
      )}

      {view === "history" && (
        <HistoryPage 
          history={history} 
          onBack={() => setView("dashboard")} 
          onClear={clearHistory} 
        />
      )}
    </div>
  );
}

// --- SCAN PAGE (Detailed Version) ---
function ScanPage({ category, onBack, onSave }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleDetect = async () => {
    if (!selectedFile) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("category", category.id);

    try {
      const response = await fetch("http://127.0.0.1:5000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Backend error");

      const data = await response.json();
      setResult(data);
      onSave({
        categoryName: category.title,
        risk: data.overall_product_risk,
        score: data.safety_score,
        date: new Date().toLocaleDateString(),
      });
    } catch (error) {
      alert("Could not connect to the backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <button onClick={onBack} style={styles.backButton}><FaArrowLeft /> Back</button>
      <h2 style={styles.title}>Analyzing {category.title}</h2>
      
      {!result ? (
        <div style={styles.uploadBox}>
          <FaCloudUploadAlt size={40} color={category.color} />
          <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} style={{marginTop: '10px'}} />
          <button onClick={handleDetect} style={{...styles.detectButton, backgroundColor: category.color}}>
            {loading ? "Analyzing Ingredients..." : "Start Detection"}
          </button>
        </div>
      ) : (
        <div style={styles.detailedResults}>
          {/* Safety Score Gauge */}
          <div style={{...styles.scoreCard, borderColor: result.safety_score > 70 ? '#2ecc71' : '#e74c3c'}}>
            <h1 style={{fontSize: '48px', margin: 0}}>{result.safety_score}</h1>
            <p>Safety Score / 100</p>
            <strong style={{color: result.overall_product_risk === 'High' ? '#e74c3c' : '#2ecc71'}}>
              Risk Level: {result.overall_product_risk}
            </strong>
          </div>

          {/* Demographic Warnings */}
          <div style={styles.warningBox}>
            <h4 style={{color: '#c0392b', margin: '0 0 5px 0'}}><FaExclamationTriangle /> Not Recommended For:</h4>
            <p style={{margin: '5px 0'}}>{result.not_recommended_for.join(", ")}</p>
            <small style={{display: 'block', marginTop: '5px'}}><em>{result.demographic_reasons}</em></small>
          </div>

          {/* Ingredient Categories */}
          <div style={styles.categoryGrid}>
            <div style={{...styles.riskSection, borderTop: '4px solid #e74c3c'}}>
              <h4 style={{color: '#e74c3c'}}>High Risk</h4>
              <ul style={styles.ingList}>
                {result.high_risk_ingredients.map(i => <li key={i}>{i}</li>)}
              </ul>
            </div>
            <div style={{...styles.riskSection, borderTop: '4px solid #2ecc71'}}>
              <h4 style={{color: '#2ecc71'}}>Safe/Low Risk</h4>
              <ul style={styles.ingList}>
                {result.low_risk_ingredients.map(i => <li key={i}>{i}</li>)}
              </ul>
            </div>
          </div>

          {/* Safer Alternatives */}
          <div style={styles.alternativeCard}>
            <h4 style={{margin: '0 0 10px 0', color: '#276749'}}><FaCheckCircle /> Recommended Alternatives:</h4>
            {result.safer_alternatives.map((alt, idx) => (
              <div key={idx} style={styles.altItem}>
                <strong style={{display: 'block'}}>{alt.product_name}</strong>
                <span style={{fontSize: '12px', color: '#4a5568'}}>{alt.why_better}</span>
              </div>
            ))}
          </div>

          <button onClick={() => setResult(null)} style={styles.historyBtn}>Scan Another Product</button>
        </div>
      )}
    </div>
  );
}

// --- HISTORY PAGE ---
const HistoryPage = ({ history, onBack, onClear }) => (
  <div style={styles.container}>
    <div style={styles.headerRow}>
      <button onClick={onBack} style={styles.backButton}><FaArrowLeft /> Back</button>
      <button onClick={onClear} style={styles.clearBtn}><FaTrash /> Clear All</button>
    </div>
    <h2 style={styles.title}>Recent Activity</h2>
    {history.map((item, index) => (
      <div key={index} style={styles.historyCard}>
        <div style={{...styles.dot, backgroundColor: item.risk === 'Low' ? '#2ecc71' : '#e74c3c'}} />
        <div style={{flex: 1}}>
          <h4 style={{margin: 0}}>{item.categoryName}</h4>
          <small>{item.date} • Score: {item.score}</small>
        </div>
        <strong>{item.risk}</strong>
      </div>
    ))}
  </div>
);

// --- DASHBOARD ---
const Dashboard = ({ categories, onSelect }) => (
  <>
    <h1 style={styles.mainTitle}>What I Contain</h1>
    <p style={{color: '#666', marginBottom: '20px'}}>Smart Ingredient Safety Scanner</p>
    <div style={styles.grid}>
      {categories.map((cat) => (
        <div key={cat.id} style={styles.card} onClick={() => onSelect(cat)}>
          <div style={{ ...styles.iconWrapper, backgroundColor: cat.color }}>{cat.icon}</div>
          <h3 style={{margin: '10px 0 5px 0'}}>{cat.title}</h3>
          <p style={{fontSize: '11px', color: '#999'}}>{cat.desc}</p>
        </div>
      ))}
    </div>
  </>
);

const styles = {
  appWrapper: { minHeight: "100vh", backgroundColor: "#f8fafc", padding: "20px", fontFamily: "sans-serif" },
  container: { maxWidth: "480px", margin: "auto" },
  mainTitle: { fontSize: "28px", color: "#1a202c", marginBottom: "5px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" },
  card: { backgroundColor: "white", padding: "20px", borderRadius: "20px", textAlign: "center", cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" },
  iconWrapper: { width: "55px", height: "55px", borderRadius: "50%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "24px" },
  historyBtn: { marginTop: "20px", width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  
  // Detailed Results Styles
  detailedResults: { marginTop: '20px' },
  scoreCard: { padding: '25px', backgroundColor: 'white', borderRadius: '24px', border: '6px solid', textAlign: 'center', marginBottom: '15px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  warningBox: { backgroundColor: '#fff5f5', padding: '15px', borderRadius: '16px', border: '1px solid #feb2b2', marginBottom: '15px', textAlign: 'left' },
  categoryGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  riskSection: { backgroundColor: 'white', padding: '15px', borderRadius: '16px', fontSize: '12px', textAlign: 'left', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  ingList: { paddingLeft: '18px', margin: '8px 0 0 0' },
  alternativeCard: { marginTop: '15px', backgroundColor: '#f0fff4', padding: '18px', borderRadius: '18px', border: '1px solid #c6f6d5', textAlign: 'left' },
  altItem: { borderBottom: '1px solid #c6f6d5', padding: '8px 0', marginBottom: '5px' },

  historyCard: { backgroundColor: "white", padding: "15px", borderRadius: "16px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  dot: { width: "10px", height: "10px", borderRadius: "50%" },
  headerRow: { display: "flex", justifyContent: "space-between", marginBottom: "20px" },
  clearBtn: { border: "none", background: "none", color: "#e53e3e", cursor: "pointer", fontWeight: 'bold' },
  detectButton: { width: "100%", padding: "16px", borderRadius: "30px", color: "white", border: "none", marginTop: "20px", fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  uploadBox: { padding: "40px 20px", border: "2px dashed #cbd5e0", borderRadius: "24px", textAlign: "center", backgroundColor: 'white' },
  backButton: { border: "none", background: "none", cursor: "pointer", marginBottom: "15px", display: 'flex', alignItems: 'center', gap: '5px', color: '#4a5568' }
};

export default App;