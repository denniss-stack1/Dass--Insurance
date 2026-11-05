// Resolve API base path dynamically depending on local or production server environment
let API_BASE = '/api'; 
if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  API_BASE = 'http://localhost:3001/api';
}

const DEFAULT_POLICIES = [
  { id: 'POL-392819', type: 'auto', coverage: 250000, deductible: 500, premium: 65, year: '2023', history: 'clean', status: 'Active', date: '2026-04-12' },
  { id: 'POL-829104', type: 'health', coverage: 500000, deductible: 1000, premium: 110, age: '20', smoker: 'no', status: 'Active', date: '2026-05-20' }
];

const DEFAULT_CLAIMS = [
  { id: 'CLM-748291', policyId: 'POL-392819', type: 'auto', date: '2026-06-15', loss: 1200, description: 'Minor fender bender during parking maneuver. Rear bumper scuffed.', status: 'Approved' },
  { id: 'CLM-903821', policyId: 'POL-829104', type: 'health', date: '2026-07-01', loss: 450, description: 'Routine checkup and physical therapy sessions.', status: 'Pending' }
];

let state = {
  policies: [],
  claims: [],
  currentType: 'auto',
  userRole: 'customer',
  isBackendOnline: false
};

// Local storage backup persistence
function saveLocalState() {
  localStorage.setItem('dass_policies', JSON.stringify(state.policies));
  localStorage.setItem('dass_claims', JSON.stringify(state.claims));
}

function loadLocalState() {
  state.policies = JSON.parse(localStorage.getItem('dass_policies')) || DEFAULT_POLICIES;
  state.claims = JSON.parse(localStorage.getItem('dass_claims')) || DEFAULT_CLAIMS;
}

// Check Backend Connection status
async function checkBackendStatus() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      state.isBackendOnline = true;
      console.log(`[DASS Insurance] Connected to Python backend. Mode: ${data.mode}`);
      updateConnectionIndicator(true);
    } else {
      throw new Error();
    }
  } catch (err) {
    state.isBackendOnline = false;
    console.log('[DASS Insurance] Backend API is offline. Running in local sandbox mode (localStorage).');
    updateConnectionIndicator(false);
  }
}

function updateConnectionIndicator(isOnline) {
  const logoEl = document.getElementById('nav-logo');
  // Remove existing indicator if any
  const existing = document.getElementById('connection-status-badge');
  if (existing) existing.remove();

  const badge = document.createElement('span');
  badge.id = 'connection-status-badge';
  badge.style.fontSize = '0.65rem';
  badge.style.padding = '0.15rem 0.5rem';
  badge.style.borderRadius = '50px';
  badge.style.marginLeft = '0.5rem';
  badge.style.fontWeight = '600';
  badge.style.letterSpacing = '0.05em';
  badge.style.textTransform = 'uppercase';

  if (isOnline) {
    badge.textContent = 'Sync Active';
    badge.style.background = 'rgba(16, 185, 129, 0.15)';
    badge.style.color = '#10b981';
    badge.style.border = '1px solid rgba(16, 185, 129, 0.3)';
  } else {
    badge.textContent = 'Sandbox';
    badge.style.background = 'rgba(245, 158, 11, 0.12)';
    badge.style.color = '#f59e0b';
    badge.style.border = '1px solid rgba(245, 158, 11, 0.25)';
  }
  
  logoEl.appendChild(badge);
}

// Unified Data Fetch Pipeline
async function syncData() {
  await checkBackendStatus();

  if (state.isBackendOnline) {
    try {
      const policiesRes = await fetch(`${API_BASE}/policies`);
      const claimsRes = await fetch(`${API_BASE}/claims`);
      
      state.policies = await policiesRes.json();
      state.claims = await claimsRes.json();
    } catch (err) {
      console.warn("Failed syncing API data. Falling back to local data.", err);
      loadLocalState();
    }
  } else {
    loadLocalState();
  }
}

// Initializer
document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  initQuoteEngine();
  initCustomerPortal();
  initAdminPortal();
  initRoleSwitcher();
  
  // Sync data and update UI
  await syncData();
  updateUI();
});

