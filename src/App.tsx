import { useState, useEffect, useRef } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
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
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
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

    // Initialize ZXing reader
    readerRef.current = new BrowserMultiFormatReader()

    return () => {
      if (readerRef.current) {
        readerRef.current.reset()
      }
    }
  }, [])

  const detectContentType = (text: string): ScanResult['type'] => {
    if (text.startsWith('http://') || text.startsWith('https://')) {
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
      
      // QR kod tarama başlat
      await readerRef.current!.decodeFromVideoDevice(null, videoRef.current, (result, error) => {
        if (result) {
          console.log('QR kod okundu:', result.getText())
          const text = result.getText()
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
          readerRef.current?.reset()
          stream.getTracks().forEach(track => track.stop())
        }
        if (error && !(error instanceof NotFoundException)) {
          console.log('QR kod bulunamadı:', error)
        }
      })
      
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
    if (readerRef.current) {
      readerRef.current.reset()
    }
    
    // Video stream'i durdur
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
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
    window.open(url, '_blank')
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
                      {result.text.startsWith('http') && (
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