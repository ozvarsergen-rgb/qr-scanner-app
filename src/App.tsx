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
          
          // Hemen yönlendir
          setTimeout(() => {
            openUrl(result.data)
          }, 100)
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
    console.log('Yönlendiriliyor:', url)
    
    // URL'yi temizle
    let cleanUrl = url.trim()
    
    // URL kontrolü ve düzeltme
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl
    }
    
    console.log('Temizlenmiş URL:', cleanUrl)
    
    // Basit yönlendirme - sadece location.href kullan
    try {
      window.location.href = cleanUrl
    } catch (error) {
      console.error('URL açma hatası:', error)
      // Alternatif: kullanıcıya URL'yi göster
      alert(`QR kod içeriği: ${url}\n\nBu URL'yi manuel olarak açabilirsiniz.`)
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
            <p className="success">Yönlendiriliyor...</p>
            <button 
              onClick={() => openUrl(result)} 
              className="btn btn-primary"
              style={{marginTop: '10px'}}
            >
              Manuel Aç
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App