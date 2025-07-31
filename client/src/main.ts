import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { MainScene } from './game/scenes/MainScene';
import { MenuScene } from './game/scenes/MenuScene';

const socket = io(import.meta.env.VITE_SOCKET_SERVER_URL || window.location.origin);

const getScreenSize = () => ({ width: window.innerWidth, height: window.innerHeight });
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  ...getScreenSize(),
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

// Resize handler for full screen
window.addEventListener('resize', () => {
  const { width, height } = getScreenSize();
  game.scale.resize(width, height);
  // Optionally, you can also update camera bounds in your scenes if needed
});

// Ensure socket is passed to scenes on start
game.scene.start('MenuScene', { socket });
import './global.css';