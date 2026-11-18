export const personalMenuConfig = {
    id: "personalMenu",
    subtitle: "第十關：個人訓練菜單",

    benchmarks: {
        grid: 70,
        six: 65,
        horizontalFlick: 65,
        sizeFlick: 60,
        horizontalTracking: 60,
        verticalTracking: 60,
        multiShot: 55,
        bounceTracking: 55,
        angleHold: 65
    },

    getPracticeCount(accuracy, average) {
        if (accuracy === null || accuracy === undefined) {
            return 1;
        }

        const difference = accuracy - average;

        if (difference <= -10) return 5;
        if (difference < 0) return 4;
        if (difference === 0) return 3;
        if (difference < 10) return 2;

        return 1;
    }
};