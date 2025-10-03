import { useState, useRef, useEffect } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import './App.css'

function App() {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader()
    
    return () => {
      if (readerRef.current) {
        readerRef.current.reset()
      }
    }
  }, [])

  const startScan = async () => {
    if (!videoRef.current || !readerRef.current) return

    try {
      setError('')
      setIsScanning(true)
      
      await readerRef.current.decodeFromVideoDevice(
        null,
        videoRef.current,
        (result, error) => {
          if (result) {
            console.log('Kod okundu:', result.getText())
            console.log('Kod formatı:', result.getBarcodeFormat())
            setIsScanning(false)
            readerRef.current?.reset()
            
            // QR kod mu barkod mu kontrol et
            const codeText = result.getText()
            const format = result.getBarcodeFormat().toString()
            
            if (format.includes('QR_CODE')) {
              // QR kod - URL'e yönlendir
              openUrl(codeText)
            } else {
              // Barkod - ürün bilgilerini göster
              showBarcodeInfo(codeText, format)
            }
          }
          
          if (error && !(error instanceof NotFoundException)) {
            console.error('Tarama hatası:', error)
            setError('Kod okunamadı, tekrar deneyin')
            setIsScanning(false)
          }
        }
      )
    } catch (err) {
      console.error('Hata:', err)
      setError('Kamera erişimi sağlanamadı')
      setIsScanning(false)
    }
  }

  const stopScan = () => {
    if (readerRef.current) {
      readerRef.current.reset()
    }
    setIsScanning(false)
  }

  const showBarcodeInfo = (codeText: string, format: string) => {
    // Barkod bilgilerini göster
    const barcodeInfo = {
      'EAN_13': 'Ürün Barkodu (EAN-13)',
      'UPC_A': 'Ürün Barkodu (UPC-A)', 
      'CODE_128': 'Stok Kodu (Code 128)',
      'CODE_39': 'Ürün Kodu (Code 39)'
    }
    
    const formatName = barcodeInfo[format as keyof typeof barcodeInfo] || format
    
    alert(`📦 Barkod Okundu!\n\nKod: ${codeText}\nFormat: ${formatName}\n\nBu barkod ürün bilgilerini içerir.`)
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
    
    // Güvenli yönlendirme - geri butonu çalışır
    try {
      // Yöntem 1: location.assign (geri butonu çalışır)
      window.location.assign(cleanUrl)
    } catch (error1) {
      console.log('location.assign failed, trying location.href')
      try {
        // Yöntem 2: location.href (geri butonu çalışır)
        window.location.href = cleanUrl
      } catch (error2) {
        console.log('location.href failed, trying window.open')
        try {
          // Yöntem 3: window.open (yeni sekmede aç)
          window.open(cleanUrl, '_blank', 'noopener,noreferrer')
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
        <h1>QR Kod & Barkod Okuyucu</h1>
        
        <div className="video-wrapper">
          <video ref={videoRef} className="video" />
        </div>
        
        {!isScanning && (
          <div className="instruction-text">
            <p>QR kod veya barkod okumak için başlat butonuna basın</p>
          </div>
        )}

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