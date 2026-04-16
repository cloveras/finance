const SAV_TAX = 0.22;
const FUND_TAX = 0.3784;
const YEARS = 10;

function fmt(n) {
  return Math.round(n).toLocaleString('nb-NO');
}

function signedPct(val) {
  return (val >= 0 ? '+' : '') + val.toFixed(1) + '%';
}

function compute() {
  const savAmt  = +document.getElementById('sav-amt').value;
  const fundAmt = +document.getElementById('fund-amt').value;
  const savRate  = +document.getElementById('sav-rate').value  / 100;
  const fundRate = +document.getElementById('fund-rate').value / 100;
  const inflRate = +document.getElementById('infl-rate').value / 100;

  const rows = [];
  let savVal  = savAmt;
  let fundVal = fundAmt;

  for (let y = 1; y <= YEARS; y++) {
    const savInterest = savVal * savRate;
    savVal += savInterest - savInterest * SAV_TAX;

    const fundGain    = fundVal * fundRate;
    const fundTaxPaid = fundGain * FUND_TAX;
    const fundValPost = fundVal + fundGain - fundTaxPaid;

    const realFactor      = Math.pow(1 + inflRate, y);
    const realSavVal      = savVal      / realFactor;
    const realFundValPost = fundValPost / realFactor;

    rows.push({
      year: y,
      savVal,
      savGain:       savVal      - savAmt,
      fundValPre:    fundVal     + fundGain,
      fundTaxPaid,
      fundValPost,
      fundGainPost:  fundValPost - fundAmt,
      realSavVal,
      realFundValPost,
      realSavGain:       realSavVal      - savAmt,
      realFundGainPost:  realFundValPost - fundAmt,
    });

    fundVal = fundValPost;
  }

  return { rows, savAmt, fundAmt, inflRate };
}

function renderMetrics({ rows, savAmt, fundAmt, inflRate }) {
  const last = rows[rows.length - 1];

  const savReturnPct      = (last.savVal      - savAmt) / savAmt * 100;
  const fundReturnPct     = (last.fundValPost - fundAmt) / fundAmt * 100;
  const realSavReturnPct  = (last.realSavVal      - savAmt) / savAmt * 100;
  const realFundReturnPct = (last.realFundValPost - fundAmt) / fundAmt * 100;

  const totalFundTax = rows.reduce((s, r) => s + r.fundTaxPaid, 0);
  const diff     = last.fundValPost      - last.savVal;
  const realDiff = last.realFundValPost  - last.realSavVal;
  const isPos    = diff >= 0;

  document.getElementById('metrics').innerHTML = `
    <div class="metric">
      <div class="metric-label">Savings after 10 yr</div>
      <div class="metric-val">${fmt(last.savVal)}</div>
      <div class="metric-sub">${signedPct(savReturnPct)} nominal</div>
      <div class="metric-sub metric-real">${fmt(last.realSavVal)} real · ${signedPct(realSavReturnPct)}</div>
    </div>
    <div class="metric highlight-blue">
      <div class="metric-label">Index fund after 10 yr</div>
      <div class="metric-val blue">${fmt(last.fundValPost)}</div>
      <div class="metric-sub">${signedPct(fundReturnPct)} nominal</div>
      <div class="metric-sub metric-real">${fmt(last.realFundValPost)} real · ${signedPct(realFundReturnPct)}</div>
    </div>
    <div class="metric ${isPos ? 'highlight-green' : ''}">
      <div class="metric-label">Difference (fund vs. savings)</div>
      <div class="metric-val ${isPos ? 'green' : 'red'}">${isPos ? '+' : ''}${fmt(diff)}</div>
      <div class="metric-sub">nominal · ${isPos ? 'fund leads' : 'savings leads'}</div>
      <div class="metric-sub metric-real">${isPos ? '+' : ''}${fmt(realDiff)} real</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total fund tax paid</div>
      <div class="metric-val">${fmt(totalFundTax)}</div>
      <div class="metric-sub">at 37.84% on annual gains</div>
    </div>
  `;
}

