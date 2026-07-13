import GameMath from './GameMath.js';

export default class GameUI {
  constructor(scene) {
    this.scene = scene;
    this.gameState = scene.gameState;
    
    // Bind HTML Elements
    this.balanceEl = document.getElementById('balance-display');
    
    this.upgradePanel = document.getElementById('upgrade-panel');
    this.upgradeCloseBtn = document.getElementById('upgrade-close-btn');
    this.upgradeActionBtn = document.getElementById('upgrade-action-btn');
    this.upgradeTitle = document.getElementById('upgrade-title');
    this.upgradeCurrentStat = document.getElementById('upgrade-current-stat');
    this.upgradeNextStat = document.getElementById('upgrade-next-stat');
    this.upgradeLevelText = document.getElementById('upgrade-level-text');
    this.upgradeCostText = document.getElementById('upgrade-cost-text');
    
    this.managerPanel = document.getElementById('manager-panel');
    this.managerCloseBtn = document.getElementById('manager-close-btn');
    this.managerBuyBtns = document.querySelectorAll('.manager-buy-btn');

    this.upgradeMultiplier = 1;
    this.selectedEntity = null; // { type: 'shaft', id: 1 }

    this.bindEvents();
    
    // Update loop for balance
    this.scene.time.addEvent({ delay: 100, callback: this.updateUI, callbackScope: this, loop: true });
  }

