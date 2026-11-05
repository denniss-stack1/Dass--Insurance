const express = require('express');
const cors = require('cors');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const REGION = process.env.AWS_REGION || 'us-east-1';

// Initialize AWS SDK if environment variables or IAM roles are present
let docClient = null;
const POLICIES_TABLE = process.env.DYNAMODB_TABLE_POLICIES;
const CLAIMS_TABLE = process.env.DYNAMODB_TABLE_CLAIMS;

if (POLICIES_TABLE && CLAIMS_TABLE) {
  try {
    const client = new DynamoDBClient({ region: REGION });
    docClient = DynamoDBDocumentClient.from(client);
    console.log(`DynamoDB Client initialized successfully for tables: ${POLICIES_TABLE}, ${CLAIMS_TABLE}`);
  } catch (err) {
    console.warn("Unable to initialize DynamoDB SDK Client. Defaulting to local memory store.", err);
  }
} else {
  console.log("No DynamoDB table variables found in environment. Defaulting to local mock memory store.");
}

// Local mock database fallback
let mockPolicies = [
  { id: 'POL-392819', type: 'auto', coverage: 250000, deductible: 500, premium: 65, year: '2023', history: 'clean', status: 'Active', date: '2026-04-12' },
  { id: 'POL-829104', type: 'health', coverage: 500000, deductible: 1000, premium: 110, age: '20', smoker: 'no', status: 'Active', date: '2026-05-20' }
];

let mockClaims = [
  { id: 'CLM-748291', policyId: 'POL-392819', type: 'auto', date: '2026-06-15', loss: 1200, description: 'Minor fender bender during parking maneuver. Rear bumper scuffed.', status: 'Approved' },
  { id: 'CLM-903821', policyId: 'POL-829104', type: 'health', date: '2026-07-01', loss: 450, description: 'Routine checkup and physical therapy sessions.', status: 'Pending' }
];

// -------------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------------

// Check Service Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Healthy',
    service: 'DASS Insurance API',
    mode: docClient ? 'AWS-DynamoDB' : 'Mock-Local-Memory',
    timestamp: new Date().toISOString()
  });
});

// GET: Retrieve all active policies
app.get('/api/policies', async (req, res) => {
  if (docClient) {
    try {
      const command = new ScanCommand({ TableName: POLICIES_TABLE });
      const response = await docClient.send(command);
      return res.json(response.Items || []);
    } catch (err) {
      console.error("DynamoDB Scan error on policies:", err);
      return res.status(500).json({ error: "Failed to read policies from Cloud database", details: err.message });
    }
  } else {
    return res.json(mockPolicies);
  }
});

