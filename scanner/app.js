import store from './store.js';
import { enableWs, disableWs, isEnabled } from './ws.js';
const LOGO_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z/C/HwAF/gL+3NwHAAAAAElFTkSuQmCC';

const navbar = document.getElementById('navbar');
const main = document.getElementById('main');
const infobar = document.getElementById('infobar');

let screenStack = [];
let activeScanHandler = null;
let allowDuplicate = false;
const lastSeen = new Map();
let lastScanTs = 0;

function updateNavbar({ title = '', showBack = false }) {
  if (showBack) {
    navbar.innerHTML = `
      <div class="left"><button id="backBtn">Back</button></div>
      <div class="center">${title}</div>
      <div class="right"><button id="startBtn">Start Over</button></div>`;
    document.getElementById('backBtn').onclick = back;
    document.getElementById('startBtn').onclick = startOver;
  } else {
    navbar.innerHTML = `
      <div class="left"><img src="${LOGO_SRC}" alt="logo" height="40"></div>
      <div class="center">${title}</div>
      <div class="right"></div>`;
  }
}

function setScanHandler(fn, opts = {}) {
  activeScanHandler = fn;
  allowDuplicate = !!opts.allowDuplicate;
}

export function emitScan(epc, source = 'touch') {
  const now = Date.now();
  if (now - lastScanTs < 500) return; // debounce
  lastScanTs = now;
  if (!allowDuplicate) {
    const last = lastSeen.get(epc);
    if (last && now - last < 2000) return; // ignore duplicate within 2s
    lastSeen.set(epc, now);
  }
  const detail = { epc, source, ts: now };
  window.dispatchEvent(new CustomEvent('scan', { detail }));
}

window.emitScan = emitScan;

window.addEventListener('scan', (e) => {
  if (activeScanHandler) activeScanHandler(e.detail.epc, e.detail);
});

document.addEventListener('keydown', (e) => {
  if ([' ', 'Enter', 'F9'].includes(e.key)) {
    emitScan(`FAKE-${Date.now()}`, 'key');
  }
});

function back() {
  if (screenStack.length > 1) {
    screenStack.pop();
    const { fn, params } = screenStack[screenStack.length - 1];
    fn(params);
  } else {
    showIndex();
  }
}

function startOver() {
  screenStack = [];
  showIndex();
}

function go(fn, params) {
  screenStack.push({ fn, params });
  fn(params);
}

// Screens
function showIndex() {
  updateNavbar({ title: '' });
  main.innerHTML = `
    <button class="pill" id="btnReceive">Receive Items</button>
    <button class="pill" id="btnBuild">Build Packing List</button>
    <button class="pill" id="btnShip">Ship Order</button>`;
  infobar.textContent = 'Select option to begin';
  setScanHandler(null);
  document.getElementById('btnReceive').onclick = () => go(showReceive1);
  document.getElementById('btnBuild').onclick = () => go(showBuild1);
  document.getElementById('btnShip').onclick = () => go(showShip1);
}

// Receive flow
function showReceive1() {
  updateNavbar({ title: 'Receive Items', showBack: true });
  main.innerHTML = `
    <button class="pill" data-owner="downing">Downing Owned</button>
    <button class="pill" data-owner="client">Client Owned</button>`;
  infobar.textContent = 'Select ownership type';
  main.querySelectorAll('[data-owner]').forEach((btn) =>
    (btn.onclick = () => go(showReceive2, { owner: btn.dataset.owner }))
  );
}

function showReceive2({ owner }) {
  updateNavbar({ title: 'Receive Items', showBack: true });
  main.innerHTML = `
    <button class="pill" data-type="single">Single Unique Piece</button>
    <button class="pill" data-type="multi">Multiples of Same Item</button>`;
  infobar.textContent = 'Select item type';
  main.querySelectorAll('[data-type]').forEach((btn) =>
    (btn.onclick = () =>
      btn.dataset.type === 'single'
        ? go(showReceiveSingle, { owner })
        : go(showReceiveMultiples, { owner })
    )
  );
}

