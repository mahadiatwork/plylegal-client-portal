/**
 * Test script for Admin Messages API endpoint
 * 
 * Usage:
 *   1. Set PORTAL_ADMIN_KEY in your environment
 *   2. Make sure dev server is running: npm run dev
 *   3. Run: node test-admin-messages.js <email>
 * 
 * Example:
 *   PORTAL_ADMIN_KEY=your-key node test-admin-messages.js user@example.com
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const ADMIN_KEY = process.env.PORTAL_ADMIN_KEY;

if (!ADMIN_KEY) {
  console.error('❌ PORTAL_ADMIN_KEY environment variable is required');
  console.log('Usage: PORTAL_ADMIN_KEY=your-key node test-admin-messages.js <email>');
  process.exit(1);
}

const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address as an argument');
  console.log('Usage: node test-admin-messages.js <email>');
  console.log('Example: node test-admin-messages.js user@example.com');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'x-admin-key': ADMIN_KEY,
};

async function testCase(name, testFn) {
  console.log(`\n🧪 ${name}`);
  console.log('─'.repeat(50));
  try {
    await testFn();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function test401MissingKey() {
  const response = await fetch(`${API_BASE}/api/admin/messages?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Intentionally missing x-admin-key
    },
  });

  const data = await response.json();

  if (response.status === 401 && !data.success) {
    console.log('✅ Test passed: 401 returned when key is missing');
    console.log('   Response:', JSON.stringify(data, null, 2));
  } else {
    console.log('❌ Test failed: Expected 401, got', response.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
  }
}

async function test401WrongKey() {
  const response = await fetch(`${API_BASE}/api/admin/messages?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': 'wrong-key-12345',
    },
  });

  const data = await response.json();

  if (response.status === 401 && !data.success) {
    console.log('✅ Test passed: 401 returned when key is wrong');
    console.log('   Response:', JSON.stringify(data, null, 2));
  } else {
    console.log('❌ Test failed: Expected 401, got', response.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
  }
}

async function test400MissingEmail() {
  const response = await fetch(`${API_BASE}/api/admin/messages`, {
    method: 'GET',
    headers,
  });

  const data = await response.json();

  if (response.status === 400 && !data.success) {
    console.log('✅ Test passed: 400 returned when email is missing');
    console.log('   Response:', JSON.stringify(data, null, 2));
  } else {
    console.log('❌ Test failed: Expected 400, got', response.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
  }
}

async function test200ValidRequest() {
  const response = await fetch(
    `${API_BASE}/api/admin/messages?email=${encodeURIComponent(email)}&limit=10`,
    {
      method: 'GET',
      headers,
    },
  );

  const data = await response.json();

  if (response.ok && data.success) {
    console.log('✅ Test passed: 200 returned with messages');
    console.log(`   Found ${data.messages.length} messages`);
    console.log(`   Has more: ${data.hasMore}`);
    if (data.messages.length > 0) {
      console.log('   Sample message:', {
        id: data.messages[0].id,
        senderType: data.messages[0].senderType,
        senderName: data.messages[0].senderName,
        body: data.messages[0].body.substring(0, 50) + '...',
      });
    }
    console.log('   Rate limit headers:', {
      limit: response.headers.get('X-RateLimit-Limit'),
      remaining: response.headers.get('X-RateLimit-Remaining'),
      reset: response.headers.get('X-RateLimit-Reset'),
    });
  } else {
    console.log('❌ Test failed: Expected 200 with success=true');
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
  }
}

async function runAllTests() {
  console.log('🧪 Admin Messages API Test Suite');
  console.log('='.repeat(50));
  console.log(`API Base: ${API_BASE}`);
  console.log(`Email: ${email}`);
  console.log(`Admin Key: ${ADMIN_KEY.substring(0, 10)}...`);

  await testCase('Test 1: 401 when key is missing', test401MissingKey);
  await testCase('Test 2: 401 when key is wrong', test401WrongKey);
  await testCase('Test 3: 400 when email is missing', test400MissingEmail);
  await testCase('Test 4: 200 with valid request', test200ValidRequest);

  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests completed!');
}

runAllTests().catch(console.error);

