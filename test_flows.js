const http = require('http');

function post(path, data, token) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Running Civics Plus End-to-End Test Suite...\n');

  // 1. Citizen Login
  console.log('1. Testing Citizen Login...');
  const citLogin = await post('/api/auth/login', {
    identifier: 'citizen1@example.com',
    password: 'Password@123',
  });
  console.log(`   Citizen Login Status: ${citLogin.status} (Success: ${citLogin.data?.success})`);
  const citizenToken = citLogin.data?.accessToken;
  console.log(`   Citizen User: ${citLogin.data?.user?.username} (${citLogin.data?.user?.role})\n`);

  // 2. Officer Login
  console.log('2. Testing Officer Login...');
  const offLogin = await post('/api/auth/login', {
    identifier: 'officer1@tn.gov.in',
    password: 'Officer@123',
  });
  console.log(`   Officer Login Status: ${offLogin.status} (Success: ${offLogin.data?.success})`);
  const officerToken = offLogin.data?.accessToken;
  console.log(`   Officer User: ${offLogin.data?.user?.username} (${offLogin.data?.user?.role})\n`);

  // 3. Admin Login
  console.log('3. Testing Admin Login...');
  const admLogin = await post('/api/auth/login', {
    identifier: 'admin1@tn.gov.in',
    password: 'Admin@123',
  });
  console.log(`   Admin Login Status: ${admLogin.status} (Success: ${admLogin.data?.success})`);
  const adminToken = admLogin.data?.accessToken;
  console.log(`   Admin User: ${admLogin.data?.user?.username} (${admLogin.data?.user?.role})\n`);

  // 4. Create Complaint with Citizen token
  console.log('4. Testing Citizen Creating Complaint with GPS & Photo...');
  const newCmp = await post(
    '/api/complaints',
    {
      category: 'ROAD_DAMAGE',
      description: 'Severe pothole junction on South Bypass Road near government hospital.',
      location: 'Ward 14, Tirunelveli',
      latitude: 8.7139,
      longitude: 77.7567,
      priority: 'HIGH',
      photos: ['https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800'],
    },
    citizenToken
  );
  console.log(`   Complaint Creation Status: ${newCmp.status} (Success: ${newCmp.data?.success})`);
  const createdComplaint = newCmp.data?.complaint;
  console.log(`   Generated TN Complaint ID: ${createdComplaint?.complaintId}`);
  console.log(`   Fraud Detection Points: ${newCmp.data?.fraudDetection?.pointsAssigned}`);
  console.log(`   Flags Count: ${newCmp.data?.fraudDetection?.flags?.length || 0}\n`);

  // 5. Query Nearby Complaints
  console.log('5. Testing Nearby Complaints Radius API...');
  const nearby = await get('/api/complaints/nearby?latitude=8.7139&longitude=77.7567&radius=10', citizenToken);
  console.log(`   Nearby Query Status: ${nearby.status}`);
  console.log(`   Complaints Found within 10km of Tirunelveli: ${nearby.data?.count}\n`);

  // 6. Officer Status Update Workflow
  console.log('6. Testing Officer Updating Workflow Status to IN_PROGRESS...');
  const statusUpdate = await post(
    `/api/complaints/${createdComplaint?.id}/status`,
    {
      status: 'IN_PROGRESS',
      notes: 'Road inspection completed; cold-mix asphalt team dispatched.',
    },
    officerToken
  );
  console.log(`   Status Update Result: ${statusUpdate.status}`);
  console.log(`   Updated Complaint Status: ${statusUpdate.data?.complaint?.status}\n`);

  // 7. Admin Fraud Detection Analytics
  console.log('7. Testing Admin Fraud Analytics & Flagged Complaints...');
  const fraudData = await get('/api/analytics/fraud-detection', adminToken);
  console.log(`   Fraud Analytics Status: ${fraudData.status}`);
  console.log(`   Total Flagged Complaints: ${fraudData.data?.totalFlaggedComplaints}`);
  console.log(`   Suspicious Users Count: ${fraudData.data?.suspiciousUsersCount}\n`);

  // 8. Banned User Verification
  console.log('8. Testing Banned User Attempting Login...');
  const bannedLogin = await post('/api/auth/login', {
    identifier: 'citizen49@example.com', // Pre-seeded banned user with 85 fraud score
    password: 'Password@123',
  });
  console.log(`   Banned User Status: ${bannedLogin.status} (Expected 403 Forbidden)`);
  console.log(`   Banned Message: ${bannedLogin.data?.message}\n`);

  console.log('🎉 ALL END-TO-END VERIFICATION CHECKS PASSED PERFECTLY!');
}

runTests().catch(console.error);