// View Navigation Router
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    item.addEventListener('click', async () => {
      const targetView = item.getAttribute('data-view');
      
      // Update nav link UI
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Show relevant view
      viewSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === targetView) {
          section.classList.add('active');
        }
      });

      // Sync fresh data on tab navigation
      await syncData();

      if (targetView === 'customer-view') {
        renderCustomerPortal();
      } else if (targetView === 'admin-view') {
        renderAdminPortal();
      }
    });
  });

  // Hero Actions Routing
  document.getElementById('hero-get-started').addEventListener('click', () => {
    switchView('quote-view');
  });

  document.getElementById('hero-view-portal').addEventListener('click', () => {
    switchView('customer-view');
  });

  document.getElementById('goto-quote-from-cust').addEventListener('click', () => {
    switchView('quote-view');
  });

  document.getElementById('nav-logo').addEventListener('click', () => {
    switchView('hero-view');
  });
}

function switchView(viewId) {
  const navItem = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if (navItem) navItem.click();
}

// Global Role Switcher Utility
function initRoleSwitcher() {
  const btnCustomer = document.getElementById('role-btn-customer');
  const btnAgent = document.getElementById('role-btn-agent');

  btnCustomer.addEventListener('click', () => {
    btnCustomer.classList.add('active');
    btnAgent.classList.remove('active');
    state.userRole = 'customer';
    showToast('Switched to Customer View', 'info');
    switchView('customer-view');
  });

  btnAgent.addEventListener('click', () => {
    btnAgent.classList.add('active');
    btnCustomer.classList.remove('active');
    state.userRole = 'agent';
    showToast('Access Granted: Adjuster Portal', 'info');
    switchView('admin-view');
  });
}

// Toast Alert System
function showToast(message, type = 'success') {
  const toast = document.getElementById('app-toast');
  const messageEl = document.getElementById('toast-message');
  const iconContainer = document.getElementById('toast-icon-container');

  messageEl.textContent = message;
  toast.className = `toast show ${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="18" height="18" fill="none" stroke="var(--accent)" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
  } else if (type === 'info') {
    iconSvg = `<svg width="18" height="18" fill="none" stroke="var(--secondary)" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg width="18" height="18" fill="none" stroke="var(--warning)" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  } else {
    iconSvg = `<svg width="18" height="18" fill="none" stroke="var(--danger)" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  }
  iconContainer.innerHTML = iconSvg;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ----------------------------------------------------
// QUOTE ENGINE CALCULATIONS
// ----------------------------------------------------
function initQuoteEngine() {
  const typeCards = document.querySelectorAll('.type-card');
  const coverageSlider = document.getElementById('coverage-slider');
  const deductibleSlider = document.getElementById('deductible-slider');

  typeCards.forEach(card => {
    card.addEventListener('click', () => {
      typeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      
      const type = card.getAttribute('data-type');
      state.currentType = type;
      
      document.querySelectorAll('.type-fields').forEach(f => f.style.display = 'none');
      document.getElementById(`fields-${type}`).style.display = 'block';

      const badge = document.getElementById('quote-type-badge');
      badge.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Insurance Plan`;

      if (type === 'health') {
        coverageSlider.max = 1500000;
        coverageSlider.value = 300000;
      } else if (type === 'home') {
        coverageSlider.max = 2000000;
        coverageSlider.value = 500000;
      } else {
        coverageSlider.max = 500000;
        coverageSlider.value = 100000;
      }

      calculateQuote();
    });
  });

  coverageSlider.addEventListener('input', calculateQuote);
  deductibleSlider.addEventListener('input', calculateQuote);

  const inputSelectors = [
    'auto-year', 'auto-history',
    'home-value', 'home-safety',
    'health-age', 'health-lifestyle'
  ];
  inputSelectors.forEach(id => {
    document.getElementById(id).addEventListener('change', calculateQuote);
  });

  document.getElementById('buy-policy-btn').addEventListener('click', purchasePolicy);
  calculateQuote();
}

