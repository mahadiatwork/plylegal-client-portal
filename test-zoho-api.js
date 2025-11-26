/**
 * Test script for Zoho CRM Chat API endpoints
 * 
 * Usage:
 *   1. Make sure your dev server is running: npm run dev
 *   2. Set ZOHO_API_KEY in your environment (or .env.local)
 *   3. Run: node test-zoho-api.js <email>
 * 
 * Example:
 *   node test-zoho-api.js user@example.com
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const API_KEY = process.env.ZOHO_API_KEY || 'test-key-change-me';

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address as an argument');
  console.log('Usage: node test-zoho-api.js <email>');
  console.log('Example: node test-zoho-api.js user@example.com');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'x-zoho-api-key': API_KEY,
};

async function testSearchUser(email) {
  console.log('\n📧 Testing: Search User by Email');
  console.log(`   GET /api/zoho/search-user?email=${email}`);
  
  try {
    const response = await fetch(`${API_BASE}/api/zoho/search-user?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Success!');
      console.log('   User found:');
      console.log(`   - UID: ${data.user.uid}`);
      console.log(`   - Email: ${data.user.email}`);
      console.log(`   - Name: ${data.user.displayName || 'N/A'}`);
      return data.user;
    } else {
      console.log('❌ Failed:', data.error || 'Unknown error');
      console.log('   Status:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testFetchMessages(email, userId = null) {
  console.log('\n💬 Testing: Fetch Messages');
  console.log(`   GET /api/zoho/messages?email=${email}&limit=10`);
  
  try {
    const url = userId 
      ? `${API_BASE}/api/zoho/messages?userId=${userId}&limit=10`
      : `${API_BASE}/api/zoho/messages?email=${encodeURIComponent(email)}&limit=10`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Success!');
      console.log(`   Found ${data.messages.length} messages`);
      if (data.messages.length > 0) {
        console.log('   Latest messages:');
        data.messages.slice(-3).forEach((msg, idx) => {
          console.log(`   ${idx + 1}. [${msg.senderType}] ${msg.senderName}: ${msg.body.substring(0, 50)}...`);
        });
      }
      return data.messages;
    } else {
      console.log('❌ Failed:', data.error || 'Unknown error');
      console.log('   Status:', response.status);
      return [];
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return [];
  }
}

async function testSendMessage(email, userId = null) {
  console.log('\n📤 Testing: Send Agent Message');
  console.log(`   POST /api/zoho/messages`);
  
  const messageData = {
    email: userId ? undefined : email,
    userId: userId || undefined,
    senderType: 'agent',
    senderUid: 'zoho-agent-123',
    senderName: 'Test Agent',
    body: `Test message from API at ${new Date().toISOString()}`,
  };
  
  try {
    const response = await fetch(`${API_BASE}/api/zoho/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(messageData),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Success!');
      console.log(`   Message ID: ${data.message.id}`);
      console.log(`   Message: ${data.message.body.substring(0, 50)}...`);
      return data.message;
    } else {
      console.log('❌ Failed:', data.error || 'Unknown error');
      console.log('   Status:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testMarkSeen(messageIds) {
  if (!messageIds || messageIds.length === 0) {
    console.log('\n👁️  Skipping: Mark Messages as Seen (no messages)');
    return;
  }
  
  console.log('\n👁️  Testing: Mark Messages as Seen');
  console.log(`   PATCH /api/zoho/messages`);
  
  const updateData = {
    messageIds: messageIds.slice(0, 5), // Mark first 5 as seen
  };
  
  try {
    const response = await fetch(`${API_BASE}/api/zoho/messages`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updateData),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Success!');
      console.log(`   Updated ${data.updated} messages`);
      return data.updated;
    } else {
      console.log('❌ Failed:', data.error || 'Unknown error');
      console.log('   Status:', response.status);
      return 0;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return 0;
  }
}

async function runTests() {
  console.log('🧪 Zoho CRM Chat API Test Suite');
  console.log('=' .repeat(50));
  console.log(`API Base: ${API_BASE}`);
  console.log(`Email: ${email}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  
  // Test 1: Search user
  const user = await testSearchUser(email);
  
  if (!user) {
    console.log('\n⚠️  User not found. Cannot continue with message tests.');
    return;
  }
  
  const userId = user.uid || user.userId;
  
  // Test 2: Fetch messages
  const messages = await testFetchMessages(email, userId);
  
  // Test 3: Send message
  const newMessage = await testSendMessage(email, userId);
  
  // Test 4: Mark messages as seen
  const messageIds = messages.map(m => m.id);
  if (newMessage) {
    messageIds.push(newMessage.id);
  }
  await testMarkSeen(messageIds);
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests completed!');
}

// Run tests
runTests().catch(console.error);

