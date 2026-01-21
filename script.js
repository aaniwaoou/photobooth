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

const STRIP_WIDTH = 360;   // for preview
const STRIP_HEIGHT = 480 * 3; // 3 photos stacked

const PHOTO_WIDTH = 360;
const PHOTO_HEIGHT = 480;

let photos = [];
let currentPhoto = 0;

// start camera
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(err => alert("Camera not accessible: " + err));

// Start booth
startBtn.addEventListener("click", () => {
  photos = [];
  currentPhoto = 0;
  startBtn.disabled = true;
  takeCountdownPhoto();
});

// Countdown + capture
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

// Show preview
function showPreview() {
  previewContainer.hidden = false;

  // draw video frame to preview canvas
  previewCanvas.width = PHOTO_WIDTH;
  previewCanvas.height = PHOTO_HEIGHT;
  const ctx = previewCanvas.getContext("2d");
  ctx.drawImage(video, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
}

// Confirm photo
confirmBtn.addEventListener("click", () => {
  // save photo data
  const photoData = previewCanvas.toDataURL("image/png");
  photos.push(photoData);
  previewContainer.hidden = true;
  currentPhoto++;

  if (currentPhoto < 3) {
    // take next photo
    takeCountdownPhoto();
  } else {
    // all 3 photos taken → create photostrip
    createPhotostrip();
  }
});

// Retake photo
retakeBtn.addEventListener("click", () => {
  previewContainer.hidden = true;
  takeCountdownPhoto();
});

// Combine into photostrip
function createPhotostrip() {
  photostripCanvas.width = STRIP_WIDTH;
  photostripCanvas.height = STRIP_HEIGHT;
  const ctx = photostripCanvas.getContext("2d");

  photos.forEach((dataURL, index) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, index * PHOTO_HEIGHT, PHOTO_WIDTH, PHOTO_HEIGHT);

      // draw frame on top
      const frame = new Image();
      frame.src = "frames/" + frameSelect.value;
      frame.onload = () => {
        ctx.drawImage(frame, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);

        if (index === photos.length - 1) {
          // last photo processed → show download
          download.href = photostripCanvas.toDataURL("image/png");
          download.hidden = false;
          startBtn.disabled = false;
        }
      };
    };
    img.src = dataURL;
  });
}