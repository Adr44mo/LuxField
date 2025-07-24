import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { MainScene } from './game/scenes/MainScene';
import { MenuScene } from './game/scenes/MenuScene';

const socket = io('http://localhost:3000');

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 900,
  height: 600,
  backgroundColor: '#222',
  scene: [MenuScene, MainScene],
  callbacks: {
    postBoot: (game) => {
      // Inject socket into MenuScene and MainScene
      const menu = game.scene.getScene('MenuScene');
      if (menu) menu.sys.settings.data = { socket };
      const main = game.scene.getScene('MainScene');
      if (main) main.sys.settings.data = { socket };
    }
  }
};

const game = new Phaser.Game(config);

// Ensure socket is passed to scenes on start
game.scene.start('MenuScene', { socket });
