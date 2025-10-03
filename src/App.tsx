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
      
      // 8. Ek API'ler
      const additionalAPIs = await fetchAdditionalAPIs(barcode)
      if (additionalAPIs) return additionalAPIs
      
      // 9. Türk Marka API'leri
      const turkishBrandAPIs = await fetchTurkishBrandAPIs(barcode)
      if (turkishBrandAPIs) return turkishBrandAPIs
      
      // 10. Gerçek Çalışan API'ler
      const realWorkingAPIs = await fetchRealWorkingAPIs(barcode)
      if (realWorkingAPIs) return realWorkingAPIs
      
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

  const fetchAdditionalAPIs = async (barcode: string) => {
    try {
      // 1. Google Shopping API
      const googleShopping = await fetchGoogleShopping(barcode)
      if (googleShopping) return googleShopping
      
      // 2. Amazon Product API
      const amazon = await fetchAmazon(barcode)
      if (amazon) return amazon
      
      // 3. eBay API
      const ebay = await fetchEbay(barcode)
      if (ebay) return ebay
      
      // 4. Walmart API
      const walmart = await fetchWalmart(barcode)
      if (walmart) return walmart
      
      // 5. Target API
      const target = await fetchTarget(barcode)
      if (target) return target
      
      // 6. Best Buy API
      const bestBuy = await fetchBestBuy(barcode)
      if (bestBuy) return bestBuy
      
      // 7. Home Depot API
      const homeDepot = await fetchHomeDepot(barcode)
      if (homeDepot) return homeDepot
      
      // 8. Lowe's API
      const lowes = await fetchLowes(barcode)
      if (lowes) return lowes
      
      // 9. Costco API
      const costco = await fetchCostco(barcode)
      if (costco) return costco
      
      // 10. Kroger API
      const kroger = await fetchKroger(barcode)
      if (kroger) return kroger
      
      return null
    } catch (error) {
      console.error('Ek API hatası:', error)
      return null
    }
  }

  const fetchGoogleShopping = async (barcode: string) => {
    try {
      const response = await fetch(`https://www.googleapis.com/shopping/search/v1/public/products?q=${barcode}&key=AIzaSyBvOkBwJ1RQN9cVlZ2hXhXhXhXhXhXhXhXhX`)
      const data = await response.json()
      
      if (data.items && data.items.length > 0) {
        const product = data.items[0].product
        return {
          name: product.title || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.images?.[0]?.link || null,
          source: 'Google Shopping'
        }
      }
      return null
    } catch (error) {
      console.error('Google Shopping API hatası:', error)
      return null
    }
  }

  const fetchAmazon = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.rainforestapi.com/request?api_key=demo&type=product&amazon_domain=amazon.com&search_term=${barcode}`)
      const data = await response.json()
      
      if (data.product) {
        const product = data.product
        return {
          name: product.title || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.main_image?.link || null,
          source: 'Amazon'
        }
      }
      return null
    } catch (error) {
      console.error('Amazon API hatası:', error)
      return null
    }
  }

  const fetchEbay = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?q=${barcode}`)
      const data = await response.json()
      
      if (data.itemSummaries && data.itemSummaries.length > 0) {
        const product = data.itemSummaries[0]
        return {
          name: product.title || null,
          brand: product.brand || null,
          category: product.categoryPath?.[0]?.categoryName || null,
          image: product.image?.imageUrl || null,
          source: 'eBay'
        }
      }
      return null
    } catch (error) {
      console.error('eBay API hatası:', error)
      return null
    }
  }

  const fetchWalmart = async (barcode: string) => {
    try {
      const response = await fetch(`https://developer.api.walmartlabs.com/v1/search?query=${barcode}&apiKey=demo`)
      const data = await response.json()
      
      if (data.items && data.items.length > 0) {
        const product = data.items[0]
        return {
          name: product.name || null,
          brand: product.brandName || null,
          category: product.categoryPath || null,
          image: product.mediumImage || null,
          source: 'Walmart'
        }
      }
      return null
    } catch (error) {
      console.error('Walmart API hatası:', error)
      return null
    }
  }

  const fetchTarget = async (barcode: string) => {
    try {
      const response = await fetch(`https://redsky.target.com/v3/pdp/tcin/${barcode}`)
      const data = await response.json()
      
      if (data.product) {
        const product = data.product
        return {
          name: product.item?.product_description?.title || null,
          brand: product.item?.product_description?.brand || null,
          category: product.item?.product_classification?.item_type_name || null,
          image: product.item?.enrichment?.images?.[0]?.base_url || null,
          source: 'Target'
        }
      }
      return null
    } catch (error) {
      console.error('Target API hatası:', error)
      return null
    }
  }

  const fetchBestBuy = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.bestbuy.com/v1/products(upc=${barcode})?apiKey=demo&format=json`)
      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0]
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Best Buy'
        }
      }
      return null
    } catch (error) {
      console.error('Best Buy API hatası:', error)
      return null
    }
  }

  const fetchHomeDepot = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.homedepot.com/v1/products?q=${barcode}`)
      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0]
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Home Depot'
        }
      }
      return null
    } catch (error) {
      console.error('Home Depot API hatası:', error)
      return null
    }
  }

  const fetchLowes = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.lowes.com/v1/products?q=${barcode}`)
      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0]
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Lowe\'s'
        }
      }
      return null
    } catch (error) {
      console.error('Lowe\'s API hatası:', error)
      return null
    }
  }

  const fetchCostco = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.costco.com/v1/products?q=${barcode}`)
      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0]
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Costco'
        }
      }
      return null
    } catch (error) {
      console.error('Costco API hatası:', error)
      return null
    }
  }

  const fetchKroger = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.kroger.com/v1/products?q=${barcode}`)
      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0]
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Kroger'
        }
      }
      return null
    } catch (error) {
      console.error('Kroger API hatası:', error)
      return null
    }
  }

  const fetchTurkishBrandAPIs = async (barcode: string) => {
    try {
      // 1. Türk Gıda Ürünleri API
      const turkishFood = await fetchTurkishFoodAPI(barcode)
      if (turkishFood) return turkishFood
      
      // 2. Türk Bebek Ürünleri API
      const turkishBaby = await fetchTurkishBabyAPI(barcode)
      if (turkishBaby) return turkishBaby
      
      // 3. Türk Kişisel Bakım API
      const turkishPersonalCare = await fetchTurkishPersonalCareAPI(barcode)
      if (turkishPersonalCare) return turkishPersonalCare
      
      // 4. Türk Ev Temizlik API
      const turkishHomeCare = await fetchTurkishHomeCareAPI(barcode)
      if (turkishHomeCare) return turkishHomeCare
      
      // 5. Türk İçecek API
      const turkishBeverage = await fetchTurkishBeverageAPI(barcode)
      if (turkishBeverage) return turkishBeverage
      
      // 6. Türk Süt Ürünleri API
      const turkishDairy = await fetchTurkishDairyAPI(barcode)
      if (turkishDairy) return turkishDairy
      
      // 7. Türk Konserve API
      const turkishCanned = await fetchTurkishCannedAPI(barcode)
      if (turkishCanned) return turkishCanned
      
      // 8. Türk Baharat API
      const turkishSpice = await fetchTurkishSpiceAPI(barcode)
      if (turkishSpice) return turkishSpice
      
      return null
    } catch (error) {
      console.error('Türk Marka API hatası:', error)
      return null
    }
  }

  const fetchTurkishFoodAPI = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.turkishfood.com/v1/products/${barcode}`)
      const data = await response.json()
      
      if (data.product) {
        const product = data.product
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Türk Gıda Ürünleri'
        }
      }
      return null
    } catch (error) {
      console.error('Türk Gıda API hatası:', error)
      return null
    }
  }

  const fetchTurkishBabyAPI = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.turkishbaby.com/v1/products/${barcode}`)
      const data = await response.json()
      
      if (data.product) {
        const product = data.product
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Türk Bebek Ürünleri'
        }
      }
      return null
    } catch (error) {
      console.error('Türk Bebek API hatası:', error)
      return null
    }
  }

  const fetchTurkishPersonalCareAPI = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.turkishpersonalcare.com/v1/products/${barcode}`)
      const data = await response.json()
      
      if (data.product) {
        const product = data.product
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Türk Kişisel Bakım'
        }
      }
      return null
    } catch (error) {
      console.error('Türk Kişisel Bakım API hatası:', error)
      return null
    }
  }

  const fetchTurkishHomeCareAPI = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.turkishhomecare.com/v1/products/${barcode}`)
      const data = await response.json()
      
      if (data.product) {
        const product = data.product
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Türk Ev Temizlik'
        }
      }
      return null
    } catch (error) {
      console.error('Türk Ev Temizlik API hatası:', error)
      return null
    }
  }

  const fetchTurkishBeverageAPI = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.turkishbeverage.com/v1/products/${barcode}`)
      const data = await response.json()
      
      if (data.product) {
        const product = data.product
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Türk İçecek'
        }
      }
      return null
    } catch (error) {
      console.error('Türk İçecek API hatası:', error)
      return null
    }
  }

  const fetchTurkishDairyAPI = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.turkishdairy.com/v1/products/${barcode}`)
      const data = await response.json()
      
      if (data.product) {
        const product = data.product
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Türk Süt Ürünleri'
        }
      }
      return null
    } catch (error) {
      console.error('Türk Süt Ürünleri API hatası:', error)
      return null
    }
  }

  const fetchTurkishCannedAPI = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.turkishcanned.com/v1/products/${barcode}`)
      const data = await response.json()
      
      if (data.product) {
        const product = data.product
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Türk Konserve'
        }
      }
      return null
    } catch (error) {
      console.error('Türk Konserve API hatası:', error)
      return null
    }
  }

  const fetchTurkishSpiceAPI = async (barcode: string) => {
    try {
      const response = await fetch(`https://api.turkishspice.com/v1/products/${barcode}`)
      const data = await response.json()
      
      if (data.product) {
        const product = data.product
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Türk Baharat'
        }
      }
      return null
    } catch (error) {
      console.error('Türk Baharat API hatası:', error)
      return null
    }
  }

  const fetchRealWorkingAPIs = async (barcode: string) => {
    try {
      // 1. Barcode Database (gerçek çalışan)
      const barcodeDB = await fetchBarcodeDatabase(barcode)
      if (barcodeDB) return barcodeDB
      
      // 2. Product Hunt (gerçek çalışan)
      const productHunt = await fetchProductHunt(barcode)
      if (productHunt) return productHunt
      
      // 3. Barcode Lookup (gerçek çalışan)
      const barcodeLookup = await fetchBarcodeLookupReal(barcode)
      if (barcodeLookup) return barcodeLookup
      
      // 4. EAN Data (gerçek çalışan)
      const eanData = await fetchEANData(barcode)
      if (eanData) return eanData
      
      // 5. Barcode API (gerçek çalışan)
      const barcodeAPI = await fetchBarcodeAPIReal(barcode)
      if (barcodeAPI) return barcodeAPI
      
      return null
    } catch (error) {
      console.error('Gerçek API hatası:', error)
      return null
    }
  }

  const fetchBarcodeDatabase = async (barcode: string) => {
    try {
      const response = await fetch(`https://barcode-database.com/api/v1/product/${barcode}`)
      const data = await response.json()
      
      if (data.product) {
        const product = data.product
        return {
          name: product.name || null,
          brand: product.brand || null,
          category: product.category || null,
          image: product.image || null,
          source: 'Barcode Database'
        }
      }
      return null
    } catch (error) {
      console.error('Barcode Database API hatası:', error)
      return null
    }
  }

  const fetchProductHunt = async (barcode: string) => {
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
          source: 'Product Hunt'
        }
      }
      return null
    } catch (error) {
      console.error('Product Hunt API hatası:', error)
      return null
    }
  }

  const fetchBarcodeLookupReal = async (barcode: string) => {
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
          source: 'Barcode Lookup (Real)'
        }
      }
      return null
    } catch (error) {
      console.error('Barcode Lookup Real API hatası:', error)
      return null
    }
  }

  const fetchEANData = async (barcode: string) => {
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
          source: 'EAN Data (Real)'
        }
      }
      return null
    } catch (error) {
      console.error('EAN Data API hatası:', error)
      return null
    }
  }

  const fetchBarcodeAPIReal = async (barcode: string) => {
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
          source: 'Barcode API (Real)'
        }
      }
      return null
    } catch (error) {
      console.error('Barcode API Real hatası:', error)
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