function calculateQuote() {
  const type = state.currentType;
  const coverage = parseInt(document.getElementById('coverage-slider').value);
  const deductible = parseInt(document.getElementById('deductible-slider').value);

  document.getElementById('coverage-val').textContent = `$${coverage.toLocaleString()}`;
  document.getElementById('deductible-val').textContent = `$${deductible.toLocaleString()}`;

  let baseRate = 0;
  let riskFactor = 0;

  if (type === 'auto') {
    baseRate = 25;
    baseRate += (coverage * 0.00025);
    baseRate -= (deductible * 0.003);

    const year = document.getElementById('auto-year').value;
    const history = document.getElementById('auto-history').value;

    if (year === '2026') riskFactor += 12;
    if (year === '2023') riskFactor += 5;
    if (history === 'minor') riskFactor += 20;
    if (history === 'major') riskFactor += 45;

  } else if (type === 'home') {
    baseRate = 45;
    baseRate += (coverage * 0.0001);
    baseRate -= (deductible * 0.004);

    const val = parseInt(document.getElementById('home-value').value);
    const safety = document.getElementById('home-safety').value;

    if (val === 500000) riskFactor += 15;
    if (val === 1000000) riskFactor += 35;
    if (safety === 'high') riskFactor -= 12;

  } else if (type === 'health') {
    baseRate = 50;
    baseRate += (coverage * 0.00015);
    baseRate -= (deductible * 0.002);

    const age = parseInt(document.getElementById('health-age').value);
    const smoker = document.getElementById('health-lifestyle').value;

    if (age === 40) riskFactor += 25;
    if (age === 60) riskFactor += 55;
    if (smoker === 'yes') riskFactor += 60;
  }

  const monthlyPremium = Math.max(15, Math.round(baseRate + riskFactor));
  
  document.getElementById('premium-display').innerHTML = `$${monthlyPremium}<span>/mo</span>`;
  document.getElementById('summary-coverage').textContent = `$${coverage.toLocaleString()}`;
  document.getElementById('summary-deductible').textContent = `$${deductible.toLocaleString()}`;
  document.getElementById('summary-base').textContent = `$${Math.max(10, Math.round(baseRate)).toFixed(2)}/mo`;
  document.getElementById('summary-risk').textContent = `${riskFactor >= 0 ? '+' : '-'} $${Math.abs(riskFactor).toFixed(2)}/mo`;
}

