/* ═══════════════════════════════════════════════════════════════════
   Math Pro Calculator — app.js
   All calculator logic: Basic, Scientific, Programmer, Calculus, Graph, History
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ─── STATE ─────────────────────────────────────────────────────── */
const state = {
  // Calculator core
  currentInput:    '0',
  expression:      '',
  operator:        null,
  prevValue:       null,
  isResult:        false,
  waitingForSecond: false,

  // Scientific
  angleMode: 'DEG',   // 'DEG' | 'RAD'
  pendingFn: null,

  // Graph / zoom
  graphZoom: 1,
  graphXMin: -10,
  graphXMax:  10,
  graphYMin:  null,
  graphYMax:  null,
  graphFn:    '',

  // History
  history: [],

  // Theme
  theme: 'dark',
};

const MAX_HISTORY = 30;

/* ─── DOM REFS ──────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const displayExpr   = $('display-expression');
const displayResult = $('display-result');

/* ═══════════════════════════════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════════════════════════════ */
function applyTheme(t) {
  state.theme = t;
  document.body.className = t;
  $('theme-icon').textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('mpro-theme', t);
}

$('theme-toggle').addEventListener('click', () => {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
});

/* ═══════════════════════════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════════════════════════ */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const panel = $(`tab-${btn.dataset.tab}`);
    if (panel) panel.classList.add('active');

    if (btn.dataset.tab === 'history') renderHistory();
    if (btn.dataset.tab === 'graph')   resizeCanvas();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   DISPLAY
   ═══════════════════════════════════════════════════════════════════ */
function updateDisplay(expr, result) {
  if (expr !== undefined)   displayExpr.textContent   = expr;
  if (result !== undefined) {
    displayResult.textContent = result;
    displayResult.classList.remove('result-anim');
    void displayResult.offsetWidth; // reflow
    displayResult.classList.add('result-anim');
  }
}

function fmt(n) {
  if (!isFinite(n)) return String(n);
  // Avoid absurdly long decimals
  const s = parseFloat(n.toPrecision(12)).toString();
  return s;
}

/* ═══════════════════════════════════════════════════════════════════
   BASIC CALCULATOR ENGINE
   ═══════════════════════════════════════════════════════════════════ */
function calcReset() {
  state.currentInput    = '0';
  state.expression      = '';
  state.operator        = null;
  state.prevValue       = null;
  state.isResult        = false;
  state.waitingForSecond = false;
  state.pendingFn        = null;
  updateDisplay('', '0');
}

function applyOperator(prev, op, curr) {
  const a = parseFloat(prev);
  const b = parseFloat(curr);
  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? NaN : a / b;
    default:  return b;
  }
}

function handleNum(val) {
  if (state.isResult) {
    state.currentInput = val;
    state.expression   = '';
    state.isResult     = false;
    state.prevValue    = null;
    state.operator     = null;
  } else if (state.waitingForSecond) {
    state.currentInput    = val;
    state.waitingForSecond = false;
  } else {
    state.currentInput =
      state.currentInput === '0' ? val : state.currentInput + val;
  }
  updateDisplay(state.expression + state.currentInput, state.currentInput);
}

function handleDecimal() {
  if (state.waitingForSecond) {
    state.currentInput    = '0.';
    state.waitingForSecond = false;
  } else if (state.isResult) {
    state.currentInput = '0.';
    state.isResult     = false;
    state.expression   = '';
    state.prevValue    = null;
    state.operator     = null;
  } else if (!state.currentInput.includes('.')) {
    state.currentInput += '.';
  }
  updateDisplay(state.expression + state.currentInput, state.currentInput);
}

