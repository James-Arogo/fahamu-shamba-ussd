// Market Trends JavaScript
const API_BASE = window.location.origin;

// Market data storage
const marketHistory = {
    beans: [],
    maize: [],
    rice: [],
    sorghum: [],
    millet: []
};

// Chart instances
let trendChart = null;
let comparisonChart = null;
let marketShareChart = null;
let volatilityChart = null;
let seasonalChart = null;
let marketUpdateInterval = null;
let currentTrendPeriod = '7d';

// Initialize market trends page
function initMarketTrends() {
    loadMarketOverview();
    loadMarketData();
    loadMarketTrends();
    loadMarketComparison();
    loadMarketAnalysis();
    startMarketUpdates();
}

// Generate realistic historical price data
function generateHistoricalData(basePrice, maxPrice) {
    const data = [];
    const today = new Date();
    
    for (let i = 90; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        
        // Simulate price fluctuations with seasonal patterns
        const seasonal = Math.sin(i / 30 * Math.PI) * 8; // Seasonal pattern
        const fluctuation = (Math.random() - 0.5) * 6; // Random fluctuation
        const trend = (i / 90) * (maxPrice - basePrice); // Long-term trend
        
        const price = Math.max(basePrice - 10, Math.min(maxPrice + 10, basePrice + trend + seasonal + fluctuation));
        
        data.push({
            date: date.toISOString().split('T')[0],
            price: Math.round(price),
            bondo: Math.round(price + (Math.random() - 0.5) * 8),
            ugunja: Math.round(price + (Math.random() - 0.5) * 6),
            yala: Math.round(price + (Math.random() - 0.5) * 10),
            volume: Math.round(1000 + Math.random() * 2000) // Simulated trading volume
        });
    }
    
    return data;
}

