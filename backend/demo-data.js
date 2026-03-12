// Demo Data for Fahamu Shamba MVP
// Contains sample crops, soil data, weather, and market prices

export const demoData = {
  // Crop suitability rules based on soil type, rainfall, and season
  // IMPROVED: Multiple rules per crop with budget and farm size constraints
  cropRules: [
    // ============================================
    // MAIZE - Multiple conditions with varying confidence
    // ============================================
    {
      name: 'Maize',
      conditions: { subcounty: 'bondo', soil: 'loam', season: 'long_rains' },
      confidence: 95,
      budgetRange: { min: 5000, max: 999999 },
      farmSizeRange: { min: 2, max: 999 },
      reasons: {
        english: 'Loam soil in Bondo has excellent drainage and fertility. Long rains provide adequate moisture.',
        swahili: 'Udongo wa tanuri hapa Bondo una usambazaji nzuri na uzalifu. Mvua nyingi inatoa maji yanayofaa.',
        luo: 'Tongo ber ka Bondo e nyadhiewo nzuri gi uzalifu. Piny nyonj ichielo pi moyaa mabeyo.'
      },
      yieldRange: '2.5-4.2 tons/ha',
      inputs: 'NPK 17:17:17, improved seed, mulching',
      waterReq: 'High (600-800mm)',
      plantingWindow: 'March-April',
      marketPrice: 65,
      risk: 'Low'
    },
    {
      name: 'Maize',
      conditions: { subcounty: 'bondo', soil: 'loam', season: 'long_rains' },
      confidence: 75,
      budgetRange: { min: 3000, max: 5000 },
      farmSizeRange: { min: 1, max: 2 },
      reasons: {
        english: 'Suitable for Maize with loam soil, but budget is tight. Use lower-cost input options.',
        swahili: 'Inafaa kwa mahindi lakini bajeti ni ndogo. Tumia matumizi yenye bei nafuu.',
        luo: 'Nyaka mahindi to pesa mokwongo. Pogo gigir moringo.'
      },
      yieldRange: '1.8-3.0 tons/ha',
      inputs: 'DAP fertilizer, improved seed, minimal mulch',
      waterReq: 'High (600-800mm)',
      plantingWindow: 'March-April',
      marketPrice: 65,
      risk: 'Medium'
    },
    {
      name: 'Maize',
      conditions: { subcounty: 'yala', soil: 'sandy', season: 'dry' },
      confidence: 35,
      budgetRange: { min: 3000, max: 999999 },
      farmSizeRange: { min: 1.5, max: 999 },
      reasons: {
        english: 'Not ideal for Maize due to sandy soil and dry season. Consider Sorghum or Cassava instead.',
        swahili: 'Si bora kwa mahindi kutokana na udongo mchanga na msimu wa joto. Fikiria Sorghum badala.',
        luo: 'Mahindi ok e ndalo kwo gi tongo anyong. Pogo Bel ambo Cassava.'
      },
      yieldRange: '0.8-1.5 tons/ha',
      inputs: 'Minimal inputs, stress-tolerant variety',
      waterReq: 'High (600-800mm)',
      plantingWindow: 'May-June',
      marketPrice: 65,
      risk: 'High'
    },
    // ============================================
    // BEANS
    // ============================================
    {
      name: 'Beans',
      conditions: { subcounty: 'bondo', soil: 'loam', season: 'short_rains' },
      confidence: 92,
      budgetRange: { min: 2000, max: 999999 },
      farmSizeRange: { min: 1, max: 999 },
      reasons: {
        english: 'Beans thrive in loam soil with short rains providing adequate moisture.',
        swahili: 'Maharagwe yanafaa katika udongo wa tanuri na mvua fupi inatoa kiangazi.',
        luo: 'Maharagwe dhi nzuri e tongo ber gi piny machon.'
      },
      yieldRange: '1.2-2.0 tons/ha',
      inputs: 'DAP, improved bean seeds, fungicide for rust',
      waterReq: 'Moderate (400-600mm)',
      plantingWindow: 'September-October',
      marketPrice: 85,
      risk: 'Low'
    },
    {
      name: 'Beans',
      conditions: { subcounty: 'ugunja', soil: 'sandy', season: 'long_rains' },
      confidence: 75,
      budgetRange: { min: 1500, max: 999999 },
      farmSizeRange: { min: 0.5, max: 999 },
      reasons: {
        english: 'Good option for sandy soils with adequate drainage. Short cycle crop fits tight budgets.',
        swahili: 'Chaguo nzuri kwa udongo mchanga. Muhimu kwa bajeti ndogo.',
        luo: 'Nyaka maharagwe e tongo anyong gi pesa mokwongo.'
      },
      yieldRange: '0.8-1.4 tons/ha',
      inputs: 'Basic DAP, local bean seed',
      waterReq: 'Moderate (400-600mm)',
      plantingWindow: 'March-April',
      marketPrice: 85,
      risk: 'Medium'
    },
    // ============================================
    // RICE
    // ============================================
    {
      name: 'Rice',
      conditions: { subcounty: 'bondo', soil: 'clay', season: 'long_rains' },
      confidence: 93,
      budgetRange: { min: 4000, max: 999999 },
      farmSizeRange: { min: 1, max: 999 },
      reasons: {
        english: 'Bondo\'s clay soil and water retention is perfect for rice cultivation.',
        swahili: 'Ardhi ya udongo mfinyanzi na kuakiba maji inawezesha ukulima wa wali vizuri.',
        luo: 'Lowo mar Tongo kod ngai mar kano pi kuom ndalo mathoth nyalo konyo jopur e pidho mchele'
      },
      yieldRange: '3.0-5.5 tons/ha',
      inputs: 'NPK, urea, quality rice seed, fungicide',
      waterReq: 'Very High (900-1200mm)',
      plantingWindow: 'April-May',
      marketPrice: 120,
      risk: 'Medium'
    },
    // ============================================
    // SORGHUM
    // ============================================
    {
      name: 'Sorghum',
      conditions: { subcounty: 'alego', soil: 'sandy', season: 'short_rains' },
      confidence: 94,
      budgetRange: { min: 1500, max: 999999 },
      farmSizeRange: { min: 1, max: 999 },
      reasons: {
        english: 'Sorghum is drought-tolerant and ideal for sandy Alego soils.',
        swahili: 'Mahindi ya kumimina yana uvumilivu wa ukame na bora kwa udongo mchanga.',
        luo: 'Bel nyalo bet e horo kuom ndalo mathoth e lop kuoyo mantie Alego.'
      },
      yieldRange: '1.8-3.2 tons/ha',
      inputs: 'CAN, improved sorghum seed',
      waterReq: 'Low-Medium (400-600mm)',
      plantingWindow: 'October-November',
      marketPrice: 95,
      risk: 'Low'
    },
    {
      name: 'Sorghum',
      conditions: { subcounty: 'yala', soil: 'sandy', season: 'dry' },
      confidence: 85,
      budgetRange: { min: 1000, max: 999999 },
      farmSizeRange: { min: 1, max: 999 },
      reasons: {
        english: 'Best option for dry season. Requires minimal water and inputs.',
        swahili: 'Chaguo bora kwa msimu wa joto. Inahitaji maji kidogo na matumizi kidogo.',
        luo: 'Bel nyaka e msimu kwo. Piny gi sigara mokwongo.'
      },
      yieldRange: '1.2-2.2 tons/ha',
      inputs: 'Minimal - CAN fertilizer only',
      waterReq: 'Low (300-400mm)',
      plantingWindow: 'November-December',
      marketPrice: 95,
      risk: 'Low'
    },
    // ============================================
    // GROUNDNUTS
    // ============================================
    {
      name: 'Groundnuts',
      conditions: { subcounty: 'ugunja', soil: 'sandy', season: 'long_rains' },
      confidence: 91,
      budgetRange: { min: 2000, max: 999999 },
      farmSizeRange: { min: 1, max: 999 },
      reasons: {
        english: 'Sandy soil drains well for groundnut crops. Long rains support growth.',
        swahili: 'Udongo mchanga una usambazaji nzuri kwa ndani na mvua nyingi inasaidia.',
        luo: 'Tongo anyong e nzuri kuom ndalo nzigu gi piny nyonj.'
      },
      yieldRange: '1.5-2.8 tons/ha',
      inputs: 'Single Super Phosphate, groundnut seed, lime',
      waterReq: 'Moderate (500-700mm)',
      plantingWindow: 'March-May',
      marketPrice: 110,
      risk: 'Low'
    },
    // ============================================
    // CASSAVA
    // ============================================
    {
      name: 'Cassava',
      conditions: { subcounty: 'yala', soil: 'sandy', season: 'dry' },
      confidence: 88,
      budgetRange: { min: 2000, max: 999999 },
      farmSizeRange: { min: 2, max: 999 },
      reasons: {
        english: 'Cassava tolerates poor soils and drought. Sandy Yala is suitable.',
        swahili: 'Cassava iuvumilivu sana na inataka kumimina kwa ardhi dhaifu.',
        luo: 'Cassava ei nzuri e tongo anyong kule Yala gi kwo.'
      },
      yieldRange: '8-15 tons/ha',
      inputs: 'Quality cassava cuttings, mulching, minimal fertilizer',
      waterReq: 'Low-Medium (400-600mm)',
      plantingWindow: 'May-July',
      marketPrice: 35,
      risk: 'Low'
    },
    // ============================================
    // SWEET POTATOES
    // ============================================
    {
      name: 'Sweet Potatoes',
      conditions: { subcounty: 'gem', soil: 'loam', season: 'long_rains' },
      confidence: 90,
      budgetRange: { min: 2000, max: 999999 },
      farmSizeRange: { min: 1, max: 999 },
      reasons: {
        english: 'Sweet potatoes grow well in loam soil with long rains.',
        swahili: 'Viazi vya sukari vinakua vizuri katika udongo wa tanuri na mvua nyingi.',
        luo: 'Viazi sweet ei nzuri e tongo ber gi piny nyonj.'
      },
      yieldRange: '12-20 tons/ha',
      inputs: 'Quality seed vines, manure, mulch',
      waterReq: 'Moderate-High (600-800mm)',
      plantingWindow: 'March-April',
      marketPrice: 40,
      risk: 'Low'
    },
    // ============================================
    // TOMATOES
    // ============================================
    {
      name: 'Tomatoes',
      conditions: { subcounty: 'bondo', soil: 'loam', season: 'long_rains' },
      confidence: 85,
      budgetRange: { min: 3000, max: 999999 },
      farmSizeRange: { min: 0.5, max: 2 },
      reasons: {
        english: 'Tomatoes benefit from loam soil drainage and long rains.',
        swahili: 'Matunda ya nyanya yanakaa vizuri katika udongo wa tanuri.',
        luo: 'Nyanya dhi nzuri e tongo ber kuom bondo.'
      },
      yieldRange: '15-25 tons/ha',
      inputs: 'NPK, potassium, quality seed, stakes, fungicide',
      waterReq: 'Moderate-High (600-800mm)',
      plantingWindow: 'February-March',
      marketPrice: 75,
      risk: 'Medium'
    },
    // ============================================
    // NEW CROPS FOR SIAYA
    // ============================================
    {
      name: 'Kales',
      conditions: { subcounty: 'bondo', soil: 'loam', season: 'long_rains' },
      confidence: 88,
      budgetRange: { min: 1000, max: 999999 },
      farmSizeRange: { min: 0.25, max: 999 },
      reasons: {
        english: 'Kales grow fast in loam soil. High value crop for small farms.',
        swahili: 'Kales hukua haraka katika udongo mzuri. Uzalishaji wa juu kwa ardhi ndogo.',
        luo: 'Sukuma wiki hukaa haraka e tongo ber. Pesa nzuri e banda."'
      },
      yieldRange: '20-30 tons/ha',
      inputs: 'Compost, DAP, minimal pesticides',
      waterReq: 'Moderate (400-500mm)',
      plantingWindow: 'Year-round possible',
      marketPrice: 50,
      risk: 'Low'
    },
    {
      name: 'Cowpeas',
      conditions: { subcounty: 'alego', soil: 'sandy', season: 'short_rains' },
      confidence: 87,
      budgetRange: { min: 1500, max: 999999 },
      farmSizeRange: { min: 1, max: 999 },
      reasons: {
        english: 'Nitrogen-fixing legume ideal for poor sandy soils in short rains.',
        swahili: 'Maharagwe ya jivu ni bora kwa udongo mchanga na mvua fupi.',
        luo: 'Maharagwe mochep nyaka kwe e tongo anyong gi piny machon.'
      },
      yieldRange: '1.2-2.0 tons/ha',
      inputs: 'Minimal fertilizer, Cowpea seed',
      waterReq: 'Low-Medium (300-500mm)',
      plantingWindow: 'August-September',
      marketPrice: 70,
      risk: 'Low'
    },
    {
      name: 'Millet',
      conditions: { subcounty: 'yala', soil: 'sandy', season: 'short_rains' },
      confidence: 82,
      budgetRange: { min: 1000, max: 999999 },
      farmSizeRange: { min: 1, max: 999 },
      reasons: {
        english: 'Extremely drought-tolerant. Minimal inputs needed for poor soils.',
        swahili: 'Uvumilivu wa ukame. Inahitaji matumizi ya chini sana.',
        luo: 'Wimbi nyaka e horo. Sigara mokwongo.'
      },
      yieldRange: '0.8-1.5 tons/ha',
      inputs: 'Millet seed only',
      waterReq: 'Low (250-350mm)',
      plantingWindow: 'September-October',
      marketPrice: 45,
      risk: 'Very Low'
    },
    {
      name: 'Pigeon Peas',
      conditions: { subcounty: 'gem', soil: 'sandy', season: 'long_rains' },
      confidence: 80,
      budgetRange: { min: 1500, max: 999999 },
      farmSizeRange: { min: 1, max: 999 },
      reasons: {
        english: 'Perennial legume. Fixes nitrogen and provides long-term income.',
        swahili: 'Maharagwe ya mwaka. Inataka zaanguni na mapato ya muda mrefu.',
        luo: 'Pigeon pea nyaka e mwaka. Zaanguni gi pesa.' 
      },
      yieldRange: '2.0-3.5 tons/ha',
      inputs: 'Quality pigeon pea seed, minimal fertilizer',
      waterReq: 'Moderate (500-700mm)',
      plantingWindow: 'March-May',
      marketPrice: 65,
      risk: 'Low'
    },
    {
      name: 'Okra',
      conditions: { subcounty: 'bondo', soil: 'loam', season: 'long_rains' },
      confidence: 80,
      budgetRange: { min: 1500, max: 999999 },
      farmSizeRange: { min: 0.25, max: 999 },
      reasons: {
        english: 'High-value vegetable for small farms. Good market demand.',
        swahili: 'Kiazi cha ajabu cha bei juu. Mahitaji ya soko mazuri.',
        luo: 'Okra pesa nzuri. Dani e merkato.'
      },
      yieldRange: '6-10 tons/ha',
      inputs: 'DAP, quality okra seed, compost',
      waterReq: 'Moderate-High (600-800mm)',
      plantingWindow: 'March-April',
      marketPrice: 55,
      risk: 'Low'
    }
  ],

  // Soil data for different sub-counties and types
  soilData: {
    bondo: {
      sandy: { pH: 6.2, nitrogen: 1.2, phosphorus: 8, potassium: 120, organicMatter: 2.1 },
      clay: { pH: 6.8, nitrogen: 2.0, phosphorus: 12, potassium: 180, organicMatter: 3.5 },
      loam: { pH: 6.5, nitrogen: 1.8, phosphorus: 15, potassium: 150, organicMatter: 3.2 }
    },
    ugunja: {
      sandy: { pH: 6.0, nitrogen: 1.0, phosphorus: 6, potassium: 100, organicMatter: 1.8 },
      clay: { pH: 6.6, nitrogen: 1.9, phosphorus: 11, potassium: 170, organicMatter: 3.2 },
      loam: { pH: 6.4, nitrogen: 1.7, phosphorus: 14, potassium: 140, organicMatter: 3.0 }
    },
    yala: {
      sandy: { pH: 5.8, nitrogen: 0.8, phosphorus: 5, potassium: 80, organicMatter: 1.5 },
      clay: { pH: 6.4, nitrogen: 1.7, phosphorus: 10, potassium: 160, organicMatter: 3.0 },
      loam: { pH: 6.2, nitrogen: 1.5, phosphorus: 12, potassium: 130, organicMatter: 2.8 }
    },
    gem: {
      sandy: { pH: 6.1, nitrogen: 1.1, phosphorus: 7, potassium: 110, organicMatter: 2.0 },
      clay: { pH: 6.7, nitrogen: 1.95, phosphorus: 13, potassium: 175, organicMatter: 3.3 },
      loam: { pH: 6.45, nitrogen: 1.75, phosphorus: 16, potassium: 155, organicMatter: 3.1 }
    },
    alego: {
      sandy: { pH: 5.9, nitrogen: 0.9, phosphorus: 5.5, potassium: 90, organicMatter: 1.6 },
      clay: { pH: 6.5, nitrogen: 1.8, phosphorus: 11, potassium: 165, organicMatter: 3.1 },
      loam: { pH: 6.3, nitrogen: 1.6, phosphorus: 13, potassium: 135, organicMatter: 2.9 }
    }
  },

  // Historical weather data (mock)
  weatherData: {
    bondo: {
      long_rains: { rainfall: 750, temperature: 25, humidity: 75 },
      short_rains: { rainfall: 520, temperature: 26, humidity: 70 },
      dry: { rainfall: 100, temperature: 28, humidity: 60 }
    },
    ugunja: {
      long_rains: { rainfall: 680, temperature: 24, humidity: 73 },
      short_rains: { rainfall: 480, temperature: 25, humidity: 68 },
      dry: { rainfall: 90, temperature: 27, humidity: 58 }
    },
    yala: {
      long_rains: { rainfall: 620, temperature: 26, humidity: 72 },
      short_rains: { rainfall: 420, temperature: 27, humidity: 67 },
      dry: { rainfall: 80, temperature: 29, humidity: 55 }
    },
    gem: {
      long_rains: { rainfall: 710, temperature: 25, humidity: 74 },
      short_rains: { rainfall: 500, temperature: 26, humidity: 69 },
      dry: { rainfall: 110, temperature: 28, humidity: 61 }
    },
    alego: {
      long_rains: { rainfall: 600, temperature: 26, humidity: 71 },
      short_rains: { rainfall: 400, temperature: 27, humidity: 66 },
      dry: { rainfall: 70, temperature: 29, humidity: 54 }
    }
  },

  // Market prices for crops (KSh per kg)
  marketPrices: [
    { crop: 'Maize', bondo: 65, ugunja: 68, gem: 66, alego: 63, rarieda: 63, ugenya: 64, trend: 'down', lastUpdated: '2025-12-01' },
    { crop: 'Beans', bondo: 85, ugunja: 82, gem: 84, alego: 86, rarieda: 86, ugenya: 83, trend: 'up', lastUpdated: '2025-12-01' },
    { crop: 'Rice', bondo: 120, ugunja: 118, gem: 119, alego: 122, rarieda: 122, ugenya: 125, trend: 'up', lastUpdated: '2025-12-01' },
    { crop: 'Sorghum', bondo: 95, ugunja: 92, gem: 94, alego: 97, rarieda: 97, ugenya: 98, trend: 'up', lastUpdated: '2025-12-01' },
    { crop: 'Groundnuts', bondo: 110, ugunja: 108, gem: 109, alego: 111, rarieda: 111, ugenya: 112, trend: 'stable', lastUpdated: '2025-12-01' },
    { crop: 'Cassava', bondo: 35, ugunja: 32, gem: 34, alego: 38, rarieda: 38, ugenya: 38, trend: 'stable', lastUpdated: '2025-12-01' },
    { crop: 'Sweet Potatoes', bondo: 40, ugunja: 38, gem: 39, alego: 41, rarieda: 41, ugenya: 42, trend: 'up', lastUpdated: '2025-12-01' },
    { crop: 'Tomatoes', bondo: 75, ugunja: 72, gem: 74, alego: 76, rarieda: 76, ugenya: 78, trend: 'down', lastUpdated: '2025-12-01' },
    { crop: 'Soybean', bondo: 55, ugunja: 53, gem: 54, alego: 56, rarieda: 56, ugenya: 58, trend: 'up', lastUpdated: '2025-12-01' },
    { crop: 'Kales', bondo: 50, ugunja: 48, gem: 49, alego: 51, rarieda: 51, ugenya: 52, trend: 'stable', lastUpdated: '2025-12-01' }
  ],

  // Sample farmers for demo
  sampleFarmers: [
    {
      id: 1,
      phoneNumber: '254712345678',
      name: 'James Ochieng',
      subCounty: 'bondo',
      soilType: 'loam',
      farmSize: 2.5,
      waterSource: 'Rainfall',
      budget: 5000,
      lastRecommendation: 'Maize',
      createdAt: '2025-11-01'
    },
    {
      id: 2,
      phoneNumber: '254723456789',
      name: 'Mary Kipchoge',
      subCounty: 'ugunja',
      soilType: 'sandy',
      farmSize: 1.8,
      waterSource: 'Well',
      budget: 3500,
      lastRecommendation: 'Groundnuts',
      createdAt: '2025-11-05'
    },
    {
      id: 3,
      phoneNumber: '254734567890',
      name: 'Peter Mwangi',
      subCounty: 'yala',
      soilType: 'sandy',
      farmSize: 3.2,
      waterSource: 'Rainfall',
      budget: 8000,
      lastRecommendation: 'Cassava',
      createdAt: '2025-11-10'
    },
    {
      id: 4,
      phoneNumber: '254745678901',
      name: 'Amina Hassan',
      subCounty: 'gem',
      soilType: 'loam',
      farmSize: 2.0,
      waterSource: 'Borehole',
      budget: 4500,
      lastRecommendation: 'Sweet Potatoes',
      createdAt: '2025-11-15'
    },
    {
      id: 5,
      phoneNumber: '254756789012',
      name: 'David Kipketer',
      subCounty: 'alego',
      soilType: 'sandy',
      farmSize: 1.5,
      waterSource: 'Rainfall',
      budget: 2500,
      lastRecommendation: 'Sorghum',
      createdAt: '2025-11-20'
    }
  ]
};

export default demoData;
