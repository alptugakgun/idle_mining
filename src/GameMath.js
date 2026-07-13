export default class GameMath {
  static getCost(baseCost, level, multiplier = 1, growthFactor = 1.15) {
    if (multiplier === 1) {
      return baseCost * Math.pow(growthFactor, level - 1);
    }
    let total = 0;
    for (let i = 0; i < multiplier; i++) {
      total += baseCost * Math.pow(growthFactor, (level - 1) + i);
    }
    return total;
  }

  static getProduction(baseProd, level) {
    let tierMultiplier = 1;
    if (level >= 10) tierMultiplier *= 2;
    if (level >= 25) tierMultiplier *= 2;
    if (level >= 50) tierMultiplier *= 2;
    if (level >= 100) tierMultiplier *= 2;
    let globalBoost = (window.globalBoostEndTime && Date.now() < window.globalBoostEndTime) ? 2 : 1;
    return baseProd * level * tierMultiplier * globalBoost;
  }

  static getStars(level) {
    let stars = 1;
    if (level >= 10) stars = 2;
    if (level >= 25) stars = 3;
    if (level >= 50) stars = 4;
    if (level >= 100) stars = 5;
    return stars;
  }

  static calculateMaxUpgrades(balance, baseCost, level, growthFactor = 1.15) {
    let count = 0;
    let currentCost = this.getCost(baseCost, level, 1, growthFactor);
    let tempBalance = balance;
    while (tempBalance >= currentCost) {
      tempBalance -= currentCost;
      count++;
      currentCost = this.getCost(baseCost, level + count, 1, growthFactor);
    }
    return count;
  }

  static calculateOfflineEarnings(lastLogoutTime, currentTime, prodPerSec) {
    if (!lastLogoutTime) return 0;
    const diffSec = Math.floor((currentTime - lastLogoutTime) / 1000);
    if (diffSec < 60) return 0;
    return Math.floor(diffSec * prodPerSec * 0.10);
  }

  static formatMoney(num) {
    if (num < 1000) return num.toFixed(2);
    if (num < 1000000) return (num / 1000).toFixed(2) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(2) + 'M';
    if (num < 1000000000000) return (num / 1000000000).toFixed(2) + 'B';
    return (num / 1000000000000).toFixed(2) + 'T';
  }
}
