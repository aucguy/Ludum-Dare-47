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
    grid.setOrigin(0, 0);
    this.board = generateBoard(this);
    this.car = new Car(this);
    this.carMover = new CarMover(this, this.car);
  }
});

const Car = util.extend(Object, 'Ship', {
  constructor: function(scene) {
    this.scene = scene;
    this.x = 0;
    this.y = 0;
    this.sprite = scene.add.sprite(this.x * TILE_WIDTH,
      this.y * TILE_HEIGHT, 'ship');
    this.sprite.setOrigin(0, 0);
  },
  setPos(x, y) {
    if(0 <= x && x < this.scene.cameras.main.width / TILE_WIDTH) {
      this.x = x;
    }

    if(0 <= y && y < this.scene.cameras.main.height / TILE_HEIGHT) {
      this.y = y;
    }

    this.sprite.x = this.x * TILE_WIDTH;
    this.sprite.y = this.y * TILE_HEIGHT;
  }
});

const CarMover = util.extend(Object, 'ShipMover', {
  constructor: function(scene, car) {
    scene.input.keyboard.addKey('A').on('down', () => {
      car.setPos(car.x - 1, car.y);
    });

    scene.input.keyboard.addKey('D').on('down', () => {
      car.setPos(car.x + 1, car.y);
    });

    scene.input.keyboard.addKey('W').on('down', () => {
      car.setPos(car.x, car.y - 1);
    });

    scene.input.keyboard.addKey('S').on('down', () => {
      car.setPos(car.x, car.y + 1);
    });
  }
});

const TILES = {
  EMPTY: 0,
  HORIZONTAL: 1,
  VERTICAL: 2,
  TOP_LEFT: 3,
  TOP_RIGHT: 4,
  BOTTOM_LEFT: 5,
  BOTTOM_RIGHT: 6
};

const Board = util.extend(Object, 'Board', {
  constructor: function(scene, width, height) {
    this.scene = scene;
    this.width = width;
    this.height = height;

    this.group = scene.add.group();
    this.board = new Uint8Array(width * height);
    this.board.fill(TILES.EMPTY);
  },
  get(x, y) {
    return this.board[y * this.width + x];
  },
  set(x, y, type) {
    if(type === TILES.HORIZONTAL) {
      let sprite = this.group.create(x * TILE_WIDTH, y * TILE_HEIGHT, 'road-straight');
      sprite.setOrigin(0, 0);
      sprite.setScale(2);
      this.board[y * this.width + x] = type;
    }
  }
});

const RECT_COUNT = 5;
const MIN_RECT_WIDTH = 7;
const MAX_RECT_WIDTH = 20;
const MIN_RECT_HEIGHT = 7;
const MAX_RECT_HEIGHT = 20;

function generateBoard(scene) {
  const width = scene.cameras.main.width / TILE_WIDTH;
  const height = scene.cameras.main.height / TILE_HEIGHT;

  const board = new Board(scene, width, height);

  const rects = [];

  while(rects.length < RECT_COUNT) {
    const left = Math.floor(Phaser.Math.RND.integerInRange(0, width) / 2) * 2;
    const top = Math.floor(Phaser.Math.RND.integerInRange(0, height) / 2) * 2;

    const maxWidth = Math.min(MAX_RECT_WIDTH, width - left);
    const maxHeight = Math.min(MAX_RECT_HEIGHT, height - top);

    if(maxWidth < MIN_RECT_WIDTH || maxHeight < MIN_RECT_HEIGHT) {
      continue;
    }

    const rectWidth = Math.floor(Phaser.Math.RND.integerInRange(MIN_RECT_WIDTH, maxWidth) / 2) * 2;
    const rectHeight = Math.floor(Phaser.Math.RND.integerInRange(MIN_RECT_HEIGHT, maxHeight) / 2) * 2;

    if(left + rectWidth >= width || top + rectHeight >= height) {
      continue;
    }

    rects.push({
      left,
      top,
      width: rectWidth,
      height: rectHeight
    });
  }

  for(let rect of rects) {
    for(let x = rect.left; x <= rect.left + rect.width; x++) {
      board.set(x, rect.top, TILES.HORIZONTAL);
      board.set(x, rect.top + rect.height, TILES.HORIZONTAL);
    }

    for(let y = rect.top; y < rect.top + rect.height; y++) {
      board.set(rect.left, y, TILES.HORIZONTAL);
      board.set(rect.left + rect.width, y, TILES.HORIZONTAL);
    }
  }

  return board;
}