async function purchasePolicy() {
  const type = state.currentType;
  const coverage = parseInt(document.getElementById('coverage-slider').value);
  const deductible = parseInt(document.getElementById('deductible-slider').value);
  const premiumText = document.getElementById('premium-display').textContent;
  const premium = parseInt(premiumText.replace(/[^0-9]/g, ''));

  const metadata = {};
  if (type === 'auto') {
    metadata.year = document.getElementById('auto-year').value;
    metadata.history = document.getElementById('auto-history').value;
  } else if (type === 'home') {
    metadata.value = document.getElementById('home-value').value;
    metadata.safety = document.getElementById('home-safety').value;
  } else if (type === 'health') {
    metadata.age = document.getElementById('health-age').value;
    metadata.smoker = document.getElementById('health-lifestyle').value;
  }

  const payload = {
    type,
    coverage,
    deductible,
    premium,
    ...metadata
  };

  let policyId = "";

  if (state.isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      policyId = data.id;
    } catch (err) {
      console.error("API Purchase failed, falling back to local database", err);
    }
  }

  // Local fallback
  if (!policyId) {
    const fallbackPolicy = {
      id: `POL-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'Active',
      date: new Date().toISOString().split('T')[0],
      ...payload
    };
    state.policies.push(fallbackPolicy);
    saveLocalState();
    policyId = fallbackPolicy.id;
  }

  await syncData();
  updateUI();

  showToast(`Bound Policy ${policyId} successfully!`);
  switchView('customer-view');
}

// ----------------------------------------------------
// CUSTOMER PORTAL ACTION HANDLERS
// ----------------------------------------------------
function initCustomerPortal() {
  const claimForm = document.getElementById('file-claim-form');
  claimForm.addEventListener('submit', fileClaim);

  const uploadArea = document.getElementById('claim-upload-area');
  const fileInput = document.getElementById('claim-file-input');
  const filePreview = document.getElementById('file-name-preview');

  uploadArea.addEventListener('click', () => fileInput.click());

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      filePreview.textContent = `Attached: ${e.dataTransfer.files[0].name}`;
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      filePreview.textContent = `Attached: ${fileInput.files[0].name}`;
    }
  });

  const modal = document.getElementById('payment-modal');
  const payBtn = document.getElementById('pay-premium-btn');
  const closeBtn = document.getElementById('payment-modal-close');
  const confirmPayBtn = document.getElementById('confirm-payment-btn');
  const successCloseBtn = document.getElementById('payment-success-close');

  payBtn.addEventListener('click', () => {
    const totalPremium = state.policies.reduce((sum, p) => sum + p.premium, 0);
    document.getElementById('payment-modal-amount').textContent = `$${totalPremium.toFixed(2)}`;
    
    document.getElementById('payment-modal-body').style.display = 'block';
    document.getElementById('payment-success-body').style.display = 'none';
    modal.classList.add('active');
  });

  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  successCloseBtn.addEventListener('click', () => modal.classList.remove('active'));

  confirmPayBtn.addEventListener('click', () => {
    confirmPayBtn.textContent = 'Processing Secured Transaction...';
    confirmPayBtn.style.opacity = '0.7';
    confirmPayBtn.disabled = true;

    setTimeout(() => {
      confirmPayBtn.textContent = 'Authorize Payment';
      confirmPayBtn.style.opacity = '1';
      confirmPayBtn.disabled = false;

      document.getElementById('payment-modal-body').style.display = 'none';
      document.getElementById('payment-success-body').style.display = 'block';
      
      showToast('Payment Completed Instantly!', 'success');
    }, 1500);
  });
}

async function fileClaim(e) {
  e.preventDefault();

  const policySelect = document.getElementById('claim-policy-select');
  const lossInput = document.getElementById('claim-loss');
  const descInput = document.getElementById('claim-desc');
  const filePreview = document.getElementById('file-name-preview');

  if (!policySelect.value) {
    showToast('You must select an active policy to file a claim', 'error');
    return;
  }

  const payload = {
    policyId: policySelect.value,
    loss: parseInt(lossInput.value),
    description: descInput.value
  };

  let claimId = "";

  if (state.isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      claimId = data.id;
    } catch (err) {
      console.error("API submission failed, falling back to local database", err);
    }
  }

  // Local fallback
  if (!claimId) {
    const matched = state.policies.find(p => p.id === payload.policyId);
    const fallbackClaim = {
      id: `CLM-${Math.floor(100000 + Math.random() * 900000)}`,
      type: matched ? matched.type : 'auto',
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      ...payload
    };
    state.claims.push(fallbackClaim);
    saveLocalState();
    claimId = fallbackClaim.id;
  }

  // Reset inputs
  lossInput.value = '';
  descInput.value = '';
  filePreview.textContent = '';
  document.getElementById('claim-file-input').value = '';

  await syncData();
  updateUI();

  showToast(`Filed Claim ${claimId} successfully!`);
}

function renderCustomerPortal() {
  const policiesContainer = document.getElementById('customer-policies-container');
  const claimsContainer = document.getElementById('customer-claims-container');
  const policySelect = document.getElementById('claim-policy-select');

  policiesContainer.innerHTML = '';
  policySelect.innerHTML = '<option value="" disabled selected>-- Choose Policy --</option>';

  if (state.policies.length === 0) {
    policiesContainer.innerHTML = `
      <div class="glass-card text-center" style="padding: 3rem 1.5rem;">
        <p style="color:var(--text-secondary); margin-bottom:1.5rem;">You do not have any active insurance policies.</p>
        <button class="btn btn-primary" onclick="document.querySelector('[data-view=quote-view]').click()">Get Cover Quote</button>
      </div>
    `;
  } else {
    state.policies.forEach(p => {
      let categorySvg = '';
      if (p.type === 'auto') {
        categorySvg = `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="3" width="22" height="13" rx="2" ry="2"></rect><polygon points="16 8 20 8 20 13 16 13"></polygon><polygon points="4 8 8 8 8 13 4 13"></polygon><circle cx="7" cy="21" r="2"></circle><circle cx="17" cy="21" r="2"></circle></svg>`;
      } else if (p.type === 'home') {
        categorySvg = `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
      } else {
        categorySvg = `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`;
      }

      policiesContainer.innerHTML += `
        <div class="policy-item">
          <div class="policy-row-top">
            <div class="policy-details">
              <div class="policy-icon">${categorySvg}</div>
              <div>
                <div class="policy-name">${p.type.charAt(0).toUpperCase() + p.type.slice(1)} Protection</div>
                <div class="policy-id">${p.id} • Issued ${p.date}</div>
              </div>
            </div>
            <div class="policy-coverage">
              <div class="policy-premium">$${p.premium}/mo</div>
              <div>Limit: $${p.coverage.toLocaleString()}</div>
            </div>
          </div>
          <div class="policy-validity-bar">
            <div class="policy-validity-fill" style="width: 85%;"></div>
          </div>
        </div>
      `;

      policySelect.innerHTML += `<option value="${p.id}">${p.type.toUpperCase()} - ${p.id} ($${p.coverage.toLocaleString()})</option>`;
    });
  }

  claimsContainer.innerHTML = '';
  const relevantClaims = state.claims.filter(c => state.policies.some(p => p.id === c.policyId));

  if (relevantClaims.length === 0) {
    claimsContainer.innerHTML = `
      <tr>
        <td colspan="5" class="text-center" style="color:var(--text-secondary); padding: 2rem;">No claims filed to date.</td>
      </tr>
    `;
  } else {
    relevantClaims.forEach(c => {
      let badgeClass = 'pending';
      if (c.status === 'Approved') badgeClass = 'approved';
      if (c.status === 'Rejected') badgeClass = 'rejected';

      claimsContainer.innerHTML += `
        <tr>
          <td style="font-weight:600; font-family:var(--font-display);">${c.id}</td>
          <td><span class="badge badge-primary">${c.type.toUpperCase()}</span></td>
          <td>${c.date}</td>
          <td style="font-weight:600;">$${c.loss.toLocaleString()}</td>
          <td><span class="status-badge ${badgeClass}">${c.status}</span></td>
        </tr>
      `;
    });
  }

  const totalPremium = state.policies.reduce((sum, p) => sum + p.premium, 0);
  document.getElementById('billing-premium-total').textContent = `$${totalPremium.toFixed(2)}`;
}

