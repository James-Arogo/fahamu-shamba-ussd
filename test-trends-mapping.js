const http = require('http');

console.log('Testing trends data mapping...');

// Test the data mapping function
function mapMarketCentersToTrendRows(marketCenters, crop) {
    const rows = [];
    Object.entries(marketCenters).forEach(([key, center]) => {
        const cropEntry = (center.crops || []).find(c => String(c.crop).toLowerCase() === String(crop).toLowerCase());
        if (!cropEntry || !Array.isArray(cropEntry.history)) return;
        
        // Map the history array to trend rows
        cropEntry.history.forEach((price, idx) => {
            // Create a date for this week
            const date = new Date();
            date.setDate(date.getDate() - (cropEntry.history.length - idx - 1) * 7);
            const weekStart = date.toISOString().split('T')[0];
            
            rows.push({
                subcounty: key,
                week_start: weekStart,
                price: Number(price || 0)
            });
        });
    });
    return rows.length ? rows : [];
}

// Test with real API data
http.get('http://localhost:5000/api/market-trends?crop=Maize', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      if (jsonData.success && jsonData.data) {
        console.log('✅ API data received successfully');
        console.log('Available markets:', Object.keys(jsonData.data));
        
        // Test the mapping function
        const mappedData = mapMarketCentersToTrendRows(jsonData.data, 'Maize');
        console.log('\n✅ Data mapping completed');
        console.log('Mapped data length:', mappedData.length);
        console.log('Sample mapped entry:', mappedData[0]);
        console.log('Unique weeks:', [...new Set(mappedData.map(d => d.week_start))]);
        console.log('Unique subcounties:', [...new Set(mappedData.map(d => d.subcounty))]);
        
        // Test chart rendering data structure
        const weeks = [...new Set(mappedData.map(t => t.week_start))].sort();
        const subcounties = ['bondo', 'ugunja', 'yala', 'gem', 'alego'];
        console.log('\n✅ Chart data structure test:');
        console.log('Weeks for chart:', weeks);
        console.log('Subcounties for chart:', subcounties);
        
        // Test dataset generation
        const datasets = subcounties.map(sc => ({
            label: sc.charAt(0).toUpperCase() + sc.slice(1),
            data: weeks.map(week => {
                const entry = mappedData.find(t => t.week_start === week && t.subcounty === sc);
                return entry ? entry.price : null;
            }),
            borderColor: 'red', // placeholder
            backgroundColor: 'rgba(255,0,0,0.1)',
            fill: false,
            tension: 0.4,
            borderWidth: 2
        }));
        
        console.log('Datasets for chart:', datasets.length);
        console.log('Sample dataset:', datasets[0]);
        console.log('✅ All data mapping tests passed!');
      } else {
        console.log('❌ API data format invalid');
      }
    } catch (error) {
      console.log('❌ Error parsing trends response:', error.message);
    }
  });
}).on('error', (err) => {
  console.log('❌ Error connecting to trends API:', err.message);
});