import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import GameMath from './GameMath.js';

// ── On-Screen Debug Logger ──
window.logToScreen = function(msg) {
  const dbg = document.getElementById('debug-console');
  if(dbg) dbg.innerHTML += '<br/>> ' + msg;
  console.log(msg);
};

// ── Global State ──
window.globalBoostEndTime = 0;
window.playerProfile = { name: 'Guest_Miner', avatar: '/assets/sprites/sprite_5.png' };

// ── Phaser Config ──
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

// ── TikTok SDK Init ──
function initTikTokSDK() {
  window.logToScreen("initTikTokSDK called. TTMinis object: " + typeof TTMinis);
  if (typeof TTMinis !== 'undefined') {
    try {
        TTMinis.init({
            clientKey: 'sbaw5t3lvvcxfi4puy'
        });
        window.logToScreen("TTMinis SDK Initialized Successfully!");
        
        if (TTMinis.login) {
            TTMinis.login({
              force: false,
              success(res) {
                window.logToScreen('Login successful');
                if (TTMinis.getUserInfo) {
                    TTMinis.getUserInfo({
                      success(info) {
                        window.playerProfile.name = info.userInfo.nickName || 'Player';
                        window.playerProfile.avatar = info.userInfo.avatarUrl || window.playerProfile.avatar;
                        updateProfileUI();
                      },
                      fail(err) { window.logToScreen("GetUserInfo error: " + JSON.stringify(err)); }
                    });
                }
              },
              fail(err) {
                window.logToScreen("TTMinis.login failed: " + JSON.stringify(err));
                updateProfileUI();
              }
            });
        } else {
            updateProfileUI();
        }
    } catch (err) {
        window.logToScreen("TTMinis Init/Login Error: " + (err.message || JSON.stringify(err)));
    }
  } else {
    window.logToScreen("CRITICAL ERROR: TTMinis object could not be loaded!");
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

// ── UI Resize (ResizeObserver + fallback) ──
function resizeUI() {
  const canvas = document.querySelector('canvas');
  const uiLayer = document.getElementById('ui-layer');
  if (canvas && uiLayer) {
    uiLayer.style.width = canvas.style.width || '100%';
    uiLayer.style.height = canvas.style.height || '100%';
    uiLayer.style.marginLeft = canvas.style.marginLeft || '0px';
    uiLayer.style.marginTop = canvas.style.marginTop || '0px';
  }
}

window.addEventListener('resize', resizeUI);

// Use ResizeObserver for responsive UI sync (replaces old setInterval hack)
const gameContainer = document.getElementById('game-container');
if (gameContainer && typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(resizeUI).observe(gameContainer);
} else {
  // Fallback for older browsers
  setInterval(resizeUI, 1000);
}

// ── Load Saved State (with migration from old key) ──
let savedState = localStorage.getItem('idle_mining_save');
// Migrate from old inconsistent key if new key doesn't exist
if (!savedState) {
  savedState = localStorage.getItem('idleMiningSave');
  if (savedState) {
    localStorage.setItem('idle_mining_save', savedState);
    localStorage.removeItem('idleMiningSave');
  }
}
if (savedState) {
  try {
    let state = JSON.parse(savedState);
    window.initialGameState = state;
  } catch (e) { }
}

// ── Create Phaser Game ──
const game = new Phaser.Game(config);

// ── Rewarded Ad Helper ──
function showRewardedAd(onSuccess, onFail) {
  if (typeof TTMinis !== 'undefined' && TTMinis.createRewardedVideoAd) {
    try {
      let videoAd = TTMinis.createRewardedVideoAd({ adUnitId: 'TEST_AD_UNIT_ID' });
      videoAd.show().then(() => {
        window.logToScreen("Ad opened successfully!");
      }).catch(() => {
        window.logToScreen("Ad API error, test reward granted!");
        if (onSuccess) onSuccess();
      });
      videoAd.onClose((res) => {
        if (res && res.isEnded) {
          window.logToScreen("Ad completed! Reward granted.");
          if (onSuccess) onSuccess();
        } else {
          window.logToScreen("Ad interrupted, reward cancelled.");
          if (onFail) onFail();
        }
      });
    } catch (e) {
      window.logToScreen("Ad API Error: " + e.message);
      // Mock fallback for development
      console.log("Watching Ad... (Mock)");
      setTimeout(() => {
        console.log("Mock Ad Finished! Granting Reward.");
        if (onSuccess) onSuccess();
      }, 2000);
    }
  } else {
    // Mock fallback for development
    console.log("Watching Ad... (Mock)");
    setTimeout(() => {
      console.log("Mock Ad Finished! Granting Reward.");
      if (onSuccess) onSuccess();
    }, 2000);
  }
}

// Make it globally accessible
window.showRewardedAd = showRewardedAd;

// ── Helper: Calculate total production per second ──
function calcTotalProd() {
  if (!window.gameScene || !window.gameScene.gameState) return 0;
  const state = window.gameScene.gameState;
  let total = 0;
  window.gameScene.shafts.forEach(s => {
    total += GameMath.getProduction(state.mineProdBase * s.id, s.level);
  });
  return total / 3;
}

// ── Post-Init: Save/Load & Offline Earnings ──
const offlineModal = document.getElementById('offline-modal');

const initInterval = setInterval(() => {
  if (window.gameScene && window.gameScene.gameState) {
    clearInterval(initInterval);

    // Boost Ad Event
    window.gameScene.events.on('watch_boost_ad', () => {
      showRewardedAd(() => {
        window.globalBoostEndTime = Date.now() + (60 * 60 * 1000); // 1 Hour
        document.getElementById('boost-modal').classList.add('hidden');
        document.getElementById('boost-modal').classList.remove('flex');
      }, () => {
        window.logToScreen('Boost ad failed or closed.');
      });
    });

    // ── Restore Save ──
    const rawSave = localStorage.getItem('idle_mining_save');
    if (rawSave) {
      try {
        const save = JSON.parse(rawSave);
        const state = window.gameScene.gameState;
        state.balance = save.balance;
        state.surfaceBin = save.surfaceBin;

        window.gameScene.elevator.level = save.elevator.level;
        if (save.elevator.hasManager) window.gameScene.elevator.assignManager();

        window.gameScene.warehouse.level = save.warehouse.level;
        if (save.warehouse.hasManager) window.gameScene.warehouse.assignManager();

        save.shafts.forEach((savedShaft) => {
          let shaft = window.gameScene.shafts.find(s => s.id === savedShaft.id);
          if (!shaft) {
            window.gameScene.addShaft();
            shaft = window.gameScene.shafts[window.gameScene.shafts.length - 1];
          }
          shaft.level = savedShaft.level;
          if (savedShaft.manager) shaft.assignManager();
          shaft.updateUI();
        });

        window.globalBoostEndTime = save.globalBoostEndTime || 0;

        // ── Offline Earnings Modal ──
        const pendingOfflineCash = GameMath.calculateOfflineEarnings(save.lastLogout, Date.now(), calcTotalProd());
        if (pendingOfflineCash > 0) {
          document.getElementById('offline-earned-text').innerText = GameMath.formatMoney(pendingOfflineCash);
          offlineModal.classList.remove('hidden'); offlineModal.classList.add('flex');

          document.getElementById('offline-collect-btn').onclick = (e) => {
            e.stopPropagation(); e.preventDefault();
            state.balance += pendingOfflineCash;
            offlineModal.classList.add('hidden'); offlineModal.classList.remove('flex');
          };

          const adBtn = document.getElementById('offline-collect-ad-btn');
          if (adBtn) {
            adBtn.onclick = (e) => {
              e.stopPropagation(); e.preventDefault();
              showRewardedAd(() => {
                state.balance += (pendingOfflineCash * 2);
                offlineModal.classList.add('hidden'); offlineModal.classList.remove('flex');
              });
            };
          }
        }
      } catch (e) { }
    }

    // ── Unified Save Loop (every 1s) + Boost Timer UI ──
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
