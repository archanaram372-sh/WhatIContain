import { useState, useEffect, useRef } from "react";
import { 
  FaCloudUploadAlt, FaLeaf, FaUtensils, FaMedkit, FaBoxOpen, 
  FaArrowLeft, FaHistory, FaTrash, FaExclamationTriangle, 
  FaCheckCircle, FaCamera, FaMicroscope, FaShieldAlt, FaInfoCircle, FaFileAlt, FaSyncAlt
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
  const [facingMode, setFacingMode] = useState("environment"); 
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async (mode = facingMode) => {
    setIsCameraOpen(true);
    try {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: mode } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera access denied. Please check site permissions.");
      setIsCameraOpen(false);
    }
  };

  const toggleCamera = (e) => {
    e.stopPropagation();
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const capturePhoto = (e) => {
    e.stopPropagation();
    const context = canvasRef.current.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, 640, 480);
    canvasRef.current.toBlob((blob) => {
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      stopCamera();
    }, "image/jpeg");
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
      if (data.error) throw new Error(data.error);
      onSuccess(data);
    } catch (error) {
      alert("Analysis failed: " + error.message);
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
                <div style={{pointerEvents: 'none'}}>
                  <FaCloudUploadAlt size={80} color={category.color} />
                  <p style={{color: '#64748b', marginTop: '10px'}}>Click to upload photo</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={(e) => {
                if(e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                    setPreview(URL.createObjectURL(e.target.files[0]));
                }
              }} style={styles.fileInput} />
              
              <div style={{marginTop: '20px', position: 'relative', zIndex: 10}}>
                <button onClick={(e) => { e.stopPropagation(); startCamera(); }} style={styles.secondaryBtn}>
                  <FaCamera /> Use Live Camera
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.cameraBox}>
              <video ref={videoRef} autoPlay playsInline style={styles.videoStream} />
              <div style={styles.cameraControls}>
                <button onClick={capturePhoto} style={styles.captureBtn}>Capture Photo</button>
                <button onClick={toggleCamera} style={styles.switchBtn}><FaSyncAlt /> Flip Camera</button>
                <button onClick={stopCamera} style={styles.cancelBtn}>Close Camera</button>
              </div>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} width="640" height="480" style={{display: 'none'}} />
        <button 
          onClick={handleDetect} 
          disabled={!selectedFile || loading} 
          style={{...styles.mainDetectBtn, backgroundColor: selectedFile && !loading ? category.color : '#cbd5e0'}}
        >
          {loading ? "🔬 Analyzing Ingredients..." : "Start Analysis"}
        </button>
      </div>
    </div>
  );
}

