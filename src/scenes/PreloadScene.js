import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() { super('PreloadScene'); }

  preload() {
    // 100% Real Sprites from the original game!
    this.load.image('bg_sky', '/assets/sprites/sprite_26.png');
    this.load.image('bg_dirt', '/assets/sprites/sprite_130.png');
    
    // Structures
    this.load.image('elevator_rig', '/assets/sprites/sprite_66.png');
    this.load.image('shaft_bg', '/assets/sprites/sprite_22.png');
    this.load.image('elevator_shaft', '/assets/sprites/sprite_181.png');
    this.load.image('warehouse_bg', '/assets/sprites/sprite_21.png');
    
    // Characters & Carts
    this.load.image('miner_spr', '/assets/sprites/sprite_104.png');
    this.load.image('surface_worker_spr', '/assets/sprites/sprite_126.png');
    this.load.image('cart_spr', '/assets/sprites/sprite_30.png');
    this.load.image('elevator_box', '/assets/sprites/sprite_15.png');
    
    // UI Elements / Icons
    this.load.image('coin_spr', '/assets/sprites/sprite_1.png');
    this.load.image('ghost_spr', '/assets/sprites/sprite_85.png');
  }

  create() {
    this.scene.start('MenuScene');
  }
}
