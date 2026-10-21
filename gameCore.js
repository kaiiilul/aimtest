const GAME_DURATION = 30;

export function createGameEngine(canvas) {
    const ctx = canvas.getContext("2d");

    let targets = [];
    let currentConfig = null;

    let score = 0;
    let hit = 0;
    let miss = 0;
    let reactionTimes = [];

    let remainingTime = GAME_DURATION;
    let startTime = 0;
    let timerId = null;
    let gameRunning = false;
    let onGameEnd = null;

    // 取得 Canvas 實際尺寸
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();

        canvas.width = Math.max(1, Math.round(rect.width));
        canvas.height = Math.max(1, Math.round(rect.height));

        // 視窗縮放時，避免目標跑到畫面外
        for (let i = 0; i < targets.length; i++) {
            const radius = currentConfig
                ? currentConfig.radius
                : 10;

            targets[i].x = Math.max(
                radius,
                Math.min(canvas.width - radius, targets[i].x)
            );

            targets[i].y = Math.max(
                radius,
                Math.min(canvas.height - radius, targets[i].y)
            );
        }

        draw();
    }

    // 計算目前命中率
    function getAccuracy() {
        const totalShots = hit + miss;

        if (totalShots === 0) {
            return 0;
        }

        return (hit / totalShots) * 100;
    }

    // 計算平均反應時間
    function getAverageReaction() {
        if (reactionTimes.length === 0) {
            return null;
        }

        let total = 0;

        for (let i = 0; i < reactionTimes.length; i++) {
            total += reactionTimes[i];
        }

        return total / reactionTimes.length;
    }

    // 更新上方統計數據
    function updateStats() {
        document.getElementById("score").textContent = score;
        document.getElementById("time").textContent = remainingTime;
        document.getElementById("hit").textContent = hit;
        document.getElementById("miss").textContent = miss;

        document.getElementById("accuracy").textContent =
            getAccuracy().toFixed(1) + "%";

        const average = getAverageReaction();

        document.getElementById("avgReaction").textContent =
            average === null
                ? "--"
                : Math.round(average) + " ms";
    }

    // 產生一個新目標
    function createTarget() {
    let radius = currentConfig.radius;

    // 如果模式有設定多種尺寸，就隨機選擇一種
    if (currentConfig.radiusOptions &&currentConfig.radiusOptions.length > 0) {
        const randomIndex = Math.floor(
            Math.random() * currentConfig.radiusOptions.length
        );

        radius = currentConfig.radiusOptions[randomIndex];
    }
    const gap = currentConfig.gap || 0;

    const width = canvas.width;
    const height = canvas.height;

    const minX = Math.min(radius, width / 2);
    const maxX = Math.max(width - radius, width / 2);
    const minY = Math.min(radius, height / 2);
    const maxY = Math.max(height - radius, height / 2);

    let x = width / 2;
    let y = height / 2;

    // 第三關：固定水平高度，左右隨機生成
    if (currentConfig.placement === "horizontalRandom") {
        y = height / 2;

        const previousTarget =
            targets.length > 0 ? targets[0] : null;

        const minDistance =
            width * (currentConfig.minDistanceRatio || 0);

        let validPositionFound = false;

        for (let attempt = 0; attempt < 100; attempt++) {
            x = minX + Math.random() * (maxX - minX);

            if (
                previousTarget === null ||
                Math.abs(x - previousTarget.x) >= minDistance
            ) {
                validPositionFound = true;
                break;
            }
        }

        // 若隨機嘗試次數用完，選擇距離舊目標較遠的一側
        if (!validPositionFound && previousTarget !== null) {
            const leftDistance = Math.abs(
                minX - previousTarget.x
            );

            const rightDistance = Math.abs(
                maxX - previousTarget.x
            );

            x = leftDistance >= rightDistance ? minX : maxX;
        }
    } else {
        // 第一、二關：保留原本的隨機位置生成方式
        for (let attempt = 0; attempt < 100; attempt++) {
            x = minX + Math.random() * (maxX - minX);
            y = minY + Math.random() * (maxY - minY);

            let valid = true;

            for (let i = 0; i < targets.length; i++) {
                const dx = x - targets[i].x;
                const dy = y - targets[i].y;
                const distance = Math.sqrt(
                    dx * dx + dy * dy
                );

                if (
                    distance <
                    radius + targets[i].radius + gap
                ) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                break;
            }
        }
    }

    return {
        x: x,
        y: y,
        radius: radius,
        bornAt: performance.now()
    };
}

    // 依設定建立所有目標
    function createTargets() {
        targets = [];

        for (let i = 0; i < currentConfig.count; i++) {
            targets.push(createTarget());
        }
    }

    // 繪製單一目標
    function drawTarget(target) {
        ctx.beginPath();
        ctx.arc(
            target.x,
            target.y,
            target.radius,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = "#57e3a0";
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.strokeStyle = "#c5ffe2";
        ctx.stroke();

        // 目標中心點
        ctx.beginPath();
        ctx.arc(
            target.x,
            target.y,
            Math.max(2, target.radius * 0.2),
            0,
            Math.PI * 2
        );
        ctx.fillStyle = "#11151c";
        ctx.fill();
    }

    // 重繪遊戲畫面
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < targets.length; i++) {
            drawTarget(targets[i]);
        }
    }

    // 點擊畫布
    function handleCanvasClick(event) {
        if (!gameRunning) {
            return;
        }

        const rect = canvas.getBoundingClientRect();

        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        let targetIndex = -1;

        // 檢查點擊位置是否在目標內
        for (let i = 0; i < targets.length; i++) {
            const dx = mouseX - targets[i].x;
            const dy = mouseY - targets[i].y;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= targets[i].radius) {
                targetIndex = i;
                break;
            }
        }

        if (targetIndex === -1) {
            // 沒有擊中任何目標
            miss++;
        } else {
            // 命中目標
            hit++;

            const reactionTime =
                performance.now() - targets[targetIndex].bornAt;

            reactionTimes.push(reactionTime);

            score += currentConfig.scorePerHit;

            // 只替換被擊中的目標，其他目標保持不變
            targets.splice(targetIndex, 1);
            targets.push(createTarget());
        }

        updateStats();
        draw();
    }

    // 結束訓練
    function endGame() {
        if (!gameRunning) {
            return;
        }

        gameRunning = false;

        if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
        }

        remainingTime = 0;
        updateStats();
        draw();

        const result = {
            score: score,
            hit: hit,
            miss: miss,
            accuracy: getAccuracy(),
            averageReaction: getAverageReaction()
        };

        if (typeof onGameEnd === "function") {
            onGameEnd(result);
        }
    }

    // 開始訓練
    function start(config, endCallback) {
        if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
        }

        currentConfig = config;
        onGameEnd = endCallback || null;

        score = 0;
        hit = 0;
        miss = 0;
        reactionTimes = [];

        remainingTime = GAME_DURATION;
        startTime = Date.now();
        gameRunning = true;

        resizeCanvas();
        createTargets();
        updateStats();
        draw();

        // 每 100 毫秒更新一次倒數
        timerId = setInterval(function () {
            if (!gameRunning) {
                return;
            }

            const elapsed = (Date.now() - startTime) / 1000;

            remainingTime = Math.max(
                0,
                Math.ceil(GAME_DURATION - elapsed)
            );

            updateStats();

            if (elapsed >= GAME_DURATION) {
                endGame();
            }
        }, 100);
    }

    // 註冊事件
    canvas.addEventListener("click", handleCanvasClick);
    window.addEventListener("resize", resizeCanvas);

    // 初始化畫布
    resizeCanvas();
    updateStats();

    return {
        start: start
    };
}