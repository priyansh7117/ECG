// ==========================================
//  ECG Anomaly Detector — app.js
//  All logic: CSV parsing, anomaly detection,
//  chart rendering, and Claude AI analysis.
// ==========================================

// ---- YOUR ANTHROPIC API KEY ----
// Replace the string below with your actual key from https://console.anthropic.com
const ANTHROPIC_API_KEY = "YOUR_API_KEY_HERE";

// ---- Global State ----
let ecgData    = [];
let anomalies  = [];
let chartInst  = null;
let csvContent = '';
let fileName   = '';

// ==========================================
//  STATUS HELPERS
// ==========================================

function setStatus(type, text) {
  document.getElementById('statusDot').className  = 'status-dot ' + type;
  document.getElementById('statusText').textContent = text;
}

// ==========================================
//  DRAG & DROP
// ==========================================

function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.add('drag-over');
}

function handleDragLeave() {
  document.getElementById('uploadZone').classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function handleFile(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

// ==========================================
//  FILE PROCESSING
// ==========================================

function processFile(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    alert('Please upload a .csv file.');
    return;
  }
  fileName = file.name;
  const reader = new FileReader();
  reader.onload = function (e) {
    csvContent = e.target.result;
    parseCSV(csvContent);
  };
  reader.readAsText(file);
}

function parseCSV(content) {
  const lines  = content.trim().split('\n');
  const values = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip header rows (non-numeric first token)
    const parts = trimmed.split(',');
    let found = false;

    for (const part of parts) {
      const n = parseFloat(part.trim());
      if (!isNaN(n)) {
        values.push(n);
        found = true;
        break;
      }
    }
  }

  if (values.length < 5) {
    alert('Could not parse valid ECG values.\nMake sure the CSV has numeric values (one per row, or comma-separated).');
    return;
  }

  ecgData = values;

  document.getElementById('fileInfo').innerHTML =
    '<span class="file-name">' + fileName + '</span> — ' + values.length + ' data points loaded';
  document.getElementById('analyzeBtn').disabled = false;

  setStatus('normal', 'File loaded — ready to analyze');
  updateMetrics(false);
  renderChart(false);
}

// ==========================================
//  ANOMALY DETECTION  (Z-score method)
// ==========================================

