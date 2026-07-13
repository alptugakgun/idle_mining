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
    try {
      if (tt.init) {
        tt.init({
          clientKey: "sbaw5t3lvvcxfi4puy"
        });
      }
    } catch (e) {
      console.error("%c TikTok SDK Init Hatası:", "color: white; background: red; font-weight: bold;", e);
      alert("SDK Başlatılamadı: " + (e.message || e));
    }

    // AppID (Client Key) Entegrasyonu
    const TIKTOK_APP_ID = 'awhls5sr2gscusax';

    tt.login({
      appId: TIKTOK_APP_ID,
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
setInterval(resizeUI, 500); // reduced frequency fallback

let savedState = localStorage.getItem('idleMiningSave');
if (savedState) {
  try {
    let state = JSON.parse(savedState);
    window.initialGameState = state;
  } catch (e) { }
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

// Removed duplicated UI logic. GameUI.js handles the UI updates now.
const offlineModal = document.getElementById('offline-modal');

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

const initInterval = setInterval(() => {
  if (window.gameScene && window.gameScene.gameState) {
    clearInterval(initInterval);

    window.gameScene.events.on('watch_boost_ad', () => {
      AdsManager.showRewardedAd(() => {
        window.globalBoostEndTime = Date.now() + (60 * 60 * 1000); // 1 Hour
        document.getElementById('boost-modal').classList.add('hidden');
        document.getElementById('boost-modal').classList.remove('flex');
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

        const pendingOfflineCash = GameMath.calculateOfflineEarnings(save.lastLogout, Date.now(), calcTotalProd());
        if (pendingOfflineCash > 0) {
          document.getElementById('offline-earned-text').innerText = formatMoney(pendingOfflineCash);
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
              AdsManager.showRewardedAd(() => {
                state.balance += (pendingOfflineCash * 2);
                offlineModal.classList.add('hidden'); offlineModal.classList.remove('flex');
              });
            };
          }
        }
      } catch (e) { }
    }

    document.getElementById('offline-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation(); e.preventDefault();
      offlineModal.classList.add('hidden'); offlineModal.classList.remove('flex');
    });

    // Removed duplicate btnShare logic (already in GameUI.js)

    // Unified Save Loop (replaces duplicate save loop and handles boost timer UI)
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
      localStorage.setItem('idleMiningSave', JSON.stringify(saveObj)); // use unified key

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
