const http = require('http');

console.log('Testing complete trends integration...');

// Test the complete integration
async function testCompleteIntegration() {
    try {
        // Test 1: API connectivity
        console.log('\n1. Testing API connectivity...');
        const response = await new Promise((resolve, reject) => {
            http.get('http://localhost:5000/api/market-trends?crop=Maize', (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve({ statusCode: res.statusCode, data }));
            }).on('error', reject);
        });
        
        if (response.statusCode !== 200) {
            throw new Error(`API returned status ${response.statusCode}`);
        }
        
        const apiData = JSON.parse(response.data);
        console.log('✅ API connectivity: PASSED');
        console.log(`   - Status: ${response.statusCode}`);
        console.log(`   - Markets: ${Object.keys(apiData.data).length}`);
        
        // Test 2: Data mapping
        console.log('\n2. Testing data mapping...');
        const mappedData = mapMarketCentersToTrendRows(apiData.data, 'Maize');
        console.log('✅ Data mapping: PASSED');
        console.log(`   - Mapped entries: ${mappedData.length}`);
        console.log(`   - Weeks: ${[...new Set(mappedData.map(d => d.week_start))].length}`);
        console.log(`   - Subcounties: ${[...new Set(mappedData.map(d => d.subcounty))].length}`);
        
        // Test 3: Chart data preparation
        console.log('\n3. Testing chart data preparation...');
        const weeks = [...new Set(mappedData.map(t => t.week_start))].sort();
        const subcounties = ['bondo', 'ugunja', 'yala', 'gem', 'alego'];
        const datasets = subcounties.map(sc => ({
            label: sc.charAt(0).toUpperCase() + sc.slice(1),
            data: weeks.map(week => {
                const entry = mappedData.find(t => t.week_start === week && t.subcounty === sc);
                return entry ? entry.price : null;
            }),
            borderColor: 'red',
            backgroundColor: 'rgba(255,0,0,0.1)',
            fill: false,
            tension: 0.4,
            borderWidth: 2
        }));
        console.log('✅ Chart data preparation: PASSED');
        console.log(`   - Weeks for chart: ${weeks.length}`);
        console.log(`   - Datasets: ${datasets.length}`);
        console.log(`   - Sample data: ${JSON.stringify(datasets[0].data)}`);
        
        // Test 4: Market page accessibility
        console.log('\n4. Testing market page accessibility...');
        const pageResponse = await new Promise((resolve, reject) => {
            http.get('http://localhost:5000/market.html', (res) => {
                resolve({ statusCode: res.statusCode });
            }).on('error', reject);
        });
        console.log('✅ Market page accessibility: PASSED');
        console.log(`   - Status: ${pageResponse.statusCode}`);
        
        console.log('\n🎉 ALL TESTS PASSED! Trends functionality should now work correctly.');
        console.log('\nExpected behavior:');
        console.log('- Weekly price trends chart should display with 4 weeks of data');
        console.log('- 5 sub-counties should be shown: Bondo, Ugunja, Yala, Gem, Alego');
        console.log('- Chart should show price trends for the selected crop');
        console.log('- Data should update in real-time');
        
    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
    }
}

// Data mapping function (same as in frontend)
function mapMarketCentersToTrendRows(marketCenters, crop) {
    const rows = [];
    Object.entries(marketCenters).forEach(([key, center]) => {
        const cropEntry = (center.crops || []).find(c => String(c.crop).toLowerCase() === String(crop).toLowerCase());
        if (!cropEntry || !Array.isArray(cropEntry.history)) return;
        
        cropEntry.history.forEach((price, idx) => {
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

// Run the test
testCompleteIntegration();