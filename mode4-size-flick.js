
export const sizeFlickConfig = {
    id: "sizeFlick",
    name: "大小隨機甩槍",
    subtitle: "SIZE FLICK",

    // 同時只出現一個目標
    count: 1,

    // 預設半徑
    radius: 18,

    // 每次生成目標時，隨機選擇半徑
    radiusOptions: [10, 18, 28],

    // 每次命中的分數
    scorePerHit: 100,

    // 在畫布內隨機生成
    placement: "random"
};