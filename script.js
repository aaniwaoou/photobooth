const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const countdown = document.getElementById("countdown");
const download = document.getElementById("download");

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
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(video, 0, 0);

  const frame = new Image();
  const selected = document.getElementById("frameSelect").value;
  frame.src = "frames/" + selected;

  frame.onload = () => {
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
    download.href = canvas.toDataURL("image/png");
  };
}