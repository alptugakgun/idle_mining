import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this.cw = this.cameras.main.width;
    this.ch = this.cameras.main.height;

    // Horizon Line (Sky + Grass)
    this.add.tileSprite(this.cw/2, this.ch * 0.6, this.cw, 256, 'bg_sky').setOrigin(0.5, 1);
    
    // Dirt
    this.add.tileSprite(this.cw/2, this.ch * 0.6 + 4000, this.cw, 8000, 'bg_dirt');

    // Title / Logo
    this.add.text(this.cw/2, this.ch * 0.3, 'IDLE MINING\nEMPIRE', {
        font: 'bold 48px Arial',
        fill: '#f1c40f',
        align: 'center',
        stroke: '#000',
        strokeThickness: 8
    }).setOrigin(0.5);

    // Play Button DOM
    const container = document.createElement('div');
    const playBtn = document.createElement('button');
    playBtn.className = 'w-64 py-4 bg-gradient-to-b from-[#22c55e] to-[#16a34a] rounded-full border-b-8 border-[#14532d] text-white font-black text-2xl shadow-2xl animate-bounce';
    playBtn.innerText = 'PLAY';
    playBtn.onclick = () => {
        document.getElementById('ui-layer').classList.remove('hidden');
        document.getElementById('ui-layer').classList.add('flex');
        this.scene.start('GameScene');
    };
    container.appendChild(playBtn);
    
    this.add.dom(this.cw/2, this.ch * 0.7, container);
    
    // Disable main UI during Menu
    const uiLayer = document.getElementById('ui-layer');
    if(uiLayer) {
        uiLayer.classList.add('hidden');
        uiLayer.classList.remove('flex');
    }
  }
}
