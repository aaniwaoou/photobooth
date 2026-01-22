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
let photos = []; // { image, offset, scale }

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
  setTimeout(() => flash.classList.remove("active"), 120);
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

  previewCanvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);

  // RESET zoom — IMPORTANT
  offset = { x: 0, y: 0 };
  scale = 1;

  drawPreview();
  enableInteraction();
}

// =======================
// DRAW PREVIEW (NO FORCED ZOOM)
// =======================
function drawPreview() {
  if (video.readyState < 2) return;

  const ctx = previewCanvas.getContext("2d");
  ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

  // Fit video naturally into frame
  const ratio = Math.max(
    FRAME_WIDTH / video.videoWidth,
    FRAME_HEIGHT / video.videoHeight
  ) * scale;

  const w = video.videoWidth * ratio;
  const h = video.videoHeight * ratio;

  const frame = FRAME_POSITIONS[currentPhoto];

  const px = (frame.x / STRIP_WIDTH) * PREVIEW_WIDTH + offset.x;
  const py = (frame.y / STRIP_HEIGHT) * PREVIEW_HEIGHT + offset.y;

  ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, px, py, w, h);

  // Overlay frame
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
  const snapshot = document.createElement("canvas");
  snapshot.width = video.videoWidth;
  snapshot.height = video.videoHeight;
  snapshot.getContext("2d").drawImage(video, 0, 0);

  photos.push({
    image: snapshot,
    offset: { ...offset },
    scale
  });

  previewContainer.hidden = true;
  currentPhoto++;

  if (currentPhoto < FRAME_COUNT) {
    updateCounter();
    countdownShot();
  } else {
    photoCounter.innerText = "";
    generateFinalStrip();
  }
};

retakeBtn.onclick = () => {
  previewContainer.hidden = true;
  countdownShot();
};

// =======================
// FINAL STRIP (ONLY SAVE AT END)
// =======================
function generateFinalStrip() {
  photostripCanvas.width = STRIP_WIDTH;
  photostripCanvas.height = STRIP_HEIGHT;
  const ctx = photostripCanvas.getContext("2d");

  photos.forEach((p, i) => {
    const frame = FRAME_POSITIONS[i];

    const ratio = Math.max(
      FRAME_WIDTH / p.image.width,
      FRAME_HEIGHT / p.image.height
    ) * p.scale;

    const w = p.image.width * ratio;
    const h = p.image.height * ratio;

    ctx.drawImage(
      p.image,
      0, 0, p.image.width, p.image.height,
      frame.x + p.offset.x * (STRIP_WIDTH / PREVIEW_WIDTH),
      frame.y + p.offset.y * (STRIP_HEIGHT / PREVIEW_HEIGHT),
      w, h
    );
  });

  const frameImg = new Image();
  frameImg.src = "frames/" + frameSelect.value;
  frameImg.onload = () => {
    ctx.drawImage(frameImg, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);
    download.href = photostripCanvas.toDataURL("image/png");
    download.hidden = false;
    startBtn.disabled = false;
  };
}