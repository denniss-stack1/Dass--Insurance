const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory mock database for Netlify Serverless execution
// Note: Since serverless containers are ephemeral, modifications will persist 
// during active sessions but reset when the function goes cold.
let dbPolicies = [
  { id: 'POL-392819', type: 'auto', coverage: 250000, deductible: 500, premium: 65, year: '2023', history: 'clean', status: 'Active', date: '2026-04-12' },
  { id: 'POL-829104', type: 'health', coverage: 500000, deductible: 1000, premium: 110, age: '20', smoker: 'no', status: 'Active', date: '2026-05-20' }
];

let dbClaims = [
  { id: 'CLM-748291', policyId: 'POL-392819', type: 'auto', date: '2026-06-15', loss: 1200, description: 'Minor fender bender during parking maneuver. Rear bumper scuffed.', status: 'Approved' },
  { id: 'CLM-903821', policyId: 'POL-829104', type: 'health', date: '2026-07-01', loss: 450, description: 'Routine checkup and physical therapy sessions.', status: 'Pending' }
];

// -------------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'Healthy',
    service: 'DASS Insurance Netlify Serverless API',
    mode: 'Serverless-Ephemeral',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/policies', (req, res) => {
  res.json(dbPolicies);
});

app.post('/api/policies', (req, res) => {
  const { type, coverage, deductible, premium, ...metadata } = req.body;

  if (!type || !coverage || !deductible || !premium) {
    return res.status(400).json({ error: "Missing required attributes: type, coverage, deductible, premium" });
  }

  const newPolicy = {
    id: `POL-${Math.floor(100000 + Math.random() * 900000)}`,
    type,
    coverage: parseInt(coverage),
    deductible: parseInt(deductible),
    premium: parseInt(premium),
    status: 'Active',
    date: new Date().toISOString().split('T')[0],
    ...metadata
  };

  dbPolicies.push(newPolicy);
  res.status(201).json(newPolicy);
});

app.get('/api/claims', (req, res) => {
  res.json(dbClaims);
});

app.post('/api/claims', (req, res) => {
  const { policyId, loss, description } = req.body;

  if (!policyId || !loss || !description) {
    return res.status(400).json({ error: "Missing incident details: policyId, loss, description" });
  }

  const matchedPolicy = dbPolicies.find(p => p.id === policyId);
  const policyType = matchedPolicy ? matchedPolicy.type : 'auto';

  const newClaim = {
    id: `CLM-${Math.floor(100000 + Math.random() * 900000)}`,
    policyId,
    type: policyType,
    date: new Date().toISOString().split('T')[0],
    loss: parseInt(loss),
    description,
    status: 'Pending'
  };

  dbClaims.push(newClaim);
  res.status(201).json(newClaim);
});

app.put('/api/claims/:id/status', (req, res) => {
  const claimId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Missing status in request body" });
  }

  const idx = dbClaims.findIndex(c => c.id === claimId);
  if (idx === -1) {
    return res.status(404).json({ error: `Claim ID ${claimId} not found` });
  }

  dbClaims[idx].status = status;
  res.json(dbClaims[idx]);
});

app.get('/api/stats', (req, res) => {
  const activePoliciesCount = dbPolicies.length;
  const claimsCount = dbClaims.length;
  const totalPremiumSum = dbPolicies.reduce((sum, p) => sum + p.premium, 0);

  const approvedClaims = dbClaims.filter(c => c.status === 'Approved').length;
  const closedClaims = dbClaims.filter(c => c.status !== 'Pending').length;
  const approvedRatio = closedClaims > 0 ? Math.round((approvedClaims / closedClaims) * 100) : 0;

  const distributions = { auto: 0, home: 0, health: 0 };
  dbPolicies.forEach(p => {
    if (distributions[p.type] !== undefined) {
      distributions[p.type] += p.premium;
    }
  });

  res.json({
    activePoliciesCount,
    claimsCount,
    totalPremiumSum,
    approvedRatio,
    distributions
  });
});

// Map Express routes to serverless handler
module.exports.handler = serverless(app);
