// Market Prices API Handler
// Serves weekly crop prices for Siaya County sub-counties

export default function handler(req, res) {
  // Get current week info
  const now = new Date();
  const lastUpdated = now.toISOString().split('T')[0];
  
  // Weekly prices data for Siaya County (all 6 sub-counties)
  // These would be updated weekly via cron job or database
  const weeklyPrices = {
    lastUpdated: lastUpdated,
    prices: [
      {
        crop: "Maize",
        bondo: 65,
        ugunja: 68,
        gem: 66,
        alego: 63,
        rarieda: 63,
        ugenya: 64,
        trend: "down"
      },
      {
        crop: "Beans",
        bondo: 85,
        ugunja: 82,
        gem: 84,
        alego: 86,
        rarieda: 86,
        ugenya: 83,
        trend: "up"
      },
      {
        crop: "Rice",
        bondo: 120,
        ugunja: 118,
        gem: 119,
        alego: 122,
        rarieda: 122,
        ugenya: 125,
        trend: "up"
      },
      {
        crop: "Sorghum",
        bondo: 95,
        ugunja: 92,
        gem: 94,
        alego: 97,
        rarieda: 97,
        ugenya: 98,
        trend: "up"
      },
      {
        crop: "Groundnuts",
        bondo: 110,
        ugunja: 108,
        gem: 109,
        alego: 111,
        rarieda: 111,
        ugenya: 112,
        trend: "stable"
      },
      {
        crop: "Cassava",
        bondo: 35,
        ugunja: 32,
        gem: 34,
        alego: 38,
        rarieda: 38,
        ugenya: 38,
        trend: "stable"
      },
      {
        crop: "Sweet Potatoes",
        bondo: 40,
        ugunja: 38,
        gem: 39,
        alego: 41,
        rarieda: 41,
        ugenya: 42,
        trend: "up"
      },
      {
        crop: "Tomatoes",
        bondo: 75,
        ugunja: 72,
        gem: 74,
        alego: 76,
        rarieda: 76,
        ugenya: 78,
        trend: "down"
      },
      {
        crop: "Soybean",
        bondo: 55,
        ugunja: 53,
        gem: 54,
        alego: 56,
        rarieda: 56,
        ugenya: 58,
        trend: "up"
      }
    ]
  };

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    success: true,
    ...weeklyPrices
  });
}

