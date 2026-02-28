import { useState, useEffect, useRef } from "react";
import { 
  FaCloudUploadAlt, FaLeaf, FaUtensils, FaMedkit, FaBoxOpen, 
  FaArrowLeft, FaHistory, FaTrash, FaExclamationTriangle, 
  FaCheckCircle, FaCamera, FaMicroscope, FaShieldAlt, FaInfoCircle, FaFileAlt
} from "react-icons/fa";

// IMPORTANT: Ensure ChatBot.jsx exists in the same directory
import ChatBot from "./ChatBot"; 

function App() {
  const [view, setView] = useState("dashboard"); 
  const [category, setCategory] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem("scanHistory") || "[]");
    setHistory(savedHistory);
  }, []);

  const saveToHistory = (newScan) => {
    const updatedHistory = [newScan, ...history].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem("scanHistory", JSON.stringify(updatedHistory));
  };

  const handleAnalysisSuccess = (data) => {
    setCurrentResult(data);
    saveToHistory({ 
      categoryName: category.title, 
      risk: data.overall_product_risk, 
      score: data.safety_score, 
      date: new Date().toLocaleDateString(),
      fullData: data 
    });
    setView("report"); 
  };

  return (
    <div style={styles.appWrapper}>
      <header style={styles.navBar}>
        <div style={styles.logo} onClick={() => setView("dashboard")}>
          <FaShieldAlt size={35} color="#2ecc71" /> 
          <span style={{marginLeft: '12px'}}>What I Contain</span>
        </div>
        <div style={{display: 'flex', gap: '20px'}}>
          <button onClick={() => setView("dashboard")} style={styles.navLink}>Home</button>
          <button onClick={() => setView("history")} style={styles.navHistoryBtn}>
            <FaHistory /> History ({history.length})
          </button>
        </div>
      </header>

      <main style={styles.mainContent}>
        {view === "dashboard" && (
          <Dashboard onSelect={(cat) => { setCategory(cat); setView("scan"); }} />
        )}

        {view === "scan" && (
          <ScanPage 
            category={category} 
            onBack={() => setView("dashboard")} 
            onSuccess={handleAnalysisSuccess} 
          />
        )}

        {view === "report" && (
          <ReportPage 
            result={currentResult} 
            category={category}
            onBack={() => setView("scan")} 
          />
        )}

        {view === "history" && (
          <HistoryPage 
            history={history} 
            onBack={() => setView("dashboard")} 
            onView={(item) => { setCurrentResult(item.fullData); setView("report"); }}
            onClear={() => {setHistory([]); localStorage.removeItem("scanHistory");}} 
          />
        )}
      </main>
    </div>
  );
}

