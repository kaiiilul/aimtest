import { createGameEngine } from "./gameCore.js";
import { gridShotConfig } from "./mode1-gridshot.js";
import { sixShotConfig } from "./mode2-sixshot.js";
import { horizontalFlickConfig } from "./mode3-horizontal-flick.js";
import { sizeFlickConfig } from "./mode4-size-flick.js";
import { horizontalTrackingConfig } from "./mode5-horizontal-tracking.js";
import { verticalTrackingConfig } from "./mode6-vertical-tracking.js";
import { multiShotConfig } from "./mode7-multishot.js";
import { bounceTrackingConfig } from "./mode8-bounce-tracking.js";
import { angleHoldConfig } from "./mode9-angle-hold.js";
import { personalMenuConfig } from "./mode10-personal-menu.js";

// 所有一般遊戲模式
const gameModes = {
    grid: gridShotConfig,
    six: sixShotConfig,
    horizontalFlick: horizontalFlickConfig,
    sizeFlick: sizeFlickConfig,
    horizontalTracking: horizontalTrackingConfig,
    verticalTracking: verticalTrackingConfig,
    multiShot: multiShotConfig,
    bounceTracking: bounceTrackingConfig,
    angleHold: angleHoldConfig
};

// 模式名稱
const modeLabels = {
    grid: "第一關：網格射擊",
    six: "第二關：六連射",
    horizontalFlick: "第三關：水平甩槍",
    sizeFlick: "第四關：大小隨機甩槍",
    horizontalTracking: "第五關：左右跟槍",
    verticalTracking: "第六關：上下跟槍",
    multiShot: "第七關：多重射擊",
    bounceTracking: "第八關：彈跳球訓練",
    angleHold: "第九關：架槍訓練"
};

// 取得 HTML 元素
const canvas = document.getElementById("gameCanvas");

const startPanel = document.getElementById("startPanel");
const resultPanel = document.getElementById("resultPanel");
const personalMenuPanel = document.getElementById("personalMenuPanel");

const personalMenuContent =
    document.getElementById("personalMenuContent");

const personalMenuBackButton =
    document.getElementById("personalMenuBackButton");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const backButton = document.getElementById("backButton");

const modeName = document.getElementById("modeName");
const resultModeName = document.getElementById("resultModeName");

const modeButtons = document.querySelectorAll(".modeButton");

// 預設第一關
let currentMode = gridShotConfig;
let selectedModeId = "grid";

// 建立共用遊戲引擎
const game = createGameEngine(canvas);

// 更新模式選擇畫面
function updateModeSelection() {
    if (selectedModeId === "personalMenu") {
        modeName.textContent = personalMenuConfig.subtitle;
    } else {
        modeName.textContent = currentMode.subtitle;
    }

    for (let i = 0; i < modeButtons.length; i++) {
        const button = modeButtons[i];

        if (button.dataset.mode === selectedModeId) {
            button.classList.add("selected");
            button.setAttribute("aria-pressed", "true");
        } else {
            button.classList.remove("selected");
            button.setAttribute("aria-pressed", "false");
        }
    }
}

// 讀取已儲存的成績
function getSavedResults() {
    try {
        return JSON.parse(
            localStorage.getItem("aimTrainerResults") || "{}"
        );
    } catch (error) {
        return {};
    }
}

// 顯示第十關個人訓練菜單
function showPersonalMenu() {
    selectedModeId = "personalMenu";

    startPanel.hidden = true;
    resultPanel.hidden = true;
    personalMenuPanel.hidden = false;

    updateModeSelection();
    renderPersonalMenu();
}

// 產生個人訓練建議
function renderPersonalMenu() {
    const savedResults = getSavedResults();

    let html = "";

    for (const modeId in personalMenuConfig.benchmarks) {
        const average = personalMenuConfig.benchmarks[modeId];
        const result = savedResults[modeId];

        let accuracy = null;
        let practiceCount = 1;
        let status = "尚未完成測驗";

        if (result && result.completed) {
            accuracy = result.accuracy;

            practiceCount =
                personalMenuConfig.getPracticeCount(
                    accuracy,
                    average
                );

            status = "目前命中率：" +
                Number(accuracy).toFixed(1) + "%";
        }

        html += `
            <div class="resultItem" style="margin-bottom: 12px;">
                <strong>${modeLabels[modeId]}</strong>

                <p>${status}</p>

                <p>參考基準：${average}%</p>

                <p>建議練習次數：
                    <strong>${practiceCount} 次</strong>
                </p>

                <button
                    type="button"
                    class="practiceButton"
                    data-practice-mode="${modeId}">
                    開始此項訓練
                </button>
            </div>
        `;
    }

    personalMenuContent.innerHTML = html;

    // 綁定每個訓練項目的按鈕
    const practiceButtons =
        personalMenuContent.querySelectorAll(".practiceButton");

    for (let i = 0; i < practiceButtons.length; i++) {
        practiceButtons[i].addEventListener("click", function () {
            const modeId = this.dataset.practiceMode;

            setGameMode(modeId);

            personalMenuPanel.hidden = true;
            startTraining();
        });
    }
}

// 選擇遊戲模式
function setGameMode(modeId) {

    // 如果選擇第十關
    if (modeId === "personalMenu") {
        showPersonalMenu();
        return;
    }

    if (!gameModes[modeId]) {
        return;
    }

    currentMode = gameModes[modeId];
    selectedModeId = modeId;

    updateModeSelection();

    personalMenuPanel.hidden = true;
    startPanel.hidden = false;
}

// 開始訓練
function startTraining() {
    startPanel.hidden = true;
    resultPanel.hidden = true;
    personalMenuPanel.hidden = true;

    resultModeName.textContent =
        currentMode.subtitle + " · 訓練報告";

    game.start(currentMode, function (result) {
        showResult(result);
    });
}

// 顯示結算畫面
function showResult(result) {

    // 儲存目前關卡的測驗成績
    const savedResults = getSavedResults();

    savedResults[currentMode.id] = {
        score: result.score,
        hit: result.hit,
        miss: result.miss,
        accuracy: result.accuracy,
        averageReaction: result.averageReaction,
        completed: true,
        date: new Date().toISOString()
    };

    localStorage.setItem(
        "aimTrainerResults",
        JSON.stringify(savedResults)
    );

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

// 結算畫面返回模式選擇
backButton.addEventListener("click", function () {
    resultPanel.hidden = true;
    startPanel.hidden = false;
    personalMenuPanel.hidden = true;

    updateModeSelection();
});

// 個人菜單返回模式選擇
personalMenuBackButton.addEventListener("click", function () {
    personalMenuPanel.hidden = true;
    startPanel.hidden = false;

    selectedModeId = currentMode.id;
    updateModeSelection();
});

// 初始化
updateModeSelection();