// ----------------------------------------------------
// ADJUSTER PORTAL (ADMIN) HANDLERS
// ----------------------------------------------------
function initAdminPortal() {
  document.getElementById('policy-search').addEventListener('input', (e) => {
    renderPolicyRegistry(e.target.value.trim());
  });
}

function renderAdminPortal() {
  renderClaimsQueue();
  renderPolicyRegistry();
  renderKPIStatistics();
  renderAnalyticsChart();
}

function renderClaimsQueue() {
  const queueContainer = document.getElementById('admin-claims-queue');
  queueContainer.innerHTML = '';

  const pendingClaims = state.claims.filter(c => c.status === 'Pending' || c.status === 'Under Review');

  if (pendingClaims.length === 0) {
    queueContainer.innerHTML = `
      <tr>
        <td colspan="5" class="text-center" style="color:var(--text-secondary); padding: 2.5rem;">No claims currently awaiting review.</td>
      </tr>
    `;
  } else {
    pendingClaims.forEach(c => {
      queueContainer.innerHTML += `
        <tr>
          <td>
            <div style="font-weight:700; font-family:var(--font-display);">${c.id}</div>
            <div style="font-size:0.75rem; color:var(--text-secondary);">${c.policyId}</div>
          </td>
          <td><span class="badge badge-primary">${c.type.toUpperCase()}</span></td>
          <td>
            <div style="max-width: 320px; font-size:0.85rem; line-height: 1.4;">${c.description}</div>
            <div style="font-size: 0.75rem; color:var(--text-muted); margin-top: 0.25rem;">Filed on ${c.date}</div>
          </td>
          <td style="font-weight:700; color:var(--text-primary);">$${c.loss.toLocaleString()}</td>
          <td>
            <div class="action-btn-group">
              <button class="btn btn-accent btn-sm" onclick="adjustClaim('${c.id}', 'Approved')">Approve</button>
              <button class="btn btn-secondary btn-sm" style="border-color:var(--danger); color:var(--danger);" onclick="adjustClaim('${c.id}', 'Rejected')">Reject</button>
              <button class="btn btn-secondary btn-sm" onclick="adjustClaim('${c.id}', 'Under Review')">Audit Info</button>
            </div>
          </td>
        </tr>
      `;
    });
  }
}

