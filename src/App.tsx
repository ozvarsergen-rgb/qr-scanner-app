import { useState, useRef } from 'react'
import QrScanner from 'qr-scanner'
import './App.css'

function App() {
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)

  const startScan = async () => {
    if (!videoRef.current) return

    try {
      setError('')
      setIsScanning(true)
      
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR okundu:', result.data)
          setResult(result.data)
          setIsScanning(false)
          scannerRef.current?.stop()
          
          // Otomatik aç
          openUrl(result.data)
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true
        }
      )
      
      await scannerRef.current.start()
    } catch (err) {
      console.error('Hata:', err)
      setError('Kamera erişimi sağlanamadı')
      setIsScanning(false)
    }
  }

  const stopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.stop()
    }
    setIsScanning(false)
  }

  const openUrl = (url: string) => {
    try {
      let cleanUrl = url.trim()
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl
      }
      window.open(cleanUrl, '_blank')
    } catch (error) {
      console.error('URL açma hatası:', error)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>QR Kod Okuyucu</h1>
        
        <div className="video-wrapper">
          <video ref={videoRef} className="video" />
          {!isScanning && (
            <div className="placeholder">
              <p>QR kodu okumak için başlat butonuna basın</p>
            </div>
          )}
        </div>

        <div className="controls">
          {!isScanning ? (
            <button onClick={startScan} className="btn btn-primary">
              Taramayı Başlat
            </button>
          ) : (
            <button onClick={stopScan} className="btn btn-danger">
              Taramayı Durdur
            </button>
          )}
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {result && (
          <div className="result">
            <h3>Okunan QR Kod:</h3>
            <p>{result}</p>
            <p className="success">QR kod otomatik olarak açıldı!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App