function renderTable({ rows }) {
  document.getElementById('tbl-body').innerHTML = rows.map(r => `
    <tr>
      <td>${r.year}</td>
      <td>${fmt(r.savVal)}</td>
      <td class="td-faint">${fmt(r.realSavVal)}</td>
      <td class="td-muted">+${fmt(r.savGain)}</td>
      <td class="td-muted">${fmt(r.fundValPre)}</td>
      <td class="td-red">&minus;${fmt(r.fundTaxPaid)}</td>
      <td class="td-blue">${fmt(r.fundValPost)}</td>
      <td class="td-faint">${fmt(r.realFundValPost)}</td>
      <td class="${r.fundGainPost >= 0 ? 'td-green' : 'td-red'}">+${fmt(r.fundGainPost)}</td>
    </tr>
  `).join('');
}

let chartInstance = null;
let showReal = false;

function renderChart({ rows, savAmt, fundAmt }) {
  const labels    = ['Start', ...rows.map(r => 'Yr ' + r.year)];
  const savNom    = [savAmt,  ...rows.map(r => Math.round(r.savVal))];
  const fundNom   = [fundAmt, ...rows.map(r => Math.round(r.fundValPost))];
  const savReal   = [savAmt,  ...rows.map(r => Math.round(r.realSavVal))];
  const fundReal  = [fundAmt, ...rows.map(r => Math.round(r.realFundValPost))];

  const savData  = showReal ? savReal  : savNom;
  const fundData = showReal ? fundReal : fundNom;
  const suffix   = showReal ? ' (real)' : ' (post-tax)';

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(document.getElementById('chart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Index fund' + suffix,
          data: fundData,
          borderColor: '#1a4fa0',
          backgroundColor: 'rgba(26,79,160,0.06)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#1a4fa0',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Savings account' + suffix,
          data: savData,
          borderColor: '#1a6645',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 3,
          pointBackgroundColor: '#1a6645',
          fill: false,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#fff',
          borderColor: 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          titleColor: '#7a7870',
          bodyColor: '#1a1916',
          padding: 10,
          callbacks: {
            label: ctx =>
              ' ' + ctx.dataset.label + ': NOK ' +
              Math.round(ctx.raw).toLocaleString('nb-NO'),
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: v => 'NOK ' + (v / 1000).toFixed(0) + 'k',
            color: '#a8a69f',
            font: { family: "'DM Mono', monospace", size: 11 },
          },
          grid: { color: 'rgba(0,0,0,0.05)' },
          border: { display: false },
        },
        x: {
          ticks: {
            color: '#a8a69f',
            font: { family: "'DM Mono', monospace", size: 11 },
            autoSkip: false,
            maxRotation: 0,
          },
          grid: { display: false },
          border: { display: false },
        },
      },
    },
  });
}

function updateSliderLabels() {
  document.getElementById('sav-amt-out').textContent  = (+document.getElementById('sav-amt').value).toLocaleString('nb-NO');
  document.getElementById('fund-amt-out').textContent = (+document.getElementById('fund-amt').value).toLocaleString('nb-NO');
  document.getElementById('sav-rate-out').textContent  = (+document.getElementById('sav-rate').value).toFixed(1)  + ' %';
  document.getElementById('fund-rate-out').textContent = (+document.getElementById('fund-rate').value).toFixed(1) + ' %';
  document.getElementById('infl-rate-out').textContent = (+document.getElementById('infl-rate').value).toFixed(1) + ' %';
}

function update() {
  const data = compute();
  renderMetrics(data);
  renderChart(data);
  renderTable(data);
  updateSliderLabels();
}

['sav-amt', 'fund-amt', 'sav-rate', 'fund-rate', 'infl-rate'].forEach(id => {
  document.getElementById(id).addEventListener('input', update);
});

document.getElementById('toggle-real').addEventListener('click', function () {
  showReal = !showReal;
  this.textContent = showReal ? 'Nominal' : 'Real';
  this.classList.toggle('active', showReal);

  const legendLabels = showReal
    ? ['Index fund (real)', 'Savings (real)']
    : ['Index fund (post-tax)', 'Savings (post-tax)'];
  document.querySelectorAll('.legend-item span').forEach((el, i) => {
    el.textContent = legendLabels[i];
  });

  update();
});

update();