function detectAnomalies(data) {
  const n    = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const std  = Math.sqrt(data.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 1;

  const THRESHOLD = 2.5;   // Z-score cutoff
  const result    = [];

  for (let i = 0; i < n; i++) {
    const z = Math.abs(data[i] - mean) / std;
    if (z > THRESHOLD) {
      result.push({
        index:    i,
        value:    data[i],
        zScore:   z,
        type:     data[i] > mean ? 'Elevated spike' : 'Signal drop',
        severity: z > 4 ? 'high' : z > 3 ? 'med' : 'low'
      });
    }
  }

  return result;
}

// ==========================================
//  METRICS UPDATE
// ==========================================

function updateMetrics(analyzed) {
  const pts = ecgData.length;

  document.getElementById('metricPoints').textContent  = pts.toLocaleString();
  document.getElementById('metricDuration').textContent = (pts / 360).toFixed(1) + 's estimated';

  if (!analyzed) {
    ['metricAnomalies','metricAnomalyPct','metricHR','metricQuality','metricQualityLabel'].forEach(id => {
      const el = document.getElementById(id);
      el.textContent = id.includes('Pct') || id.includes('Label') ? 'Run analysis first' : '—';
    });
    return;
  }

  // Anomaly count
  const a = anomalies.length;
  document.getElementById('metricAnomalies').textContent  = a;
  document.getElementById('metricAnomalyPct').textContent = ((a / pts) * 100).toFixed(2) + '% of signal';

  // Rough heart-rate from peak counting
  const win = Math.max(1, Math.floor(pts / 40));
  let peakCount = 0;
  for (let i = win; i < pts - win; i++) {
    const slice = ecgData.slice(i - win, i + win);
    if (ecgData[i] === Math.max(...slice)) peakCount++;
  }
  const hr = peakCount > 1 ? Math.round((peakCount / (pts / 360)) * 60) : null;
  document.getElementById('metricHR').textContent     = hr ? hr : '—';
  document.getElementById('metricHRLabel').textContent = hr ? 'bpm' : '—';

  // Signal quality (SNR proxy)
  const range = Math.max(...ecgData) - Math.min(...ecgData);
  const mean  = ecgData.reduce((a, b) => a + b, 0) / pts;
  const std   = Math.sqrt(ecgData.reduce((a, b) => a + (b - mean) ** 2, 0) / pts) || 1;
  const snr   = range / std;
  const qual  = snr > 5 ? 'Good' : snr > 2 ? 'Fair' : 'Poor';

  const qEl = document.getElementById('metricQuality');
  qEl.textContent  = qual;
  qEl.className    = 'metric-value ' + (qual === 'Good' ? 'success' : qual === 'Fair' ? 'warn' : 'danger');
  document.getElementById('metricQualityLabel').textContent = 'Signal clarity';
}

// ==========================================
//  CHART RENDERING (Chart.js)
// ==========================================

function renderChart(showAnomalies) {
  const MAX_DISPLAY = 600;
  const step    = ecgData.length > MAX_DISPLAY ? Math.floor(ecgData.length / MAX_DISPLAY) : 1;
  const display = [];
  const labels  = [];

  for (let i = 0; i < ecgData.length; i += step) {
    display.push(ecgData[i]);
    labels.push(i);
  }

  const anomalySet   = new Set(anomalies.map(a => a.index));
  const pointColors  = display.map((_, idx) =>
    showAnomalies && anomalySet.has(idx * step) ? '#e24b4a' : 'transparent');
  const pointRadii   = display.map((_, idx) =>
    showAnomalies && anomalySet.has(idx * step) ? 5 : 0);

  if (chartInst) { chartInst.destroy(); chartInst = null; }

  const ctx = document.getElementById('ecgChart').getContext('2d');

  chartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'ECG Signal',
        data: display,
        borderColor: '#1d9e75',
        borderWidth: 1.5,
        fill: false,
        tension: 0.1,
        pointBackgroundColor: pointColors,
        pointRadius: pointRadii,
        pointHoverRadius: 6,
        pointBorderColor: pointColors,
        pointBorderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const realIdx = ctx.dataIndex * step;
              const isAnom  = showAnomalies && anomalySet.has(realIdx);
              return 'Value: ' + ctx.parsed.y.toFixed(4) + (isAnom ? '  ⚠ Anomaly' : '');
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: { color: 'rgba(128,128,128,0.1)' },
          ticks: { maxTicksLimit: 8, color: '#888', font: { size: 11 } },
          title: { display: true, text: 'Sample Index', color: '#888', font: { size: 11 } }
        },
        y: {
          display: true,
          grid: { color: 'rgba(128,128,128,0.1)' },
          ticks: { maxTicksLimit: 6, color: '#888', font: { size: 11 } },
          title: { display: true, text: 'Amplitude (mV)', color: '#888', font: { size: 11 } }
        }
      }
    }
  });
}

// ==========================================
//  ANOMALY LIST RENDERING
// ==========================================

function renderAnomalyList() {
  const list  = document.getElementById('anomalyList');
  const badge = document.getElementById('anomalyBadge');

  if (anomalies.length === 0) {
    badge.textContent = 'None detected';
    badge.className   = 'badge success';
    list.innerHTML    = `
      <div class="empty-state">
        <p style="color:#1d9e75;font-weight:500">No anomalies detected</p>
        <p>ECG signal appears normal</p>
      </div>`;
    return;
  }

  badge.textContent = anomalies.length + ' found';
  badge.className   = 'badge danger';

  const rows = anomalies.slice(0, 8).map(a => `
    <div class="anomaly-row">
      <span class="anom-time">#${a.index}</span>
      <span class="anom-type">${a.type}</span>
      <span class="anom-conf">Z: ${a.zScore.toFixed(2)}</span>
      <span class="sev-badge sev-${a.severity}">
        ${a.severity === 'high' ? 'High' : a.severity === 'med' ? 'Medium' : 'Low'}
      </span>
    </div>`).join('');

  const extra = anomalies.length > 8
    ? `<div class="anomaly-row" style="color:var(--text-secondary)">+ ${anomalies.length - 8} more anomalies</div>`
    : '';

  list.innerHTML = rows + extra;
}