// POST: Register / Purchase new policy
app.post('/api/policies', async (req, res) => {
  const { type, coverage, deductible, premium, ...metadata } = req.value || req.body;

  if (!type || !coverage || !deductible || !premium) {
    return res.status(400).json({ error: "Missing required coverage attributes: type, coverage, deductible, premium" });
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

  if (docClient) {
    try {
      const command = new PutCommand({
        TableName: POLICIES_TABLE,
        Item: newPolicy
      });
      await docClient.send(command);
      return res.status(201).json(newPolicy);
    } catch (err) {
      console.error("DynamoDB Put error on policy:", err);
      return res.status(500).json({ error: "Failed to save policy to cloud DB", details: err.message });
    }
  } else {
    mockPolicies.push(newPolicy);
    return res.status(201).json(newPolicy);
  }
});

// GET: Retrieve all submitted claims
app.get('/api/claims', async (req, res) => {
  if (docClient) {
    try {
      const command = new ScanCommand({ TableName: CLAIMS_TABLE });
      const response = await docClient.send(command);
      return res.json(response.Items || []);
    } catch (err) {
      console.error("DynamoDB Scan error on claims:", err);
      return res.status(500).json({ error: "Failed to read claims from Cloud database", details: err.message });
    }
  } else {
    return res.json(mockClaims);
  }
});

// POST: File an incident claim
app.post('/api/claims', async (req, res) => {
  const { policyId, loss, description } = req.body;

  if (!policyId || !loss || !description) {
    return res.status(400).json({ error: "Missing incident details: policyId, loss, description" });
  }

  // Find policy type
  let policyType = 'general';
  if (docClient) {
    try {
      // Query or scan to check if policy exists and get details
      const command = new ScanCommand({ TableName: POLICIES_TABLE });
      const response = await docClient.send(command);
      const matched = (response.Items || []).find(p => p.id === policyId);
      if (matched) {
        policyType = matched.type;
      }
    } catch (err) {
      console.warn("Failed to cross-check policy in database. defaulting type to general.");
    }
  } else {
    const matched = mockPolicies.find(p => p.id === policyId);
    if (matched) {
      policyType = matched.type;
    }
  }

  const newClaim = {
    id: `CLM-${Math.floor(100000 + Math.random() * 900000)}`,
    policyId,
    type: policyType,
    date: new Date().toISOString().split('T')[0],
    loss: parseInt(loss),
    description,
    status: 'Pending'
  };

  if (docClient) {
    try {
      const command = new PutCommand({
        TableName: CLAIMS_TABLE,
        Item: newClaim
      });
      await docClient.send(command);
      return res.status(201).json(newClaim);
    } catch (err) {
      console.error("DynamoDB Put error on claim:", err);
      return res.status(500).json({ error: "Failed to save claim to cloud DB", details: err.message });
    }
  } else {
    mockClaims.push(newClaim);
    return res.status(201).json(newClaim);
  }
});

// PUT: Update claim status (Approve, Reject, Review)
app.put('/api/claims/:id/status', async (req, res) => {
  const claimId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Missing updated status in request body" });
  }

  if (docClient) {
    try {
      const command = new UpdateCommand({
        TableName: CLAIMS_TABLE,
        Key: { id: claimId },
        UpdateExpression: 'set #status = :s',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':s': status },
        ReturnValues: 'ALL_NEW'
      });
      const response = await docClient.send(command);
      return res.json(response.Attributes);
    } catch (err) {
      console.error("DynamoDB Update error on claim status:", err);
      return res.status(500).json({ error: "Failed to update claim in Cloud DB", details: err.message });
    }
  } else {
    const idx = mockClaims.findIndex(c => c.id === claimId);
    if (idx === -1) {
      return res.status(404).json({ error: `Claim ID ${claimId} not found` });
    }
    mockClaims[idx].status = status;
    return res.json(mockClaims[idx]);
  }
});

// GET: Aggregate stats for KPIs
app.get('/api/stats', async (req, res) => {
  let policies = [];
  let claims = [];

  if (docClient) {
    try {
      const pResponse = await docClient.send(new ScanCommand({ TableName: POLICIES_TABLE }));
      const cResponse = await docClient.send(new ScanCommand({ TableName: CLAIMS_TABLE }));
      policies = pResponse.Items || [];
      claims = cResponse.Items || [];
    } catch (err) {
      console.error("DynamoDB stats aggregates error:", err);
      // Fallback
      policies = mockPolicies;
      claims = mockClaims;
    }
  } else {
    policies = mockPolicies;
    claims = mockClaims;
  }

  const activePoliciesCount = policies.length;
  const claimsCount = claims.length;
  const totalPremiumSum = policies.reduce((sum, p) => sum + p.premium, 0);

  const approvedClaims = claims.filter(c => c.status === 'Approved').length;
  const closedClaims = claims.filter(c => c.status !== 'Pending').length;
  const approvedRatio = closedClaims > 0 ? Math.round((approvedClaims / closedClaims) * 100) : 0;

  // Category distributions
  const distributions = { auto: 0, home: 0, health: 0 };
  policies.forEach(p => {
    if (distributions[p.type] !== undefined) {
      distributions[p.type] += p.premium;
    }
  });

  return res.json({
    activePoliciesCount,
    claimsCount,
    totalPremiumSum,
    approvedRatio,
    distributions
  });
});

// Export the app for serverless framework wrappers
module.exports = app;

// Local startup check
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running locally in port ${PORT}`);
    console.log(`API health check: http://localhost:${PORT}/api/health`);
  });
}
