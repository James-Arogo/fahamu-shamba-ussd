const http = require('http');

console.log('Testing trends API format...');

http.get('http://localhost:5000/api/market-trends?crop=Maize', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('API Response Format:');
      console.log(JSON.stringify(jsonData, null, 2));
      
      if (jsonData.success && jsonData.data) {
        console.log('\nData structure analysis:');
        console.log('Available markets:', Object.keys(jsonData.data));
        
        const siayaData = jsonData.data['siaya-town'];
        if (siayaData && siayaData.crops) {
          const maizeData = siayaData.crops.find(c => c.crop === 'Maize');
          if (maizeData) {
            console.log('\nMaize data structure:');
            console.log('Price:', maizeData.price);
            console.log('Trend:', maizeData.trend);
            console.log('History length:', maizeData.history ? maizeData.history.length : 0);
            if (maizeData.history && maizeData.history.length > 0) {
              console.log('Sample history entry:', maizeData.history[0]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err);
});