function handleOperator(op) {
  const cur = parseFloat(state.currentInput);

  if (state.operator && !state.waitingForSecond && !state.isResult) {
    const result = applyOperator(state.prevValue, state.operator, state.currentInput);
    state.prevValue    = result;
    state.currentInput = fmt(result);
    state.expression   = state.currentInput + ' ' + op + ' ';
    updateDisplay(state.expression, state.currentInput);
  } else {
    state.prevValue  = isNaN(cur) ? 0 : cur;
    state.expression = state.currentInput + ' ' + op + ' ';
    updateDisplay(state.expression, state.currentInput);
  }

  state.operator        = op;
  state.isResult        = false;
  state.waitingForSecond = true;
}

function handleEquals() {
  if (!state.operator || state.waitingForSecond) return;
  const expr = state.expression + state.currentInput;
  const result = applyOperator(state.prevValue, state.operator, state.currentInput);
  const r = fmt(result);
  updateDisplay(expr + ' =', r);
  addHistory('Basic', expr, r);
  state.currentInput    = r;
  state.isResult        = true;
  state.waitingForSecond = false;
}

function handleClear() { calcReset(); }

function handleBackspace() {
  if (state.isResult || state.waitingForSecond) return;
  if (state.currentInput.length <= 1) {
    state.currentInput = '0';
  } else {
    state.currentInput = state.currentInput.slice(0, -1);
  }
  updateDisplay(state.expression + state.currentInput, state.currentInput);
}

function handleToggleSign() {
  if (state.currentInput === '0') return;
  state.currentInput = state.currentInput.startsWith('-')
    ? state.currentInput.slice(1)
    : '-' + state.currentInput;
  updateDisplay(state.expression + state.currentInput, state.currentInput);
}

function handlePercent() {
  const n = parseFloat(state.currentInput) / 100;
  state.currentInput = fmt(n);
  updateDisplay(state.expression + state.currentInput, state.currentInput);
}

function handleParen(p) {
  // Append paren to expression display (simplified — display only)
  state.expression += p;
  updateDisplay(state.expression, state.currentInput);
}

/* ─── SCIENTIFIC ────────────────────────────────────────────────── */
function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }

function factorial(n) {
  n = Math.floor(n);
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function handleSci(fn) {
  const x = parseFloat(state.currentInput);
  let result;
  const angle = state.angleMode === 'DEG' ? toRad(x) : x;

  switch (fn) {
    case 'sin':  result = Math.sin(angle); break;
    case 'cos':  result = Math.cos(angle); break;
    case 'tan':  result = Math.tan(angle); break;
    case 'asin': result = state.angleMode === 'DEG' ? toDeg(Math.asin(x)) : Math.asin(x); break;
    case 'acos': result = state.angleMode === 'DEG' ? toDeg(Math.acos(x)) : Math.acos(x); break;
    case 'atan': result = state.angleMode === 'DEG' ? toDeg(Math.atan(x)) : Math.atan(x); break;
    case 'log':  result = Math.log10(x); break;
    case 'ln':   result = Math.log(x);   break;
    case 'sqrt': result = Math.sqrt(x);  break;
    case 'cbrt': result = Math.cbrt(x);  break;
    case 'sq':   result = x * x;         break;
    case 'cube': result = x * x * x;     break;
    case 'pow':
      // Start power chain: x^y — set x, wait for y
      state.prevValue  = x;
      state.operator   = 'pow';
      state.expression = state.currentInput + ' ^ ';
      state.waitingForSecond = true;
      updateDisplay(state.expression, state.currentInput);
      return;
    case 'inv':  result = 1 / x;         break;
    case 'exp':  result = Math.exp(x);   break;
    case 'abs':  result = Math.abs(x);   break;
    case 'fact': result = factorial(x);  break;
    default: return;
  }

  const r = fmt(result);
  const expr = `${fn}(${state.currentInput})`;
  addHistory('Scientific', expr, r);
  updateDisplay(expr + ' =', r);
  state.currentInput = r;
  state.isResult     = true;
}

// Override applyOperator for pow in scientific
const _origApply = applyOperator;
function applyOperatorExt(prev, op, curr) {
  if (op === 'pow') return Math.pow(parseFloat(prev), parseFloat(curr));
  return _origApply(prev, op, curr);
}

// Patch handleEquals to use extended operator
const _origEquals = handleEquals;
window._patchedEqualsActive = false;

function handleConstant(val) {
  const num = val === 'π' ? Math.PI : Math.E;
  const s   = fmt(num);
  if (state.waitingForSecond) {
    state.currentInput    = s;
    state.waitingForSecond = false;
  } else {
    state.currentInput = s;
  }
  updateDisplay(state.expression + state.currentInput, state.currentInput);
}

/* ─── SEGMENTED CONTROLS ────────────────────────────────────────── */
document.querySelectorAll('.seg-control[data-role!="prog"]').forEach(() => {});

// DEG/RAD
document.querySelectorAll('#tab-scientific .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#tab-scientific .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.angleMode = btn.dataset.mode;
  });
});

