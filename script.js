// =======================
// CONFIG
// =======================
const STRIP_WIDTH = 1240;
const STRIP_HEIGHT = 3508;

const FRAME_WIDTH = 1093;
const FRAME_HEIGHT = 763;
const FRAME_COUNT = 3;

const FRAME_POSITIONS = [
  { x: 73, y: 200 },
  { x: 73, y: 1370 },
  { x: 73, y: 2540 }
];

const PREVIEW_WIDTH = 320;
const PREVIEW_HEIGHT = 500;

// =======================
// ELEMENTS
// =======================
const video = document.getElementById("video");
const countdown = document.getElementById("countdown");
const photoCounter = document.getElementById("photoCounter");
const flash = document.getElementById("flash");
const qrContainer = document.getElementById("qrContainer");

const startBtn = document.getElementById("startBtn");
const frameSelect = document.getElementById("frameSelect");
const previewContainer = document.getElementById("previewContainer");
const previewCanvas = document.getElementById("previewCanvas");
const confirmBtn = document.getElementById("confirm");
const retakeBtn = document.getElementById("retake");
const photostripCanvas = document.getElementById("photostrip");
const download = document.getElementById("download");

// =======================
// STATE
// =======================
let currentPhoto = 0;
let photos = [];

let offset = { x: 0, y: 0 };
let scale = 1;

let dragging = false;
let dragStart = { x: 0, y: 0 };
let pinchStartDist = 0;
let pinchStartScale = 1;

// =======================
// CAMERA (MOBILE SAFE)
// =======================
navigator.mediaDevices.getUserMedia({
  video: { facingMode: "user" },
  audio: false
}).then(stream => {
  video.srcObject = stream;
  video.setAttribute("playsinline", true);
  video.play();
});

// =======================
// START
// =======================
startBtn.onclick = () => {
  photos = [];
  currentPhoto = 0;
  offset = { x: 0, y: 0 };
  scale = 1;
  qrContainer.hidden = true;
  startBtn.disabled = true;
  updateCounter();
  countdownShot();
};

// =======================
// COUNTER
// =======================
function updateCounter() {
  photoCounter.innerText = `Photo ${currentPhoto + 1} / ${FRAME_COUNT}`;
}

// =======================
// COUNTDOWN + FLASH
// =======================
function countdownShot() {
  let c = 3;
  countdown.innerText = c;

  const timer = setInterval(() => {
    c--;
    countdown.innerText = c || "";
    if (c === 0) {
      clearInterval(timer);
      triggerFlash();
      showPreview();
    }
  }, 1000);
}

function triggerFlash() {
  flash.classList.add("active");
  setTimeout(() => flash.classList.remove("active"), 150);
}

// =======================
// PREVIEW
// =======================
function showPreview() {
  previewContainer.hidden = false;

  const dpr = window.devicePixelRatio || 1;
  previewCanvas.width = PREVIEW_WIDTH * dpr;
  previewCanvas.height = PREVIEW_HEIGHT * dpr;
  previewCanvas.style.width = PREVIEW_WIDTH + "px";
  previewCanvas.style.height = PREVIEW_HEIGHT + "px";

  const ctx = previewCanvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  autoCenterFace();
  drawPreview();
  enableInteraction();
}

// =======================
// AUTO CENTER FACE (SAFE DEFAULT)
// =======================
function autoCenterFace() {
  const baseScale = FRAME_WIDTH / video.videoWidth;
  scale = 1.1; // gentle zoom
  offset = {
    x: (PREVIEW_WIDTH - video.videoWidth * baseScale) / 2,
    y: (PREVIEW_HEIGHT - video.videoHeight * baseScale) / 2
  };
}

// =======================
// DRAW PREVIEW (EXACT MATCH)
// =======================
function drawPreview() {
  if (video.readyState < 2) return;
  const ctx = previewCanvas.getContext("2d");
  ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

  const frame = FRAME_POSITIONS[currentPhoto];
  const baseScale = FRAME_WIDTH / video.videoWidth;
  const finalScale = baseScale * scale;

  const w = video.videoWidth * finalScale;
  const h = video.videoHeight * finalScale;

  const px = (frame.x / STRIP_WIDTH) * PREVIEW_WIDTH + offset.x;
  const py = (frame.y / STRIP_HEIGHT) * PREVIEW_HEIGHT + offset.y;

  ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, px, py, w, h);

  const frameImg = new Image();
  frameImg.src = "frames/" + frameSelect.value;
  frameImg.onload = () => {
    ctx.drawImage(frameImg, 0, 0, STRIP_WIDTH, STRIP_HEIGHT,
      0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
  };
}

