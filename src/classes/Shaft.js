import Phaser from 'phaser';
import GameMath from '../GameMath.js';

export default class Shaft {
  constructor(scene, id, y) {
    this.scene = scene;
    this.id = id;
    this.y = y;
    this.level = 1;
    this.binAmount = 0;
    this.hasManager = false;
    
    // Shaft tunnel width
    const tunnelWidth = this.scene.cw - 170;
    this.bg = this.scene.add.tileSprite(170 + tunnelWidth/2, y, tunnelWidth, 80, 'shaft_bg');
    
    // Left bin text (wait, game usually has a small bin graphic, we can use cart_spr)
    this.scene.add.image(180, y + 20, 'cart_spr').setScale(0.7);
    this.binText = this.scene.add.text(180, y - 10, '0', { font: 'bold 12px Arial', fill: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    
    // MGR button on the far left
    this.scene.addMGRButton(40, y, () => this.scene.events.emit('buy_manager', { type: 'shaft', id: this.id }));
    
    // Level Up Button inside the tunnel at the right edge
    const lvlBtn = document.createElement('button');
    lvlBtn.className = 'btn-press bg-[#3b82f6] border-b-4 border-[#1e40af] text-white rounded-xl w-16 h-12 flex flex-col items-center justify-center shadow-lg';
    lvlBtn.innerHTML = `<span class="text-yellow-400 font-bold text-lg leading-none">↑</span><span class="text-[10px] font-bold">Lvl ${this.level}</span>`;
    lvlBtn.onclick = (e) => { e.stopPropagation(); e.preventDefault(); this.scene.events.emit('open_upgrade', { type: 'shaft', id: this.id }); };
    this.lvlBtnDOM = this.scene.add.dom(this.scene.cw - 50, y, lvlBtn);

    // Miner object
    this.minerSprite = this.scene.add.sprite(220, y + 10, 'miner_spr');
    this.startCycle();
  }

  assignManager() {
    this.hasManager = true;
  }

  updateUI() {
    this.binText.setText(this.binAmount.toString());
    this.lvlBtnDOM.node.innerHTML = `<span class="text-yellow-400 font-bold text-lg leading-none">↑</span><span class="text-[10px] font-bold">Lvl ${this.level}</span>`;
  }

  startCycle() {
    const endX = this.scene.cw - 100;
    this.minerSprite.scaleX = 1;
    this.scene.tweens.add({
        targets: this.minerSprite,
        x: endX,
        duration: 1500,
        yoyo: false,
        onComplete: () => {
            // Mining animation (bobbing)
            this.scene.tweens.add({
                targets: this.minerSprite, y: this.y + 5, duration: 200, yoyo: true, repeat: 3,
                onComplete: () => {
                    this.minerSprite.scaleX = -1; // walk back
                    this.scene.tweens.add({
                        targets: this.minerSprite, x: 220, duration: 1500,
                        onComplete: () => {
                            this.minerSprite.scaleX = 1;
                            // Use GameMath for correct production with milestones & global boost
                            const baseProd = this.scene.gameState ? this.scene.gameState.mineProdBase : 10;
                            const prod = GameMath.getProduction(baseProd, this.level);
                            this.binAmount += prod;
                            this.updateUI();
                            this.scene.time.delayedCall(500, () => this.startCycle());
                        }
                    });
                }
            });
        }
    });
  }
}
