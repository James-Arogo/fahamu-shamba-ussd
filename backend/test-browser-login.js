#!/usr/bin/env node

/**
 * Test login exactly as the browser form sends it
 */

import http from 'http';

function testLogin(username, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      username: username.toLowerCase(),
      password: password
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    console.log(`\n📤 Sending login request:`);
    console.log(`   Username: ${username}`);
    console.log(`   Lowercase: ${username.toLowerCase()}`);
    console.log(`   Password: ${password}`);
    console.log(`   Body: ${data}\n`);

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`📥 Response Status: ${res.statusCode}`);
        console.log(`   Headers:`, res.headers);
        
        try {
          const result = JSON.parse(responseData);
          console.log(`   Body:`, JSON.stringify(result, null, 2));
          
          if (result.status === 'success') {
            console.log(`\n✅ LOGIN SUCCESS`);
            console.log(`   Token: ${result.token.substring(0, 30)}...`);
          } else {
            console.log(`\n❌ LOGIN FAILED`);
            console.log(`   Error: ${result.message}`);
          }
        } catch (e) {
          console.log(`   Raw Body: ${responseData}`);
        }
        
        resolve();
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🌾 BROWSER LOGIN FORM TEST\n');
  console.log('='.repeat(60));

  // Test 1: testfarm/password123
  await testLogin('testfarm', 'password123');

  console.log('\n' + '='.repeat(60));

  // Test 2: With spaces (what browser might send)
  await testLogin('  testfarm  ', 'password123');

  console.log('\n' + '='.repeat(60));

  // Test 3: Wrong password
  await testLogin('testfarm', 'wrongpass');

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ ALL TESTS COMPLETE\n');
}

runTests().catch(console.error);
