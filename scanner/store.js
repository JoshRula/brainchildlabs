const KEY = 'rfid-kiosk-store';

let state = {
  items: {},
  packingLists: [],
  activePackingList: null
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state = Object.assign(state, data);
    }
  } catch (e) {
    console.error('store load', e);
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('store save', e);
  }
}

function addItem(item) {
  state.items[item.epc] = item;
  save();
}

function startPackingList(orderId) {
  state.activePackingList = { id: `PL-${Date.now()}`, orderId, items: [], crates: [] };
  save();
}

function addToPackingList(epc) {
  if (state.activePackingList) {
    state.activePackingList.items.push({ epc });
    save();
  }
}

function finalizePackingList() {
  if (state.activePackingList) {
    state.packingLists.push(state.activePackingList);
    state.activePackingList = null;
    save();
  }
}

load();

export default {
  state,
  addItem,
  startPackingList,
  addToPackingList,
  finalizePackingList
};
