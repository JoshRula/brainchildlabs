let socket = null;
let enabled = false;

export function enableWs() {
  if (enabled) return;
  enabled = true;
  try {
    socket = new WebSocket('ws://localhost:8787');
    socket.addEventListener('message', (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'scan' && msg.epc) {
          if (window.emitScan) window.emitScan(msg.epc, 'hw');
        }
      } catch (err) {
        console.error('ws message', err);
      }
    });
  } catch (err) {
    console.error('ws init', err);
  }
}

export function disableWs() {
  if (socket) socket.close();
  socket = null;
  enabled = false;
}

export function isEnabled() {
  return enabled;
}
