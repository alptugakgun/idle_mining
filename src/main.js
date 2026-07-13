import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import { GameMath, AdsManager } from './gameLogic.js';

window.globalBoostEndTime = 0;

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 450,
  height: 800,
  backgroundColor: '#5D9FE6',
  dom: { createContainer: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [PreloadScene, MenuScene, GameScene]
};

// Global offline earning logic
let lastTime = Date.now();

window.playerProfile = { name: 'Guest_Miner', avatar: '/assets/sprites/sprite_5.png' };

function initTikTokSDK() {
    if (typeof tt !== 'undefined') {
        tt.login({
            force: false,
            success(res) {
                console.log('Login successful');
                tt.getUserInfo({
                    success(info) {
                        window.playerProfile.name = info.userInfo.nickName || 'Player';
                        window.playerProfile.avatar = info.userInfo.avatarUrl || window.playerProfile.avatar;
                        updateProfileUI();
                    },
                    fail(err) { console.log('GetUserInfo failed', err); }
                });
            },
            fail(err) {
                console.log('Login failed', err);
                updateProfileUI();
            }
        });
    } else {
        console.log('Localhost: Mock TikTok Login successful.');
        updateProfileUI();
    }
}

function updateProfileUI() {
    const nameEl = document.getElementById('player-name');
    const avatarEl = document.getElementById('player-avatar');
    if (nameEl) nameEl.innerText = window.playerProfile.name;
    if (avatarEl) avatarEl.src = window.playerProfile.avatar;
}

initTikTokSDK();

// Sync UI Layer size to match dynamically scaled canvas
setInterval(() => {
    const canvas = document.querySelector('canvas');
    const uiLayer = document.getElementById('ui-layer');
    if (canvas && uiLayer) {
        uiLayer.style.width = canvas.style.width || '100%';
        uiLayer.style.height = canvas.style.height || '100%';
        uiLayer.style.marginLeft = canvas.style.marginLeft || '0px';
        uiLayer.style.marginTop = canvas.style.marginTop || '0px';
    }
}, 100);

let savedState = localStorage.getItem('idleMiningSave');
if (savedState) {
    try {
        let state = JSON.parse(savedState);
        window.initialGameState = state;
    } catch(e) {}
}

const game = new Phaser.Game(config);

// Save loop
setInterval(() => {
    if (window.gameScene && window.gameScene.gameState) {
        let state = { ...window.gameScene.gameState, lastSaved: Date.now() };
        // Estimate idle cash rate for offline calc
        let idleRate = parseInt(document.getElementById('idle-cash-display').innerText) || 0;
        state.idleCashRate = idleRate;
        localStorage.setItem('idleMiningSave', JSON.stringify(state));
    }
}, 5000);

const balanceDisplay = document.getElementById('balance-display');
const idleCashDisplay = document.getElementById('idle-cash-display');
const upgradePanel = document.getElementById('upgrade-panel');
const managerPanel = document.getElementById('manager-panel');
const offlineModal = document.getElementById('offline-modal');

let currentUpgradeTarget = null;
let currentMultiplier = 1;
let currentManagerTarget = null;

function formatMoney(num) {
  if (num < 1000) return Math.floor(num).toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + 'k';
  if (num < 1000000000) return (num / 1000000).toFixed(2) + 'm';
  return (num / 1000000000).toFixed(2) + 'b';
}

function calcTotalProd() {
  if (!window.gameScene || !window.gameScene.gameState) return 0;
  const state = window.gameScene.gameState;
  let total = 0;
  window.gameScene.shafts.forEach(s => {
    total += GameMath.calculateProduction(state.mineProdBase * s.id, s.level);
  });
  return total / 3;
}

window.updateHTMLUI = () => {
  if (!window.gameScene) return;
  balanceDisplay.innerText = formatMoney(window.gameScene.gameState.balance);
  idleCashDisplay.innerText = formatMoney(calcTotalProd()) + '/s';
};

document.querySelectorAll('.upgrade-mul-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.upgrade-mul-btn').forEach(b => {
      b.classList.remove('bg-blue-600', 'text-white');
      b.classList.add('bg-slate-700', 'text-slate-300');
    });
    e.target.classList.remove('bg-slate-700', 'text-slate-300');
    e.target.classList.add('bg-blue-600', 'text-white');
    const mul = e.target.getAttribute('data-mul');
    currentMultiplier = mul === 'MAX' ? 100 : parseInt(mul);
    refreshUpgradeUI();
  });
});