// Show different market views
function showMarketView(view) {
    // Hide all views
    document.querySelectorAll('.market-view').forEach(view => {
        view.style.display = 'none';
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.market-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected view and activate tab
    document.getElementById('market' + view.charAt(0).toUpperCase() + view.slice(1) + 'View').style.display = 'block';
    event.target.classList.add('active');
    
    // Update charts for the selected view
    switch(view) {
        case 'trends':
            loadMarketTrends();
            break;
        case 'comparison':
            loadMarketComparison();
            break;
        case 'analysis':
            loadMarketAnalysis();
            break;
    }
}

// Load market overview stats
async function loadMarketOverview() {
    const container = document.getElementById('marketOverview');
    
    try {
        const response = await fetch(`${API_BASE}/api/market-prices`);
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        
        const data = await response.json();
        if (!data.success || !data.prices) {
            container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 20px;">Failed to load prices</div>';
            return;
        }
        
        // Get latest prices per crop
        const latestPrices = {};
        data.prices.forEach(p => {
            const crop = p.crop.toLowerCase();
            if (!latestPrices[crop] || new Date(p.recorded_at) > new Date(latestPrices[crop].recorded_at)) {
                latestPrices[crop] = p;
            }
        });
        
        let html = '';
        Object.entries(latestPrices).slice(0, 5).forEach(([cropKey, priceData]) => {
            const trend = priceData.trend || 'stable';
            const trendIcon = trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';
            const trendClass = trend === 'up' ? 'price-up' : trend === 'down' ? 'price-down' : 'price-stable';
            
            html += `
                <div class="stat-card">
                    <div class="stat-number">KES ${priceData.price}</div>
                    <div class="stat-label">${priceData.crop}</div>
                    <div class="${trendClass}" style="font-size: 12px; margin-top: 5px;">
                        ${trendIcon} ${trend.charAt(0).toUpperCase() + trend.slice(1)}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading market overview:', error);
        container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 20px;">Failed to load market prices</div>';
    }
}

// Load market data table
async function loadMarketData() {
    const container = document.getElementById('marketData');
    
    try {
        const response = await fetch(`${API_BASE}/api/market-prices`);
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.prices && Array.isArray(data.prices)) {
            // Group prices by crop and market
            const pricesByMarket = {};
            data.prices.forEach(p => {
                const crop = p.crop;
                if (!pricesByMarket[crop]) pricesByMarket[crop] = {};
                pricesByMarket[crop][p.market] = p.price;
            });
            
            let tableHtml = `
                <table class="price-table">
                    <thead>
                        <tr>
                            <th>Crop</th>
                            <th>Bondo</th>
                            <th>Ugunja</th>
                            <th>Gem</th>
                            <th>Alego</th>
                            <th>Rarieda</th>
                            <th>Ugenya</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            Object.entries(pricesByMarket).forEach(([crop, prices]) => {
                const bondoPrice = prices.bondo || prices['Bondo Market'] || '-';
                const ugunjPrice = prices.ugunja || prices['Ugunja Market'] || '-';
                const gemPrice = prices.gem || prices['Gem Market'] || '-';
                const alegoPrice = prices.alego || prices['Siaya Town Market'] || '-';
                const rariedaPrice = prices.rarieda || '-';
                const ugenyaPrice = prices.ugenya || '-';
                
                tableHtml += `
                    <tr>
                        <td><strong>${crop}</strong></td>
                        <td>${typeof bondoPrice === 'number' ? 'KSh ' + bondoPrice : bondoPrice}</td>
                        <td>${typeof ugunjPrice === 'number' ? 'KSh ' + ugunjPrice : ugunjPrice}</td>
                        <td>${typeof gemPrice === 'number' ? 'KSh ' + gemPrice : gemPrice}</td>
                        <td>${typeof alegoPrice === 'number' ? 'KSh ' + alegoPrice : alegoPrice}</td>
                        <td>${typeof rariedaPrice === 'number' ? 'KSh ' + rariedaPrice : rariedaPrice}</td>
                        <td>${typeof ugenyaPrice === 'number' ? 'KSh ' + ugenyaPrice : ugenyaPrice}</td>
                    </tr>
                `;
            });
            
            tableHtml += `
                    </tbody>
                </table>
                <div class="update-info">
                    Real-time data • Prices sync every 30 seconds • Last updated: <span id="tableLastUpdated">${new Date().toLocaleTimeString()}</span>
                </div>
            `;
            
            container.innerHTML = tableHtml;
        } else {
            container.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 20px;">No market data available</div>`;
        }
    } catch (error) {
        console.error('Error loading market data:', error);
        container.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 20px;">Failed to load market data. Please try again.</div>`;
    }
}

// Load market trends chart
async function loadMarketTrends() {
    try {
        const crop = document.getElementById('trendCropSelect').value;
        
        const response = await fetch(`${API_BASE}/api/market/prices/history?crop=${encodeURIComponent(crop)}&market=Siaya%20Town%20Market&days=90`);
        if (!response.ok) {
            console.warn('Failed to load price history');
            return;
        }
        
        const data = await response.json();
        if (!data.success || !data.history) return;
        
        const periodData = data.history.slice(-30); // Get last 30 days
    
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (trendChart) {
        trendChart.destroy();
    }
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: periodData.map(d => formatDate(d.date, currentTrendPeriod)),
            datasets: [
                {
                    label: 'Bondo',
                    data: periodData.map(d => d.bondo),
                    borderColor: '#2E8B57',
                    backgroundColor: 'rgba(46, 139, 87, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Ugunja',
                    data: periodData.map(d => d.ugunja),
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Gem',
                    data: periodData.map(d => d.gem),
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Alego',
                    data: periodData.map(d => d.alego),
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Rarieda',
                    data: periodData.map(d => d.rarieda),
                    borderColor: '#e67e22',
                    backgroundColor: 'rgba(230, 126, 34, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Ugenya',
                    data: periodData.map(d => d.ugenya),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${crop.charAt(0).toUpperCase() + crop.slice(1)} Price Trends - ${getPeriodLabel(currentTrendPeriod)}`,
                    font: { size: 16, weight: 'bold' }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: KES ${context.parsed.y}/kg`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Price (KES/kg)',
                        font: { weight: 'bold' }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date',
                        font: { weight: 'bold' }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'nearest'
            }
        }
    });
    
    updateLastUpdated();
    } catch (error) {
        console.error('Error loading market trends:', error);
    }
}

// Load market comparison charts
async function loadMarketComparison() {
    try {
        const response = await fetch(`${API_BASE}/api/market/prices`);
        if (!response.ok) {
            console.warn('Failed to load market prices');
            return;
        }
        
        const data = await response.json();
        if (!data.success || !data.prices) return;
        
        // Group prices by crop
        const pricesByCrop = {};
        data.prices.forEach(p => {
            const crop = p.crop.toLowerCase();
            if (!pricesByCrop[crop]) {
                pricesByCrop[crop] = [];
            }
            pricesByCrop[crop].push(p);
        });
        
        const crop = document.getElementById('compareCropSelect').value || 'maize';
        const cropData = pricesByCrop[crop.toLowerCase()] || [];
        
        // Get unique markets
        const markets = {};
        cropData.forEach(p => {
            if (!markets[p.market]) {
                markets[p.market] = p.price;
            }
        });
        
        const marketNames = Object.keys(markets);
        const prices = Object.values(markets);
    const total = prices.reduce((sum, price) => sum + price, 0);
    const percentages = prices.map(price => ((price / total) * 100).toFixed(1));
    
    // Price Comparison Chart (Bar)
    const comparisonCtx = document.getElementById('comparisonChart').getContext('2d');
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    comparisonChart = new Chart(comparisonCtx, {
        type: 'bar',
        data: {
            labels: ['Bondo', 'Ugunja', 'Yala'],
            datasets: [{
                label: 'Current Price (KES/kg)',
                data: prices,
                backgroundColor: ['#2E8B57', '#FFD700', '#17a2b8'],
                borderColor: ['#26734d', '#e6c200', '#148a9c'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Current ${crop.charAt(0).toUpperCase() + crop.slice(1)} Prices by Market`,
                    font: { size: 16, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `KES ${context.parsed.y}/kg`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Price (KES/kg)',
                        font: { weight: 'bold' }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    // Market Share Chart (Doughnut)
    const shareCtx = document.getElementById('marketShareChart').getContext('2d');
    if (marketShareChart) {
        marketShareChart.destroy();
    }
    
    marketShareChart = new Chart(shareCtx, {
        type: 'doughnut',
        data: {
            labels: ['Bondo', 'Ugunja', 'Yala'],
            datasets: [{
                data: percentages,
                backgroundColor: ['#2E8B57', '#FFD700', '#17a2b8'],
                borderWidth: 2,
                borderColor: 'white'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Market Price Distribution',
                    font: { size: 16, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.parsed}% (KES ${prices[context.dataIndex]}/kg)`;
                        }
                    }
                }
            }
        }
    });
    } catch (error) {
        console.error('Error loading market comparison:', error);
    }
}

