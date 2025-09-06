#!/usr/bin/env node

const axios = require('axios');

async function testRenderDeployment(backendUrl = 'https://photo-enhancement-backend.onrender.com') {
    console.log('🧪 Testing Render Deployment...\n');
    
    const baseUrl = backendUrl.endsWith('/api') ? backendUrl : `${backendUrl}/api`;
    
    let results = {
        healthCheck: false,
        registration: false,
        authentication: false,
        photoUpload: false
    };
    
    try {
        // Test 1: Health Check
        console.log('1. Testing health endpoint...');
        const healthResponse = await axios.get(`${backendUrl}/_health`, { timeout: 30000 });
        if (healthResponse.status === 204) {
            console.log('   ✅ Health check: PASSED');
            results.healthCheck = true;
        } else {
            console.log(`   ❌ Health check: Expected 204, got ${healthResponse.status}`);
        }
    } catch (error) {
        console.log(`   ❌ Health check: ${error.response?.status || error.message}`);
    }

    try {
        // Test 2: Registration
        console.log('2. Testing user registration...');
        const testUser = {
            username: `testuser_${Date.now()}`,
            email: `test${Date.now()}@example.com`,
            password: 'TestPassword123!'
        };

        const registerResponse = await axios.post(`${baseUrl}/auth/local/register`, testUser, { timeout: 30000 });
        if (registerResponse.status === 200 && registerResponse.data.jwt) {
            console.log('   ✅ Registration: PASSED');
            results.registration = true;
            
            // Test 3: Authentication with the created user
            console.log('3. Testing authentication...');
            const loginResponse = await axios.post(`${baseUrl}/auth/local`, {
                identifier: testUser.email,
                password: testUser.password
            }, { timeout: 30000 });
            
            if (loginResponse.status === 200 && loginResponse.data.jwt) {
                console.log('   ✅ Authentication: PASSED');
                results.authentication = true;
                
                // Test 4: Protected endpoint (photo creation)
                console.log('4. Testing protected photo endpoint...');
                const photoResponse = await axios.post(`${baseUrl}/photos`, {
                    data: {
                        title: 'Test Photo',
                        description: 'Test photo for deployment validation',
                        processing_status: 'pending'
                    }
                }, {
                    headers: {
                        'Authorization': `Bearer ${loginResponse.data.jwt}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                });
                
                if (photoResponse.status === 200) {
                    console.log('   ✅ Photo endpoint: PASSED');
                    results.photoUpload = true;
                } else {
                    console.log(`   ❌ Photo endpoint: Expected 200, got ${photoResponse.status}`);
                }
            } else {
                console.log(`   ❌ Authentication: Expected 200 with JWT, got ${loginResponse.status}`);
            }
        } else {
            console.log(`   ❌ Registration: Expected 200 with JWT, got ${registerResponse.status}`);
        }
    } catch (error) {
        if (error.config?.url?.includes('/auth/local/register')) {
            console.log(`   ❌ Registration: ${error.response?.status || error.message}`);
        } else if (error.config?.url?.includes('/auth/local')) {
            console.log(`   ❌ Authentication: ${error.response?.status || error.message}`);
        } else if (error.config?.url?.includes('/photos')) {
            console.log(`   ❌ Photo endpoint: ${error.response?.status || error.message}`);
        }
    }

    // Results Summary
    console.log('\n📊 Test Results:');
    console.log(`Health Check: ${results.healthCheck ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Registration: ${results.registration ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Authentication: ${results.authentication ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Photo Endpoint: ${results.photoUpload ? '✅ PASS' : '❌ FAIL'}`);
    
    const passedTests = Object.values(results).filter(r => r).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Render deployment is working correctly.');
        return true;
    } else {
        console.log('⚠️  Some tests failed. Check the deployment configuration.');
        return false;
    }
}

// Run if called directly
if (require.main === module) {
    const backendUrl = process.argv[2] || 'https://photo-enhancement-backend.onrender.com';
    testRenderDeployment(backendUrl).then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test script error:', error.message);
        process.exit(1);
    });
}

module.exports = { testRenderDeployment };