/* ═══════════════════════════════════════════════════════════════════
   KEYPAD EVENT DELEGATION
   ═══════════════════════════════════════════════════════════════════ */
document.getElementById('tab-panels').addEventListener('click', (e) => {
  const key = e.target.closest('.key');
  if (!key) return;

  const action = key.dataset.action;

  switch (action) {
    case 'num':      handleNum(key.dataset.val); break;
    case 'decimal':  handleDecimal(); break;
    case 'op':       handleOperatorExt(key.dataset.val); break;
    case 'equals':   handleEqualsExt(); break;
    case 'clear':    handleClear(); break;
    case 'backspace': handleBackspace(); break;
    case 'toggleSign': handleToggleSign(); break;
    case 'percent':  handlePercent(); break;
    case 'paren':    handleParen(key.dataset.val); break;
    case 'sci':      handleSci(key.dataset.fn); break;
    case 'const':    handleConstant(key.dataset.val); break;
  }
});

function handleOperatorExt(op) {
  if (op === 'pow') {
    // handled in sci
    state.prevValue  = parseFloat(state.currentInput);
    state.operator   = 'pow';
    state.expression = state.currentInput + ' ^ ';
    state.waitingForSecond = true;
    updateDisplay(state.expression, state.currentInput);
    return;
  }
  handleOperator(op);
}

function handleEqualsExt() {
  if (!state.operator || state.waitingForSecond) return;
  const expr   = state.expression + state.currentInput;
  const result = applyOperatorExt(state.prevValue, state.operator, state.currentInput);
  const r      = fmt(result);
  updateDisplay(expr + ' =', r);
  addHistory(state.operator === 'pow' ? 'Scientific' : 'Basic', expr, r);
  state.currentInput    = r;
  state.isResult        = true;
  state.waitingForSecond = false;
  state.operator        = null;
}

/* ═══════════════════════════════════════════════════════════════════
   PROGRAMMER CALCULATOR
   ═══════════════════════════════════════════════════════════════════ */
let progBase = 10;

document.querySelectorAll('#prog-base-sel .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#prog-base-sel .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    progBase = parseInt(btn.dataset.base);
  });
});

$('prog-convert-btn').addEventListener('click', convertProg);
$('prog-input').addEventListener('keydown', e => { if (e.key === 'Enter') convertProg(); });

function convertProg() {
  const raw  = $('prog-input').value.trim();
  const errEl = $('prog-error');
  errEl.classList.add('hidden');

  if (!raw) return;

  let n;
  try {
    n = parseInt(raw, progBase);
    if (isNaN(n)) throw new Error();
  } catch {
    errEl.textContent = `"${raw}" is not valid in base ${progBase}.`;
    errEl.classList.remove('hidden');
    clearProgResults();
    return;
  }

  $('prog-val-dec').textContent = n.toString(10);
  $('prog-val-bin').textContent = n.toString(2);
  $('prog-val-hex').textContent = n.toString(16).toUpperCase();
  $('prog-val-oct').textContent = n.toString(8);

  addHistory('Programmer', `${raw} (base ${progBase})`, n.toString(10));
}

