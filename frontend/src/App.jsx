import ScanPage from "./pages/ScanPage"

function App() {
  return (
    <div style={styles.appContainer}>
      <div style={styles.header}>
        <h1 style={styles.title}>WhatIContain</h1>
        <p style={styles.subtitle}>
          Scan. Analyze. Know what’s inside.
        </p>
      </div>

      <ScanPage />
    </div>
  )
}

const styles = {
  appContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #e8fdf5, #ffffff)",
    padding: "20px"
  },
  header: {
    textAlign: "center",
    marginBottom: "30px"
  },
  title: {
    fontSize: "40px",
    fontWeight: "bold",
    color: "#2ecc71",
    marginBottom: "10px"
  },
  subtitle: {
    fontSize: "16px",
    color: "#555"
  }
}

export default App