// ==========================================
//  MAIN ANALYSIS FUNCTION
// ==========================================

async function runAnalysis() {
  if (!ecgData.length) return;

  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="border-top-color:white"></div> Analyzing...';
  setStatus('analyzing', 'Running anomaly detection…');

  document.getElementById('aiContent').innerHTML =
    '<div class="ai-loading"><div class="spinner"></div> Claude AI is analyzing your ECG data…</div>';

  // 1. Local Z-score detection
  anomalies = detectAnomalies(ecgData);

  // 2. Update UI
  updateMetrics(true);
  renderChart(true);
  renderAnomalyList();

  // 3. Build prompt for Claude AI
  const pts     = ecgData.length;
  const mean    = (ecgData.reduce((a,b)=>a+b,0) / pts).toFixed(4);
  const std     = Math.sqrt(ecgData.reduce((a,b)=>a+(b-mean)**2,0) / pts).toFixed(4);
  const minV    = Math.min(...ecgData).toFixed(4);
  const maxV    = Math.max(...ecgData).toFixed(4);
  const highA   = anomalies.filter(a=>a.severity==='high').length;
  const medA    = anomalies.filter(a=>a.severity==='med').length;
  const spikeA  = anomalies.filter(a=>a.type==='Elevated spike').length;
  const dropA   = anomalies.filter(a=>a.type==='Signal drop').length;

  const prompt = `You are a clinical ECG analysis assistant. Analyze the following ECG data summary and provide a brief clinical interpretation.

ECG Data Statistics:
- Total samples: ${pts}
- Mean amplitude: ${mean}
- Std deviation: ${std}
- Min: ${minV}, Max: ${maxV}
- Anomalies detected: ${anomalies.length} total (${highA} high severity, ${medA} medium)
- Anomaly types: ${spikeA} elevated spikes, ${dropA} signal drops
- Anomaly rate: ${((anomalies.length/pts)*100).toFixed(2)}%

Provide a 3-4 sentence clinical summary covering:
1. Overall signal assessment
2. Interpretation of the anomalies found
3. Whether this warrants clinical attention

Use clear, professional language. Be concise.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":         "application/json",
        "x-api-key":            ANTHROPIC_API_KEY,
        "anthropic-version":    "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages:   [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content.map(i => i.text || '').join('');

    document.getElementById('aiContent').innerHTML =
      '<div class="ai-content">' + text.replace(/\n/g, '<br>') + '</div>';

    if (anomalies.length === 0) {
      setStatus('normal', 'Analysis complete — no anomalies detected');
    } else if (highA > 0) {
      setStatus('warning', anomalies.length + ' anomalies detected — review recommended');
    } else {
      setStatus('normal', anomalies.length + ' minor anomalies detected');
    }

  } catch (err) {
    console.error('Claude API error:', err);
    document.getElementById('aiContent').innerHTML =
      '<div class="ai-content" style="color:#a32d2d">AI analysis unavailable (check API key or network).<br>Statistical analysis is complete: <strong>' +
      anomalies.length + ' anomalies</strong> detected using Z-score method (threshold: 2.5σ).</div>';

    setStatus(anomalies.length ? 'warning' : 'normal',
      anomalies.length + ' anomalies found (offline mode)');
  }

  btn.disabled = false;
  btn.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg> Re-analyze`;
}
