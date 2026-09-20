module.exports = (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  res.end(
    JSON.stringify({
      status: 'healthy',
      backend: 'online',
      platform: 'Civics Plus - Tamil Nadu Civic Complaints',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      region: 'Tamil Nadu, India',
    })
  );
};
