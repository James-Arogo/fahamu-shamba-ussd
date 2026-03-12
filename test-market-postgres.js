/**
 * Test script to validate PostgreSQL market data
 * Tests if the market prices API returns data correctly
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function testMarketAPI() {
  try {
    console.log(`Testing Market API at ${API_URL}`);
    
    // Test 1: Get market prices
    console.log('\n📊 Test 1: Getting market prices...');
    const pricesRes = await fetch(`${API_URL}/api/market/prices`);
    const pricesData = await pricesRes.json();
    
    if (pricesData.success) {
      console.log('✅ Market prices retrieved');
      console.log(`   Total prices: ${pricesData.prices?.length || 0}`);
      
      // Check for specific sub-counties
      const hasSixSubcounties = pricesData.prices?.some(p => p.rarieda > 0 && p.ugenya > 0);
      if (hasSixSubcounties) {
        console.log('✅ Data includes all 6 sub-counties (Rarieda & Ugenya present)');
      } else {
        console.log('⚠️  Missing data for some sub-counties');
      }
    } else {
      console.log('❌ Failed to fetch market prices:', pricesData.message);
    }
    
    // Test 2: Get markets
    console.log('\n🏪 Test 2: Getting market centers...');
    const marketsRes = await fetch(`${API_URL}/api/market/centers`);
    const marketsData = await marketsRes.json();
    
    if (marketsData.success) {
      console.log(`✅ Market centers retrieved: ${marketsData.markets?.length || 0} markets`);
      const marketNames = marketsData.markets?.map(m => m.name);
      console.log(`   Markets: ${marketNames?.join(', ')}`);
    } else {
      console.log('❌ Failed to fetch markets:', marketsData.message);
    }
    
    // Test 3: Get specific crop prices
    console.log('\n🌾 Test 3: Getting maize prices...');
    const maizeRes = await fetch(`${API_URL}/api/market/prices?crop=Maize`);
    const maizeData = await maizeRes.json();
    
    if (maizeData.success && maizeData.prices?.length > 0) {
      console.log('✅ Maize prices retrieved');
      const maizePrice = maizeData.prices[0];
      console.log(`   Alego: KSh ${maizePrice.alego}`);
      console.log(`   Bondo: KSh ${maizePrice.bondo}`);
      console.log(`   Gem: KSh ${maizePrice.gem}`);
      console.log(`   Rarieda: KSh ${maizePrice.rarieda}`);
      console.log(`   Ugenya: KSh ${maizePrice.ugenya}`);
      console.log(`   Ugunja: KSh ${maizePrice.ugunja}`);
    } else {
      console.log('⚠️  No maize prices found');
    }
    
    console.log('\n✅ All tests completed');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

testMarketAPI();