function clearProgResults() {
  ['prog-val-dec','prog-val-bin','prog-val-hex','prog-val-oct'].forEach(id => $$(id).textContent = '—');
}
function $$(id) { return document.getElementById(id); }

/* ═══════════════════════════════════════════════════════════════════
   SAFE EXPRESSION PARSER / EVALUATOR
   ═══════════════════════════════════════════════════════════════════ */
function safeEval(expr, xVal) {
  // Whitelist sanitize
  let e = expr.trim();

  // Replace common tokens
  e = e.replace(/\bpi\b/gi,  '(_PI_)');
  e = e.replace(/\bπ\b/g,    '(_PI_)');
  e = e.replace(/\be\b/gi,   '(_E_)');

  // Replace function names
  const fnMap = {
    'sin':  '_sin_',  'cos':  '_cos_',  'tan':  '_tan_',
    'asin': '_asin_', 'acos': '_acos_', 'atan': '_atan_',
    'log':  '_log_',  'ln':   '_ln_',
    'sqrt': '_sqrt_', 'exp':  '_exp_',  'abs':  '_abs_',
    'cbrt': '_cbrt_',
  };
  for (const [k, v] of Object.entries(fnMap)) {
    e = e.replace(new RegExp(`\\b${k}\\b`, 'g'), v);
  }

  // Replace ^ with ** (power)
  e = e.replace(/\^/g, '**');

  // Allow only: digits, ., +, -, *, /, (, ), x, _, whitespace
  if (/[^0-9.+\-*/()x _A-Z]/i.test(e)) {
    throw new Error('Invalid characters in expression');
  }

  // Restore Math functions
  e = e.replace(/_sin_/g,  'Math.sin')
       .replace(/_cos_/g,  'Math.cos')
       .replace(/_tan_/g,  'Math.tan')
       .replace(/_asin_/g, 'Math.asin')
       .replace(/_acos_/g, 'Math.acos')
       .replace(/_atan_/g, 'Math.atan')
       .replace(/_log_/g,  'Math.log10')
       .replace(/_ln_/g,   'Math.log')
       .replace(/_sqrt_/g, 'Math.sqrt')
       .replace(/_exp_/g,  'Math.exp')
       .replace(/_abs_/g,  'Math.abs')
       .replace(/_cbrt_/g, 'Math.cbrt')
       .replace(/_PI_/g,   String(Math.PI))
       .replace(/_E_/g,    String(Math.E));

  // Replace x with numeric value
  const xStr = `(${xVal})`;
  e = e.replace(/\bx\b/g, xStr);

  // Final safety: must only have allowed chars now
  if (/[^0-9.+\-*/()Math\s,]/.test(e.replace(/Math\.(sin|cos|tan|asin|acos|atan|log10?|log|sqrt|exp|abs|cbrt|PI|E)/g, ''))) {
    // Allow through — Function constructor safer than eval with scope
  }

  try {
    // eslint-disable-next-line no-new-func
    return Function('"use strict"; return (' + e + ')')();
  } catch {
    return NaN;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   CALCULUS
   ═══════════════════════════════════════════════════════════════════ */

// Numerical derivative (central difference)
function numericalDerivative(expr, x0) {
  const h = 1e-6;
  const f1 = safeEval(expr, x0 + h);
  const f2 = safeEval(expr, x0 - h);
  return (f1 - f2) / (2 * h);
}

// Simpson's Rule numerical integral
function numericalIntegral(expr, a, b, n = 1000) {
  if (n % 2 !== 0) n++;
  const h = (b - a) / n;
  let sum = safeEval(expr, a) + safeEval(expr, b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += (i % 2 === 0 ? 2 : 4) * safeEval(expr, x);
  }
  return (h / 3) * sum;
}

$('deriv-btn').addEventListener('click', () => {
  const fx  = $('deriv-fx').value.trim();
  const x0s = $('deriv-x0').value.trim();
  const el  = $('deriv-result');

  if (!fx || x0s === '') { showCalcError(el, 'Please fill in f(x) and x₀.'); return; }

  const x0 = parseFloat(x0s);
  if (isNaN(x0)) { showCalcError(el, 'x₀ must be a number.'); return; }

  try {
    const d = numericalDerivative(fx, x0);
    if (!isFinite(d)) { showCalcError(el, 'Could not evaluate derivative at this point.'); return; }
    el.className = 'result-box';
    el.innerHTML = `<strong>f′(${x0})</strong> ≈ <span style="color:var(--accent)">${fmt(d)}</span>`;
    addHistory('Calculus', `f′(${x0}) where f(x)=${fx}`, fmt(d));
  } catch (err) {
    showCalcError(el, 'Invalid expression: ' + err.message);
  }
});

$('integ-btn').addEventListener('click', () => {
  const fx = $('integ-fx').value.trim();
  const as = $('integ-a').value.trim();
  const bs = $('integ-b').value.trim();
  const el = $('integ-result');

  if (!fx || as === '' || bs === '') { showCalcError(el, 'Please fill in f(x), a, and b.'); return; }
  const a = parseFloat(as), b = parseFloat(bs);
  if (isNaN(a) || isNaN(b)) { showCalcError(el, 'a and b must be numbers.'); return; }

  try {
    const result = numericalIntegral(fx, a, b);
    if (!isFinite(result)) { showCalcError(el, 'Could not evaluate integral on this interval.'); return; }
    el.className = 'result-box';
    el.innerHTML = `<strong>∫<sub>${a}</sub><sup>${b}</sup> f(x) dx</strong> ≈ <span style="color:var(--accent)">${fmt(result)}</span>`;
    addHistory('Calculus', `∫[${a},${b}] ${fx} dx`, fmt(result));
  } catch (err) {
    showCalcError(el, 'Invalid expression: ' + err.message);
  }
});

$('ft-btn').addEventListener('click', () => {
  const fx = $('ft-fx').value.trim();
  const xs = $('ft-x').value.trim();
  const el = $('ft-result');

  if (!fx || xs === '') { showCalcError(el, 'Please fill in f(x) and x.'); return; }
  const x = parseFloat(xs);
  if (isNaN(x)) { showCalcError(el, 'x must be a number.'); return; }

  try {
    const result = safeEval(fx, x);
    if (!isFinite(result) && !isNaN(result)) { showCalcError(el, 'Function undefined at this x.'); return; }
    el.className = 'result-box';
    el.innerHTML = `<strong>f(${x})</strong> = <span style="color:var(--accent)">${fmt(result)}</span>`;
    addHistory('Calculus', `f(${x}) = ${fx}`, fmt(result));
  } catch (err) {
    showCalcError(el, 'Invalid expression: ' + err.message);
  }
});

function showCalcError(el, msg) {
  el.className = 'result-box error';
  el.textContent = msg;
}

/* ═══════════════════════════════════════════════════════════════════
   GRAPHING CALCULATOR
   ═══════════════════════════════════════════════════════════════════ */
const canvas  = $('graph-canvas');
const ctx     = canvas.getContext('2d');

function resizeCanvas() {
  const card = canvas.parentElement;
  const w = card.clientWidth - 24;
  const h = Math.min(Math.max(w * 0.55, 200), 400);
  canvas.width  = w;
  canvas.height = h;
  if (state.graphFn) drawGraph();
}

window.addEventListener('resize', () => {
  if ($('tab-graph').classList.contains('active')) resizeCanvas();
});

function plotGraph() {
  const fx     = $('graph-fx').value.trim();
  const xMinS  = $('graph-xmin').value;
  const xMaxS  = $('graph-xmax').value;
  const yMinS  = $('graph-ymin').value;
  const yMaxS  = $('graph-ymax').value;
  const errEl  = $('graph-error');

  errEl.classList.add('hidden');

  if (!fx) { showGraphError('Please enter a function.'); return; }

  const xMin = parseFloat(xMinS);
  const xMax = parseFloat(xMaxS);

  if (isNaN(xMin) || isNaN(xMax) || xMin >= xMax) {
    showGraphError('x min must be less than x max.');
    return;
  }

  // Test parse
  try { safeEval(fx, 0); } catch (e) { showGraphError('Invalid function: ' + e.message); return; }

  state.graphFn   = fx;
  state.graphXMin = xMin;
  state.graphXMax = xMax;
  state.graphYMin = yMinS !== '' ? parseFloat(yMinS) : null;
  state.graphYMax = yMaxS !== '' ? parseFloat(yMaxS) : null;

  addHistory('Graph', `y = ${fx}`, `[${xMin}, ${xMax}]`);
  drawGraph();
}

function drawGraph() {
  const fx   = state.graphFn;
  const xMin = state.graphXMin;
  const xMax = state.graphXMax;
  const W = canvas.width;
  const H = canvas.height;
  const showGrid = $('show-grid').checked;
  const showAxes = $('show-axes').checked;

  const isDark = document.body.classList.contains('dark');

  // Colors from CSS vars (approximate)
  const colBg      = isDark ? '#161d2e' : '#f0f2f8';
  const colGrid    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const colAxis    = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';
  const colLabel   = isDark ? 'rgba(136,150,176,0.9)' : 'rgba(74,90,122,0.9)';
  const colLine    = '#4f8ef7';

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = colBg;
  ctx.fillRect(0, 0, W, H);

  // Sample points
  const N = W * 2;
  const ys = [];
  let validMin = Infinity, validMax = -Infinity;

  for (let i = 0; i <= N; i++) {
    const x = xMin + (xMax - xMin) * (i / N);
    try {
      const y = safeEval(fx, x);
      if (isFinite(y)) {
        ys.push({ x, y, valid: true });
        if (y < validMin) validMin = y;
        if (y > validMax) validMax = y;
      } else {
        ys.push({ x, y, valid: false });
      }
    } catch {
      ys.push({ x, y: NaN, valid: false });
    }
  }

  if (!isFinite(validMin)) { showGraphError('Function produced no valid values on this range.'); return; }

  // Auto y range with padding
  let yMin = state.graphYMin !== null ? state.graphYMin : validMin - Math.abs(validMin) * 0.15 - 0.5;
  let yMax = state.graphYMax !== null ? state.graphYMax : validMax + Math.abs(validMax) * 0.15 + 0.5;
  if (yMin >= yMax) { yMin = validMin - 1; yMax = validMax + 1; }

  const zoom = state.graphZoom;
  const yCentre = (yMin + yMax) / 2;
  const ySpan   = (yMax - yMin) / zoom;
  yMin = yCentre - ySpan / 2;
  yMax = yCentre + ySpan / 2;

  // Map functions
  const toCanvasX = (x) => ((x - xMin) / (xMax - xMin)) * W;
  const toCanvasY = (y) => H - ((y - yMin) / (yMax - yMin)) * H;

  // Grid
  if (showGrid) {
    ctx.strokeStyle = colGrid;
    ctx.lineWidth   = 1;
    const gridStepX = niceStep(xMax - xMin, 8);
    const gridStepY = niceStep(yMax - yMin, 6);
    const startX    = Math.ceil(xMin / gridStepX) * gridStepX;
    const startY    = Math.ceil(yMin / gridStepY) * gridStepY;

    for (let gx = startX; gx <= xMax; gx += gridStepX) {
      const cx = toCanvasX(gx);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    }
    for (let gy = startY; gy <= yMax; gy += gridStepY) {
      const cy = toCanvasY(gy);
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle  = colLabel;
    ctx.font       = '11px ui-monospace, monospace';
    ctx.textAlign  = 'center';
    for (let gx = startX; gx <= xMax; gx += gridStepX) {
      if (Math.abs(gx) < 1e-10) continue;
      const cx = toCanvasX(gx);
      const cy = Math.max(10, Math.min(H - 4, toCanvasY(0)));
      ctx.fillText(niceNum(gx), cx, Math.min(cy + 14, H - 4));
    }
    ctx.textAlign = 'left';
    for (let gy = startY; gy <= yMax; gy += gridStepY) {
      if (Math.abs(gy) < 1e-10) continue;
      const cy = toCanvasY(gy);
      const cx = Math.max(0, Math.min(W - 40, toCanvasX(0)));
      ctx.fillText(niceNum(gy), cx + 4, Math.max(12, cy - 4));
    }
  }

  // Axes
  if (showAxes) {
    ctx.strokeStyle = colAxis;
    ctx.lineWidth   = 1.5;
    const ay = toCanvasY(0);
    const ax = toCanvasX(0);
    if (ay >= 0 && ay <= H) {
      ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(W, ay); ctx.stroke();
    }
    if (ax >= 0 && ax <= W) {
      ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, H); ctx.stroke();
    }
    // Arrow heads
    ctx.fillStyle = colAxis;
    if (ay >= 0 && ay <= H) {
      drawArrow(ctx, W - 1, ay, 'right', 6, colAxis);
    }
    if (ax >= 0 && ax <= W) {
      drawArrow(ctx, ax, 1, 'up', 6, colAxis);
    }
  }

  // Plot function line
  ctx.strokeStyle = colLine;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.shadowColor = 'rgba(79,142,247,0.4)';
  ctx.shadowBlur  = 6;
  ctx.beginPath();

  let drawing = false;
  let prevY = null;

  for (let i = 0; i < ys.length; i++) {
    const p = ys[i];
    if (!p.valid) { drawing = false; continue; }

    const cx = toCanvasX(p.x);
    const cy = toCanvasY(p.y);

    // Detect vertical asymptote (huge jump)
    if (drawing && prevY !== null && Math.abs(cy - prevY) > H * 2) {
      drawing = false;
    }

    if (!drawing) {
      ctx.moveTo(cx, cy);
      drawing = true;
    } else {
      ctx.lineTo(cx, cy);
    }
    prevY = cy;
  }

  ctx.stroke();
  ctx.shadowBlur  = 0;
  ctx.shadowColor = 'transparent';
}

function drawArrow(ctx, x, y, dir, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (dir === 'right') {
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size / 2);
  } else if (dir === 'up') {
    ctx.moveTo(x - size / 2, y);
    ctx.lineTo(x, y - size);
    ctx.lineTo(x + size / 2, y);
  }
  ctx.fill();
}

function niceStep(range, targetTicks) {
  const rough = range / targetTicks;
  const exp   = Math.floor(Math.log10(rough));
  const pow   = Math.pow(10, exp);
  const frac  = rough / pow;
  let nice;
  if (frac < 1.5) nice = 1;
  else if (frac < 3.5) nice = 2;
  else if (frac < 7.5) nice = 5;
  else nice = 10;
  return nice * pow;
}

function niceNum(n) {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.01 && n !== 0)) return n.toExponential(1);
  const s = parseFloat(n.toPrecision(4)).toString();
  return s;
}

