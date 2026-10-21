export const horizontalFlickConfig = {
    id: "horizontalFlick",
    name: "水平甩槍",
    subtitle: "HORIZONTAL FLICK",

    // 同時只出現一個目標
    count: 1,

    // 目標半徑
    radius: 18,

    // 與上一個目標的最小水平距離比例
    minDistanceRatio: 0.25,

    // 每次命中的分數
    scorePerHit: 100,

    // 指定目標生成方式
    placement: "horizontalRandom"
};