document.getElementById('upgrade-close-btn').onclick = () => upgradePanel.classList.add('translate-y-full');
document.getElementById('manager-close-btn').onclick = () => { managerPanel.classList.add('hidden'); managerPanel.classList.remove('flex'); };

function refreshUpgradeUI() {
  if (!currentUpgradeTarget || !window.gameScene) return;
  const state = window.gameScene.gameState;
  let lvl = 1, baseCost = 0, baseStat = 0;
  
  if (currentUpgradeTarget.type === 'shaft') {
    const shaft = window.gameScene.shafts.find(s => s.id === currentUpgradeTarget.id);
    lvl = shaft.level;
    baseCost = state.mineCostBase * Math.pow(1.5, shaft.id - 1);
    baseStat = state.mineProdBase * shaft.id;
    document.getElementById('upgrade-title').innerText = `Upgrade Shaft ${shaft.id}`;
  } else {
    const obj = window.gameScene[currentUpgradeTarget.type];
    lvl = obj.level || 1;
    baseCost = state[`${currentUpgradeTarget.type}CostBase`];
    baseStat = state[`${currentUpgradeTarget.type}CapBase`];
    document.getElementById('upgrade-title').innerText = `Upgrade ${currentUpgradeTarget.type}`;
  }

  const cost = GameMath.calculateUpgradeCost(baseCost, state.costMul, lvl, currentMultiplier);
  document.getElementById('upgrade-cost-text').innerText = formatMoney(cost);
  document.getElementById('upgrade-level-text').innerText = `Lvl ${lvl} ➔ ${lvl + currentMultiplier}`;
  document.getElementById('upgrade-current-stat').innerText = formatMoney(GameMath.calculateProduction(baseStat, lvl));
  document.getElementById('upgrade-next-stat').innerText = formatMoney(GameMath.calculateProduction(baseStat, lvl + currentMultiplier));

  const btn = document.getElementById('upgrade-action-btn');
  if (state.balance >= cost) {
    btn.classList.replace('from-slate-500', 'from-green-500');
    btn.classList.replace('to-slate-600', 'to-green-600');
  } else {
    btn.classList.replace('from-green-500', 'from-slate-500');
    btn.classList.replace('to-green-600', 'to-slate-600');
  }
}

document.getElementById('upgrade-action-btn').onclick = () => {
  const state = window.gameScene.gameState;
  let lvl = 1, baseCost = 0;
  let obj = currentUpgradeTarget.type === 'shaft' 
    ? window.gameScene.shafts.find(s => s.id === currentUpgradeTarget.id) 
    : window.gameScene[currentUpgradeTarget.type];
    
  if (currentUpgradeTarget.type === 'shaft') baseCost = state.mineCostBase * Math.pow(1.5, obj.id - 1);
  else baseCost = state[`${currentUpgradeTarget.type}CostBase`];

  const cost = GameMath.calculateUpgradeCost(baseCost, state.costMul, obj.level || 1, currentMultiplier);
  
  if (state.balance >= cost) {
    state.balance -= cost;
    obj.level = (obj.level || 1) + currentMultiplier;
    if (obj.updateUI) obj.updateUI();
    window.updateHTMLUI();
    refreshUpgradeUI();
  }
};

document.querySelectorAll('.manager-buy-btn').forEach(btn => {
  btn.onclick = (e) => {
    const cost = parseInt(e.target.getAttribute('data-cost'));
    const state = window.gameScene.gameState;
    if (state.balance >= cost && currentManagerTarget) {
      state.balance -= cost;
      let obj = currentManagerTarget.type === 'shaft' 
        ? window.gameScene.shafts.find(s => s.id === currentManagerTarget.id) 
        : window.gameScene[currentManagerTarget.type];
      obj.assignManager();
      window.updateHTMLUI();
      managerPanel.classList.add('hidden'); managerPanel.classList.remove('flex');
    }
  };
});

