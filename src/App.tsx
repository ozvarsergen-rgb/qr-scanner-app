import { useState, useRef } from 'react'
import QrScanner from 'qr-scanner'
import './App.css'

function App() {
  const [isScanning, setIsScanning] = useState(false)
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
          setIsScanning(false)
          scannerRef.current?.stop()
          
          // Hemen yönlendir - gecikme yok
          openUrl(result.data)
        },
        {
          highlightScanRegion: false,
          highlightCodeOutline: false,
          maxScansPerSecond: 3
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
    console.log('Yönlendiriliyor:', url)
    
    // URL'yi temizle
    let cleanUrl = url.trim()
    
    // URL kontrolü ve düzeltme
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl
    }
    
    console.log('Temizlenmiş URL:', cleanUrl)
    
    // Aynı sekmede açma - geri butonu çalışır
    try {
      // Yöntem 1: location.href (geri butonu çalışır)
      window.location.href = cleanUrl
    } catch (error1) {
      console.log('location.href failed, trying location.assign')
      try {
        // Yöntem 2: location.assign (geri butonu çalışır)
        window.location.assign(cleanUrl)
      } catch (error2) {
        console.log('location.assign failed, trying location.replace')
        try {
          // Yöntem 3: location.replace (geri butonu çalışmaz)
          window.location.replace(cleanUrl)
        } catch (error3) {
          console.error('Tüm yönlendirme yöntemleri başarısız:', error3)
          // Son çare: kullanıcıya URL'yi göster
          alert(`QR kod içeriği: ${url}\n\nBu URL'yi kopyalayıp tarayıcıya yapıştırabilirsiniz.`)
        }
      }
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

      </div>
    </div>
  )
}

export default App