import { createGameEngine } from "./gameCore.js";
import { gridShotConfig } from "./mode1-gridshot.js";
import { sixShotConfig } from "./mode2-sixshot.js";
import { horizontalFlickConfig } from "./mode3-horizontal-flick.js";
import { sizeFlickConfig } from "./mode4-size-flick.js";

// 所有可用模式
const gameModes = {
    grid: gridShotConfig,
    six: sixShotConfig,
    horizontalFlick: horizontalFlickConfig,
    sizeFlick: sizeFlickConfig
};

// 取得 HTML 元素
const canvas = document.getElementById("gameCanvas");

const startPanel = document.getElementById("startPanel");
const resultPanel = document.getElementById("resultPanel");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const backButton = document.getElementById("backButton");

const modeName = document.getElementById("modeName");
const resultModeName = document.getElementById("resultModeName");

const modeButtons = document.querySelectorAll(".modeButton");

// 預設第一關
let currentMode = gridShotConfig;

// 建立共用遊戲引擎
const game = createGameEngine(canvas);

// 更新模式選擇畫面
function updateModeSelection() {
    modeName.textContent = currentMode.subtitle;

    for (let i = 0; i < modeButtons.length; i++) {
        const button = modeButtons[i];

        if (button.dataset.mode === currentMode.id) {
            button.classList.add("selected");
            button.setAttribute("aria-pressed", "true");
        } else {
            button.classList.remove("selected");
            button.setAttribute("aria-pressed", "false");
        }
    }
}

// 選擇遊戲模式
function setGameMode(modeId) {
    if (!gameModes[modeId]) {
        return;
    }

    currentMode = gameModes[modeId];
    updateModeSelection();
}

// 開始訓練
function startTraining() {
    startPanel.hidden = true;
    resultPanel.hidden = true;

    resultModeName.textContent =
        currentMode.subtitle + " · 訓練報告";

    game.start(currentMode, function (result) {
        showResult(result);
    });
}

// 顯示結算畫面
function showResult(result) {
    document.getElementById("finalScore").textContent =
        result.score;

    document.getElementById("finalHit").textContent =
        result.hit;

    document.getElementById("finalMiss").textContent =
        result.miss;

    document.getElementById("finalAccuracy").textContent =
        result.accuracy.toFixed(1) + "%";

    document.getElementById("finalReaction").textContent =
        result.averageReaction === null
            ? "--"
            : Math.round(result.averageReaction) + " ms";

    resultModeName.textContent =
        currentMode.subtitle + " · 訓練報告";

    resultPanel.hidden = false;
}

// 綁定模式選擇按鈕
for (let i = 0; i < modeButtons.length; i++) {
    modeButtons[i].addEventListener("click", function () {
        setGameMode(this.dataset.mode);
    });
}

// 開始訓練
startButton.addEventListener("click", function () {
    startTraining();
});

// 使用相同模式重新訓練
restartButton.addEventListener("click", function () {
    startTraining();
});

// 返回模式選擇
backButton.addEventListener("click", function () {
    resultPanel.hidden = true;
    startPanel.hidden = false;

    updateModeSelection();
});

// 初始化
updateModeSelection();