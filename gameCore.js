const GAME_DURATION = 30;

export function createGameEngine(canvas) {
    const ctx = canvas.getContext("2d");
    const TRACKING_CHECK_INTERVAL = 100; // 每 100 毫秒檢查一次
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

    let animationFrameId = null;
    let lastFrameTime = 0;

    let lastTrackingCheckTime = 0;
    // 滑鼠在 Canvas 內的座標，以及左鍵是否正被按住
    let mouseX = -1;
    let mouseY = -1;
    let mouseDown = false;

    // 跟槍模式依照動畫影格累積實際瞄準時間

    // 取得 Canvas 實際尺寸
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();

        canvas.width = Math.max(1, Math.round(rect.width));
        canvas.height = Math.max(1, Math.round(rect.height));

        // 視窗縮放時，避免目標跑到畫面外
        for (let i = 0; i < targets.length; i++) {
            const radius = targets[i].radius || 10;

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
        let radius =
        currentConfig.id === "multiShot"
        ? currentConfig.startRadius
        : currentConfig.radius;

        // 如果模式有設定多種尺寸，就隨機選擇一種
        if (
            currentConfig.radiusOptions &&
            currentConfig.radiusOptions.length > 0
        ) {
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
        if (currentConfig.movement === "angleHold") {
            x = radius + Math.random() * (width - radius * 2);
            y = height / 2;
        }
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
                const leftDistance = Math.abs(minX - previousTarget.x);
                const rightDistance = Math.abs(maxX - previousTarget.x);

                x = leftDistance >= rightDistance ? minX : maxX;
            }
        } else if (currentConfig.movement === "angleHold") {
            // 第九關：固定在畫面中央高度，左右隨機生成
            x = radius + Math.random() * (width - radius * 2);
            y = height / 2;

        } else if (
            currentConfig.movement === "horizontal" ||
            currentConfig.movement === "vertical"
        ) {
            // 第五、六關：移動目標從畫面內的隨機位置開始
            x = minX + Math.random() * (maxX - minX);
            y = minY + Math.random() * (maxY - minY);
        } else {
            // 第一、二、四關：隨機位置，並盡量避免目標互相重疊
            for (let attempt = 0; attempt < 100; attempt++) {
                x = minX + Math.random() * (maxX - minX);
                y = minY + Math.random() * (maxY - minY);

                let valid = true;

                for (let i = 0; i < targets.length; i++) {
                    const dx = x - targets[i].x;
                    const dy = y - targets[i].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < radius + targets[i].radius + gap) {
                        valid = false;
                        break;
                    }
                }

                if (valid) {
                    break;
                }
            }
        }

        let vx = 0;
        let vy = 0;

        if (currentConfig.movement === "horizontal") {
            const speed = currentConfig.speed || 220;
            vx = Math.random() < 0.5 ? -speed : speed;
        }

        if (currentConfig.movement === "vertical") {
            const speed = currentConfig.speed || 220;
            vy = Math.random() < 0.5 ? -speed : speed;
        }
        if (currentConfig.movement === "bounce") {
            const speed = currentConfig.speed || 250;

            // 隨機產生移動角度
            const angle = Math.random() * Math.PI * 2;

            vx = Math.cos(angle) * speed;
            vy = Math.sin(angle) * speed;
        }
        // 第九關：架槍訓練，球只會左右移動
        if (currentConfig.movement === "angleHold") {
            const speed = currentConfig.speed || 260;
            vx = Math.random() < 0.5 ? -speed : speed;
        }
        return {
            x: x,
            y: y,
            radius: radius,
            vx: vx,
            vy: vy,
            bornAt: performance.now(),
            trackingProgress: 0,

            // 第七關：目標動畫經過時間，從 0 秒開始
            multiShotElapsed: 0,

            // 第八關：每 0.5～3 秒隨機改變方向
            directionChangeTimer: 0.5 + Math.random() * 2.5
        };
    }

    // 依設定建立所有目標
    function createTargets() {
        targets = [];

        for (let i = 0; i < currentConfig.count; i++) {
            targets.push(createTarget());
        }
    }
     // 第七關：目標由小變大、再縮小，最後消失
    function updateMultiShot(deltaTime) {
  if (!currentConfig || currentConfig.id !== "multiShot") {
    return;
  }

  // 確保場上維持 5 個目標
  while (targets.length < currentConfig.count) {
    targets.push(createTarget());
  }

  // 分別更新每一個目標
  for (let i = targets.length - 1; i >= 0; i--) {
    const target = targets[i];

    target.multiShotElapsed += deltaTime;

    const growDuration = currentConfig.growDuration || 0.8;
    const shrinkDuration = currentConfig.shrinkDuration || 1.2;
    const totalDuration = growDuration + shrinkDuration;

    const startRadius = currentConfig.startRadius || 8;
    const maxRadius = currentConfig.maxRadius || 30;
    const minRadius = currentConfig.minRadius || 4;

    // 階段一：由小變大
    if (target.multiShotElapsed < growDuration) {
      const progress = target.multiShotElapsed / growDuration;

      target.radius =
        startRadius + (maxRadius - startRadius) * progress;
    }

    // 階段二：由大變小
    else if (target.multiShotElapsed < totalDuration) {
      const progress =
        (target.multiShotElapsed - growDuration) / shrinkDuration;

      target.radius =
        maxRadius - (maxRadius - minRadius) * progress;
    }

    // 階段三：時間到，未擊中
    else {
      miss++;

      targets.splice(i, 1);
      targets.push(createTarget());

      updateStats();
    }
  }
}
    // 更新移動目標的位置；會突然變換方向，碰到邊界時也會反彈
    function updateTargets(deltaTime) {
        if (!currentConfig) {
        return;
    }

    // 第七關使用專屬的尺寸動畫
    if (currentConfig.id === "multiShot") {
        updateMultiShot(deltaTime);
        return;
    }

        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];

            // 隨機倒數，時間到就突然改變方向
            // 第五、六關：原本的水平／垂直隨機轉向
            // 第八關：每 0.5～3 秒隨機轉向 360 度內任意方向
            if (
                currentConfig.movement === "horizontal" ||
                currentConfig.movement === "vertical" ||
                currentConfig.movement === "bounce"
            ) {
                target.directionChangeTimer -= deltaTime;

                if (target.directionChangeTimer <= 0) {
                    const speed = currentConfig.speed || 220;

                    if (currentConfig.movement === "bounce") {
                        // 隨機選擇 0～360 度的方向
                        const angle = Math.random() * Math.PI * 2;

                        target.vx = Math.cos(angle) * speed;
                        target.vy = Math.sin(angle) * speed;

                        // 下一次轉向時間：0.5～3 秒
                        target.directionChangeTimer =
                            0.5 + Math.random() * 2.5;
                    } else {
                        // 保留第五、六關原本的移動方式
                        if (currentConfig.movement === "horizontal") {
                            target.vx = Math.random() < 0.5 ? -speed : speed;
                        } else {
                            target.vy = Math.random() < 0.5 ? -speed : speed;
                        }

                        target.directionChangeTimer =
                            0.7 + Math.random() * 1.3;
                    }
                }
            }

            if (currentConfig.movement === "horizontal") {
                target.x += target.vx * deltaTime;

                if (target.x <= target.radius) {
                    target.x = target.radius;
                    target.vx = Math.abs(target.vx);
                }

                if (target.x >= canvas.width - target.radius) {
                    target.x = canvas.width - target.radius;
                    target.vx = -Math.abs(target.vx);
                }
            }
            // 第九關：球在牆後方左右移動
            if (currentConfig.movement === "angleHold") {
                target.x += target.vx * deltaTime;

                if (target.x <= target.radius) {
                    target.x = target.radius;
                    target.vx = Math.abs(target.vx);
                }

                if (target.x >= canvas.width - target.radius) {
                    target.x = canvas.width - target.radius;
                    target.vx = -Math.abs(target.vx);
                }
            }
            if (currentConfig.movement === "vertical") {
                target.y += target.vy * deltaTime;

                if (target.y <= target.radius) {
                    target.y = target.radius;
                    target.vy = Math.abs(target.vy);
                }

                if (target.y >= canvas.height - target.radius) {
                    target.y = canvas.height - target.radius;
                    target.vy = -Math.abs(target.vy);
                }
            }
            if (currentConfig.movement === "bounce") {
                // 更新球的位置
                target.x += target.vx * deltaTime;
                target.y += target.vy * deltaTime;

                // 碰到左側或右側邊界就反彈
                if (target.x <= target.radius) {
                    target.x = target.radius;
                    target.vx = Math.abs(target.vx);
                } else if (target.x >= canvas.width - target.radius) {
                    target.x = canvas.width - target.radius;
                    target.vx = -Math.abs(target.vx);
                }

                // 碰到上方或下方邊界就反彈
                if (target.y <= target.radius) {
                    target.y = target.radius;
                    target.vy = Math.abs(target.vy);
                } else if (target.y >= canvas.height - target.radius) {
                    target.y = canvas.height - target.radius;
                    target.vy = -Math.abs(target.vy);
                }
            }
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

        // 第五、六關顯示血條，第八關彈跳球不顯示
        if (
            currentConfig &&
            currentConfig.tracking &&
            !currentConfig.bounceTracking
        ) {
            const barWidth = Math.max(42, target.radius * 2.8);
            const barHeight = 7;
            const barX = target.x - barWidth / 2;
            const barY = target.y - target.radius - 16;

            const progress = Math.max(
                0,
                Math.min(1, (target.trackingProgress || 0) / 3)
            );

            ctx.fillStyle = "#3a2028";
            ctx.fillRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = "#57e3a0";
            ctx.fillRect(barX, barY, barWidth * progress, barHeight);

            ctx.lineWidth = 1;
            ctx.strokeStyle = "#e8fff3";
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
    }
    // 第九關：繪製左右牆壁，保留中間縫隙
    function drawAngleHoldWalls() {
        if (!currentConfig || currentConfig.movement !== "angleHold") {
            return;
        }

        const gapRatio = currentConfig.wallGapRatio || 0.22;
        const gapWidth = canvas.width * gapRatio;

        const gapLeft = (canvas.width - gapWidth) / 2;
        const gapRight = gapLeft + gapWidth;

        // 牆壁顏色
        ctx.fillStyle = "#343d49";

        // 左側牆壁
        ctx.fillRect(
            0,
            0,
            gapLeft,
            canvas.height
        );

        // 右側牆壁
        ctx.fillRect(
            gapRight,
            0,
            canvas.width - gapRight,
            canvas.height
        );

        // 牆壁邊緣
        ctx.strokeStyle = "#657181";
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(gapLeft, 0);
        ctx.lineTo(gapLeft, canvas.height);

        ctx.moveTo(gapRight, 0);
        ctx.lineTo(gapRight, canvas.height);
        ctx.stroke();

        // 縫隙邊緣提示
        ctx.fillStyle = "rgba(87, 227, 160, 0.08)";
        ctx.fillRect(
            gapLeft,
            0,
            gapWidth,
            canvas.height
        );
    }
    // 重繪遊戲畫面
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 先畫球
        for (let i = 0; i < targets.length; i++) {
            drawTarget(targets[i]);
        }

        // 再畫牆壁，讓球被牆壁遮住
        drawAngleHoldWalls();
    }

    // 更新滑鼠位置，轉換成 Canvas 座標
    function updateMousePosition(event) {
        const rect = canvas.getBoundingClientRect();

        mouseX = event.clientX - rect.left;
        mouseY = event.clientY - rect.top;
    }

    // 跟槍模式：按住左鍵並持續瞄準目標，累積 5 秒後擊破
    function updateTracking(timestamp) {
    // 只在遊戲進行、目前是跟槍模式，而且按住左鍵時執行
    if (
        !gameRunning ||
        !currentConfig ||
        !currentConfig.tracking ||
        !mouseDown
    ) {
        return;
    }

    // 每隔 100 毫秒才檢查一次
    if (timestamp - lastTrackingCheckTime < TRACKING_CHECK_INTERVAL) {
        return;
    }

    lastTrackingCheckTime = timestamp;

    let targetIndex = -1;

    // 檢查滑鼠是否在任何一個目標上
    for (let i = 0; i < targets.length; i++) {
        const target = targets[i];

        const dx = mouseX - target.x;
        const dy = mouseY - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= target.radius) {
            targetIndex = i;
            break;
        }
    }

    // 準心在目標上
    if (targetIndex !== -1) {
        const target = targets[targetIndex];

        // 每次成功追蹤加 100 分，並增加一次 Hit
        score += 100;
        hit++;

        // 每次檢查代表 0.1 秒的有效追蹤時間
        target.trackingProgress =
            (target.trackingProgress || 0) + 0.1;

        // 累積追蹤滿 3 秒，擊殺目標
        if (!currentConfig.bounceTracking) {
            // 原本第五、六關的擊破目標機制
            if (target.trackingProgress >= 3) {
                if (target.bornAt !== undefined) {
                    reactionTimes.push(timestamp - target.bornAt);
                }

                targets.splice(targetIndex, 1);
                targets.push(createTarget());
            }
        }
            } else {
                // 準心不在任何目標上
                miss++;
            }

    // 更新畫面上的統計數據
    updateStats();
}
    // 遊戲動畫：更新移動、跟槍判定並重繪
    function animate(timestamp) {
        if (!gameRunning) {
            return;
        }

        const deltaTime = Math.min(
            Math.max((timestamp - lastFrameTime) / 1000, 0),
            0.05
        );

        lastFrameTime = timestamp;

        updateTargets(deltaTime);
        updateTracking(timestamp);
        draw();

        animationFrameId = requestAnimationFrame(animate);
    }

    // 點擊畫布：第一、二、三、四關使用
    function handleCanvasClick(event) {
        if (!gameRunning || (currentConfig && currentConfig.tracking)) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        let targetIndex = -1;

        // 檢查點擊位置是否在目標內
        for (let i = 0; i < targets.length; i++) {
            const dx = clickX - targets[i].x;
            const dy = clickY - targets[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            let isVisible = true;

        // 第九關：只有球進入牆壁縫隙時才能被擊中
        if (currentConfig.movement === "angleHold") {
            const gapWidth =
                canvas.width * (currentConfig.wallGapRatio || 0.22);

            const gapLeft = (canvas.width - gapWidth) / 2;
            const gapRight = gapLeft + gapWidth;

            isVisible =
                clickX >= gapLeft &&
                clickX <= gapRight;
        }

        if (distance <= targets[i].radius && isVisible) {
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
        mouseDown = false;

        if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
        }

        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
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

        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        currentConfig = config;
        onGameEnd = endCallback || null;

        score = 0;
        hit = 0;
        miss = 0;
        reactionTimes = [];

        mouseDown = false;
        remainingTime = GAME_DURATION;
        startTime = Date.now();
        gameRunning = true;

        resizeCanvas();
        createTargets();
        updateStats();
        draw();

        lastFrameTime = performance.now();
        animationFrameId = requestAnimationFrame(animate);

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
    canvas.addEventListener("mousemove", updateMousePosition);

    canvas.addEventListener("mousedown", function (event) {
        if (event.button !== 0 || !gameRunning) {
            return;
        }

        updateMousePosition(event);

        if (currentConfig && currentConfig.tracking) {
            mouseDown = true;
        }
    });

    // 使用 window，確保滑鼠在按住時移出 Canvas 再放開也能停止
    window.addEventListener("mouseup", function (event) {
        if (event.button === 0) {
            mouseDown = false;
        }
    });

    // 切換分頁或視窗失焦時，避免左鍵狀態卡住
    window.addEventListener("blur", function () {
        mouseDown = false;
    });

    window.addEventListener("resize", resizeCanvas);

    // 初始化畫布
    resizeCanvas();
    updateStats();

    return {
        start: start
    };
}