import Phaser from 'phaser';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

class MainScene extends Phaser.Scene {
  orbs: Phaser.GameObjects.Arc[] = [];
  orbAngles: number[] = [];

  create() {
    const centerX = 400;
    const centerY = 300;
    // Planète centrale
    this.add.circle(centerX, centerY, 60, 0x3399ff).setStrokeStyle(4, 0xffffff);

    // Boules lumineuses autour
    this.lights.enable().setAmbientColor(0x222222);
    const numOrbs = 8;
    const radius = 100;
    for (let i = 0; i < numOrbs; i++) {
      const angle = (i / numOrbs) * Math.PI * 2;
      const orb = this.add.circle(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius,
        16,
        0xffff66
      ).setStrokeStyle(2, 0xffffff);
      this.orbs.push(orb);
      this.orbAngles.push(angle);
    }
  }

  update(time: number) {
    // Animation des boules lumineuses
    const t = time / 1000;
    const centerX = 400;
    const centerY = 300;
    const radius = 100;
    for (let i = 0; i < this.orbs.length; i++) {
      const angle = this.orbAngles[i] + t;
      this.orbs[i].x = centerX + Math.cos(angle) * radius;
      this.orbs[i].y = centerY + Math.sin(angle) * radius;
    }
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#222',
  scene: MainScene
};

new Phaser.Game(config);
