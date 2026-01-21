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
}