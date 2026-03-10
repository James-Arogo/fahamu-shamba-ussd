const http = require('http');

console.log('Testing trends API and frontend integration...');

// Test the trends API
console.log('\n1. Testing trends API...');
http.get('http://localhost:5000/api/market-trends?crop=Maize', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('✅ Trends API working');
      console.log('Response structure:', Object.keys(jsonData));
      if (jsonData.success && jsonData.data) {
        console.log('✅ Data structure valid');
        console.log('Available markets:', Object.keys(jsonData.data));
        if (jsonData.data['siaya-town'] && jsonData.data['siaya-town'].crops) {
          const maizeData = jsonData.data['siaya-town'].crops.find(c => c.crop === 'Maize');
          if (maizeData) {
            console.log('✅ Maize data found');
            console.log('History length:', maizeData.history ? maizeData.history.length : 'No history');
          }
        }
      } else {
        console.log('❌ Invalid data structure');
      }
    } catch (error) {
      console.log('❌ Error parsing trends response:', error.message);
    }
  });
}).on('error', (err) => {
  console.log('❌ Error connecting to trends API:', err.message);
});

// Test the market page HTML loading
console.log('\n2. Testing market page loading...');
http.get('http://localhost:5000/market.html', (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Market page loads successfully');
  } else {
    console.log(`❌ Market page error: ${res.statusCode}`);
  }
}).on('error', (err) => {
  console.log('❌ Error loading market page:', err.message);
});

console.log('\nDebug test complete.');