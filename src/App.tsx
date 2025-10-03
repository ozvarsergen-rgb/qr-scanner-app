import { useState, useEffect, useRef } from 'react'
import QrScanner from 'qr-scanner'
import { QrCode, Camera, History, Copy, ExternalLink } from 'lucide-react'
import './App.css'

interface ScanResult {
  id: string
  text: string
  timestamp: Date
  type: 'url' | 'text' | 'email' | 'phone' | 'wifi' | 'other'
}

function App() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [currentResult, setCurrentResult] = useState<string>('')
  const [error, setError] = useState<string>('')
  const qrScannerRef = useRef<QrScanner | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Load previous results from localStorage
    const savedResults = localStorage.getItem('qr-scan-results')
    if (savedResults) {
      try {
        const parsed = JSON.parse(savedResults).map((result: any) => ({
          ...result,
          timestamp: new Date(result.timestamp)
        }))
        setScanResults(parsed)
      } catch (e) {
        console.error('Failed to load saved results:', e)
      }
    }

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy()
      }
    }
  }, [])

  const detectContentType = (text: string): ScanResult['type'] => {
    if (text.startsWith('http://') || text.startsWith('https://')) return 'url'
    if (text.includes('@') && text.includes('.')) return 'email'
    if (/^\+?[\d\s\-\(\)]+$/.test(text.replace(/\s/g, ''))) return 'phone'
    if (text.startsWith('WIFI:')) return 'wifi'
    return 'text'
  }

  const startScanning = async () => {
    if (!videoRef.current) return

    try {
      setError('')
      setIsScanning(true)
      
      // Kamera desteği kontrolü
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Bu tarayıcı kamera erişimini desteklemiyor. Lütfen güncel bir tarayıcı kullanın.')
        setIsScanning(false)
        return
      }
      
      // HTTPS kontrolü
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        setError('Kamera erişimi için HTTPS gerekli. Lütfen güvenli bağlantı kullanın.')
        setIsScanning(false)
        return
      }
      
      // Kamera izni iste
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'environment' }, // Arka kamera
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        } 
      })
      
      // Video elementine stream'i bağla
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      
      // QR Scanner'ı başlat
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          const text = result.data
          const newResult: ScanResult = {
            id: Date.now().toString(),
            text,
            timestamp: new Date(),
            type: detectContentType(text)
          }
          
          setCurrentResult(text)
          setScanResults(prev => {
            const updated = [newResult, ...prev]
            localStorage.setItem('qr-scan-results', JSON.stringify(updated))
            return updated
          })
          
          setIsScanning(false)
          qrScannerRef.current?.stop()
          stream.getTracks().forEach(track => track.stop())
        },
        {
          onDecodeError: (error) => {
            // QR kod bulunamadı, taramaya devam et
            console.log('QR kod bulunamadı:', error)
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5
        }
      )
      
      await qrScannerRef.current.start()
      
    } catch (err) {
      console.error('Kamera hatası:', err)
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Kamera izni reddedildi. Lütfen tarayıcı ayarlarından kamera iznini açın.')
        } else if (err.name === 'NotFoundError') {
          setError('Kamera bulunamadı. Lütfen bir kamera bağlı olduğundan emin olun.')
        } else if (err.name === 'NotReadableError') {
          setError('Kamera kullanımda. Lütfen diğer uygulamaları kapatın.')
        } else if (err.name === 'OverconstrainedError') {
          setError('Kamera ayarları desteklenmiyor. Lütfen farklı bir kamera deneyin.')
        } else {
          setError(`Kamera hatası: ${err.message}`)
        }
      } else {
        setError('Kamera erişimi sağlanamadı. Lütfen tarayıcı ayarlarını kontrol edin.')
      }
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
    }
    
    // Video stream'i durdur
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    
    setIsScanning(false)
    setError('')
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Panoya kopyalandı!')
    } catch (err) {
      console.error('Kopyalama hatası:', err)
    }
  }

  const openUrl = (url: string) => {
    window.open(url, '_blank')
  }

  const clearHistory = () => {
    setScanResults([])
    localStorage.removeItem('qr-scan-results')
  }

  const getTypeIcon = (type: ScanResult['type']) => {
    switch (type) {
      case 'url': return <ExternalLink size={16} />
      case 'email': return <span>📧</span>
      case 'phone': return <span>📞</span>
      case 'wifi': return <span>📶</span>
      default: return <span>📄</span>
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <QrCode size={32} />
          <h1>QR Kod Okuyucu</h1>
        </div>
      </header>

      <main className="app-main">
        <div className="scanner-section">
          <div className="video-container">
            <video ref={videoRef} className="scanner-video" />
            {!isScanning && (
              <div className="scanner-placeholder">
                <Camera size={64} />
                <p>QR kodu okumak için başlat butonuna basın</p>
              </div>
            )}
          </div>

          <div className="scanner-controls">
            {!isScanning ? (
              <button 
                className="scan-button start"
                onClick={startScanning}
              >
                <Camera size={20} />
                Taramayı Başlat
              </button>
            ) : (
              <button 
                className="scan-button stop"
                onClick={stopScanning}
              >
                Taramayı Durdur
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {currentResult && (
            <div className="current-result">
              <h3>Sonuç:</h3>
              <div className="result-content">
                <p>{currentResult}</p>
                <div className="result-actions">
                  <button 
                    className="action-button"
                    onClick={() => copyToClipboard(currentResult)}
                  >
                    <Copy size={16} />
                    Kopyala
                  </button>
                  {currentResult.startsWith('http') && (
                    <button 
                      className="action-button"
                      onClick={() => openUrl(currentResult)}
                    >
                      <ExternalLink size={16} />
                      Aç
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {scanResults.length > 0 && (
          <div className="history-section">
            <div className="history-header">
              <h2>
                <History size={20} />
                Tarama Geçmişi
              </h2>
              <button 
                className="clear-button"
                onClick={clearHistory}
              >
                Temizle
              </button>
            </div>

            <div className="results-list">
              {scanResults.map((result) => (
                <div key={result.id} className="result-item">
                  <div className="result-type">
                    {getTypeIcon(result.type)}
                    <span className="type-label">{result.type}</span>
                  </div>
                  <div className="result-text">
                    {result.text}
                  </div>
                  <div className="result-meta">
                    <span className="timestamp">
                      {result.timestamp.toLocaleString('tr-TR')}
                    </span>
                    <div className="result-actions">
                      <button 
                        className="action-button small"
                        onClick={() => copyToClipboard(result.text)}
                      >
                        <Copy size={14} />
                      </button>
                      {result.type === 'url' && (
                        <button 
                          className="action-button small"
                          onClick={() => openUrl(result.text)}
                        >
                          <ExternalLink size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
