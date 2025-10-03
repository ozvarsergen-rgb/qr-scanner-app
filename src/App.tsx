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
            setIsScanning(false)
            readerRef.current?.reset()
            
            const codeText = result.getText()
            
            if (isUrl(codeText)) {
              // QR kod - URL'e yönlendir
              openUrl(codeText)
            } else {
              // Barkod - ürün bilgilerini göster
              showBarcodeInfo(codeText, 'BARKOD')
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

  const isUrl = (text: string) => {
    try {
      new URL(text)
      return true
    } catch {
      return text.startsWith('http://') || text.startsWith('https://')
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
      
      // 4. Barcode API (ücretsiz)
      const barcodeAPI = await fetchBarcodeAPI(barcode)
      if (barcodeAPI) return barcodeAPI
      
      // 5. Product API (ücretsiz)
      const productAPI = await fetchProductAPI(barcode)
      if (productAPI) return productAPI
      
      // 6. EAN Search API (ücretsiz)
      const eanSearch = await fetchEANSearch(barcode)
      if (eanSearch) return eanSearch
      
      // 7. Türkiye API'leri
      const turkishAPIs = await fetchTurkishAPIs(barcode)
      if (turkishAPIs) return turkishAPIs
      
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

  const fetchBarcodeAPI = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.barcodeapi.com/v1/products/${barcode}`)
      const data = await response.json()
      
      if (data.product) {
        const product = data.product
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Barcode API'
        }
      }
      return null
    } catch (error) {
      console.error('Barcode API hatası:', error)
      return null
    }
  }

  const fetchProductAPI = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.producthunt.com/v1/products?barcode=${barcode}`)
      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0]
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image_url || null,
          source: 'Product API'
        }
      }
      return null
    } catch (error) {
      console.error('Product API hatası:', error)
      return null
    }
  }

  const fetchEANSearch = async (barcode: string) => {
    try {
      const response = await fetch(`https://eandata.com/api/v1/product/${barcode}`)
      const data = await response.json()
      
      if (data.product) {
        const product = data.product
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'EAN Search'
        }
      }
      return null
    } catch (error) {
      console.error('EAN Search API hatası:', error)
      return null
    }
  }

  const fetchTurkishAPIs = async (barcode: string) => {
    try {
      // 1. Migros API (Türkiye)
      const migros = await fetchMigrosAPI(barcode)
      if (migros) return migros
      
      // 2. CarrefourSA API (Türkiye)
      const carrefour = await fetchCarrefourAPI(barcode)
      if (carrefour) return carrefour
      
      // 3. A101 API (Türkiye)
      const a101 = await fetchA101API(barcode)
      if (a101) return a101
      
      // 4. BİM API (Türkiye)
      const bim = await fetchBIMAPI(barcode)
      if (bim) return bim
      
      // 5. Şok API (Türkiye)
      const sok = await fetchSokAPI(barcode)
      if (sok) return sok
      
      // 6. Türkiye Ürün Veritabanı
      const turkishDB = await fetchTurkishDB(barcode)
      if (turkishDB) return turkishDB
      
      return null
    } catch (error) {
      console.error('Türk API hatası:', error)
      return null
    }
  }

  const fetchMigrosAPI = async (barcode: string) => {
    try {
      const response = await fetch(`https://www.migros.com.tr/api/products/search?q=${barcode}`)
      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0]
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Migros (Türkiye)'
        }
      }
      return null
    } catch (error) {
      console.error('Migros API hatası:', error)
      return null
    }
  }

  const fetchCarrefourAPI = async (barcode: string) => {
    try {
      const response = await fetch(`https://www.carrefoursa.com/api/products/search?barcode=${barcode}`)
      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0]
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'CarrefourSA (Türkiye)'
        }
      }
      return null
    } catch (error) {
      console.error('CarrefourSA API hatası:', error)
      return null
    }
  }

  const fetchA101API = async (barcode: string) => {
    try {
      const response = await fetch(`https://www.a101.com.tr/api/products/search?barcode=${barcode}`)
      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0]
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'A101 (Türkiye)'
        }
      }
      return null
    } catch (error) {
      console.error('A101 API hatası:', error)
      return null
    }
  }

  const fetchBIMAPI = async (barcode: string) => {
    try {
      const response = await fetch(`https://www.bim.com.tr/api/products/search?barcode=${barcode}`)
      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0]
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'BİM (Türkiye)'
        }
      }
      return null
    } catch (error) {
      console.error('BİM API hatası:', error)
      return null
    }
  }

  const fetchSokAPI = async (barcode: string) => {
    try {
      const response = await fetch(`https://www.sokmarket.com.tr/api/products/search?barcode=${barcode}`)
      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0]
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Şok (Türkiye)'
        }
      }
      return null
    } catch (error) {
      console.error('Şok API hatası:', error)
      return null
    }
  }

  const fetchTurkishDB = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.turkishproducts.com/v1/products/${barcode}`)
      const data = await response.json()
      
      if (data.product) {
        const product = data.product
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Türkiye Ürün Veritabanı'
        }
      }
      return null
    } catch (error) {
      console.error('Türk Veritabanı API hatası:', error)
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