// --- SCREEN 1: SCAN/UPLOAD PAGE ---
function ScanPage({ category, onBack, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
        alert("Could not access camera. Check permissions.");
        setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    const context = canvasRef.current.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, 640, 480);
    canvasRef.current.toBlob((blob) => {
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      stopCamera();
    });
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const handleDetect = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("category", category.id);

    try {
      const response = await fetch("http://127.0.0.1:5000/analyze", { method: "POST", body: formData });
      const data = await response.json();
      onSuccess(data);
    } catch (error) {
      alert("Analysis failed. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.centerContainer}>
      <button onClick={onBack} style={styles.backButton}><FaArrowLeft /> Change Category</button>
      <div style={styles.scanCard}>
        <h2 style={styles.sectionTitle}><FaCamera /> Scan {category.title} Label</h2>
        <div style={styles.uploadSection}>
          {!isCameraOpen ? (
            <div style={styles.dropZone}>
              {preview ? (
                <img src={preview} alt="Preview" style={styles.fullPreview} />
              ) : (
                <FaCloudUploadAlt size={80} color={category.color} />
              )}
              <input type="file" onChange={(e) => {
                if(e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                    setPreview(URL.createObjectURL(e.target.files[0]));
                }
              }} style={styles.fileInput} />
              <div style={{marginTop: '20px'}}>
                <button onClick={startCamera} style={styles.secondaryBtn}><FaCamera /> Use Camera</button>
              </div>
            </div>
          ) : (
            <div style={styles.cameraBox}>
              <video ref={videoRef} autoPlay style={styles.videoStream} />
              <button onClick={capturePhoto} style={styles.captureBtn}>Capture Label</button>
              <button onClick={stopCamera} style={styles.cancelBtn}>Cancel</button>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} width="640" height="480" style={{display: 'none'}} />
        <button 
          onClick={handleDetect} 
          disabled={!selectedFile || loading} 
          style={{...styles.mainDetectBtn, backgroundColor: selectedFile && !loading ? category.color : '#cbd5e0'}}
        >
          {loading ? "🔬 AI Analysis in Progress..." : "Start Analysis"}
        </button>
      </div>
    </div>
  );
}

// --- SCREEN 2: FULL REPORT PAGE ---
const ReportPage = ({ result, category, onBack }) => {
  if (!result) return null;

  // Logic to determine colors based on the safety score
  const getRiskTheme = (score) => {
    if (score >= 80) return { border: '#2ecc71', bg: '#dcfce7', text: '#15803d' }; // Green
    if (score >= 50) return { border: '#f1c40f', bg: '#fef9c3', text: '#854d0e' }; // Yellow/Moderate
    return { border: '#e74c3c', bg: '#fee2e2', text: '#b91c1c' }; // Red/High
  };

  const theme = getRiskTheme(result.safety_score);

  return (
    <div style={styles.fullReportContainer}>
      <div style={styles.reportHeader}>
        <button onClick={onBack} style={styles.backButton}><FaArrowLeft /> New Scan</button>
        <h1 style={styles.laptopTitle}>Product Safety Report</h1>
      </div>

      <div style={styles.reportGrid}>
        <div style={styles.reportSide}>
          <div style={{...styles.scoreCardLarge, borderColor: theme.border}}>
            <span style={{...styles.hugeScore, color: theme.border}}>{result.safety_score}</span>
            <p style={{fontWeight: '700', color: '#64748b'}}>Safety Score</p>
            <div style={{...styles.riskBadge, backgroundColor: theme.bg, color: theme.text}}>
              {result.overall_product_risk} Risk
            </div>
          </div>
          <div style={styles.alertBox}>
            <h3><FaExclamationTriangle color="#e11d48" /> Demographic Alert</h3>
            <p><strong>Avoid if:</strong> {result.not_recommended_for.join(", ")}</p>
            <p style={styles.smallReason}>{result.demographic_reasons}</p>
          </div>
        </div>

        <div style={styles.reportMain}>
          <div style={styles.ingredientSection}>
            <h3><FaMicroscope /> Ingredient Deep-Dive</h3>
            <div style={styles.riskGrid}>
              <div style={styles.riskColumn}>
                <h4 style={{color: '#e11d48'}}>Flagged (High Risk)</h4>
                {result.high_risk_ingredients.map(i => <div key={i} style={styles.ingTagRed}>{i}</div>)}
              </div>
              <div style={styles.riskColumn}>
                <h4 style={{color: '#059669'}}>Safe / Low Risk</h4>
                {result.low_risk_ingredients.map(i => <div key={i} style={styles.ingTagGreen}>{i}</div>)}
              </div>
            </div>
          </div>
          <div style={styles.alternativesSection}>
            <h3><FaCheckCircle color="#059669" /> Safer Alternatives</h3>
            <div style={styles.altGrid}>
              {result.safer_alternatives.map((alt, i) => (
                <div key={i} style={styles.altCardFull}>
                  <FaShieldAlt size={24} color="#059669" />
                  <strong>{alt.product_name}</strong>
                  <p style={{fontSize: '14px', color: '#64748b', marginTop: '5px'}}>{alt.why_better}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ChatBot context={result} category={category.title} />
    </div>
  );
};

const Dashboard = ({ onSelect }) => {
  const categories = [
    { id: "cosmetics", title: "Cosmetics", icon: <FaLeaf />, color: "#2ecc71", desc: "Skincare & Makeup" },
    { id: "food", title: "Food", icon: <FaUtensils />, color: "#e67e22", desc: "Packaged Foods" },
    { id: "healthcare", title: "Healthcare", icon: <FaMedkit />, color: "#e74c3c", desc: "Supplements & Meds" },
    { id: "processed", title: "Processed", icon: <FaBoxOpen />, color: "#3498db", desc: "Chemical Goods" },
  ];

  return (
    <div style={styles.dashboardWrapper}>
      <h1 style={styles.heroText}>What are you scanning today?</h1>
      <div style={styles.laptopGrid}>
        {categories.map((cat) => (
          <div key={cat.id} style={styles.megaCard} onClick={() => onSelect(cat)}>
            <div style={{ ...styles.megaIcon, backgroundColor: cat.color }}>{cat.icon}</div>
            <h2 style={{fontSize: '22px', marginBottom: '10px'}}>{cat.title}</h2>
            <p style={{color: '#64748b', fontSize: '14px'}}>{cat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const HistoryPage = ({ history, onBack, onView, onClear }) => (
  <div style={styles.centerContainer}>
    <div style={styles.headerRow}>
      <button onClick={onBack} style={styles.backButton}><FaArrowLeft /> Back</button>
      <button onClick={onClear} style={styles.clearBtn}><FaTrash /> Clear All</button>
    </div>
    <h1 style={styles.sectionTitle}>Recent Scans</h1>
    <div style={styles.historyList}>
      {history.length === 0 && <p style={{textAlign: 'center', color: '#94a3b8'}}>No history found.</p>}
      {history.map((item, index) => (
        <div key={index} style={styles.historyItem} onClick={() => onView(item)}>
          <div style={{...styles.statusDot, backgroundColor: item.score >= 80 ? '#2ecc71' : item.score >= 50 ? '#f1c40f' : '#e74c3c'}} />
          <div style={{flex: 1}}>
            <h4 style={{margin: 0}}>{item.categoryName} Analysis</h4>
            <small>{item.date} • Score: {item.score}</small>
          </div>
          <FaFileAlt color="#cbd5e0" size={20} />
        </div>
      ))}
    </div>
  </div>
);

const styles = {
  appWrapper: { minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Inter', sans-serif", color: '#1e293b' },
  navBar: { display: 'flex', justifyContent: 'space-between', padding: '15px 80px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 },
  logo: { display: 'flex', alignItems: 'center', fontSize: '22px', fontWeight: '800', cursor: 'pointer' },
  navLink: { background: 'none', border: 'none', fontSize: '16px', fontWeight: '600', cursor: 'pointer', color: '#64748b' },
  navHistoryBtn: { padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  mainContent: { padding: '40px 80px' },
  centerContainer: { maxWidth: '800px', margin: '0 auto' },
  heroText: { fontSize: '36px', textAlign: 'center', marginBottom: '40px', fontWeight: '800' },
  laptopGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' },
  megaCard: { backgroundColor: 'white', padding: '40px 20px', borderRadius: '24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  megaIcon: { width: '70px', height: '70px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '30px', margin: '0 auto 20px' },
  scanCard: { backgroundColor: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  uploadSection: { margin: '20px 0' },
  dropZone: { border: '2px dashed #cbd5e0', padding: '40px', borderRadius: '20px', backgroundColor: '#f8fafc', position: 'relative' },
  fullPreview: { maxWidth: '100%', maxHeight: '250px', borderRadius: '12px', marginBottom: '15px' },
  cameraBox: { backgroundColor: '#000', borderRadius: '20px', overflow: 'hidden', padding: '10px' },
  videoStream: { width: '100%', borderRadius: '12px' },
  captureBtn: { width: '100%', padding: '12px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '10px', marginTop: '10px', fontWeight: 'bold', cursor: 'pointer' },
  cancelBtn: { background: 'none', color: 'white', border: 'none', marginTop: '10px', cursor: 'pointer', opacity: 0.8 },
  mainDetectBtn: { width: '100%', padding: '18px', borderRadius: '14px', border: 'none', color: 'white', fontSize: '18px', fontWeight: '700', cursor: 'pointer' },
  secondaryBtn: { padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e0', background: 'white', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' },
  fullReportContainer: { maxWidth: '1100px', margin: '0 auto' },
  reportHeader: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
  laptopTitle: { fontSize: '28px', fontWeight: '800' },
  reportGrid: { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px' },
  reportSide: { display: 'flex', flexDirection: 'column', gap: '20px' },
  scoreCardLarge: { backgroundColor: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', border: '6px solid', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  hugeScore: { fontSize: '80px', fontWeight: '900', display: 'block', lineHeight: 1 },
  riskBadge: { display: 'inline-block', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', marginTop: '15px', fontSize: '14px' },
  alertBox: { backgroundColor: '#fff1f2', padding: '25px', borderRadius: '20px', border: '1px solid #fecdd3' },
  smallReason: { fontSize: '13px', color: '#991b1b', marginTop: '8px', fontStyle: 'italic' },
  reportMain: { display: 'flex', flexDirection: 'column', gap: '20px' },
  ingredientSection: { backgroundColor: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  riskGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' },
  ingTagRed: { padding: '10px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '10px', marginBottom: '8px', borderLeft: '4px solid #ef4444', fontSize: '14px' },
  ingTagGreen: { padding: '10px', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '10px', marginBottom: '8px', borderLeft: '4px solid #22c55e', fontSize: '14px' },
  alternativesSection: { backgroundColor: '#f0fdf4', padding: '30px', borderRadius: '24px', border: '1px solid #bbf7d0' },
  altGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' },
  altCardFull: { backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' },
  backButton: { background: 'none', border: 'none', color: '#64748b', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' },
  historyItem: { backgroundColor: 'white', padding: '15px', borderRadius: '16px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #e2e8f0' },
  statusDot: { width: '10px', height: '10px', borderRadius: '50%' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  clearBtn: { border: 'none', background: 'none', color: '#e11d48', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' },
  fileInput: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' },
  sectionTitle: { fontSize: '24px', fontWeight: '800', marginBottom: '20px' }
};

export default App;