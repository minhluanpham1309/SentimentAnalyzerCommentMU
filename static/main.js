// main.js — Frontend logic

let pieChart = null;

// ── Tab switching ──────────────────────────────────────────────────────────
function switchTab(idx, el) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  document.querySelectorAll('.panel').forEach((p, i) => p.classList.toggle('active', i === idx));
}

// ── Tab 1: Single predict ─────────────────────────────────────────────────
async function analyzeSingle() {
  const text = document.getElementById('singleInput').value.trim();
  if (!text) return;

  const btn = document.getElementById('singleBtn');
  btn.disabled = true;
  document.getElementById('singleLoading').style.display = 'block';
  document.getElementById('singleResult').style.display  = 'none';

  try {
    const res  = await fetch('/predict', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ text }),
    });
    const data = await res.json();
    renderSingleResult(data, text);
  } catch (e) {
    alert('Lỗi: ' + e.message);
  } finally {
    btn.disabled = false;
    document.getElementById('singleLoading').style.display = 'none';
  }
}

function renderSingleResult(data, text) {
  const lbl = document.getElementById('resultLabel');
  lbl.textContent = data.label_vi.toUpperCase();
  lbl.className   = 'result-label ' + data.label;

  document.getElementById('resultText').textContent =
    '"' + text.slice(0, 100) + (text.length > 100 ? '…' : '') + '"';

  setBar('Neg', data.scores.negative);
  setBar('Neu', data.scores.neutral);
  setBar('Pos', data.scores.positive);

  document.getElementById('singleResult').style.display = 'block';
}

function setBar(name, val) {
  const pct = (val * 100).toFixed(1);
  document.getElementById('bar' + name).style.width    = pct + '%';
  document.getElementById('val' + name).textContent    = pct + '%';
}

// ── Tab 2: Batch predict ──────────────────────────────────────────────────
async function analyzeBatch() {
  const raw = document.getElementById('batchInput').value.trim();
  let texts;
  try {
    texts = JSON.parse(raw);
  } catch (e) {
    alert('JSON không hợp lệ! Ví dụ: ["câu 1", "câu 2"]');
    return;
  }
  if (!Array.isArray(texts) || texts.length === 0) {
    alert('Cần ít nhất 1 câu!');
    return;
  }

  const btn = document.getElementById('batchBtn');
  btn.disabled = true;
  document.getElementById('batchLoading').style.display = 'block';
  document.getElementById('batchResult').style.display  = 'none';

  try {
    const res  = await fetch('/predict_batch', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ texts }),
    });
    const data = await res.json();
    renderBatchResult(data);
  } catch (e) {
    alert('Lỗi: ' + e.message);
  } finally {
    btn.disabled = false;
    document.getElementById('batchLoading').style.display = 'none';
  }
}

function renderBatchResult(data) {
  const { results, counts } = data;

  // Stats
  document.getElementById('cntNeg').textContent = counts.negative;
  document.getElementById('cntNeu').textContent = counts.neutral;
  document.getElementById('cntPos').textContent = counts.positive;

  // Pie chart
  if (pieChart) pieChart.destroy();
  const ctx = document.getElementById('pieChart').getContext('2d');
  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels  : ['Tiêu cực', 'Trung tính', 'Tích cực'],
      datasets: [{
        data           : [counts.negative, counts.neutral, counts.positive],
        backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
        borderColor    : '#141418',
        borderWidth    : 3,
      }],
    },
    options: {
      responsive       : true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels  : { color: '#e8e8f0', font: { size: 13 }, padding: 20 },
        },
      },
    },
  });

  // Result list
  const list = document.getElementById('resultList');
  list.innerHTML = results.map(r => `
    <div class="result-item">
      <span class="badge ${r.label}">${r.label_vi}</span>
      <span class="item-text">${escHtml(r.text.slice(0, 120))}${r.text.length > 120 ? '…' : ''}</span>
    </div>
  `).join('');

  document.getElementById('batchResult').style.display = 'block';
}

// ── Helpers ───────────────────────────────────────────────────────────────
function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Ctrl+Enter để submit tab 1
document.getElementById('singleInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.ctrlKey) analyzeSingle();
});
