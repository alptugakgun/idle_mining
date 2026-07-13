import Phaser from 'phaser';

export default class Elevator extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.scene = scene;
    this.surfaceY = y - 40; // inside the rig
    this.level = 1;
    this.capacity = 20;
    this.currentCargo = 0;
    this.state = 'IDLE';
    this.hasManager = false;
    
    // The main elevator box
    this.sprite = this.scene.add.sprite(0, 0, 'elevator_box');
    
    // A ghostly sleeping worker inside if no manager, or normal if manager
    this.worker = this.scene.add.sprite(0, 0, 'ghost_spr');
    
    this.cargoText = this.scene.add.text(0, -25, '0', { font: 'bold 16px Arial', fill: '#f1c40f', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    
    this.add([this.sprite, this.worker, this.cargoText]);
    this.scene.add.existing(this);
    
    this.y = this.surfaceY; // Start at surface
    
    this.sprite.setInteractive({useHandCursor:true}).on('pointerdown', () => this.startCycle());
    this.worker.setInteractive({useHandCursor:true}).on('pointerdown', () => this.startCycle());
  }

  updateCapacity(newCap) {
      this.capacity = newCap;
  }

  assignManager() {
    this.hasManager = true;
    this.worker.setTexture('surface_worker_spr'); // Change ghost to actual worker inside box
    this.worker.setScale(0.7);
    if (this.state === 'IDLE') this.startCycle();
  }

  startCycle() {
    if (this.state !== 'IDLE') return;
    this.currentCargo = 0;
    this.currentShaft = 0;
    this.updateUI();
    this.visitNextShaft();
  }

  visitNextShaft() {
    const shafts = this.scene.shafts;
    if (this.currentShaft >= shafts.length || this.currentCargo >= this.capacity) return this.returnToSurface();
    
    const targetY = shafts[this.currentShaft].y;
    this.state = 'DESCENDING';
    this.scene.tweens.add({
      targets: this, y: targetY, duration: Math.abs(this.y - targetY) * 5,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        const take = Math.min(this.capacity - this.currentCargo, shafts[this.currentShaft].binAmount);
        this.scene.time.delayedCall(take > 0 ? 500 : 200, () => {
          shafts[this.currentShaft].binAmount -= take;
          shafts[this.currentShaft].updateUI();
          this.currentCargo += take;
          this.updateUI();
          if (this.currentCargo >= this.capacity) this.returnToSurface();
          else { this.currentShaft++; this.visitNextShaft(); }
        });
      }
    });
  }

  returnToSurface() {
    this.state = 'ASCENDING';
    this.scene.tweens.add({
      targets: this, y: this.surfaceY, duration: Math.abs(this.y - this.surfaceY) * 5,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        this.scene.time.delayedCall(this.currentCargo > 0 ? 500 : 200, () => {
          this.scene.gameState.surfaceBin += this.currentCargo;
          this.currentCargo = 0;
          this.updateUI();
          this.state = 'IDLE';
          if (this.hasManager) this.startCycle();
        });
      }
    });
  }

  updateUI() { this.cargoText.setText(this.currentCargo > 0 ? this.currentCargo.toString() : ''); }
}
