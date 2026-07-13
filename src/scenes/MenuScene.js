import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this.cw = this.cameras.main.width;
    this.ch = this.cameras.main.height;

    // ── Background Sky + Dirt ──
    this.add.tileSprite(this.cw/2, this.ch * 0.6, this.cw, 256, 'bg_sky').setOrigin(0.5, 1);
    this.add.tileSprite(this.cw/2, this.ch * 0.6 + 4000, this.cw, 8000, 'bg_dirt');

    // ── Floating Gold Particle Effect ──
    this.createGoldParticles();

    // ── Title Logo with Premium Font ──
    const titleShadow = this.add.text(this.cw/2 + 3, this.ch * 0.27 + 3, 'IDLE MINING\nEMPIRE', {
        font: 'bold 46px Bungee',
        fill: '#000000',
        align: 'center',
        stroke: '#000',
        strokeThickness: 2
    }).setOrigin(0.5).setAlpha(0.4);

    const titleText = this.add.text(this.cw/2, this.ch * 0.27, 'IDLE MINING\nEMPIRE', {
        font: 'bold 46px Bungee',
        fill: '#ffd700',
        align: 'center',
        stroke: '#3e2723',
        strokeThickness: 8
    }).setOrigin(0.5);

    // Title float animation
    this.tweens.add({
      targets: [titleText, titleShadow],
      y: '-=8',
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Title scale-in entrance
    titleText.setScale(0);
    titleShadow.setScale(0);
    this.tweens.add({
      targets: [titleText, titleShadow],
      scale: 1,
      duration: 600,
      ease: 'Back.easeOut'
    });

    // ── Subtitle ──
    const subtitle = this.add.text(this.cw/2, this.ch * 0.42, '⛏️ Dig Deep. Get Rich. ⛏️', {
      font: 'bold 16px Outfit',
      fill: '#ffffff',
      align: 'center',
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      y: '-=10',
      duration: 800,
      delay: 400,
      ease: 'Quad.easeOut'
    });

    // ── Decorative Pickaxe Icons ──
    const pickL = this.add.text(this.cw/2 - 120, this.ch * 0.27, '⛏️', { font: '32px Arial' }).setOrigin(0.5);
    const pickR = this.add.text(this.cw/2 + 120, this.ch * 0.27, '⛏️', { font: '32px Arial' }).setOrigin(0.5);
    
    this.tweens.add({
      targets: pickL,
      angle: { from: -15, to: 15 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: pickR,
      angle: { from: 15, to: -15 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // ── Play Button (DOM) ──
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center gap-3';
    
    const playBtn = document.createElement('button');
    playBtn.className = 'btn-press w-56 py-4 btn-green rounded-full text-white font-black text-2xl shadow-2xl';
    playBtn.style.fontFamily = "'Bungee', cursive";
    playBtn.style.animation = 'boostGlow 2s ease-in-out infinite';
    playBtn.innerText = '▶ PLAY';
    playBtn.onclick = () => {
        // Button press feedback
        playBtn.style.transform = 'scale(0.9)';
        setTimeout(() => {
            document.getElementById('ui-layer').classList.remove('hidden');
            document.getElementById('ui-layer').classList.add('flex');
            this.scene.start('GameScene');
        }, 150);
    };
    container.appendChild(playBtn);

    // Version text
    const versionText = document.createElement('span');
    versionText.className = 'text-white/40 text-[10px] font-bold';
    versionText.innerText = 'v1.0.0 — TikTok Minis Edition';
    container.appendChild(versionText);
    
    this.add.dom(this.cw/2, this.ch * 0.65, container);
    
    // Disable main UI during Menu
    const uiLayer = document.getElementById('ui-layer');
    if(uiLayer) {
        uiLayer.classList.add('hidden');
        uiLayer.classList.remove('flex');
    }
  }

  createGoldParticles() {
    // Spawn falling gold sparkle particles using sprites
    this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(20, this.cw - 20);
        const coin = this.add.image(x, -10, 'coin_spr')
          .setScale(0.15 + Math.random() * 0.2)
          .setAlpha(0.3 + Math.random() * 0.4);
        
        this.tweens.add({
          targets: coin,
          y: this.ch + 20,
          x: x + Phaser.Math.Between(-40, 40),
          alpha: 0,
          angle: Phaser.Math.Between(-180, 180),
          duration: 3000 + Math.random() * 2000,
          ease: 'Sine.easeIn',
          onComplete: () => coin.destroy()
        });
      }
    });
  }
}