function showReceiveSingle({ owner }) {
  updateNavbar({ title: 'Receive Item', showBack: true });
  main.innerHTML = `
    <input id="descInput" placeholder="Description" />
    <input id="epcField" placeholder="EPC" readonly />
    <button id="scanBtn">Scan</button>`;
  infobar.textContent = 'Enter description';
  const descInput = document.getElementById('descInput');
  descInput.addEventListener('input', () => {
    if (descInput.value.trim()) infobar.textContent = 'Scan tag';
  });
  document.getElementById('scanBtn').onclick = () => {
    const epc = document.getElementById('epcField').value || `FAKE-${Date.now()}`;
    emitScan(epc, 'touch');
  };
  setScanHandler((epc) => {
    const desc = descInput.value.trim();
    if (!desc) {
      infobar.textContent = 'Enter description first';
      document.getElementById('errorAudio').play().catch(() => {});
      return;
    }
    document.getElementById('epcField').value = epc;
    store.addItem({ epc, desc, owner });
    infobar.textContent = 'Saved';
    document.getElementById('successAudio').play().catch(() => {});
  });
}

function showReceiveMultiples({ owner }) {
  updateNavbar({ title: 'Receive Batch', showBack: true });
  main.innerHTML = `
    <input id="descInput" placeholder="Description" />
    <ul id="epcList"></ul>
    <button id="scanBtn">Scan</button>
    <button id="saveBatch">Save</button>`;
  infobar.textContent = 'Select or enter description';
  const epcList = document.getElementById('epcList');
  const descInput = document.getElementById('descInput');
  descInput.addEventListener('input', () => (infobar.textContent = 'Scan each item'));
  const batch = [];
  document.getElementById('scanBtn').onclick = () => emitScan(`FAKE-${Date.now()}`, 'touch');
  document.getElementById('saveBatch').onclick = () => {
    const desc = descInput.value.trim();
    batch.forEach((epc) => store.addItem({ epc, desc, owner }));
    batch.length = 0;
    epcList.innerHTML = '';
    infobar.textContent = 'Batch saved';
  };
  setScanHandler((epc) => {
    batch.push(epc);
    const li = document.createElement('li');
    li.textContent = epc;
    epcList.appendChild(li);
    document.getElementById('successAudio').play().catch(() => {});
  });
}

// Build Packing List flow (simplified)
async function showBuild1() {
  updateNavbar({ title: 'Build List', showBack: true });
  main.innerHTML = `
    <button class="pill" id="btnBooth">Scan Booth</button>
    <button class="pill" id="btnCrate">Scan Crates</button>`;
  infobar.textContent = 'Select scan mode';
  document.getElementById('btnBooth').onclick = () => go(selectOrderForBooth);
  document.getElementById('btnCrate').onclick = () => go(scanCrateStep);
}

async function fetchOrders() {
  if (!window.__orders) {
    const res = await fetch('data/mock-orders.json');
    window.__orders = await res.json();
  }
  return window.__orders;
}

async function selectOrderForBooth() {
  updateNavbar({ title: 'Select Order', showBack: true });
  const orders = await fetchOrders();
  main.innerHTML = `<select id="orderSel"></select><button id="nextBtn">Next</button>`;
  const sel = document.getElementById('orderSel');
  orders.forEach((o) => {
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = o.id;
    sel.appendChild(opt);
  });
  infobar.textContent = 'Select Order';
  document.getElementById('nextBtn').onclick = () => {
    store.startPackingList(sel.value);
    go(scanBoothTag);
  };
}

function scanBoothTag() {
  updateNavbar({ title: 'Scan Booth', showBack: true });
  main.innerHTML = `<ul id="plList"></ul><button id="scanBtn">Scan Booth Tag</button><button id="finishBtn">List Complete</button>`;
  infobar.textContent = 'Scan booth tag';
  const list = document.getElementById('plList');
  document.getElementById('scanBtn').onclick = () => emitScan(`BOOTH-${Date.now()}`, 'touch');
  document.getElementById('finishBtn').onclick = () => {
    store.finalizePackingList();
    infobar.textContent = 'Packing list saved';
  };
  setScanHandler((epc) => {
    store.addToPackingList(epc);
    const li = document.createElement('li');
    li.textContent = epc;
    list.appendChild(li);
    document.getElementById('successAudio').play().catch(() => {});
  });
}

