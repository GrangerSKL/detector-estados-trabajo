const URL = "./model/";

let model, webcam, maxPredictions;

const predictionElement = document.getElementById("prediction");
const confidenceElement = document.getElementById("confidence");
const latencyElement = document.getElementById("latency");
const barsContainer = document.getElementById("bars-container");

// BUFFER PARA ESTABILIZACIÓN
const predictionBuffer = [];
const BUFFER_SIZE = 5;

// UMBRAL
const CONFIDENCE_THRESHOLD = 0.85;

// BARRAS
let bars = [];

async function init() {

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    // CARGAR MODELO
    model = await tmImage.load(modelURL, metadataURL);

    maxPredictions = model.getTotalClasses();

    // WEBCAM
    const flip = true;

    webcam = new tmImage.Webcam(350, 350, flip);

    await webcam.setup();
    await webcam.play();

    window.requestAnimationFrame(loop);

    document
        .getElementById("webcam-container")
        .appendChild(webcam.canvas);

    // CREAR BARRAS
    for (let i = 0; i < maxPredictions; i++) {

        const bar = document.createElement("div");
        bar.className = "bar";

        const fill = document.createElement("div");
        fill.className = "fill";

        bar.appendChild(fill);

        const label = document.createElement("div");
        label.className = "label";

        barsContainer.appendChild(label);
        barsContainer.appendChild(bar);

        bars.push({
            fill,
            label
        });
    }
}

async function loop() {

    webcam.update();

    await predict();

    window.requestAnimationFrame(loop);
}

async function predict() {

    // MEDICIÓN DE LATENCIA
    const start = performance.now();

    const prediction = await model.predict(webcam.canvas);

    const end = performance.now();

    const latency = (end - start).toFixed(2);

    latencyElement.innerText = `Inferencia: ${latency} ms`;

    // BUSCAR MEJOR PREDICCIÓN
    let bestPrediction = prediction[0];

    for (let i = 1; i < prediction.length; i++) {

        if (prediction[i].probability > bestPrediction.probability) {

            bestPrediction = prediction[i];
        }
    }

    // GUARDAR EN BUFFER
    predictionBuffer.push(bestPrediction.className);

    if (predictionBuffer.length > BUFFER_SIZE) {

        predictionBuffer.shift();
    }

    // VOTO MAYORITARIO
    const stableClass = getMajorityVote(predictionBuffer);

    // UMBRAL DE CONFIANZA
    if (bestPrediction.probability < CONFIDENCE_THRESHOLD) {

        predictionElement.innerText = "Analizando...";
        confidenceElement.innerText = "Confianza insuficiente";

        return;
    }

    // ACTUALIZAR TEXTO
    predictionElement.innerText = stableClass;

    confidenceElement.innerText =
        `Confianza: ${(bestPrediction.probability * 100).toFixed(2)}%`;

    // ACTUALIZAR BARRAS
    for (let i = 0; i < prediction.length; i++) {

        const percentage =
            (prediction[i].probability * 100).toFixed(2);

        bars[i].fill.style.width = `${percentage}%`;

        bars[i].label.innerText =
            `${prediction[i].className}: ${percentage}%`;
    }
}

// FUNCIÓN DE VOTO MAYORITARIO
function getMajorityVote(buffer) {

    const counts = {};

    buffer.forEach(item => {

        counts[item] = (counts[item] || 0) + 1;
    });

    let maxCount = 0;
    let majorityClass = buffer[0];

    for (const item in counts) {

        if (counts[item] > maxCount) {

            maxCount = counts[item];
            majorityClass = item;
        }
    }

    return majorityClass;
}

init();