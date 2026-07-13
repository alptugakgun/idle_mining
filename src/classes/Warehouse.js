import Phaser from 'phaser';
import GameMath from '../GameMath.js';

export default class Warehouse extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.scene = scene;
    this.startX = x;
    this.elevatorX = 170; // Stop right next to elevator rig
    this.level = 1;
    this.capacity = this.scene.gameState ? this.scene.gameState.warehouseCapBase : 300;
    this.state = 'IDLE';
    this.hasManager = false;
    
    // The guy carrying the cart
    this.sprite = this.scene.add.sprite(0, -10, 'surface_worker_spr').setInteractive({useHandCursor:true});
    
    // Cash icon above him
    this.cargo = this.scene.add.sprite(0, -40, 'coin_spr').setVisible(false);
    
    this.add([this.sprite, this.cargo]);
    this.scene.add.existing(this);
    
    this.sprite.on('pointerdown', () => this.startCycle());
  }

  updateCapacity(newCap) {
      this.capacity = newCap;
  }

  assignManager() {
    this.hasManager = true;
    if (this.state === 'IDLE') this.startCycle();
  }

  // Coin burst particle effect when earning money
  spawnCoinBurst(amount) {
    const numCoins = Math.min(8, Math.max(3, Math.floor(amount / 10)));
    for (let i = 0; i < numCoins; i++) {
      const coin = this.scene.add.sprite(this.x, this.y - 30, 'coin_spr').setScale(0.4 + Math.random() * 0.3);
      const targetX = this.x + (Math.random() - 0.5) * 120;
      const targetY = this.y - 60 - Math.random() * 80;
      
      this.scene.tweens.add({
        targets: coin,
        x: targetX,
        y: targetY,
        scale: 0,
        alpha: 0,
        duration: 600 + Math.random() * 400,
        delay: i * 60,
        ease: 'Quad.easeOut',
        onComplete: () => coin.destroy()
      });
    }
  }

  startCycle() {
    if (this.state !== 'IDLE') return;
    this.state = 'WALK_TO_ELEVATOR';
    this.sprite.scaleX = -1; // Face left
    
    // Walking animation (bobbing)
    this.walkTween = this.scene.tweens.add({ targets: this.sprite, y: -15, duration: 100, yoyo: true, repeat: -1 });

    this.scene.tweens.add({
        targets: this, x: this.elevatorX, duration: Math.abs(this.x - this.elevatorX) * 5,
        onComplete: () => {
            this.walkTween.stop();
            this.sprite.y = -10;
            const take = Math.min(this.capacity, this.scene.gameState.surfaceBin);
            this.scene.time.delayedCall(500, () => {
                if (take > 0) {
                    this.scene.gameState.surfaceBin -= take;
                    this.cargo.setVisible(true);
                    this.sprite.scaleX = 1; // Face right
                    this.walkTween = this.scene.tweens.add({ targets: this.sprite, y: -15, duration: 100, yoyo: true, repeat: -1 });
                    this.scene.tweens.add({
                        targets: this, x: this.startX, duration: Math.abs(this.x - this.startX) * 5,
                        onComplete: () => {
                            this.walkTween.stop();
                            this.sprite.y = -10;
                            this.scene.gameState.balance += take;
                            this.cargo.setVisible(false);
                            
                            // Coin burst particle effect
                            this.spawnCoinBurst(take);
                            
                            // Floating Money Text with premium styling
                            const floatText = this.scene.add.text(this.x, this.y - 50, '+$' + GameMath.formatMoney(take), { 
                              font: 'bold 22px Arial', 
                              fill: '#ffd700', 
                              stroke: '#000', 
                              strokeThickness: 4 
                            }).setOrigin(0.5);
                            this.scene.tweens.add({ 
                              targets: floatText, 
                              y: this.y - 120, 
                              alpha: 0, 
                              scale: 1.3,
                              duration: 1200, 
                              ease: 'Quad.easeOut',
                              onComplete: () => floatText.destroy() 
                            });
                            
                            this.state = 'IDLE';
                            if (this.hasManager) this.startCycle();
                        }
                    });
                } else {
                    this.sprite.scaleX = 1;
                    this.walkTween = this.scene.tweens.add({ targets: this.sprite, y: -15, duration: 100, yoyo: true, repeat: -1 });
                    this.scene.tweens.add({
                        targets: this, x: this.startX, duration: Math.abs(this.x - this.startX) * 5,
                        onComplete: () => {
                            this.walkTween.stop();
                            this.sprite.y = -10;
                            this.state = 'IDLE';
                            if (this.hasManager) this.startCycle();
                        }
                    });
                }
            });
        }
    });
  }
}
