import * as util from '/lib/util.js';

export function init() {
  const game = new Phaser.Game({
    width: 640,
    height: 480,
    parent: 'gameContainer',
    scene: new util.BootScene('play'),
    pixelArt: true
  });

  game.scene.add('play', new PlayScene());
}

const TILE_WIDTH = 20;
const TILE_HEIGHT = 20;

const PlayScene = util.extend(Phaser.Scene, 'PlayScene', {
  constructor: function() {
    this.constructor$Scene();
    this.ship = null;
  },
  create() {
    const grid = this.add.tileSprite(0, 0, this.cameras.main.width,
      this.cameras.main.height, 'grid');
    grid.setScale(2);
    this.ship = new Ship(this);
    new ShipMover(this, this.ship);
  }
});

const Ship = util.extend(Object, 'Ship', {
  constructor: function(scene) {
    this.scene = scene;
    this.x = 0;
    this.y = 0;
    this.sprite = scene.add.sprite(this.x * TILE_WIDTH,
      this.y * TILE_HEIGHT, 'ship');
    this.sprite.setOrigin(0, 0);
    this.sprite.setScale(2);
  },
  setPos(x, y) {
    if(0 <= x && x < this.scene.cameras.main.width / TILE_WIDTH / 2) {
      this.x = x;
    }

    if(0 <= y && y < this.scene.cameras.main.height / TILE_HEIGHT / 2) {
      this.y = y;
    }

    this.sprite.x = this.x * 2 * TILE_WIDTH;
    this.sprite.y = this.y * 2 * TILE_HEIGHT;
  }
});

const ShipMover = util.extend(Object, 'ShipMover', {
  constructor: function(scene, ship) {
    scene.input.keyboard.addKey('A').on('down', () => {
      ship.setPos(ship.x - 1, ship.y);
    });

    scene.input.keyboard.addKey('D').on('down', () => {
      ship.setPos(ship.x + 1, ship.y);
    });

    scene.input.keyboard.addKey('W').on('down', () => {
      ship.setPos(ship.x, ship.y - 1);
    });

    scene.input.keyboard.addKey('S').on('down', () => {
      ship.setPos(ship.x, ship.y + 1);
    });
  }
});