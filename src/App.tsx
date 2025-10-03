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
      } catch (error) {
        console.error('Error loading saved results:', error)
      }
    }

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy()
      }
    }
  }, [])

  const detectContentType = (text: string): ScanResult['type'] => {
    if (text.startsWith('http://') || text.startsWith('https://')) {
      return 'url'
    } else if (text.includes('www.') || text.includes('.com') || text.includes('.org') || text.includes('.net')) {
      return 'url'
    } else if (text.includes('@') && text.includes('.')) {
      return 'email'
    } else if (text.startsWith('tel:') || /^\+?[\d\s\-\(\)]+$/.test(text)) {
      return 'phone'
    } else if (text.startsWith('WIFI:')) {
      return 'wifi'
    } else {
      return 'text'
    }
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
      
      // QR Scanner'ı başlat
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR kod okundu:', result.data)
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
    
    setIsScanning(false)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Panoya kopyalandı!')
    } catch (error) {
      console.error('Kopyalama hatası:', error)
      alert('Kopyalama başarısız!')
    }
  }

  const openUrl = (url: string) => {
    try {
      // URL'yi temizle ve doğrula
      let cleanUrl = url.trim()
      
      // http:// veya https:// yoksa ekle
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl
      }
      
      // URL'yi aç
      window.open(cleanUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('URL açma hatası:', error)
      alert('URL açılamadı: ' + url)
    }
  }

  const clearHistory = () => {
    setScanResults([])
    setCurrentResult('')
    localStorage.removeItem('qr-scan-results')
  }

  const getTypeIcon = (type: ScanResult['type']) => {
    switch (type) {
      case 'url':
        return <ExternalLink size={16} />
      case 'email':
        return <Copy size={16} />
      case 'phone':
        return <Copy size={16} />
      case 'wifi':
        return <Copy size={16} />
      default:
        return <Copy size={16} />
    }
  }

  return (
    <div className="app">
      <div className="app-main">
        <header className="header">
          <div className="header-content">
            <QrCode size={32} />
            <h1>QR Kod Okuyucu</h1>
          </div>
        </header>

        <main className="scanner-section">
          <div className="video-container">
            <video
              ref={videoRef}
              className="scanner-video"
              playsInline
              muted
            />
            {!isScanning && (
              <div className="scanner-placeholder">
                <Camera size={48} />
                <p>QR kodu okumak için başlat butonuna basın</p>
              </div>
            )}
          </div>

          <div className="scanner-controls">
            {!isScanning ? (
              <button className="scan-button" onClick={startScanning}>
                <Camera size={20} />
                Taramayı Başlat
              </button>
            ) : (
              <button className="scan-button stop" onClick={stopScanning}>
                <Camera size={20} />
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
              <h3>Son Sonuç:</h3>
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
                  {(currentResult.startsWith('http') || currentResult.includes('www.') || currentResult.includes('.com')) && (
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
        </main>

        <section className="history-section">
          <div className="history-header">
            <h2>
              <History size={24} />
              Tarama Geçmişi
            </h2>
            <button className="clear-button" onClick={clearHistory}>
              Temizle
            </button>
          </div>

          {scanResults.length === 0 ? (
            <p className="no-results">Henüz QR kod taraması yapılmadı.</p>
          ) : (
            <div className="results-list">
              {scanResults.map((result) => (
                <div key={result.id} className="result-item">
                  <div className="result-text">
                    {result.text}
                  </div>
                  <div className="result-meta">
                    <span className="result-type">
                      {getTypeIcon(result.type)}
                      {result.type.toUpperCase()}
                    </span>
                    <span className="result-time">
                      {result.timestamp.toLocaleString()}
                    </span>
                    <div className="result-actions">
                      <button 
                        className="action-button small"
                        onClick={() => copyToClipboard(result.text)}
                      >
                        <Copy size={14} />
                      </button>
                      {(result.text.startsWith('http') || result.text.includes('www.') || result.text.includes('.com')) && (
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
          )}
        </section>
      </div>
    </div>
  )
}

export default App