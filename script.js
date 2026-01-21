// -----------------------
// Constants
// -----------------------
const STRIP_WIDTH = 1240;
const STRIP_HEIGHT = 3508;

const FRAME_WIDTH = 1093;
const FRAME_HEIGHT = 763;
const FRAME_COUNT = 3;

// Positions of each frame (top-left corner) on the strip
const FRAME_POSITIONS = [
  { x: (STRIP_WIDTH - FRAME_WIDTH)/2, y: 200 },   // frame 1
  { x: (STRIP_WIDTH - FRAME_WIDTH)/2, y: 1400 },  // frame 2
  { x: (STRIP_WIDTH - FRAME_WIDTH)/2, y: 2600 }   // frame 3
];

const PREVIEW_WIDTH = 360;
const PREVIEW_HEIGHT = 480;

// -----------------------
// Elements
// -----------------------
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

// -----------------------
// State
// -----------------------
let currentPhoto = 0;
let photos = []; // stores {offsetX, offsetY, scale}
let userOffset = {x:0, y:0};
let userScale = 1;

// Drag/pinch state
let dragging = false;
let dragStart = {x:0, y:0};
let pinchStartDist = 0;
let pinchStartScale = 1;

// -----------------------
// Camera
// -----------------------
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(err => alert("Camera not accessible: " + err));

// -----------------------
// Start Photobooth
// -----------------------
startBtn.addEventListener("click", ()=>{
  photos=[];
  currentPhoto=0;
  userOffset={x:0,y:0};
  userScale=1;
  startBtn.disabled=true;
  takeCountdownPhoto();
});

// -----------------------
// Countdown
// -----------------------
function takeCountdownPhoto(){
  let count=3;
  countdown.innerText=count;
  const timer=setInterval(()=>{
    count--;
    countdown.innerText = count || "";
    if(count===0){
      clearInterval(timer);
      countdown.innerText="";
      showPreview();
    }
  },1000);
}

// -----------------------
// Show preview
// -----------------------
function showPreview(){
  previewContainer.hidden=false;
  previewCanvas.width=PREVIEW_WIDTH;
  previewCanvas.height=PREVIEW_HEIGHT;
  userOffset={x:0,y:0};
  userScale=1;

  drawPreview();
  enableInteraction();
}

// -----------------------
// Draw preview
// -----------------------
function drawPreview(){
  const ctx = previewCanvas.getContext("2d");
  ctx.clearRect(0,0,PREVIEW_WIDTH,PREVIEW_HEIGHT);

  // Draw video snapshot
  const scaledWidth = PREVIEW_WIDTH * userScale;
  const scaledHeight = video.videoHeight * (scaledWidth / video.videoWidth);

  ctx.save();
  ctx.translate(userOffset.x,userOffset.y);
  ctx.drawImage(video,0,0,video.videoWidth,video.videoHeight,0,0,scaledWidth,scaledHeight);
  ctx.restore();

  // Draw frame overlay for current photo
  const frameImg = new Image();
  frameImg.src = "frames/" + frameSelect.value;
  frameImg.onload = () => {
    // Fit the correct frame to preview
    ctx.drawImage(frameImg,
      0, 0, FRAME_WIDTH, FRAME_HEIGHT,    // source slice (top-left corner, frame size)
      0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT // fit into preview
    );
  };
}

// -----------------------
// Interaction
// -----------------------
function enableInteraction(){
  // Mouse drag
  previewCanvas.onmousedown=(e)=>{
    dragging=true;
    dragStart={x:e.clientX - userOffset.x, y:e.clientY - userOffset.y};
  };
  previewCanvas.onmousemove=(e)=>{
    if(!dragging) return;
    userOffset={x:e.clientX - dragStart.x, y:e.clientY - dragStart.y};
    drawPreview();
  };
  previewCanvas.onmouseup=()=>{dragging=false;};
  previewCanvas.onmouseleave=()=>{dragging=false;};

  // Touch drag / pinch
  previewCanvas.ontouchstart=(e)=>{
    e.preventDefault();
    if(e.touches.length===1){
      dragging=true;
      const touch=e.touches[0];
      dragStart={x: touch.clientX - userOffset.x, y: touch.clientY - userOffset.y};
    } else if(e.touches.length===2){
      pinchStartDist = getDistance(e.touches[0], e.touches[1]);
      pinchStartScale = userScale;
    }
  };
  previewCanvas.ontouchmove=(e)=>{
    e.preventDefault();
    if(e.touches.length===1 && dragging){
      const touch=e.touches[0];
      userOffset={x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y};
    } else if(e.touches.length===2){
      const dist=getDistance(e.touches[0],e.touches[1]);
      userScale = pinchStartScale*(dist/pinchStartDist);
    }
    drawPreview();
  };
  previewCanvas.ontouchend=(e)=>{
    dragging=false;
    if(e.touches.length<2) pinchStartDist=0;
  };
}

function getDistance(t1,t2){
  const dx=t2.clientX-t1.clientX;
  const dy=t2.clientY-t1.clientY;
  return Math.sqrt(dx*dx + dy*dy);
}

// -----------------------
// Confirm photo
// -----------------------
confirmBtn.addEventListener("click",()=>{
  photos.push({offsetX:userOffset.x, offsetY:userOffset.y, scale:userScale});
  currentPhoto++;
  previewContainer.hidden=true;
  if(currentPhoto<FRAME_COUNT) takeCountdownPhoto();
  else generatePhotostrip();
});

// -----------------------
// Retake photo
// -----------------------
retakeBtn.addEventListener("click",()=>{
  previewContainer.hidden=true;
  takeCountdownPhoto();
});

// -----------------------
// Generate final strip
// -----------------------
function generatePhotostrip(){
  photostripCanvas.width=STRIP_WIDTH;
  photostripCanvas.height=STRIP_HEIGHT;
  const ctx = photostripCanvas.getContext("2d");

  photos.forEach((p,i)=>{
    const pos = FRAME_POSITIONS[i];
    const scaleX = FRAME_WIDTH / PREVIEW_WIDTH * p.scale;
    const scaleY = FRAME_HEIGHT / PREVIEW_HEIGHT * p.scale;

    const drawWidth = video.videoWidth * scaleX;
    const drawHeight = video.videoHeight * scaleY;

    const offsetX = pos.x + p.offsetX * (FRAME_WIDTH / PREVIEW_WIDTH);
    const offsetY = pos.y + p.offsetY * (FRAME_HEIGHT / PREVIEW_HEIGHT);

    ctx.drawImage(video, 0,0,video.videoWidth,video.videoHeight,
      offsetX, offsetY, drawWidth, drawHeight);
  });

  const frameImg = new Image();
  frameImg.src = "frames/" + frameSelect.value;
  frameImg.onload = ()=>{
    ctx.drawImage(frameImg, 0,0,STRIP_WIDTH,STRIP_HEIGHT);
    download.href = photostripCanvas.toDataURL("image/png");
    download.hidden=false;
    startBtn.disabled=false;
  };
}