  bindEvents() {
    this.scene.events.on('open_upgrade', (data) => this.openUpgradePanel(data));
    this.scene.events.on('buy_manager', (data) => this.openManagerPanel(data));
    
    this.upgradeCloseBtn.onclick = () => this.upgradePanel.classList.add('translate-y-full');
    this.managerCloseBtn.onclick = () => this.managerPanel.classList.add('hidden');
    this.managerPanel.classList.add('hidden'); // Ensure hidden at start
    
    document.querySelectorAll('.upgrade-mul-btn').forEach(btn => {
      btn.onclick = (e) => {
        document.querySelectorAll('.upgrade-mul-btn').forEach(b => b.classList.replace('bg-blue-600', 'bg-slate-700'));
        e.target.classList.replace('bg-slate-700', 'bg-blue-600');
        this.upgradeMultiplier = e.target.dataset.mul === 'MAX' ? 'MAX' : parseInt(e.target.dataset.mul);
        this.refreshUpgradePanel();
      };
    });

    this.upgradeActionBtn.onclick = () => this.performUpgrade();
    
    this.managerBuyBtns.forEach(btn => {
        btn.onclick = (e) => {
            const cost = parseInt(e.target.dataset.cost);
            if (this.gameState.balance >= cost && this.selectedEntity) {
                this.gameState.balance -= cost;
                this.hireManager(this.selectedEntity);
                this.managerPanel.classList.add('hidden');
                this.managerPanel.classList.remove('flex');
            }
        };
    });

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.onclick = () => this.showModal('Settings', 'Audio and Language options coming soon.');
    
    const boostBtn = document.getElementById('boost-btn');
    if (boostBtn) boostBtn.onclick = () => {
        document.getElementById('boost-modal').classList.remove('hidden');
        document.getElementById('boost-modal').classList.add('flex');
    };
    
    const boostCloseBtn = document.getElementById('boost-close-btn');
    if (boostCloseBtn) boostCloseBtn.onclick = () => {
        document.getElementById('boost-modal').classList.add('hidden');
        document.getElementById('boost-modal').classList.remove('flex');
    };
    
    const boostAdBtn = document.getElementById('boost-ad-btn');
    if (boostAdBtn) {
        boostAdBtn.onclick = () => {
            // Wait for AdsManager to be available on window, but GameUI is imported locally, so we can just use event or import it.
            // Since AdsManager is in gameLogic.js and not imported here, we'll emit an event.
            this.scene.events.emit('watch_boost_ad');
        };
    }

    const dummyIds = ['btn-engineer', 'btn-alert', 'btn-briefcase', 'btn-wheel', 'btn-hexagon', 'btn-shop', 'btn-lab', 'btn-trophy', 'btn-calendar'];
    dummyIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.onclick = () => this.showModal('Coming Soon!', 'This feature is currently under development.');
    });

    document.getElementById('info-modal-close').onclick = () => {
        document.getElementById('info-modal').classList.add('hidden');
        document.getElementById('info-modal').classList.remove('flex');
    };
  }

  showModal(title, text) {
    document.getElementById('info-modal-title').innerText = title;
    document.getElementById('info-modal-text').innerText = text;
    document.getElementById('info-modal').classList.remove('hidden');
    document.getElementById('info-modal').classList.add('flex');
  }

  updateUI() {
    this.balanceEl.innerText = GameMath.formatMoney(this.gameState.balance);
  }

  openUpgradePanel(data) {
    this.selectedEntity = data;
    this.upgradePanel.classList.remove('translate-y-full');
    this.refreshUpgradePanel();
  }
  
  openManagerPanel(data) {
    this.selectedEntity = data;
    this.managerPanel.classList.remove('hidden');
    this.managerPanel.classList.add('flex');
  }

  hireManager(entityData) {
      if (entityData.type === 'shaft') {
          const shaft = this.scene.shafts.find(s => s.id === entityData.id);
          if(shaft) shaft.assignManager();
      } else if (entityData.type === 'elevator') {
          this.scene.elevator.assignManager();
      } else if (entityData.type === 'warehouse') {
          this.scene.warehouse.assignManager();
      }
  }

  refreshUpgradePanel() {
    if (!this.selectedEntity) return;
    
    let entity, baseCost, baseProd, title;
    if (this.selectedEntity.type === 'shaft') {
        entity = this.scene.shafts.find(s => s.id === this.selectedEntity.id);
        baseCost = this.gameState.mineCostBase;
        baseProd = this.gameState.mineProdBase;
        title = `Mine Shaft ${entity.id}`;
    } else if (this.selectedEntity.type === 'elevator') {
        entity = this.scene.elevator;
        baseCost = this.gameState.elevatorCostBase;
        baseProd = this.gameState.elevatorCapBase;
        title = `Elevator`;
    } else {
        entity = this.scene.warehouse;
        baseCost = this.gameState.warehouseCostBase;
        baseProd = this.gameState.warehouseCapBase;
        title = `Warehouse`;
    }
    
    if(!entity.level) entity.level = 1;

    let mul = this.upgradeMultiplier;
    if (mul === 'MAX') {
        mul = GameMath.calculateMaxUpgrades(this.gameState.balance, baseCost, entity.level, this.gameState.costMul);
        if (mul === 0) mul = 1; // Show cost for 1 even if can't afford
    }

    const cost = GameMath.getCost(baseCost, entity.level, mul, this.gameState.costMul);
    const currentProd = GameMath.getProduction(baseProd, entity.level);
    const nextProd = GameMath.getProduction(baseProd, entity.level + mul);
    
    let starCount = GameMath.getStars(entity.level);
    document.getElementById('upgrade-stars').innerText = '⭐'.repeat(starCount);

    this.upgradeTitle.innerText = title;
    this.upgradeCurrentStat.innerText = GameMath.formatMoney(currentProd);
    this.upgradeNextStat.innerText = GameMath.formatMoney(nextProd);
    this.upgradeLevelText.innerText = `Lvl ${entity.level} ➔ ${entity.level + mul}`;
    this.upgradeCostText.innerText = GameMath.formatMoney(cost) + ' C';
    
    if (this.gameState.balance >= cost) {
        this.upgradeActionBtn.classList.replace('from-slate-500', 'from-green-500');
        this.upgradeActionBtn.classList.replace('to-slate-600', 'to-green-600');
        this.upgradeActionBtn.disabled = false;
    } else {
        this.upgradeActionBtn.classList.replace('from-green-500', 'from-slate-500');
        this.upgradeActionBtn.classList.replace('to-green-600', 'to-slate-600');
        this.upgradeActionBtn.disabled = true;
    }
  }

  performUpgrade() {
      if (!this.selectedEntity) return;
      
      let entity, baseCost;
      if (this.selectedEntity.type === 'shaft') {
          entity = this.scene.shafts.find(s => s.id === this.selectedEntity.id);
          baseCost = this.gameState.mineCostBase;
      } else if (this.selectedEntity.type === 'elevator') {
          entity = this.scene.elevator;
          baseCost = this.gameState.elevatorCostBase;
      } else {
          entity = this.scene.warehouse;
          baseCost = this.gameState.warehouseCostBase;
      }
      
      if(!entity.level) entity.level = 1;
      
      let mul = this.upgradeMultiplier;
      if (mul === 'MAX') {
          mul = GameMath.calculateMaxUpgrades(this.gameState.balance, baseCost, entity.level, this.gameState.costMul);
          if (mul === 0) return;
      }

      const cost = GameMath.getCost(baseCost, entity.level, mul, this.gameState.costMul);
      if (this.gameState.balance >= cost) {
          this.gameState.balance -= cost;
          entity.level += mul;
          
          if (entity.updateCapacity) {
              const capBase = this.selectedEntity.type === 'elevator' ? this.gameState.elevatorCapBase : this.gameState.warehouseCapBase;
              entity.updateCapacity(GameMath.getProduction(capBase, entity.level));
          }
          if (this.selectedEntity.type === 'shaft') entity.updateUI();
          
          this.refreshUpgradePanel();
          this.updateUI();
      }
  }
}