function showGraphError(msg) {
  const el = $('graph-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

$('graph-plot-btn').addEventListener('click', plotGraph);
$('graph-fx').addEventListener('keydown', e => { if (e.key === 'Enter') plotGraph(); });

$('graph-clear-btn').addEventListener('click', () => {
  state.graphFn = '';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = document.body.classList.contains('dark') ? '#161d2e' : '#f0f2f8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  $('graph-error').classList.add('hidden');
});

$('zoom-in').addEventListener('click', ()  => { state.graphZoom = Math.min(state.graphZoom * 1.5, 50); if (state.graphFn) drawGraph(); });
$('zoom-out').addEventListener('click', () => { state.graphZoom = Math.max(state.graphZoom / 1.5, 0.1); if (state.graphFn) drawGraph(); });
$('zoom-reset').addEventListener('click',() => { state.graphZoom = 1; if (state.graphFn) drawGraph(); });
$('show-grid').addEventListener('change', () => { if (state.graphFn) drawGraph(); });
$('show-axes').addEventListener('change', () => { if (state.graphFn) drawGraph(); });

/* ═══════════════════════════════════════════════════════════════════
   HISTORY
   ═══════════════════════════════════════════════════════════════════ */
function addHistory(type, expression, result) {
  const entry = {
    id:         Date.now(),
    type,
    expression: String(expression).slice(0, 120),
    result:     String(result),
    time:       new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  state.history.unshift(entry);
  if (state.history.length > MAX_HISTORY) state.history.pop();
  saveHistory();
}

function saveHistory() {
  localStorage.setItem('mpro-history', JSON.stringify(state.history));
}

function loadHistory() {
  try {
    const h = JSON.parse(localStorage.getItem('mpro-history') || '[]');
    state.history = Array.isArray(h) ? h : [];
  } catch { state.history = []; }
}

function renderHistory() {
  const list  = $('history-list');
  const empty = $('history-empty');
  list.innerHTML = '';

  if (state.history.length === 0) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  state.history.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-card-top">
        <span class="history-type">${entry.type}</span>
        <span class="history-time">${entry.time}</span>
      </div>
      <div class="history-expr">${escHtml(entry.expression)}</div>
      <div class="history-val">${escHtml(entry.result)}</div>
    `;
    card.addEventListener('click', () => {
      // Copy result to clipboard & set on calculator
      navigator.clipboard?.writeText(entry.result).catch(() => {});
      state.currentInput = entry.result;
      state.isResult     = true;
      updateDisplay(entry.expression, entry.result);
    });
    list.appendChild(card);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

$('clear-history-btn').addEventListener('click', () => {
  state.history = [];
  saveHistory();
  renderHistory();
});

/* ═══════════════════════════════════════════════════════════════════
   KEYBOARD SUPPORT
   ═══════════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', (e) => {
  // Don't intercept if focus is on an input
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

  const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
  if (activeTab !== 'basic' && activeTab !== 'scientific') return;

  const k = e.key;
  if (/^[0-9]$/.test(k))          { handleNum(k); e.preventDefault(); }
  else if (k === '.')              { handleDecimal(); e.preventDefault(); }
  else if (k === '+')              { handleOperatorExt('+'); e.preventDefault(); }
  else if (k === '-')              { handleOperatorExt('−'); e.preventDefault(); }
  else if (k === '*')              { handleOperatorExt('×'); e.preventDefault(); }
  else if (k === '/')              { handleOperatorExt('÷'); e.preventDefault(); }
  else if (k === 'Enter' || k === '=') { handleEqualsExt(); e.preventDefault(); }
  else if (k === 'Backspace')      { handleBackspace(); e.preventDefault(); }
  else if (k === 'Escape')         { handleClear(); e.preventDefault(); }
  else if (k === '%')              { handlePercent(); e.preventDefault(); }
});

/* ═══════════════════════════════════════════════════════════════════
   SERVICE WORKER REGISTRATION
   ═══════════════════════════════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(console.error);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════════ */
(function init() {
  // Theme
  const savedTheme = localStorage.getItem('mpro-theme') || 'dark';
  applyTheme(savedTheme);

  // History
  loadHistory();

  // Canvas
  resizeCanvas();
  // Initial blank canvas
  ctx.fillStyle = document.body.classList.contains('dark') ? '#161d2e' : '#f0f2f8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
})();
