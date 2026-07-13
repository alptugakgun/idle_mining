import Phaser from 'phaser';

export default class Miner extends Phaser.GameObjects.Container {
  constructor(scene, x, y, shaftId) {
    super(scene, x, y);
    this.scene = scene;
    this.shaftId = shaftId;
    this.capacity = 10;
    this.state = 'IDLE';
    this.hasManager = false;
    this.startX = x;
    this.oreX = x + 300;
    
    this.sprite = this.scene.add.sprite(0, -15, 'miner_spr').setDisplaySize(40, 40).setInteractive({useHandCursor: true});
    this.cargo = this.scene.add.sprite(15, -15, 'coin_spr').setVisible(false);
    this.add([this.sprite, this.cargo]);
    this.scene.add.existing(this);
    
    this.sprite.on('pointerdown', () => this.startCycle());
  }

  startCycle() {
    if (this.state !== 'IDLE') return;
    this.state = 'WALK_TO_ORE';
    this.sprite.scaleX = 1;
    this.walkTo(this.oreX, () => {
      this.state = 'MINING';
      this.scene.tweens.add({
        targets: this.sprite, angle: {from:0, to:20}, yoyo:true, repeat: 3, duration: 150,
        onComplete: () => {
          this.state = 'WALK_TO_BIN';
          this.cargo.setVisible(true);
          this.sprite.scaleX = -1;
          this.walkTo(this.startX, () => {
            this.scene.time.delayedCall(300, () => {
              this.cargo.setVisible(false);
              const shaft = this.scene.shafts.find(s => s.id === this.shaftId);
              if (shaft) { shaft.binAmount += this.capacity; shaft.updateUI(); }
              this.state = 'IDLE';
              if (this.hasManager) this.startCycle();
            });
          });
        }
      });
    });
  }

  walkTo(tx, cb) {
    const dist = Math.abs(this.x - tx);
    const duration = (dist / 100) * 1000 * (this.cargo.visible ? 1.3 : 1.0);
    
    this.walkTween = this.scene.tweens.add({ targets: this.sprite, y: -20, angle: {from:-5, to:5}, yoyo:true, repeat:-1, duration: 200 });
    this.scene.tweens.add({
      targets: this, x: tx, duration,
      onComplete: () => { this.walkTween.stop(); this.sprite.y = -15; this.sprite.angle = 0; cb(); }
    });
  }
}
