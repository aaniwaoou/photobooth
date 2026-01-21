// -----------------------
// Constants
// -----------------------
const STRIP_WIDTH = 1240;
const STRIP_HEIGHT = 3508;
const FRAME_COUNT = 3;
const FRAME_HEIGHT = STRIP_HEIGHT / FRAME_COUNT;

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

  // Draw video snapshot scaled to width
  const scaledWidth = PREVIEW_WIDTH * userScale;
  const scaledHeight = video.videoHeight * (scaledWidth / video.videoWidth);

  ctx.save();
  ctx.translate(userOffset.x,userOffset.y);
  ctx.drawImage(video,0,0,video.videoWidth,video.videoHeight,0,0,scaledWidth,scaledHeight);
  ctx.restore();

  // Draw correct portion of frame
  const frameImg = new Image();
  frameImg.src = "frames/"+frameSelect.value;
  frameImg.onload = ()=>{
    const srcY = FRAME_HEIGHT*currentPhoto;
    ctx.drawImage(frameImg,0,srcY,STRIP_WIDTH,FRAME_HEIGHT,0,0,PREVIEW_WIDTH,PREVIEW_HEIGHT);
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
    const scale = STRIP_WIDTH / video.videoWidth * p.scale;
    const scaledH = video.videoHeight * scale;
    const offsetX = p.offsetX * (STRIP_WIDTH / PREVIEW_WIDTH);
    const offsetY = p.offsetY * (FRAME_HEIGHT / PREVIEW_HEIGHT);

    ctx.drawImage(video,0,0,video.videoWidth,video.videoHeight,
      offsetX, i*FRAME_HEIGHT + offsetY, STRIP_WIDTH* p.scale, scaledH);
  });

  const frameImg=new Image();
  frameImg.src="frames/"+frameSelect.value;
  frameImg.onload=()=>{
    ctx.drawImage(frameImg,0,0,STRIP_WIDTH,STRIP_HEIGHT);
    download.href=photostripCanvas.toDataURL("image/png");
    download.hidden=false;
    startBtn.disabled=false;
  };
}