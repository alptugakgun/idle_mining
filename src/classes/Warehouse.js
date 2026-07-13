import Phaser from 'phaser';

export default class Warehouse extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.scene = scene;
    this.startX = x;
    this.elevatorX = 170; // Stop right next to elevator rig
    this.level = 1;
    this.capacity = 20;
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

  startCycle() {
    if (this.state !== 'IDLE') return;
    this.state = 'WALK_TO_ELEVATOR';
    this.sprite.scaleX = -1; // Face left
    
    // Walking animation (bobbing)
    this.walkTween = this.scene.tweens.add({ targets: this.sprite, y: -15, duration: 150, yoyo: true, repeat: -1 });

    this.scene.tweens.add({
        targets: this, x: this.elevatorX, duration: Math.abs(this.x - this.elevatorX) * 8,
        onComplete: () => {
            this.walkTween.stop();
            this.sprite.y = -10;
            const take = Math.min(this.capacity, this.scene.gameState.surfaceBin);
            this.scene.time.delayedCall(500, () => {
                if (take > 0) {
                    this.scene.gameState.surfaceBin -= take;
                    this.cargo.setVisible(true);
                    this.sprite.scaleX = 1; // Face right
                    this.walkTween = this.scene.tweens.add({ targets: this.sprite, y: -15, duration: 150, yoyo: true, repeat: -1 });
                    this.scene.tweens.add({
                        targets: this, x: this.startX, duration: Math.abs(this.x - this.startX) * 8,
                        onComplete: () => {
                            this.walkTween.stop();
                            this.sprite.y = -10;
                            this.scene.gameState.balance += take;
                            this.cargo.setVisible(false);
                            
                            // Floating Text for Money Added
                            const floatText = this.scene.add.text(this.x, this.y - 50, '+' + take, { font: 'bold 24px Arial', fill: '#2ecc71', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
                            this.scene.tweens.add({ targets: floatText, y: this.y - 100, alpha: 0, duration: 1500, onComplete: () => floatText.destroy() });
                            
                            if (window.updateHTMLUI) window.updateHTMLUI();
                            this.state = 'IDLE';
                            if (this.hasManager) this.startCycle();
                        }
                    });
                } else {
                    this.sprite.scaleX = 1;
                    this.walkTween = this.scene.tweens.add({ targets: this.sprite, y: -15, duration: 150, yoyo: true, repeat: -1 });
                    this.scene.tweens.add({
                        targets: this, x: this.startX, duration: Math.abs(this.x - this.startX) * 8,
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