// =======================
// INTERACTION
// =======================
function enableInteraction() {
  previewCanvas.onmousedown = e => {
    dragging = true;
    dragStart = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  previewCanvas.onmousemove = e => {
    if (!dragging) return;
    offset = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
    drawPreview();
  };

  previewCanvas.onmouseup =
  previewCanvas.onmouseleave = () => dragging = false;

  previewCanvas.ontouchstart = e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      dragging = true;
      dragStart = {
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y
      };
    } else if (e.touches.length === 2) {
      pinchStartDist = distance(e.touches[0], e.touches[1]);
      pinchStartScale = scale;
    }
  };

  previewCanvas.ontouchmove = e => {
    e.preventDefault();
    if (e.touches.length === 1 && dragging) {
      offset = {
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      };
    } else if (e.touches.length === 2) {
      scale = pinchStartScale *
        (distance(e.touches[0], e.touches[1]) / pinchStartDist);
    }
    drawPreview();
  };

  previewCanvas.ontouchend = () => dragging = false;
}

function distance(a, b) {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

// =======================
// CONFIRM / RETAKE
// =======================
confirmBtn.onclick = () => {
  saveIndividualPhoto();
  photos.push({ offset: { ...offset }, scale });
  previewContainer.hidden = true;
  currentPhoto++;

  if (currentPhoto < FRAME_COUNT) {
    updateCounter();
    countdownShot();
  } else {
    photoCounter.innerText = "";
    buildFinalStrip();
  }
};

retakeBtn.onclick = () => {
  previewContainer.hidden = true;
  countdownShot();
};

// =======================
// SAVE INDIVIDUAL PHOTO
// =======================
function saveIndividualPhoto() {
  const c = document.createElement("canvas");
  c.width = FRAME_WIDTH;
  c.height = FRAME_HEIGHT;
  const ctx = c.getContext("2d");

  const baseScale = FRAME_WIDTH / video.videoWidth;
  const finalScale = baseScale * scale;

  ctx.drawImage(
    video,
    0, 0, video.videoWidth, video.videoHeight,
    offset.x * (FRAME_WIDTH / PREVIEW_WIDTH),
    offset.y * (FRAME_HEIGHT / PREVIEW_HEIGHT),
    video.videoWidth * finalScale,
    video.videoHeight * finalScale
  );

  const a = document.createElement("a");
  a.download = `photo_${currentPhoto + 1}.png`;
  a.href = c.toDataURL("image/png");
  a.click();
}

// =======================
// FINAL STRIP + QR CODE
// =======================
function buildFinalStrip() {
  photostripCanvas.width = STRIP_WIDTH;
  photostripCanvas.height = STRIP_HEIGHT;
  const ctx = photostripCanvas.getContext("2d");

  photos.forEach((p, i) => {
    const frame = FRAME_POSITIONS[i];
    const baseScale = FRAME_WIDTH / video.videoWidth;
    const finalScale = baseScale * p.scale;

    ctx.drawImage(
      video,
      0, 0, video.videoWidth, video.videoHeight,
      frame.x + p.offset.x * (STRIP_WIDTH / PREVIEW_WIDTH),
      frame.y + p.offset.y * (STRIP_HEIGHT / PREVIEW_HEIGHT),
      video.videoWidth * finalScale,
      video.videoHeight * finalScale
    );
  });

  const frameImg = new Image();
  frameImg.src = "frames/" + frameSelect.value;
  frameImg.onload = () => {
    ctx.drawImage(frameImg, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);

    const url = photostripCanvas.toDataURL("image/png");
    download.href = url;
    download.hidden = false;

    // QR code
    qrContainer.innerHTML =
      `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}">`;
    qrContainer.hidden = false;

    startBtn.disabled = false;
  };
}