const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const countdown = document.getElementById("countdown");
const download = document.getElementById("download");

const STRIP_WIDTH = 1240;
const STRIP_HEIGHT = 3508;

// where the photo should appear inside the frame
// 🔴 YOU CAN ADJUST THESE NUMBERS LATER
const PHOTO_X = 120;
const PHOTO_Y = 250;
const PHOTO_WIDTH = 1000;
const PHOTO_HEIGHT = 3000;

// camera
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream);

function startBooth() {
  let count = 3;
  countdown.innerText = count;

  const timer = setInterval(() => {
    count--;
    countdown.innerText = count || "";

    if (count === 0) {
      clearInterval(timer);
      takePhoto();
    }
  }, 1000);
}

function takePhoto() {
  canvas.width = STRIP_WIDTH;
  canvas.height = STRIP_HEIGHT;
  const ctx = canvas.getContext("2d");

  // clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // get camera dimensions
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  // crop camera to fit portrait area
  const videoAspect = vw / vh;
  const photoAspect = PHOTO_WIDTH / PHOTO_HEIGHT;

  let sx, sy, sw, sh;

  if (videoAspect > photoAspect) {
    // camera too wide → crop sides
    sh = vh;
    sw = vh * photoAspect;
    sx = (vw - sw) / 2;
    sy = 0;
  } else {
    // camera too tall → crop top/bottom
    sw = vw;
    sh = vw / photoAspect;
    sx = 0;
    sy = (vh - sh) / 2;
  }

  // draw cropped photo into strip
  ctx.drawImage(
    video,
    sx, sy, sw, sh,
    PHOTO_X, PHOTO_Y,
    PHOTO_WIDTH, PHOTO_HEIGHT
  );

  // draw frame on top
  const frame = new Image();
  frame.src = "frames/" + document.getElementById("frameSelect").value;

  frame.onload = () => {
    ctx.drawImage(frame, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);
    download.href = canvas.toDataURL("image/png");
    download.style.display = "inline-block";
  };
}

  // draw camera photo first
  ctx.drawImage(
    video,
    PHOTO_X,
    PHOTO_Y,
    PHOTO_WIDTH,
    PHOTO_HEIGHT
  );

  // load frame
  const frame = new Image();
  const selected = document.getElementById("frameSelect").value;
  frame.src = "frames/" + selected;

  frame.onload = () => {
    // draw frame on top
    ctx.drawImage(frame, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);

    // enable download
    download.href = canvas.toDataURL("image/png");
    download.style.display = "inline-block";
  };