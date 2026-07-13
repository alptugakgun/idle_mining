export const GameMath = {
  calculateUpgradeCost: (baseCost, multiplier, currentLevel, amount = 1) => {
    if (amount === 1) return Math.floor(baseCost * Math.pow(multiplier, currentLevel));
    const a = baseCost * Math.pow(multiplier, currentLevel);
    return Math.floor(a * (Math.pow(multiplier, amount) - 1) / (multiplier - 1));
  },

  calculateProduction: (baseProduction, currentLevel) => {
    let milestoneMultiplier = 1;
    if (currentLevel >= 10) milestoneMultiplier *= 2;
    if (currentLevel >= 50) milestoneMultiplier *= 5;
    if (currentLevel >= 100) milestoneMultiplier *= 10;
    let globalBoost = (window.globalBoostEndTime && Date.now() < window.globalBoostEndTime) ? 2 : 1;
    return baseProduction * currentLevel * milestoneMultiplier * globalBoost;
  },

  calculateOfflineEarnings: (lastLogoutTime, currentTime, prodPerSec) => {
    if (!lastLogoutTime) return 0;
    const diffSec = Math.floor((currentTime - lastLogoutTime) / 1000);
    if (diffSec < 60) return 0;
    return Math.floor(diffSec * prodPerSec * 0.10);
  }
};

export const AdsManager = {
    showRewardedAd: (onSuccess, onFail) => {
        console.log("Reklam İzleniyor... (Mock)");
        setTimeout(() => {
            console.log("Mock Reklam Bitti! Ödül Veriliyor.");
            onSuccess();
        }, 2000);
    }
};
