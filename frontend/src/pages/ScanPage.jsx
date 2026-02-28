import { useState, useEffect, useRef } from "react";
import { 
  FaCloudUploadAlt, FaLeaf, FaUtensils, FaMedkit, FaBoxOpen, 
  FaArrowLeft, FaHistory, FaTrash, FaExclamationTriangle, 
  FaCheckCircle, FaCamera, FaMicroscope, FaShieldAlt, FaInfoCircle, FaFileAlt
} from "react-icons/fa";

function App() {
  const [view, setView] = useState("dashboard"); // dashboard, scan, report, history
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
      fullData: data // Store full data to re-view from history if needed
    });
    setView("report"); // Switch to full-screen report page
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
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
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
        <p style={styles.subtitle}>Place the product label clearly in the frame</p>

        <div style={styles.uploadSection}>
          {!isCameraOpen ? (
            <div style={styles.dropZone}>
              {preview ? (
                <img src={preview} alt="Preview" style={styles.fullPreview} />
              ) : (
                <FaCloudUploadAlt size={80} color={category.color} />
              )}
              <input type="file" onChange={(e) => {
                setSelectedFile(e.target.files[0]);
                setPreview(URL.createObjectURL(e.target.files[0]));
              }} style={styles.fileInput} />
              <div style={{marginTop: '20px'}}>
                <button onClick={startCamera} style={styles.secondaryBtn}><FaCamera /> Switch to Camera</button>
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
          style={{...styles.mainDetectBtn, backgroundColor: category.color}}
        >
          {loading ? "🔬 Processing with AI..." : "Analyze Product"}
        </button>
      </div>
    </div>
  );
}

