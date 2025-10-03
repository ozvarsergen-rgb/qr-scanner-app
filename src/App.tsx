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

  const showBarcodeInfo = async (codeText: string, format: string) => {
    // Barkod format bilgileri
    const barcodeInfo = {
      'EAN_13': 'Ürün Barkodu (EAN-13)',
      'UPC_A': 'Ürün Barkodu (UPC-A)', 
      'CODE_128': 'Stok Kodu (Code 128)',
      'CODE_39': 'Ürün Kodu (Code 39)'
    }
    
    const formatName = barcodeInfo[format as keyof typeof barcodeInfo] || format
    
    try {
      // Ürün bilgilerini API'den al
      const productInfo = await getProductInfo(codeText)
      
      if (productInfo) {
        const name = productInfo.name || 'Bilinmeyen Ürün'
        const brand = productInfo.brand || 'Bilinmeyen Marka'
        const category = productInfo.category || 'Bilinmeyen Kategori'
        const source = productInfo.source || 'Bilinmeyen Kaynak'
        
        alert(`📦 Ürün Bulundu!\n\nÜrün: ${name}\nMarka: ${brand}\nKategori: ${category}\n\nKaynak: ${source}`)
      } else {
        alert(`📦 Barkod Okundu!\n\nKod: ${codeText}\nFormat: ${formatName}\n\nÜrün bilgileri bulunamadı.`)
      }
    } catch (error) {
      console.error('Ürün bilgisi alınamadı:', error)
      alert(`📦 Barkod Okundu!\n\nKod: ${codeText}\nFormat: ${formatName}\n\nÜrün bilgileri alınamadı.`)
    }
  }

  const getProductInfo = async (barcode: string) => {
    try {
      // 1. Open Food Facts API (ücretsiz)
      const openFoodFacts = await fetchOpenFoodFacts(barcode)
      if (openFoodFacts) return openFoodFacts
      
      // 2. Barcode Lookup API (ücretsiz)
      const barcodeLookup = await fetchBarcodeLookup(barcode)
      if (barcodeLookup) return barcodeLookup
      
      // 3. UPC Database API (ücretsiz)
      const upcDatabase = await fetchUPCDatabase(barcode)
      if (upcDatabase) return upcDatabase
      
      return null
    } catch (error) {
      console.error('API hatası:', error)
      return null
    }
  }

  const fetchOpenFoodFacts = async (barcode: string) => {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      const data = await response.json()
      
      if (data.status === 1 && data.product) {
        const product = data.product
        return {
          name: product.product_name || null,
          brand: product.brands || null,
          category: product.categories || null,
          image: product.image_url || null,
          source: 'Open Food Facts'
        }
      }
      return null
    } catch (error) {
      console.error('Open Food Facts API hatası:', error)
      return null
    }
  }

  const fetchBarcodeLookup = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.barcodelookup.com/v3/products?barcode=${barcode}&formatted=y&key=demo`)
      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0]
        return {
          name: product.title || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.images?.[0] || null,
          source: 'Barcode Lookup'
        }
      }
      return null
    } catch (error) {
      console.error('Barcode Lookup API hatası:', error)
      return null
    }
  }

  const fetchUPCDatabase = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`)
      const data = await response.json()
      
      if (data.items && data.items.length > 0) {
        const product = data.items[0]
        return {
          name: product.title || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.images?.[0] || null,
          source: 'UPC Database'
        }
      }
      return null
    } catch (error) {
      console.error('UPC Database API hatası:', error)
      return null
    }
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