window.adjustClaim = async function(claimId, newStatus) {
  let updated = false;

  if (state.isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/claims/${claimId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) updated = true;
    } catch (err) {
      console.error("API update status failed", err);
    }
  }

  // Local fallback
  if (!updated) {
    const claimIndex = state.claims.findIndex(c => c.id === claimId);
    if (claimIndex !== -1) {
      state.claims[claimIndex].status = newStatus;
      saveLocalState();
      updated = true;
    }
  }

  if (updated) {
    await syncData();
    updateUI();

    if (newStatus === 'Approved') {
      showToast(`Claim ${claimId} Approved. Simulated disbursement triggered.`);
    } else if (newStatus === 'Rejected') {
      showToast(`Claim ${claimId} Rejected. Notification sent.`, 'warning');
    } else {
      showToast(`Requested additional context for ${claimId}.`, 'info');
    }
  }
};

function renderPolicyRegistry(searchQuery = '') {
  const registryContainer = document.getElementById('admin-policy-registry');
  registryContainer.innerHTML = '';

  let filteredPolicies = state.policies;
  
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredPolicies = state.policies.filter(p => 
      p.id.toLowerCase().includes(q) || 
      p.type.toLowerCase().includes(q) || 
      (p.status && p.status.toLowerCase().includes(q))
    );
  }

  if (filteredPolicies.length === 0) {
    registryContainer.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="color:var(--text-secondary); padding: 2rem;">No matching policies found.</td>
      </tr>
    `;
  } else {
    filteredPolicies.forEach(p => {
      registryContainer.innerHTML += `
        <tr>
          <td style="font-weight:700; font-family:var(--font-display);">${p.id}</td>
          <td><span class="badge badge-primary">${p.type.toUpperCase()}</span></td>
          <td>$${p.coverage.toLocaleString()}</td>
          <td>$${p.deductible.toLocaleString()}</td>
          <td style="font-weight:600; color:var(--accent);">$${p.premium}/mo</td>
          <td><span class="status-badge approved">${p.status || 'Active'}</span></td>
        </tr>
      `;
    });
  }
}

function renderKPIStatistics() {
  document.getElementById('stat-active-policies').textContent = state.policies.length;
  document.getElementById('stat-claims-filed').textContent = state.claims.length;

  const totalPremium = state.policies.reduce((sum, p) => sum + p.premium, 0);
  document.getElementById('stat-premium-total').textContent = `$${totalPremium.toLocaleString()}`;

  const approvedClaims = state.claims.filter(c => c.status === 'Approved').length;
  const closedClaims = state.claims.filter(c => c.status !== 'Pending').length;
  const ratio = closedClaims > 0 ? Math.round((approvedClaims / closedClaims) * 100) : 0;
  
  document.getElementById('stat-approved-ratio').textContent = `${ratio}%`;
}

function renderAnalyticsChart() {
  const categoriesSum = { auto: 0, home: 0, health: 0 };
  
  state.policies.forEach(p => {
    if (categoriesSum[p.type] !== undefined) {
      categoriesSum[p.type] += p.premium;
    }
  });

  const maxVal = Math.max(10, categoriesSum.auto, categoriesSum.home, categoriesSum.health);

  const barAuto = document.getElementById('chart-bar-auto');
  const tooltipAuto = document.getElementById('chart-tooltip-auto');
  const heightAuto = (categoriesSum.auto / maxVal) * 100;
  barAuto.style.height = `${heightAuto}%`;
  tooltipAuto.textContent = `Auto: $${categoriesSum.auto}/mo`;

  const barHome = document.getElementById('chart-bar-home');
  const tooltipHome = document.getElementById('chart-tooltip-home');
  const heightHome = (categoriesSum.home / maxVal) * 100;
  barHome.style.height = `${heightHome}%`;
  tooltipHome.textContent = `Home: $${categoriesSum.home}/mo`;

  const barHealth = document.getElementById('chart-bar-health');
  const tooltipHealth = document.getElementById('chart-tooltip-health');
  const heightHealth = (categoriesSum.health / maxVal) * 100;
  barHealth.style.height = `${heightHealth}%`;
  tooltipHealth.textContent = `Health: $${categoriesSum.health}/mo`;
}

// ----------------------------------------------------
// CENTRAL DATA RE-RENDERING PIPELINE
// ----------------------------------------------------
function updateUI() {
  renderCustomerPortal();
  renderAdminPortal();
}
