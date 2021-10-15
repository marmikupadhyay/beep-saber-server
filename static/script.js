// In this case, We set width 320, and the height will be computed based on the input stream.
let lastFilter = "";
let src = null;
let dstC1 = null;
let dstC3 = null;
let dstC4 = null;
let width = 180;
let height = 0;
let socket = null;
let sendCenter = false;
let timeStart = null;
let frame = document.getElementById('frame');
// whether streaming video from the camera.
let streaming = false;
let contoursColor = [];
for (let i = 0; i < 10000; i++) {
    contoursColor.push([
        Math.round(Math.random() * 255),
        Math.round(Math.random() * 255),
        Math.round(Math.random() * 255),
        0,
    ]);
}

let video = document.getElementById("video");
let stream = null;
let vc = null;

function opencvIsReady() {
    console.log("OpenCV.js is ready");
    startCamera();
}

function startCamera() {
    if (streaming) return;
    navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then(function (s) {
            stream = s;
            video.srcObject = s;
            video.play();
        })
        .catch(function (err) {
            console.log("An error occured! " + err);
        });

    video.addEventListener(
        "canplay",
        function (ev) {
            if (!streaming) {
                height = video.videoHeight / (video.videoWidth / width);
                video.setAttribute("width", width);
                video.setAttribute("height", height);
                streaming = true;
                vc = new cv.VideoCapture(video);
            }
            startVideoProcessing();
        },
        false
    );
}
function stopVideoProcessing() {
    if (src != null && !src.isDeleted()) src.delete();
    if (dstC1 != null && !dstC1.isDeleted()) dstC1.delete();
    if (dstC3 != null && !dstC3.isDeleted()) dstC3.delete();
    if (dstC4 != null && !dstC4.isDeleted()) dstC4.delete();
}

function startVideoProcessing() {
    if (!streaming) {
        console.warn("Please startup your webcam");
        return;
    }
    stopVideoProcessing();
    src = new cv.Mat(height, width, cv.CV_8UC4);
    dstC1 = new cv.Mat(height, width, cv.CV_8UC1);
    dstC3 = new cv.Mat(height, width, cv.CV_8UC3);
    dstC4 = new cv.Mat(height, width, cv.CV_8UC4);
    requestAnimationFrame(processVideo);
}

function processVideo() {
    vc.read(src);
    let result = passThrough(src, true);
    result = passThrough(src, false);
    cv.imshow("canvasOutput", result);
    requestAnimationFrame(processVideo);
}

function passThrough(src, green) {
    //guassian blur
    if (green) {
        cv.GaussianBlur(
            src,
            dstC3,
            { width: 9, height: 9 },
            0,
            0,
            cv.BORDER_DEFAULT
        );
        // return dstC3;
        //convert to hsv
        cv.cvtColor(dstC3, dstC3, cv.COLOR_RGBA2RGB);
        cv.cvtColor(dstC3, dstC3, cv.COLOR_RGB2HSV);
    }
    //inrange
    let lowScalar;
    let highScalar;
    if (green) {
        lowScalar = new cv.Scalar(29, 86, 6, 255);
        highScalar = new cv.Scalar(64, 255, 255, 255);
    }
    else {
        lowScalar = new cv.Scalar(55, 64, 83, 255);
        highScalar = new cv.Scalar(174, 201, 210, 255);
    }
    let low = new cv.Mat(height, width, dstC3.type(), lowScalar);
    let high = new cv.Mat(height, width, dstC3.type(), highScalar);
    cv.inRange(dstC3, low, high, dstC1);

    low.delete();
    high.delete();
    // return dstC1;
    cv.threshold(dstC1, dstC4, 120, 200, cv.THRESH_BINARY);
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(
        dstC4,
        contours,
        hierarchy,
        Number(cv.RETR_CCOMP),
        Number(cv.CHAIN_APPROX_SIMPLE),
        { x: 0, y: 0 }
    );
    let index = getMaxCircle(contours);
    if (index != null) {
        let circle = cv.minEnclosingCircle(contours.get(index));
        let circleColor = new cv.Scalar(255, 255, 255);
        cv.circle(src, circle.center, circle.radius, circleColor);
        let test = document.getElementById("canvasOutput");
        circle.center.x = circle.center.x / test.width;
        circle.center.y = circle.center.y / test.height;
        if (sendCenter)
            socket.emit("coords", [green, circle.center, circle.radius]);
    }
    contours.delete();
    hierarchy.delete();
    frame.innerHTML = `${Math.floor(1 / (Date.now() - timeStart) * 1000)} fps`;
    timeStart = Date.now();
    return src;
}

function getMaxCircle(contours) {
    if (contours == undefined || contours == null) return null;
    let maxArea = null;
    let index = null;
    for (let i = 0; i < contours.size(); ++i) {
        if (maxArea == null) {
            maxArea = contours[i];
            index = i;
        } else if (maxArea < cv.contourArea(contours[i], false)) {
            maxArea = cv.contourArea(contours[i], false);
            index = i;
        }
    }
    if (index == null) return null;
    return index;
}

function doItPa() {
    let ip = document.getElementById('ip');
    socket = io("https://beep-saber.herokuapp.com/", {
        withCredentials: true,
        extraHeaders: {
            "my-custom-header": "abcd"
        }
    });;
    socket.on("connect", () => { console.log("connected"); });
    console.log(socket);
    sendCenter = true;
}
