// Elements
const video = document.getElementById("video");
const countdown = document.getElementById("countdown");
const startBtn = document.getElementById("startBtn");
const frameSelect = document.getElementById("frameSelect");
const previewContainer = document.getElementById("previewContainer");
const previewCanvas = document.getElementById("previewCanvas");
const confirmBtn = document.getElementById("confirm");
const retakeBtn = document.getElementById("retake");
const photostripCanvas = document.getElementById("photostrip");
const download = document.getElementById("download");

// Constants
const STRIP_WIDTH = 360;
const PHOTO_WIDTH = 360;
const PHOTO_HEIGHT = 480;
const STRIP_HEIGHT = PHOTO_HEIGHT * 3;

let photos = [];
let currentPhoto = 0;

// Start camera
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(err => alert("Camera not accessible: " + err));

// Start button
startBtn.addEventListener("click", () => {
  photos = [];
  currentPhoto = 0;
  startBtn.disabled = true;
  takeCountdownPhoto();
});

// Countdown before taking photo
function takeCountdownPhoto() {
  let count = 3;
  countdown.innerText = count;

  const timer = setInterval(() => {
    count--;
    countdown.innerText = count || "";

    if (count === 0) {
      clearInterval(timer);
      countdown.innerText = "";
      showPreview();
    }
  }, 1000);
}

// Show preview canvas
function showPreview() {
  previewContainer.hidden = false;
  previewCanvas.width = PHOTO_WIDTH;
  previewCanvas.height = PHOTO_HEIGHT;
  const ctx = previewCanvas.getContext("2d");

  // Draw the live camera feed
  ctx.drawImage(video, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);

  // Draw the frame on top of preview
  const frame = new Image();
  frame.src = "frames/" + frameSelect.value;
  frame.onload = () => {
    ctx.drawImage(frame, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
  };
}

// Confirm photo
confirmBtn.addEventListener("click", () => {
  const photoData = previewCanvas.toDataURL("image/png");
  photos.push(photoData);
  previewContainer.hidden = true;
  currentPhoto++;

  if (currentPhoto < 3) {
    takeCountdownPhoto();
  } else {
    createPhotostrip();
  }
});

// Retake photo
retakeBtn.addEventListener("click", () => {
  previewContainer.hidden = true;
  takeCountdownPhoto();
});

// Create photostrip
function createPhotostrip() {
  photostripCanvas.width = STRIP_WIDTH;
  photostripCanvas.height = STRIP_HEIGHT;
  const ctx = photostripCanvas.getContext("2d");

  let loaded = 0;

  photos.forEach((dataURL, index) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, index * PHOTO_HEIGHT, PHOTO_WIDTH, PHOTO_HEIGHT);
      loaded++;
      if (loaded === photos.length) {
        // draw frame after all photos
        const frame = new Image();
        frame.src = "frames/" + frameSelect.value;
        frame.onload = () => {
          ctx.drawImage(frame, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);
          // show download
          download.href = photostripCanvas.toDataURL("image/png");
          download.hidden = false;
          startBtn.disabled = false;
        };
      }
    };
    img.src = dataURL;
  });
}