function scanCrateStep() {
  updateNavbar({ title: 'Scan Crate', showBack: true });
  main.innerHTML = `<ul id="crateList"></ul><button id="scanBtn">Scan Item</button><button id="finishBtn">List Complete</button>`;
  infobar.textContent = 'Scan crate and its items';
  const list = document.getElementById('crateList');
  document.getElementById('scanBtn').onclick = () => emitScan(`ITEM-${Date.now()}`, 'touch');
  document.getElementById('finishBtn').onclick = () => {
    store.finalizePackingList();
    infobar.textContent = 'Packing list saved';
  };
  setScanHandler((epc) => {
    store.addToPackingList(epc);
    const li = document.createElement('li');
    li.textContent = epc;
    list.appendChild(li);
    document.getElementById('successAudio').play().catch(() => {});
  });
}

// Ship Order flow (simplified verification)
async function showShip1() {
  updateNavbar({ title: 'Ship Order', showBack: true });
  const orders = await fetchOrders();
  main.innerHTML = `<select id="orderSel"></select><button id="startBtn">Start</button>`;
  const sel = document.getElementById('orderSel');
  orders.forEach((o) => {
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = o.id;
    sel.appendChild(opt);
  });
  infobar.textContent = 'Select Order';
  document.getElementById('startBtn').onclick = () => go(shipScanStep, { orderId: sel.value });
}

async function shipScanStep({ orderId }) {
  updateNavbar({ title: 'Ship Order', showBack: true });
  const orders = await fetchOrders();
  const order = orders.find((o) => o.id === orderId);
  const expected = new Set(order.items);
  const scanned = new Set();
  main.innerHTML = `<ul id="shipList"></ul><button id="finishBtn">Finish</button>`;
  infobar.textContent = 'Scan items as loaded';
  const list = document.getElementById('shipList');
  renderList();
  document.getElementById('finishBtn').onclick = () => {
    const missing = [...expected].filter((e) => !scanned.has(e));
    go(shipResult, { missing });
  };
  document.getElementById('scanBtn')?.addEventListener('click', () => emitScan(`FAKE-${Date.now()}`, 'touch'));
  setScanHandler((epc) => {
    if (expected.has(epc)) {
      scanned.add(epc);
      document.getElementById('successAudio').play().catch(() => {});
    } else {
      document.getElementById('errorAudio').play().catch(() => {});
    }
    renderList();
  });
  function renderList() {
    list.innerHTML = '';
    expected.forEach((epc) => {
      const li = document.createElement('li');
      li.textContent = epc;
      if (scanned.has(epc)) li.style.color = 'green';
      else li.style.color = 'red';
      list.appendChild(li);
    });
  }
}

function shipResult({ missing }) {
  updateNavbar({ title: 'Ship Order', showBack: true });
  if (missing.length === 0) {
    main.innerHTML = '<h2 style="color:green">All Components Present</h2>';
  } else {
    main.innerHTML = '<h2 style="color:red">Missing Items</h2><ul>' +
      missing.map((m) => `<li>${m}</li>`).join('') + '</ul>';
  }
  infobar.textContent = '';
}

// Settings modal (simple long-press to open)
let settingsTimeout;
navbar.addEventListener('mousedown', () => {
  settingsTimeout = setTimeout(openSettings, 1000);
});
navbar.addEventListener('mouseup', () => clearTimeout(settingsTimeout));

function openSettings() {
  const enabled = isEnabled();
  const modal = document.createElement('div');
  modal.id = 'settingsModal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.right = '0';
  modal.style.bottom = '0';
  modal.style.background = 'rgba(0,0,0,0.8)';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.innerHTML = `
    <div style="background:#fff;padding:20px;border-radius:8px;text-align:center;">
      <h3>Settings</h3>
      <button id="toggleWs">WebSocket: ${enabled ? 'On' : 'Off'}</button>
      <button id="clearData">Clear Data</button>
      <p>Version 0.1.0</p>
      <button id="closeSettings">Close</button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('toggleWs').onclick = () => {
    if (isEnabled()) disableWs(); else enableWs();
    document.body.removeChild(modal);
  };
  document.getElementById('clearData').onclick = () => {
    localStorage.clear();
    store.state = { items: {}, packingLists: [], activePackingList: null };
    document.body.removeChild(modal);
  };
  document.getElementById('closeSettings').onclick = () => document.body.removeChild(modal);
}

// initialize
showIndex();