// Load market analysis
async function loadMarketAnalysis() {
    try {
        const response = await fetch(`${API_BASE}/api/market/prices`);
        if (!response.ok) return;
        
        const apiData = await response.json();
        if (!apiData.success || !apiData.prices) return;
        
        const crop = document.getElementById('analysisCropSelect').value || 'maize';
        const cropData = apiData.prices.filter(p => p.crop.toLowerCase() === crop.toLowerCase());
        
        // Load volatility chart
        loadVolatilityChart(crop, cropData);
        
        // Load seasonal trends
        loadSeasonalChart(crop, cropData);
        
        // Load analysis stats
        loadAnalysisStats(crop, cropData);
    } catch (error) {
        console.error('Error loading market analysis:', error);
    }
}

// Load volatility chart
function loadVolatilityChart(crop, data) {
    const volatilityData = calculateVolatility(data);
    const ctx = document.getElementById('volatilityChart').getContext('2d');
    
    if (volatilityChart) {
        volatilityChart.destroy();
    }
    
    volatilityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bondo', 'Ugunja', 'Yala'],
            datasets: [{
                label: 'Price Volatility (%)',
                data: [volatilityData.bondo, volatilityData.ugunja, volatilityData.yala],
                backgroundColor: ['#2E8B57', '#FFD700', '#17a2b8'],
                borderColor: ['#26734d', '#e6c200', '#148a9c'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${crop.charAt(0).toUpperCase() + crop.slice(1)} Price Volatility by Market`,
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Volatility (%)',
                        font: { weight: 'bold' }
                    }
                }
            }
        }
    });
}

// Load seasonal chart
function loadSeasonalChart(crop, data) {
    const seasonalData = calculateSeasonalTrends(data);
    const ctx = document.getElementById('seasonalChart').getContext('2d');
    
    if (seasonalChart) {
        seasonalChart.destroy();
    }
    
    seasonalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Average Price (KES/kg)',
                data: seasonalData,
                borderColor: '#2E8B57',
                backgroundColor: 'rgba(46, 139, 87, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${crop.charAt(0).toUpperCase() + crop.slice(1)} Seasonal Price Trends`,
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Price (KES/kg)',
                        font: { weight: 'bold' }
                    }
                }
            }
        }
    });
}

