import { useState, useEffect, useRef } from 'react'
import QrScanner from 'qr-scanner'
import { QrCode, Camera } from 'lucide-react'
import './App.css'

function App() {
  const [isScanning, setIsScanning] = useState(false)
  const [currentResult, setCurrentResult] = useState<string>('')
  const [error, setError] = useState<string>('')
  const qrScannerRef = useRef<QrScanner | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy()
      }
    }
  }, [])

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
          
          setCurrentResult(text)
          setIsScanning(false)
          qrScannerRef.current?.stop()
          
          // Otomatik yönlendirme
          openUrl(text)
        },
        {
          onDecodeError: (error) => {
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
              <h3>Son Okunan QR Kod:</h3>
              <div className="result-content">
                <p>{currentResult}</p>
                <p className="result-note">QR kod otomatik olarak açıldı!</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App