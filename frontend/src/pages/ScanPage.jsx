import { useState } from "react"
import { FaCloudUploadAlt, FaCamera } from "react-icons/fa"

function ScanPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Upload Product Label</h2>

      <div style={styles.uploadBox}>
        <FaCloudUploadAlt size={50} color="#2ecc71" />
        <h3>Upload Photo</h3>
        <p>Drag & drop or select from gallery</p>

        <label style={styles.galleryButton}>
          Choose from Gallery
          <input
            type="file"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </label>

        {preview && (
          <img
            src={preview}
            alt="preview"
            style={{ marginTop: "15px", width: "100%", borderRadius: "10px" }}
          />
        )}
      </div>

      <p style={{ margin: "20px 0" }}>OR</p>

      <button style={styles.cameraButton}>
        <FaCamera style={{ marginRight: "10px" }} />
        Open Camera
      </button>

      <button
        style={{
          ...styles.detectButton,
          opacity: selectedFile ? 1 : 0.5,
          cursor: selectedFile ? "pointer" : "not-allowed"
        }}
        disabled={!selectedFile}
      >
        Detect Ingredients
      </button>
    </div>
  )
}

const styles = {
  container: {
    textAlign: "center",
    padding: "20px",
    maxWidth: "400px",
    margin: "auto"
  },
  title: {
    marginBottom: "20px"
  },
  uploadBox: {
    border: "2px dashed #2ecc71",
    padding: "30px",
    borderRadius: "15px",
    backgroundColor: "#f9fdfb"
  },
  galleryButton: {
    display: "inline-block",
    marginTop: "15px",
    padding: "10px 20px",
    backgroundColor: "#2ecc71",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer"
  },
  cameraButton: {
    padding: "12px 20px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#ecf0f1",
    cursor: "pointer"
  },
  detectButton: {
    marginTop: "30px",
    width: "100%",
    padding: "15px",
    borderRadius: "30px",
    border: "none",
    backgroundColor: "#2ecc71",
    color: "white",
    fontSize: "18px"
  }
}

export default ScanPage