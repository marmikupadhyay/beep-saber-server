let roomcode,sendCenter = false;
function doItPa() {
    let ip = document.getElementById('ip');
    if (ip.value == "") return;
    roomcode = ip.value;
    socket = io(
        "https://beep-saber.herokuapp.com/",
        {
        withCredentials: true,
        extraHeaders: {
            "my-custom-header": "abcd"
        }
    });;
    socket.on("connect", () => { console.log("connected"); });
    console.log(socket);
    sendCenter = true;
}

const convertColorToInt = (color) => {
  return parseInt(color.replace('#', '0x'));
};

const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const landmarkContainer = document.getElementsByClassName('landmark-grid-container')[0];
const landmarkConfig = {
  axesColor:40,
  backgroundColor: 0,
  connectionWidth : 2,
  connectionColor : convertColorToInt('#ff0000'),
  landmarkColor : convertColorToInt('#00ff00'),
  range : 5
};

const grid = new LandmarkGrid(landmarkContainer,landmarkConfig);
// const grid = new LandmarkGrid(landmarkContainer);
console.log(grid);

grid.rotation = 0;
grid.isRotating = false;
grid.rotationSpeed = 0;
grid.size = 100;
grid.distance = 150;
grid.fitToGrid = true;

let logged = 0;
let rate = 1000;
let prevTime;
function onResults(results) {
  if (!results.poseLandmarks) {
    grid.updateLandmarks([]);
    return;
  }
  if(logged % rate == 0) {
      console.log(results.poseWorldLandmarks);
}
  logged++;
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Only overwrite existing pixels.
  canvasCtx.globalCompositeOperation = 'source-in';
  canvasCtx.fillStyle = '#00FF00';
  canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

  // Only overwrite missing pixels.
  canvasCtx.globalCompositeOperation = 'destination-atop';
  canvasCtx.drawImage(
      results.image, 0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.globalCompositeOperation = 'source-over';
  drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                 {color: '#00FF00', lineWidth: 4});
  drawLandmarks(canvasCtx, results.poseLandmarks,
                {color: '#FF0000', lineWidth: 2});
  canvasCtx.restore();

  grid.updateLandmarks(results.poseWorldLandmarks);

  if (sendCenter) {
    let leftPosition = results.poseLandmarks[15];
    let rightPosition = results.poseLandmarks[16];
    let topPosition = results.poseLandmarks[0];
    let rightBackPosition = results.poseLandmarks[14];
    let leftBackPosition = results.poseLandmarks[13];
    let data = {
      "roomcode": roomcode,
      "position" : {
        left: leftPosition,
        right: rightPosition,
        top: topPosition,
        leftBack: leftBackPosition,
        rightBack: rightBackPosition,
      }
    }
    socket.emit("coords", data);
  }
  document.getElementById("fps").innerHTML = `${1/(Date.now() - prevTime)*1000} FPS`;
  prevTime = Date.now();

}

const pose = new Pose({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});
pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  smoothSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
pose.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({image: videoElement});
  },
  width: 1280,
  height: 720
});
camera.start();