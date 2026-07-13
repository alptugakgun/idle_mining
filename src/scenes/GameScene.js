import Phaser from 'phaser';
import Elevator from '../classes/Elevator.js';
import Warehouse from '../classes/Warehouse.js';
import Shaft from '../classes/Shaft.js';
import GameUI from '../GameUI.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    window.gameScene = this;
  }

  create() {
    this.cw = this.cameras.main.width;
    this.ch = this.cameras.main.height;
    this.surfaceY = 300;
    
    // Always start with default constants, then merge any saved dynamic values on top
    const defaults = {
      balance: 77,
      mineProdBase: 10, elevatorCapBase: 100, warehouseCapBase: 300,
      mineCostBase: 150, elevatorCostBase: 100, warehouseCostBase: 100,
      costMul: 1.15,
      surfaceBin: 0
    };
    this.gameState = { ...defaults, ...(window.initialGameState || {}) };

    // Background Sky & Grass (Horizon)
    this.add.tileSprite(this.cw/2, this.surfaceY, this.cw, 256, 'bg_sky').setOrigin(0.5, 1).setScrollFactor(0);
    
    // Dirt layers (Tileable)
    this.add.tileSprite(this.cw/2, this.surfaceY + 4000, this.cw, 8000, 'bg_dirt');
    
    // Vertical Elevator Shaft Background
    this.add.tileSprite(120, this.surfaceY + 4000, 100, 8000, 'elevator_shaft');

    // Surface Structures
    this.warehouse_building = this.add.image(this.cw - 80, this.surfaceY, 'warehouse_bg').setOrigin(0.5, 1);
    this.add.image(120, this.surfaceY, 'elevator_rig').setOrigin(0.5, 1);
    
    this.shafts = [];
    this.elevator = new Elevator(this, 120, this.surfaceY);
    this.warehouse = new Warehouse(this, this.warehouse_building.x - 30, this.surfaceY);
    
    this.addShaft();

    // Camera Drag
    let isDragging = false;
    let startY = 0, camStartY = 0;
    this.input.on('pointerdown', (p) => {
        if (p.event.target.tagName !== 'CANVAS') return;
        isDragging = true; startY = p.y; camStartY = this.cameras.main.scrollY; 
    });
    this.input.on('pointermove', (p) => { 
        if (isDragging) {
            let targetY = camStartY - (p.y - startY);
            if(targetY < 0) targetY = 0;
            this.cameras.main.scrollY = targetY; 
        }
    });
    this.input.on('pointerup', () => isDragging = false);

    this.gameUI = new GameUI(this);
    
    // MGR Buttons mapping
    this.addMGRButton(40, this.surfaceY - 120, () => this.events.emit('buy_manager', { type: 'elevator' }));
    this.addMGRButton(this.warehouse_building.x - 60, this.surfaceY - 120, () => this.events.emit('buy_manager', { type: 'warehouse' }));

    // Elevator & Warehouse Level Up Buttons
    const eleLvlBtn = document.createElement('button');
    eleLvlBtn.className = 'btn-press btn-blue text-white rounded-xl w-16 h-12 flex flex-col items-center justify-center shadow-lg';
    eleLvlBtn.innerHTML = `<span class="text-yellow-400 font-bold text-lg leading-none">↑</span><span class="text-[10px] font-bold">Lvl ${this.elevator.level || 1}</span>`;
    eleLvlBtn.onclick = (e) => { e.stopPropagation(); e.preventDefault(); this.events.emit('open_upgrade', { type: 'elevator' }); };
    this.add.dom(120 + 70, this.surfaceY - 40, eleLvlBtn);

    const wareLvlBtn = document.createElement('button');
    wareLvlBtn.className = 'btn-press btn-blue text-white rounded-xl w-16 h-12 flex flex-col items-center justify-center shadow-lg';
    wareLvlBtn.innerHTML = `<span class="text-yellow-400 font-bold text-lg leading-none">↑</span><span class="text-[10px] font-bold">Lvl ${this.warehouse.level || 1}</span>`;
    wareLvlBtn.onclick = (e) => { e.stopPropagation(); e.preventDefault(); this.events.emit('open_upgrade', { type: 'warehouse' }); };
    this.add.dom(this.warehouse_building.x + 40, this.surfaceY - 40, wareLvlBtn);
    
    // Setup global access for UI refresh
    window.gameSceneInstance = this;
    
    // Initial New Shaft Button
    this.createNewShaftButton();
  }

  addMGRButton(x, y, callback) {
    const el = document.createElement('button');
    el.className = 'btn-press w-10 h-10 btn-blue rounded-full text-white font-black text-[10px] shadow-lg flex items-center justify-center';
    el.innerText = 'MGR';
    el.onclick = (e) => { e.stopPropagation(); e.preventDefault(); callback(e); };
    return this.add.dom(x, y, el);
  }

  // Screen shake effect for dig feedback
  digShake() {
    this.cameras.main.shake(120, 0.005);
  }

  // Dirt particle burst at dig button
  spawnDigParticles(worldY) {
    const cx = this.cw / 2;
    for (let i = 0; i < 6; i++) {
      // Create small dirt-colored rectangles as particles
      const size = 3 + Math.random() * 5;
      const colors = [0x8B6914, 0x5c3a21, 0x9b6b3a, 0x3b2818, 0xd4a540];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const particle = this.add.rectangle(
        cx + Phaser.Math.Between(-60, 60), 
        worldY, 
        size, size, color
      ).setAlpha(0.8);
      
      this.tweens.add({
        targets: particle,
        x: particle.x + Phaser.Math.Between(-80, 80),
        y: worldY - Phaser.Math.Between(20, 80),
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        scale: 0,
        duration: 500 + Math.random() * 300,
        delay: i * 30,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  createNewShaftButton() {
    if (this.newShaftContainer) this.newShaftContainer.destroy();
    
    const yPos = this.surfaceY + 50 + ((this.shafts.length + 1) * 120);
    const cost = Math.floor(this.gameState.mineCostBase * Math.pow(2.2, this.shafts.length));
    const tapsNeeded = 10 + (this.shafts.length * 5); // 10, 15, 20 taps
    const digCostPerTap = Math.max(1, Math.floor(cost / tapsNeeded)); 
    
    const container = document.createElement('div');
    container.className = 'w-[250px] flex flex-col gap-1 items-center';
    container.style.position = 'relative';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'w-full h-3.5 rounded-full overflow-hidden border border-[#290f02] relative dig-progress-bar';
    progressBar.style.background = '#1a0d05';
    const progressFill = document.createElement('div');
    progressFill.className = 'h-full dig-progress-fill w-0 rounded-full';
    progressFill.style.transition = 'width 0.2s ease-out';
    progressBar.appendChild(progressFill);
    
    const progressText = document.createElement('div');
    progressText.className = 'text-white font-bold text-[10px] drop-shadow-md';
    progressText.style.fontFamily = "'Outfit', sans-serif";
    progressText.innerText = '0%';
    
    const btn = document.createElement('button');
    btn.className = 'btn-press w-full py-3 btn-blue rounded-[20px] text-white font-black text-xl shadow-xl flex items-center justify-center gap-2 mt-1';
    btn.style.fontFamily = "'Outfit', sans-serif";
    btn.innerHTML = `<img src="/assets/sprites/sprite_1.png" class="w-6 h-6"/> ${digCostPerTap} Dig ⛏️`;
    
    this.digProgress = 0;
    
    btn.onclick = (e) => {
        e.stopPropagation(); e.preventDefault();
        if (this.gameState.balance >= digCostPerTap) {
            this.gameState.balance -= digCostPerTap;
            this.digProgress += (100 / tapsNeeded);
            if (this.digProgress > 100) this.digProgress = 100;
            progressFill.style.width = this.digProgress + '%';
            progressText.innerText = Math.floor(this.digProgress) + '%';
            
            // Dig feedback effects
            this.digShake();
            this.spawnDigParticles(yPos);
            
            // Spawn a little worker icon popup for juice
            const juice = document.createElement('span');
            juice.innerText = '⛏️';
            juice.className = 'absolute text-xl pointer-events-none drop-shadow-lg';
            juice.style.left = (Math.random() * 80 + 10) + '%';
            juice.style.top = '-20px';
            juice.style.transition = 'all 0.6s ease-out';
            container.appendChild(juice);
            requestAnimationFrame(() => {
              juice.style.top = '-50px';
              juice.style.opacity = '0';
            });
            setTimeout(() => juice.remove(), 700);

            if (this.digProgress >= 100) {
                this.addShaft();
            }
        }
    };
    
    container.appendChild(progressBar);
    container.appendChild(progressText);
    container.appendChild(btn);
    
    this.newShaftContainer = this.add.dom(this.cw/2, yPos, container);
    this.cameras.main.setBounds(0, 0, this.cw, yPos + 300);
  }

  addShaft() {
    const id = this.shafts.length + 1;
    const yPos = this.surfaceY + 30 + (id * 120);
    const shaft = new Shaft(this, id, yPos);
    this.shafts.push(shaft);
    this.createNewShaftButton();
  }
}