const initInterval = setInterval(() => {
  if (window.gameScene && window.gameScene.gameState) {
    clearInterval(initInterval);
    
    window.gameScene.events.on('open_upgrade', (target) => {
      currentUpgradeTarget = target;
      upgradePanel.classList.remove('translate-y-full');
      refreshUpgradeUI();
    });

    window.gameScene.events.on('buy_manager', (target) => {
      currentManagerTarget = target;
      managerPanel.classList.remove('hidden'); managerPanel.classList.add('flex');
    });

    window.gameScene.events.on('watch_boost_ad', () => {
        AdsManager.showRewardedAd(() => {
            window.globalBoostEndTime = Date.now() + (60 * 60 * 1000); // 1 Hour
            document.getElementById('boost-modal').classList.add('hidden');
            document.getElementById('boost-modal').classList.remove('flex');
            window.updateHTMLUI();
        }, () => {
            alert('Boost Ad failed or closed.');
        });
    });

    const rawSave = localStorage.getItem('idle_mining_save');
    if (rawSave) {
      try {
        const save = JSON.parse(rawSave);
        const state = window.gameScene.gameState;
        state.balance = save.balance;
        state.surfaceBin = save.surfaceBin;
        
        window.gameScene.elevator.level = save.elevator.level;
        if(save.elevator.hasManager) window.gameScene.elevator.assignManager();
        
        window.gameScene.warehouse.level = save.warehouse.level;
        if(save.warehouse.hasManager) window.gameScene.warehouse.assignManager();
        
        save.shafts.forEach((savedShaft) => {
          let shaft = window.gameScene.shafts.find(s => s.id === savedShaft.id);
          if (!shaft) {
            window.gameScene.addShaft();
            shaft = window.gameScene.shafts[window.gameScene.shafts.length - 1];
          }
          shaft.level = savedShaft.level;
          if(savedShaft.manager) shaft.assignManager();
          shaft.updateUI();
        });

        window.globalBoostEndTime = save.globalBoostEndTime || 0;

        const pendingOfflineCash = GameMath.calculateOfflineEarnings(save.lastLogout, Date.now(), calcTotalProd());
        if (pendingOfflineCash > 0) {
          document.getElementById('offline-earned-text').innerText = formatMoney(pendingOfflineCash);
          offlineModal.classList.remove('hidden'); offlineModal.classList.add('flex');
          
          document.getElementById('offline-collect-btn').onclick = () => {
              state.balance += pendingOfflineCash;
              window.updateHTMLUI();
              offlineModal.classList.add('hidden'); offlineModal.classList.remove('flex');
          };
          
          const adBtn = document.getElementById('offline-collect-ad-btn');
          if (adBtn) {
              adBtn.onclick = () => {
                  AdsManager.showRewardedAd(() => {
                      state.balance += (pendingOfflineCash * 2);
                      window.updateHTMLUI();
                      offlineModal.classList.add('hidden'); offlineModal.classList.remove('flex');
                  });
              };
          }
        }
      } catch(e) {}
    }
    
    document.getElementById('offline-close-btn').onclick = () => {
      offlineModal.classList.add('hidden'); offlineModal.classList.remove('flex');
    };

    window.updateHTMLUI();
    
    setInterval(() => {
      const state = window.gameScene.gameState;
      const saveObj = {
        balance: state.balance,
        surfaceBin: state.surfaceBin,
        elevator: { level: window.gameScene.elevator.level, hasManager: window.gameScene.elevator.hasManager },
        warehouse: { level: window.gameScene.warehouse.level, hasManager: window.gameScene.warehouse.hasManager },
        shafts: window.gameScene.shafts.map(s => ({ id: s.id, level: s.level, manager: s.hasManager })),
        lastLogout: Date.now(),
        globalBoostEndTime: window.globalBoostEndTime
      };
      localStorage.setItem('idle_mining_save', JSON.stringify(saveObj));
      
      // Update Boost UI Timer
      const boostDisplay = document.getElementById('boost-timer-display');
      const timeText = document.getElementById('boost-time-text');
      if (window.globalBoostEndTime && Date.now() < window.globalBoostEndTime) {
          boostDisplay.classList.remove('hidden');
          boostDisplay.classList.add('flex');
          const remaining = Math.floor((window.globalBoostEndTime - Date.now()) / 1000);
          const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
          const secs = (remaining % 60).toString().padStart(2, '0');
          timeText.innerText = `${mins}:${secs}`;
      } else {
          boostDisplay.classList.add('hidden');
          boostDisplay.classList.remove('flex');
      }
    }, 1000);
  }
}, 100);
