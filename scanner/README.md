# RFID Kiosk Demo

This directory contains a touch-first kiosk web app intended for a Raspberry Pi 5 with a 7" portrait display (480×800). The app runs full-screen in Chromium kiosk mode and provides three workflows: Receive Items, Build Packing List and Ship Order.

## Run

```bash
python3 -m http.server 8080
```
Then launch Chromium:
```bash
chromium-browser --kiosk --app=http://localhost:8080/scanner/index.html --incognito --disable-pinch --overscroll-history-navigation=0
```
Disable screen blanking:
```bash
xset s off
xset -dpms
xset s noblank
```

Replace the embedded audio data URIs in `index.html` and the `LOGO_SRC` constant in `app.js` with your production assets. Hardware scan integration can replace the demo event in `app.js`.