// Load analysis statistics
function loadAnalysisStats(crop, data) {
    const stats = calculateMarketStats(data);
    const container = document.getElementById('analysisStats');
    
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${stats.avgPrice}</div>
            <div class="stat-label">Average Price</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.highestMarket}</div>
            <div class="stat-label">Highest Market</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.lowestMarket}</div>
            <div class="stat-label">Lowest Market</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.volatility}%</div>
            <div class="stat-label">Avg Volatility</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.trend}</div>
            <div class="stat-label">30-Day Trend</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.recommendation}</div>
            <div class="stat-label">Recommendation</div>
        </div>
    `;
}

// Utility functions
function calculateVolatility(data) {
    const markets = ['bondo', 'ugunja', 'yala'];
    const volatility = {};
    
    markets.forEach(market => {
        const prices = data.map(d => d[market]);
        const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
        volatility[market] = (Math.sqrt(variance) / avg * 100).toFixed(1);
    });
    
    return volatility;
}

function calculateSeasonalTrends(data) {
    const monthlyAverages = Array(12).fill(0);
    const monthlyCounts = Array(12).fill(0);
    
    data.forEach(day => {
        const month = new Date(day.date).getMonth();
        monthlyAverages[month] += day.price;
        monthlyCounts[month]++;
    });
    
    return monthlyAverages.map((sum, index) => 
        monthlyCounts[index] > 0 ? Math.round(sum / monthlyCounts[index]) : 0
    );
}

function calculateMarketStats(data) {
    const current = data[data.length - 1];
    const monthAgo = data[data.length - 30];
    const trend = ((current.price - monthAgo.price) / monthAgo.price * 100).toFixed(1);
    
    const markets = ['bondo', 'ugunja', 'yala'];
    const marketPrices = markets.map(market => current[market]);
    const highestMarket = markets[marketPrices.indexOf(Math.max(...marketPrices))];
    const lowestMarket = markets[marketPrices.indexOf(Math.min(...marketPrices))];
    
    const volatility = calculateVolatility(data);
    const avgVolatility = (Object.values(volatility).reduce((a, b) => a + parseFloat(b), 0) / 3).toFixed(1);
    
    let recommendation = 'Hold';
    if (parseFloat(trend) > 5) recommendation = 'Buy';
    if (parseFloat(trend) < -5) recommendation = 'Sell';
    
    return {
        avgPrice: `KES ${Math.round(data.reduce((sum, day) => sum + day.price, 0) / data.length)}`,
        highestMarket: highestMarket.charAt(0).toUpperCase() + highestMarket.slice(1),
        lowestMarket: lowestMarket.charAt(0).toUpperCase() + lowestMarket.slice(1),
        volatility: avgVolatility,
        trend: `${trend}%`,
        recommendation: recommendation
    };
}

function changeTrendPeriod(period) {
    currentTrendPeriod = period;
    
    // Update button states
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Reload trends
    loadMarketTrends();
}

function getDataForPeriod(data, period) {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    return data.slice(-days);
}

function formatDate(dateString, period) {
    const date = new Date(dateString);
    if (period === '7d') {
        return date.toLocaleDateString('en', { weekday: 'short' });
    } else if (period === '30d') {
        return date.toLocaleDateString('en', { day: 'numeric', month: 'short' });
    } else {
        return date.toLocaleDateString('en', { month: 'short' });
    }
}

function getPeriodLabel(period) {
    return period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : 'Last 90 Days';
}

function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = now.toLocaleTimeString();
}

// Start real-time market updates
function startMarketUpdates() {
    marketUpdateInterval = setInterval(() => {
        updateMarketData();
    }, 30000);
}

// Update market data from API
async function updateMarketData() {
    try {
        // Sync with backend
        await loadMarketOverview();
        
        if (document.getElementById('marketPricesView') && document.getElementById('marketPricesView').style.display !== 'none') {
            await loadMarketData();
        }
        if (document.getElementById('marketTrendsView') && document.getElementById('marketTrendsView').style.display !== 'none') {
            loadMarketTrends();
        }
        if (document.getElementById('marketComparisonView') && document.getElementById('marketComparisonView').style.display !== 'none') {
            loadMarketComparison();
        }
        if (document.getElementById('marketAnalysisView') && document.getElementById('marketAnalysisView').style.display !== 'none') {
            loadMarketAnalysis();
        }
        
        updateLastUpdated();
    } catch (error) {
        console.error('Error updating market data:', error);
    }
}

// API call function
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(API_BASE + endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        return { success: false, error: 'Connection failed' };
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initMarketTrends();
});

// Clean up when leaving the page
window.addEventListener('beforeunload', () => {
    if (marketUpdateInterval) {
        clearInterval(marketUpdateInterval);
    }
});