// --- SCREEN 2: FULL REPORT PAGE ---
const ReportPage = ({ result, category, onBack }) => {
  if (!result) return null;

  const getRiskTheme = (score) => {
    if (score >= 80) return { border: '#2ecc71', bg: '#dcfce7', text: '#15803d' };
    if (score >= 50) return { border: '#f1c40f', bg: '#fef9c3', text: '#854d0e' };
    return { border: '#e74c3c', bg: '#fee2e2', text: '#b91c1c' };
  };

  const theme = getRiskTheme(result.safety_score);

  return (
    <div style={styles.fullReportContainer}>
      <div style={styles.reportHeader}>
        <button onClick={onBack} style={styles.backButton}><FaArrowLeft /> New Scan</button>
        <h1 style={styles.laptopTitle}>{category.title} Safety Report</h1>
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
            <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}><FaExclamationTriangle color="#e11d48" /> Demographic Alert</h3>
            <p><strong>Avoid if:</strong> {result.not_recommended_for.join(", ")}</p>
            <p style={styles.smallReason}>{result.demographic_reasons}</p>
          </div>
        </div>

        <div style={styles.reportMain}>
          <div style={styles.ingredientSection}>
            <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}><FaMicroscope /> Ingredient Deep-Dive</h3>
            <div style={styles.riskGrid}>
              <div style={styles.riskColumn}>
                <h4 style={{color: '#e11d48'}}>Flagged (High Risk)</h4>
                {result.high_risk_ingredients.length > 0 ? 
                  result.high_risk_ingredients.map(i => <div key={i} style={styles.ingTagRed}>{i}</div>) : 
                  <p style={{fontSize: '13px', color: '#94a3b8'}}>No harmful ingredients flagged.</p>
                }
              </div>
              <div style={styles.riskColumn}>
                <h4 style={{color: '#059669'}}>Safe / Low Risk</h4>
                {result.low_risk_ingredients.map(i => <div key={i} style={styles.ingTagGreen}>{i}</div>)}
              </div>
            </div>
          </div>
          <div style={styles.alternativesSection}>
            <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#166534'}}><FaCheckCircle /> Safer Alternatives</h3>
            <div style={styles.altGrid}>
              {result.safer_alternatives.map((alt, i) => (
                <div key={i} style={styles.altCardFull}>
                  <FaShieldAlt size={20} color="#059669" />
                  <div style={{marginTop: '10px'}}>
                    <strong style={{fontSize: '15px'}}>{alt.product_name}</strong>
                    <p style={{fontSize: '13px', color: '#64748b', marginTop: '4px'}}>{alt.why_better}</p>
                  </div>
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
    { id: "processed", title: "Processed", icon: <FaBoxOpen />, color: "#3498db", desc: "Household Chemicals" },
  ];

  return (
    <div style={styles.dashboardWrapper}>
      <h1 style={styles.heroText}>Analyze what's inside.</h1>
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
      {history.length > 0 && <button onClick={onClear} style={styles.clearBtn}><FaTrash /> Clear All</button>}
    </div>
    <h1 style={styles.sectionTitle}>Scan History</h1>
    <div style={styles.historyList}>
      {history.length === 0 ? (
        <div style={{textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '20px'}}>
          <p style={{color: '#94a3b8'}}>No history found yet. Start scanning products!</p>
        </div>
      ) : (
        history.map((item, index) => (
          <div key={index} style={styles.historyItem} onClick={() => onView(item)}>
            <div style={{...styles.statusDot, backgroundColor: item.score >= 80 ? '#2ecc71' : item.score >= 50 ? '#f1c40f' : '#e74c3c'}} />
            <div style={{flex: 1}}>
              <h4 style={{margin: 0}}>{item.categoryName}</h4>
              <small style={{color: '#64748b'}}>{item.date} • Safety Score: {item.score}</small>
            </div>
            <FaFileAlt color="#cbd5e0" size={20} />
          </div>
        ))
      )}
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
  heroText: { fontSize: '42px', textAlign: 'center', marginBottom: '50px', fontWeight: '800', color: '#0f172a' },
  laptopGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' },
  megaCard: { backgroundColor: 'white', padding: '40px 20px', borderRadius: '28px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s ease', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid transparent' },
  megaIcon: { width: '75px', height: '75px', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '32px', margin: '0 auto 24px' },
  scanCard: { backgroundColor: 'white', padding: '40px', borderRadius: '28px', textAlign: 'center', boxShadow: '0 15px 30px -5px rgba(0,0,0,0.05)' },
  uploadSection: { margin: '20px 0' },
  dropZone: { border: '2px dashed #cbd5e0', padding: '50px 30px', borderRadius: '24px', backgroundColor: '#f8fafc', position: 'relative' },
  fullPreview: { maxWidth: '100%', maxHeight: '300px', borderRadius: '16px', marginBottom: '15px', objectFit: 'contain' },
  cameraBox: { backgroundColor: '#000', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  videoStream: { width: '100%', height: 'auto', backgroundColor: '#000' },
  cameraControls: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', backgroundColor: '#0f172a' },
  captureBtn: { width: '100%', padding: '16px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
  switchBtn: { width: '100%', padding: '12px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  cancelBtn: { background: 'none', color: 'rgba(255,255,255,0.6)', border: 'none', padding: '5px', cursor: 'pointer', fontSize: '14px' },
  mainDetectBtn: { width: '100%', padding: '20px', borderRadius: '16px', border: 'none', color: 'white', fontSize: '18px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.2s' },
  secondaryBtn: { padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  fullReportContainer: { maxWidth: '1100px', margin: '0 auto' },
  reportHeader: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
  laptopTitle: { fontSize: '32px', fontWeight: '800' },
  reportGrid: { display: 'grid', gridTemplateColumns: '360px 1fr', gap: '32px' },
  reportSide: { display: 'flex', flexDirection: 'column', gap: '24px' },
  scoreCardLarge: { backgroundColor: 'white', padding: '50px 30px', borderRadius: '28px', textAlign: 'center', border: '8px solid', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
  hugeScore: { fontSize: '90px', fontWeight: '900', display: 'block', lineHeight: 1 },
  riskBadge: { display: 'inline-block', padding: '8px 20px', borderRadius: '24px', fontWeight: 'bold', marginTop: '20px', fontSize: '15px' },
  alertBox: { backgroundColor: '#fff1f2', padding: '30px', borderRadius: '28px', border: '1px solid #fecdd3' },
  smallReason: { fontSize: '14px', color: '#991b1b', marginTop: '10px', fontStyle: 'italic', lineHeight: '1.5' },
  reportMain: { display: 'flex', flexDirection: 'column', gap: '24px' },
  ingredientSection: { backgroundColor: 'white', padding: '35px', borderRadius: '28px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  riskGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '20px' },
  riskColumn: { display: 'flex', flexDirection: 'column', gap: '10px' },
  ingTagRed: { padding: '12px 16px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '12px', borderLeft: '5px solid #ef4444', fontSize: '14px', fontWeight: '500' },
  ingTagGreen: { padding: '12px 16px', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '12px', borderLeft: '5px solid #22c55e', fontSize: '14px', fontWeight: '500' },
  alternativesSection: { backgroundColor: '#f0fdf4', padding: '35px', borderRadius: '28px', border: '1px solid #bbf7d0' },
  altGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' },
  altCardFull: { backgroundColor: 'white', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'flex-start', gap: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  backButton: { background: 'none', border: 'none', color: '#64748b', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' },
  historyItem: { backgroundColor: 'white', padding: '20px', borderRadius: '20px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', border: '1px solid #e2e8f0', transition: 'border-color 0.2s' },
  statusDot: { width: '12px', height: '12px', borderRadius: '50%' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  clearBtn: { border: 'none', background: 'none', color: '#e11d48', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' },
  fileInput: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 1 },
  sectionTitle: { fontSize: '28px', fontWeight: '800', marginBottom: '25px' }
};

export default App;