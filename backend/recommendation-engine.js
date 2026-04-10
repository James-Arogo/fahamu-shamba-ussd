import farmInputsData from './farm-inputs-data.js';
import realDataStore from './real-data-store.js';

const DEFAULT_CROP_PROFILES = {
  Maize: {
    soils: ['loam', 'clay loam', 'sandy loam'],
    seasons: ['long_rains', 'short_rains'],
    yieldRange: '2.5-4.5 tons/ha',
    waterReq: 'High (600-800mm)',
    plantingWindow: 'March-April',
    risk: 'Medium',
    budgetRange: { min: 5000, max: 15000 },
    farmSizeRange: { min: 0.25, max: 20 }
  },
  Beans: {
    soils: ['loam', 'sandy loam', 'clay loam'],
    seasons: ['long_rains', 'short_rains'],
    yieldRange: '1.0-2.0 tons/ha',
    waterReq: 'Moderate (400-600mm)',
    plantingWindow: 'March-May',
    risk: 'Low',
    budgetRange: { min: 2000, max: 9000 },
    farmSizeRange: { min: 0.1, max: 10 }
  },
  Rice: {
    soils: ['clay', 'clay loam', 'alluvial'],
    seasons: ['long_rains'],
    yieldRange: '3.0-5.5 tons/ha',
    waterReq: 'Very High (900-1200mm)',
    plantingWindow: 'April-May',
    risk: 'Medium',
    budgetRange: { min: 7000, max: 20000 },
    farmSizeRange: { min: 0.5, max: 20 }
  },
  Sorghum: {
    soils: ['loam', 'sandy loam', 'clay loam'],
    seasons: ['short_rains', 'dry'],
    yieldRange: '1.2-2.5 tons/ha',
    waterReq: 'Low-Medium (300-500mm)',
    plantingWindow: 'September-November',
    risk: 'Low',
    budgetRange: { min: 1500, max: 7000 },
    farmSizeRange: { min: 0.1, max: 20 }
  },
  Groundnuts: {
    soils: ['sandy loam', 'loam'],
    seasons: ['long_rains', 'short_rains'],
    yieldRange: '1.2-2.2 tons/ha',
    waterReq: 'Moderate (500-700mm)',
    plantingWindow: 'March-May',
    risk: 'Low',
    budgetRange: { min: 2500, max: 9000 },
    farmSizeRange: { min: 0.1, max: 8 }
  },
  Cassava: {
    soils: ['sandy loam', 'loam', 'clay loam'],
    seasons: ['long_rains', 'short_rains', 'dry'],
    yieldRange: '12-20 tons/ha',
    waterReq: 'Low-Medium (400-600mm)',
    plantingWindow: 'Flexible planting',
    risk: 'Low',
    budgetRange: { min: 1000, max: 6000 },
    farmSizeRange: { min: 0.1, max: 20 }
  },
  'Sweet Potatoes': {
    soils: ['sandy loam', 'loam'],
    seasons: ['long_rains', 'short_rains'],
    yieldRange: '8-15 tons/ha',
    waterReq: 'Moderate (500-700mm)',
    plantingWindow: 'March-April',
    risk: 'Low',
    budgetRange: { min: 1500, max: 7000 },
    farmSizeRange: { min: 0.1, max: 10 }
  },
  Tomatoes: {
    soils: ['loam', 'sandy loam'],
    seasons: ['long_rains', 'short_rains'],
    yieldRange: '15-25 tons/ha',
    waterReq: 'Moderate-High (600-800mm)',
    plantingWindow: 'February-March',
    risk: 'Medium',
    budgetRange: { min: 6000, max: 20000 },
    farmSizeRange: { min: 0.05, max: 5 }
  },
  Soybean: {
    soils: ['loam', 'clay loam'],
    seasons: ['long_rains', 'short_rains'],
    yieldRange: '1.2-2.0 tons/ha',
    waterReq: 'Moderate (450-650mm)',
    plantingWindow: 'March-April',
    risk: 'Low',
    budgetRange: { min: 2500, max: 9000 },
    farmSizeRange: { min: 0.1, max: 10 }
  },
  Kales: {
    soils: ['loam', 'clay loam'],
    seasons: ['long_rains', 'short_rains', 'dry'],
    yieldRange: '6-10 tons/ha',
    waterReq: 'Moderate-High (600-800mm)',
    plantingWindow: 'Year-round possible',
    risk: 'Low',
    budgetRange: { min: 3000, max: 10000 },
    farmSizeRange: { min: 0.05, max: 3 }
  },
  Millet: {
    soils: ['sandy loam', 'loam'],
    seasons: ['short_rains', 'dry'],
    yieldRange: '0.8-1.5 tons/ha',
    waterReq: 'Low (250-350mm)',
    plantingWindow: 'September-October',
    risk: 'Very Low',
    budgetRange: { min: 1500, max: 6000 },
    farmSizeRange: { min: 0.1, max: 15 }
  },
  Cowpeas: {
    soils: ['sandy loam', 'loam'],
    seasons: ['short_rains', 'dry'],
    yieldRange: '0.8-1.6 tons/ha',
    waterReq: 'Low-Medium (300-500mm)',
    plantingWindow: 'September-October',
    risk: 'Low',
    budgetRange: { min: 1500, max: 6000 },
    farmSizeRange: { min: 0.1, max: 12 }
  },
  'Green Grams': {
    soils: ['sandy loam', 'loam'],
    seasons: ['short_rains', 'dry'],
    yieldRange: '0.7-1.4 tons/ha',
    waterReq: 'Low-Medium (300-500mm)',
    plantingWindow: 'September-October',
    risk: 'Low',
    budgetRange: { min: 1500, max: 6500 },
    farmSizeRange: { min: 0.1, max: 12 }
  }
};

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function capitalizeWords(value) {
  return String(value || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function bucketTemperature(value) {
  if (!Number.isFinite(value)) return 'unknown';
  if (value < 20) return 'cool';
  if (value < 26) return 'moderate';
  return 'hot';
}

function bucketRain(value) {
  if (!Number.isFinite(value)) return 'unknown';
  if (value < 1) return 'none';
  if (value < 5) return 'light';
  if (value < 15) return 'moderate';
  return 'heavy';
}

function bucketHumidity(value) {
  if (!Number.isFinite(value)) return 'unknown';
  if (value < 45) return 'dry';
  if (value < 70) return 'normal';
  return 'humid';
}

class RecommendationEngine {
  constructor() {
    this.cropInputs = farmInputsData.cropInputs;
    this.essentialTools = farmInputsData.essentialTools;
    this.costSavingStrategies = farmInputsData.costSavingStrategies;
  }

  get data() {
    return realDataStore.load();
  }

  getCropCatalog() {
    return Array.from(new Set([
      ...Object.keys(DEFAULT_CROP_PROFILES),
      ...Object.keys(this.cropInputs || {}),
      ...(this.data.cropCatalog || [])
    ]));
  }

  getCropProfile(cropName) {
    return DEFAULT_CROP_PROFILES[cropName] || {
      soils: ['loam', 'sandy loam', 'clay loam'],
      seasons: ['long_rains', 'short_rains'],
      yieldRange: '1.0-3.0 tons/ha',
      waterReq: 'Moderate (400-600mm)',
      plantingWindow: 'Flexible planting',
      risk: 'Medium',
      budgetRange: { min: 2000, max: 10000 },
      farmSizeRange: { min: 0.1, max: 10 }
    };
  }

  getWeatherSummary(subCounty, season = 'long_rains') {
    const subCountyKey = normalizeKey(subCounty);
    const seasonKey = normalizeKey(season);
    return this.data.weatherData?.[subCountyKey]?.[seasonKey] || null;
  }

  getAllWeatherData() {
    return this.data.weatherData || {};
  }

  getSoilAssessment(subCounty, soilType) {
    const subCountyKey = normalizeKey(subCounty);
    const soilTypeKey = normalizeKey(soilType);
    const profile = this.data.soilData?.[subCountyKey]?.[soilTypeKey];
    if (!profile) return null;

    return {
      location: subCounty,
      soilType,
      pH: profile.pH,
      nitrogen: profile.nitrogen,
      phosphorus: profile.phosphorus,
      potassium: profile.potassium,
      organicMatter: profile.organicMatter,
      sampleCount: profile.sampleCount,
      wards: profile.wards,
      targetCrops: profile.targetCrops,
      assessment: this.assessSoilQuality(profile)
    };
  }

  getGeologicalSoilProfile(subCounty) {
    const subCountyKey = normalizeKey(subCounty);
    const soilProfiles = this.data.soilData?.[subCountyKey];
    if (!soilProfiles) return null;

    const entries = Object.entries(soilProfiles).map(([soilType, profile]) => ({
      soilType,
      ...profile,
      qualityScore: this.scoreSoilQuality(profile)
    })).sort((a, b) => b.qualityScore - a.qualityScore);

    if (!entries.length) return null;
    const dominantSoil = entries[0];

    return {
      subCounty,
      lookupSubCounty: subCountyKey,
      source: 'Processed real soil reference',
      dominantSoilType: capitalizeWords(dominantSoil.soilType),
      recommendedSoilType: capitalizeWords(dominantSoil.soilType),
      soilProfiles: entries,
      advisory: dominantSoil.organicMatter < 2.5
        ? 'Organic matter is relatively low. Add compost or manure for better yields.'
        : 'Soil profile is favorable for productive cropping with balanced inputs.'
    };
  }

  scoreSoilQuality(profile) {
    const pHScore = 7 - Math.abs(6.5 - (profile.pH || 6.5));
    return Math.round(((pHScore * 10) + ((profile.nitrogen || 0) * 20) + (profile.phosphorus || 0) + ((profile.potassium || 0) / 10) + ((profile.organicMatter || 0) * 15)) * 10) / 10;
  }

  assessSoilQuality(soilData) {
    const { pH, nitrogen, phosphorus, potassium, organicMatter } = soilData;
    let quality = 'Good';
    const issues = [];

    if (Number.isFinite(pH) && (pH < 6 || pH > 7.5)) {
      issues.push(`pH ${pH} (ideal 6.0-7.0) - adjust with lime or sulfur`);
    }
    if (Number.isFinite(nitrogen) && nitrogen < 1.0) {
      issues.push('Low nitrogen - apply manure or fertilizer');
    }
    if (Number.isFinite(phosphorus) && phosphorus < 10) {
      issues.push('Low phosphorus - apply Single Super Phosphate');
    }
    if (Number.isFinite(potassium) && potassium < 100) {
      issues.push('Low potassium - apply K fertilizer');
    }
    if (Number.isFinite(organicMatter) && organicMatter < 2.5) {
      issues.push('Low organic matter - add compost or manure');
    }

    if (issues.length > 2) quality = 'Poor';
    else if (issues.length > 0) quality = 'Fair';

    return { quality, issues };
  }

  getMarketPricesFeed() {
    return this.data.marketRows || [];
  }

  getMarketPrice(cropName, subCounty) {
    const cropKey = normalizeKey(cropName);
    const subCountyKey = normalizeKey(subCounty);
    const rows = (this.data.marketRows || []).filter((row) =>
      normalizeKey(row.crop) === cropKey && normalizeKey(row.sub_county) === subCountyKey
    );

    const candidateRows = rows.length
      ? rows
      : (this.data.marketRows || []).filter((row) => normalizeKey(row.crop) === cropKey);

    if (!candidateRows.length) return null;

    const ranked = [...candidateRows].sort((a, b) => {
      const aTime = new Date(a.recorded_at).getTime();
      const bTime = new Date(b.recorded_at).getTime();
      return bTime - aTime;
    });

    const best = ranked[0];
    return {
      crop: best.crop,
      market: best.market,
      price: best.price,
      trend: best.trend,
      lastUpdated: best.recorded_at,
      signal: best.signal
    };
  }

  getModelProbability(cropName, features) {
    const model = this.data.model;
    if (!model || !model.classes?.length) return 0;

    const classes = model.classes;
    const scores = {};
    classes.forEach((cls) => {
      const prior = Math.log(model.priors?.[cls] || 1e-9);
      let score = prior;

      (model.features || []).forEach((featureKey) => {
        const value = features[featureKey] || 'unknown';
        const valueCount = model.feature_counts?.[cls]?.[featureKey]?.[value] || 0;
        const classTotal = model.class_counts?.[cls] || 0;
        const vocabSize = model.feature_values?.[featureKey]?.length || 1;
        const likelihood = (valueCount + 1) / (classTotal + vocabSize);
        score += Math.log(likelihood);
      });

      scores[cls] = score;
    });

    const maxScore = Math.max(...Object.values(scores));
    const expScores = Object.fromEntries(
      Object.entries(scores).map(([cls, score]) => [cls, Math.exp(score - maxScore)])
    );
    const total = Object.values(expScores).reduce((sum, value) => sum + value, 0) || 1;
    return (expScores[cropName] || 0) / total;
  }

  buildModelFeatures(subCounty, soilType, season, weather, marketSignal) {
    return {
      sub_county: subCounty || 'unknown',
      season: season || 'unknown',
      soil_type: soilType || 'unknown',
      temperature_bucket: bucketTemperature(Number(weather?.avgTemperature)),
      rain_bucket: bucketRain(Number(weather?.totalRainfall) / 90),
      humidity_bucket: bucketHumidity(Number(weather?.avgHumidity)),
      market_signal: marketSignal || 'unknown'
    };
  }

  getWaterCompatibilityScore(waterReq, waterSource) {
    const sourceRating = {
      Rainfall: { low: 15, medium: 12, high: 5 },
      Well: { low: 12, medium: 15, high: 10 },
      Borehole: { low: 12, medium: 15, high: 15 },
      Irrigation: { low: 13, medium: 15, high: 15 }
    };

    const extractLevel = (req) => {
      if (req.includes('Very High')) return 'high';
      if (req.includes('High')) return 'high';
      if (req.includes('Moderate')) return 'medium';
      return 'low';
    };

    const level = extractLevel(waterReq || 'Moderate');
    const ratings = sourceRating[waterSource] || sourceRating.Rainfall;
    return ratings[level] || 10;
  }

  getBudgetFeasibilityScore(budgetRange, budget) {
    if (!budgetRange) return 3;
    const { min, max } = budgetRange;
    if (budget >= min && budget <= max) return 5;
    if (budget >= min * 0.8 && budget <= max * 1.2) return 3;
    if (budget >= min * 0.5) return 1;
    return 0;
  }

  getFarmSizeScore(cropName, farmSize) {
    const suitability = {
      Maize: { small: 4, medium: 5, large: 4 },
      Beans: { small: 5, medium: 5, large: 4 },
      Rice: { small: 3, medium: 5, large: 5 },
      Sorghum: { small: 5, medium: 5, large: 4 },
      Groundnuts: { small: 5, medium: 5, large: 4 },
      Cassava: { small: 4, medium: 5, large: 5 },
      'Sweet Potatoes': { small: 5, medium: 5, large: 4 },
      Tomatoes: { small: 5, medium: 4, large: 3 },
      Soybean: { small: 4, medium: 5, large: 5 },
      Kales: { small: 5, medium: 4, large: 3 }
    };

    const size = farmSize < 1 ? 'small' : farmSize < 3 ? 'medium' : 'large';
    const scores = suitability[cropName] || { small: 3, medium: 3, large: 3 };
    return scores[size] || 3;
  }

  buildReason(cropName, signals) {
    const parts = [];
    if (signals.soilMatch) parts.push(`matches your ${signals.soilType} soil`);
    if (signals.seasonMatch) parts.push(`fits the ${signals.season.replace('_', ' ')} season`);
    if (signals.marketPrice) parts.push(`has a live market price of KES ${signals.marketPrice.price}/kg`);
    if (signals.modelProbability >= 0.4) parts.push('is strongly supported by the trained model');
    if (signals.localTargetMatch) parts.push('appears in the current location soil reference');
    if (signals.weatherSummary) parts.push('aligns with recent rainfall and temperature patterns');

    const message = parts.length
      ? `${cropName} ${parts.join(', ')}.`
      : `${cropName} remains a practical option for your current farm setup.`;

    return {
      english: message,
      swahili: `${cropName} ni chaguo zuri kwa hali yako ya shamba kwa sasa.`
    };
  }

  scoreCrop(cropName, farmerData) {
    const profile = this.getCropProfile(cropName);
    const weather = this.getWeatherSummary(farmerData.subCounty, farmerData.season);
    const marketPrice = this.getMarketPrice(cropName, farmerData.subCounty);
    const soilAssessment = this.getSoilAssessment(farmerData.subCounty, farmerData.soilType);
    const localTargetMatch = Boolean(
      soilAssessment?.targetCrops?.some((targetCrop) => normalizeKey(targetCrop) === normalizeKey(cropName))
    );

    let score = 20;
    const soilMatch = profile.soils.map(normalizeKey).includes(normalizeKey(farmerData.soilType));
    if (soilMatch) score += 24;

    const seasonMatch = profile.seasons.map(normalizeKey).includes(normalizeKey(farmerData.season));
    if (seasonMatch) score += 18;

    if (weather) {
      score += 8;
      if (Number.isFinite(weather.avgTemperature) && weather.avgTemperature >= 20 && weather.avgTemperature <= 30) score += 5;
      if (Number.isFinite(weather.avgHumidity) && weather.avgHumidity >= 55 && weather.avgHumidity <= 85) score += 4;
      if (Number.isFinite(weather.totalRainfall) && weather.totalRainfall > 150) score += 4;
    }

    if (marketPrice?.price) {
      score += 8;
      if (marketPrice.trend === 'up') score += 6;
      else if (marketPrice.trend === 'stable') score += 4;
      else score += 2;
    }

    if (localTargetMatch) score += 12;

    const modelFeatures = this.buildModelFeatures(
      farmerData.subCounty,
      farmerData.soilType,
      farmerData.season,
      weather,
      marketPrice?.signal
    );
    const modelProbability = this.getModelProbability(cropName, modelFeatures);
    score += Math.round(modelProbability * 18);

    score += this.getWaterCompatibilityScore(profile.waterReq, farmerData.waterSource);
    score += this.getBudgetFeasibilityScore(profile.budgetRange, farmerData.budget);
    score += this.getFarmSizeScore(cropName, farmerData.farmSize);

    if (profile.budgetRange && farmerData.budget < profile.budgetRange.min * 0.5) score -= 20;
    if (profile.farmSizeRange && farmerData.farmSize < profile.farmSizeRange.min) score -= 15;

    const confidence = Math.max(35, Math.min(98, Math.round(score)));
    return {
      name: cropName,
      conditions: {
        soil: farmerData.soilType.toLowerCase(),
        season: farmerData.season.toLowerCase(),
        subcounty: farmerData.subCounty.toLowerCase()
      },
      confidence,
      score: confidence,
      marketPrice,
      yieldRange: profile.yieldRange,
      waterReq: profile.waterReq,
      plantingWindow: profile.plantingWindow,
      risk: profile.risk,
      budgetRange: profile.budgetRange,
      farmSizeRange: profile.farmSizeRange,
      modelProbability: Math.round(modelProbability * 100) / 100,
      reasons: this.buildReason(cropName, {
        soilMatch,
        soilType: farmerData.soilType,
        seasonMatch,
        season: farmerData.season,
        marketPrice,
        modelProbability,
        localTargetMatch,
        weatherSummary: weather
      })
    };
  }

  getRecommendations(farmerData) {
    const normalizedInput = {
      subCounty: capitalizeWords(farmerData.subCounty),
      soilType: String(farmerData.soilType || '').trim().toLowerCase(),
      season: String(farmerData.season || '').trim().toLowerCase(),
      budget: Number(farmerData.budget || 5000),
      farmSize: Number(farmerData.farmSize || 1),
      waterSource: farmerData.waterSource || 'Rainfall'
    };

    const candidates = this.getCropCatalog()
      .map((cropName) => this.scoreCrop(cropName, normalizedInput))
      .sort((a, b) => b.score - a.score);

    const recommendations = candidates.slice(0, 3);
    return {
      recommendations,
      allScores: candidates,
      metadata: {
        timestamp: new Date().toISOString(),
        location: normalizedInput.subCounty,
        soil: normalizedInput.soilType,
        season: normalizedInput.season,
        budget: normalizedInput.budget,
        farmSize: normalizedInput.farmSize,
        modelTrainedAt: this.data.model?.trained_at || null,
        dataLoadedAt: this.data.loadedAt,
        recommendationDiversity: Math.min(100, Math.round((recommendations.length / 3) * 100))
      }
    };
  }

  analyzeFarm(farmerData) {
    const recommendations = this.getRecommendations(farmerData);
    const soilAssessment = this.getSoilAssessment(farmerData.subCounty, farmerData.soilType);
    const weather = this.getWeatherSummary(farmerData.subCounty, farmerData.season);

    return {
      recommendations,
      soilAssessment,
      weather: weather
        ? {
            location: farmerData.subCounty,
            season: farmerData.season,
            ...weather
          }
        : {
            location: farmerData.subCounty,
            season: farmerData.season
          },
      analysis: {
        budget: farmerData.budget,
        farmSize: farmerData.farmSize,
        waterSource: farmerData.waterSource,
        suggestions: this.generateSuggestions(farmerData, soilAssessment)
      }
    };
  }

  getFarmInputRecommendations(cropName, farmSize = 1) {
    const cropInputs = this.cropInputs[cropName];
    if (!cropInputs) {
      return {
        error: `No input recommendations found for ${cropName}`,
        crop: cropName
      };
    }

    const totalInputCost = cropInputs.totalEstimatedCost * farmSize;

    return {
      crop: cropName,
      farmSize,
      fertilizers: cropInputs.fertilizers,
      pesticides: cropInputs.pesticides,
      herbicides: cropInputs.herbicides || [],
      soilAmendments: cropInputs.soilAmendments || [],
      tools: cropInputs.tools || [],
      micronutrients: cropInputs.micronutrients || [],
      totalEstimatedCost: cropInputs.totalEstimatedCost,
      totalCostForFarmSize: Math.round(totalInputCost),
      summary: {
        message: `For a ${farmSize} hectare ${cropName} farm, you'll need:`,
        fertilizers: cropInputs.fertilizers.length,
        pesticides: cropInputs.pesticides.length,
        herbicides: (cropInputs.herbicides || []).length,
        soilAmendments: (cropInputs.soilAmendments || []).length,
        tools: (cropInputs.tools || []).length
      }
    };
  }

  getBudgetAdjustedInputs(cropName, budget, farmSize = 1) {
    const fullInputs = this.getFarmInputRecommendations(cropName, farmSize);
    if (fullInputs.error) return fullInputs;

    const requiredCost = fullInputs.totalCostForFarmSize;
    const budgetRatio = budget / requiredCost;
    const prioritized = { essential: [], important: [], optional: [] };

    fullInputs.fertilizers.forEach((fert, index) => {
      if (index === 0) prioritized.essential.push(fert);
      else if (index === 1) prioritized.important.push(fert);
      else prioritized.optional.push(fert);
    });

    fullInputs.pesticides.forEach((pest, index) => {
      if (index === 0) prioritized.important.push(pest);
      else prioritized.optional.push(pest);
    });

    (fullInputs.soilAmendments || []).forEach((amend, index) => {
      if (index === 0) prioritized.important.push(amend);
      else prioritized.optional.push(amend);
    });

    (fullInputs.tools || []).forEach((tool) => {
      if (tool.name.includes('Seed') || tool.name.includes('Cuttings') || tool.name.includes('Seedlings')) {
        prioritized.essential.push(tool);
      } else {
        prioritized.optional.push(tool);
      }
    });

    return {
      crop: cropName,
      farmSize,
      budget,
      budgetSufficiency: {
        required: requiredCost,
        available: budget,
        ratio: `${Math.round(budgetRatio * 100)}%`,
        status: budgetRatio >= 0.9 ? 'Sufficient' : budgetRatio >= 0.6 ? 'Tight' : 'Limited'
      },
      recommendations: prioritized,
      costBreakdown: {
        fertilizers: Math.round(fullInputs.fertilizers.reduce((sum, item) => sum + (item.costPerUnit * (farmSize || 1) / 50), 0)),
        pesticides: Math.round(fullInputs.pesticides.reduce((sum, item) => sum + (item.costPerUnit * (farmSize || 1) / 50), 0)),
        soilAmendments: Math.round((fullInputs.soilAmendments || []).reduce((sum, item) => sum + (item.costPerUnit * (farmSize || 1)), 0)),
        tools: Math.round((fullInputs.tools || []).reduce((sum, item) => sum + (item.costPerUnit * (farmSize || 1)), 0))
      }
    };
  }

  getCostSavingTips(budget, farmSize = 1) {
    const tips = [];

    if (budget < 5000 * farmSize) {
      tips.push({
        strategy: 'Group Buying',
        description: 'Join a farmer group and buy inputs together',
        potential_savings: '15-25%',
        contact: 'Visit your sub-county agricultural office'
      });
      tips.push({
        strategy: 'Use Farm Manure',
        description: 'Rely on farmyard manure instead of expensive synthetic fertilizers',
        potential_savings: '30-40%',
        requirement: '10-15 tons/ha available'
      });
    }

    tips.push({
      strategy: 'Organic Pest Control',
      description: 'Use neem oil, soap spray, or companion planting',
      potential_savings: '25-35%',
      benefit: 'Safer for family and environment'
    });

    tips.push({
      strategy: 'Mulching',
      description: 'Use farm waste as mulch instead of buying',
      potential_savings: '20-30%',
      benefit: 'Reduces watering and weeding needs'
    });

    tips.push({
      strategy: 'Seed Saving',
      description: 'Save seeds from good plants for next season',
      potential_savings: '15-25%',
      note: 'Works better for open-pollinated varieties'
    });

    return tips;
  }

  getEssentialToolsChecklist() {
    return {
      tools: this.essentialTools,
      totalEstimatedCost: this.essentialTools.reduce((sum, tool) => sum + tool.cost, 0),
      message: 'These are basic tools every farmer should have. Buy gradually if budget is limited.',
      purchasePriority: [
        '1. Hand hoe (most important)',
        '2. Knapsack sprayer (for chemical application)',
        '3. Machete/Panga (for clearing)',
        '4. Watering can (for dry season)',
        '5. Measuring equipment (for accurate input application)'
      ]
    };
  }

  getSoilImprovementPlan(subCounty, soilType) {
    const soilAssessment = this.getSoilAssessment(subCounty, soilType);
    const improvements = {
      subCounty,
      soilType,
      currentQuality: soilAssessment?.assessment?.quality || 'Unknown',
      issues: soilAssessment?.assessment?.issues || [],
      recommendedAmendments: [],
      estimatedCost: 0,
      timeline: '2-3 months before planting'
    };

    if (soilAssessment?.assessment?.issues?.length > 0) {
      const issues = soilAssessment.assessment.issues;

      if (issues.some((issue) => issue.includes('pH'))) {
        if (issues[0].includes('Low')) {
          improvements.recommendedAmendments.push({
            amendment: 'Lime (CaCO3)',
            quantity: '2-3 tons/ha',
            cost: '2400-3600 KSh/ha'
          });
        } else {
          improvements.recommendedAmendments.push({
            amendment: 'Sulfur',
            quantity: '1-2 tons/ha',
            cost: '2000-4000 KSh/ha'
          });
        }
      }

      if (issues.some((issue) => issue.includes('nitrogen'))) {
        improvements.recommendedAmendments.push({
          amendment: 'Farmyard manure or Compost',
          quantity: '10-15 tons/ha',
          cost: '5000-7500 KSh/ha'
        });
      }

      if (issues.some((issue) => issue.includes('organic'))) {
        improvements.recommendedAmendments.push({
          amendment: 'Compost/Green manure',
          quantity: '8-12 tons/ha',
          cost: '4000-7200 KSh/ha'
        });
      }
    } else {
      improvements.message = 'Soil is in good condition. Maintain fertility by adding manure annually.';
    }

    return improvements;
  }

  generateSuggestions(farmerData, soilAssessment) {
    const suggestions = [];

    if (soilAssessment?.assessment?.issues?.length > 0) {
      suggestions.push({
        type: 'soil',
        priority: 'high',
        message: 'Address soil issues',
        actions: soilAssessment.assessment.issues
      });
    }

    if (farmerData.budget < 3000) {
      suggestions.push({
        type: 'budget',
        priority: 'medium',
        message: 'Your budget is limited. Focus on crops with low input requirements.',
        actions: ['Consider cassava, sorghum, or beans', 'Explore group buying for inputs']
      });
    }

    if (farmerData.farmSize < 1) {
      suggestions.push({
        type: 'farm-size',
        priority: 'medium',
        message: 'Your farm is small. Optimize with high-value crops.',
        actions: ['Grow tomatoes or leafy vegetables', 'Intercrop with legumes']
      });
    }

    suggestions.push({
      type: 'market',
      priority: 'low',
      message: 'Check current market prices before planting',
      actions: ['Review the market trends dashboard', 'Compare prices across local Siaya markets']
    });

    return suggestions;
  }
}

export default new RecommendationEngine();