// --- SCREEN 2: FULL REPORT PAGE ---
const ReportPage = ({ result, category, onBack }) => {
  if (!result) return null;

  return (
    <div style={styles.fullReportContainer}>
      <div style={styles.reportHeader}>
        <button onClick={onBack} style={styles.backButton}><FaArrowLeft /> Scan Another</button>
        <h1 style={styles.laptopTitle}>Product Safety Report</h1>
      </div>

      <div style={styles.reportGrid}>
        {/* Left Side: Score & Warnings */}
        <div style={styles.reportSide}>
          <div style={{...styles.scoreCardLarge, borderColor: result.safety_score > 70 ? '#2ecc71' : '#e74c3c'}}>
            <span style={styles.hugeScore}>{result.safety_score}</span>
            <p>Overall Safety Score</p>
            <div style={{...styles.riskBadge, backgroundColor: result.overall_product_risk === 'High' ? '#fee2e2' : '#dcfce7', color: result.overall_product_risk === 'High' ? '#b91c1c' : '#15803d'}}>
              {result.overall_product_risk} Risk
            </div>
          </div>

          <div style={styles.alertBox}>
            <h3><FaExclamationTriangle color="#e11d48" /> Critical Warnings</h3>
            <p><strong>Not recommended for:</strong> {result.not_recommended_for.join(", ")}</p>
            <p style={styles.smallReason}>{result.demographic_reasons}</p>
          </div>
        </div>

        {/* Right Side: Ingredients & Alternatives */}
        <div style={styles.reportMain}>
          <div style={styles.ingredientSection}>
            <h3><FaMicroscope /> Ingredient Analysis</h3>
            <div style={styles.riskGrid}>
              <div style={styles.riskColumn}>
                <h4 style={{color: '#e11d48'}}>High Risk</h4>
                {result.high_risk_ingredients.map(i => <div key={i} style={styles.ingTagRed}>{i}</div>)}
              </div>
              <div style={styles.riskColumn}>
                <h4 style={{color: '#059669'}}>Safe / Beneficial</h4>
                {result.low_risk_ingredients.map(i => <div key={i} style={styles.ingTagGreen}>{i}</div>)}
              </div>
            </div>
          </div>

          <div style={styles.alternativesSection}>
            <h3><FaCheckCircle color="#059669" /> Recommended Safer Alternatives</h3>
            <div style={styles.altGrid}>
              {result.safer_alternatives.map((alt, i) => (
                <div key={i} style={styles.altCardFull}>
                  <FaShieldAlt size={24} color="#059669" />
                  <strong>{alt.product_name}</strong>
                  <p>{alt.why_better}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Dashboard Component ---
const Dashboard = ({ onSelect }) => {
  const categories = [
    { id: "cosmetics", title: "Cosmetics", icon: <FaLeaf />, color: "#2ecc71", desc: "Skincare, Haircare & Makeup" },
    { id: "food", title: "Food", icon: <FaUtensils />, color: "#e67e22", desc: "Packaged Foods & Beverages" },
    { id: "healthcare", title: "Healthcare", icon: <FaMedkit />, color: "#e74c3c", desc: "Medicine & Supplements" },
    { id: "processed", title: "Processed Items", icon: <FaBoxOpen />, color: "#3498db", desc: "Household & Chemical Goods" },
  ];

  return (
    <div style={styles.dashboardWrapper}>
      <h1 style={styles.heroText}>What would you like to analyze today?</h1>
      <div style={styles.laptopGrid}>
        {categories.map((cat) => (
          <div key={cat.id} style={styles.megaCard} onClick={() => onSelect(cat)}>
            <div style={{ ...styles.megaIcon, backgroundColor: cat.color }}>{cat.icon}</div>
            <h2>{cat.title}</h2>
            <p>{cat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- History Page ---
const HistoryPage = ({ history, onBack, onView, onClear }) => (
  <div style={styles.centerContainer}>
    <div style={styles.headerRow}>
      <button onClick={onBack} style={styles.backButton}><FaArrowLeft /> Back</button>
      <button onClick={onClear} style={styles.clearBtn}><FaTrash /> Clear History</button>
    </div>
    <h1 style={styles.sectionTitle}>Scan History</h1>
    <div style={styles.historyList}>
      {history.map((item, index) => (
        <div key={index} style={styles.historyItem} onClick={() => onView(item)}>
          <div style={{...styles.statusDot, backgroundColor: item.risk === 'Low' ? '#2ecc71' : '#e74c3c'}} />
          <div style={{flex: 1}}>
            <h4 style={{margin: 0}}>{item.categoryName}</h4>
            <small>{item.date} • Score: {item.score}</small>
          </div>
          <FaFileAlt color="#cbd5e0" size={20} />
        </div>
      ))}
    </div>
  </div>
);

// --- UPDATED LAPTOP STYLES ---
const styles = {
  appWrapper: { minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Inter', sans-serif" },
  navBar: { display: 'flex', justifyContent: 'space-between', padding: '20px 80px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0' },
  logo: { display: 'flex', alignItems: 'center', fontSize: '26px', fontWeight: '800', cursor: 'pointer', color: '#1e293b' },
  navLink: { background: 'none', border: 'none', fontSize: '16px', fontWeight: '600', cursor: 'pointer', color: '#64748b' },
  navHistoryBtn: { padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  
  mainContent: { padding: '40px 80px' },
  centerContainer: { maxWidth: '800px', margin: '0 auto' },
  
  // Dashboard
  heroText: { fontSize: '42px', textAlign: 'center', marginBottom: '50px', color: '#0f172a', fontWeight: '800' },
  laptopGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '25px' },
  megaCard: { backgroundColor: 'white', padding: '50px 30px', borderRadius: '32px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  megaIcon: { width: '90px', height: '90px', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '40px', margin: '0 auto 25px' },

  // Scan Page
  scanCard: { backgroundColor: 'white', padding: '50px', borderRadius: '32px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  uploadSection: { margin: '30px 0' },
  dropZone: { border: '3px dashed #cbd5e0', padding: '40px', borderRadius: '24px', backgroundColor: '#f1f5f9' },
  fullPreview: { maxWidth: '100%', maxHeight: '300px', borderRadius: '16px' },
  cameraBox: { backgroundColor: '#000', borderRadius: '24px', overflow: 'hidden', padding: '10px' },
  videoStream: { width: '100%', borderRadius: '16px' },
  captureBtn: { width: '100%', padding: '15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '12px', marginTop: '10px', fontWeight: 'bold' },
  cancelBtn: { background: 'none', color: 'white', border: 'none', marginTop: '10px', cursor: 'pointer' },
  mainDetectBtn: { width: '100%', padding: '22px', borderRadius: '18px', border: 'none', color: 'white', fontSize: '20px', fontWeight: '800', cursor: 'pointer' },
  secondaryBtn: { padding: '12px 24px', borderRadius: '12px', border: '1px solid #cbd5e0', background: 'white', cursor: 'pointer', fontWeight: '600' },

  // Report Page
  fullReportContainer: { maxWidth: '1200px', margin: '0 auto' },
  reportHeader: { display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '40px' },
  reportGrid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' },
  reportSide: { display: 'flex', flexDirection: 'column', gap: '25px' },
  scoreCardLarge: { backgroundColor: 'white', padding: '50px', borderRadius: '32px', textAlign: 'center', border: '8px solid', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  hugeScore: { fontSize: '100px', fontWeight: '900', display: 'block' },
  riskBadge: { display: 'inline-block', padding: '8px 20px', borderRadius: '30px', fontWeight: 'bold', marginTop: '15px' },
  alertBox: { backgroundColor: '#fff1f2', padding: '30px', borderRadius: '24px', border: '1px solid #fecdd3' },
  reportMain: { display: 'flex', flexDirection: 'column', gap: '25px' },
  ingredientSection: { backgroundColor: 'white', padding: '40px', borderRadius: '32px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  riskGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '20px' },
  ingTagRed: { padding: '12px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '12px', marginBottom: '10px', borderLeft: '5px solid #ef4444', fontWeight: '600' },
  ingTagGreen: { padding: '12px', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '12px', marginBottom: '10px', borderLeft: '5px solid #22c55e', fontWeight: '600' },
  alternativesSection: { backgroundColor: '#f0fdf4', padding: '40px', borderRadius: '32px', border: '1px solid #bbf7d0' },
  altGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' },
  altCardFull: { backgroundColor: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },

  backButton: { background: 'none', border: 'none', color: '#64748b', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' },
  historyItem: { backgroundColor: 'white', padding: '20px', borderRadius: '20px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', border: '1px solid #e2e8f0' },
  statusDot: { width: '12px', height: '12px', borderRadius: '50%' }
};

export default App;