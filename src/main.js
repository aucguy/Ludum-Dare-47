import * as util from '/lib/util.js';

export function init() {
  const game = new Phaser.Game({
    width: 640,
    height: 480,
    parent: 'gameContainer',
    scene: new util.BootScene('play'),
    pixelArt: true,
    physics: {
      default: 'arcade'
    }
  });

  game.scene.add('play', new PlayScene());
}

const TILE_WIDTH = 40;
const TILE_HEIGHT = 40;

const PlayScene = util.extend(Phaser.Scene, 'PlayScene', {
  constructor: function() {
    this.constructor$Scene();
    this.ship = null;
  },
  create() {
    this.board = generateBoard(this);
    this.car = new Car(this, this.board);
    this.carMover = new CarMover(this, this.car);
    this.physics.add.collider(this.car.sprite, this.board.staticGroup);
  },
  update() {
    this.carMover.update();
  }
});

const Car = util.extend(Object, 'Ship', {
  constructor: function(scene, board) {
    this.scene = scene;

    this.x = 0;
    this.y = 0;

    let found = false;

    for(let y = 0; y < board.height; y++) {
      for(let x = 0; x < board.width; x++) {
        if(board.get(x, y) != TILES.EMPTY) {
          this.x = x;
          this.y = y;
          found = true;
          break;
        }
      }
      if(found) {
        break;
      }
    }

    this.sprite = scene.physics.add.sprite(this.x * TILE_WIDTH,
      this.y * TILE_HEIGHT, 'ship');
    this.sprite.body.setCollideWorldBounds();
    this.sprite.setOrigin(0, 0);
    this.xVel = 0;
    this.yVel = 0;
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
    this.scene = scene;
    this.car = car;
    this.keyLeft = this.scene.input.keyboard.addKey('A');
    this.keyRight = this.scene.input.keyboard.addKey('D');
    this.keyUp = this.scene.input.keyboard.addKey('W');
    this.keyDown = this.scene.input.keyboard.addKey('S');
    this.acceleration = 10;
    this.friction = 0.9;
  },
  update() {
    const velocity = this.car.sprite.body.velocity;
    velocity.x *= this.friction;
    velocity.y *= this.friction;
    if(this.keyLeft.isDown) {
      velocity.x -= this.acceleration;
    } else if(this.keyRight.isDown) {
      velocity.x += this.acceleration;
    } else if(this.keyUp.isDown) {
      velocity.y -= this.acceleration;
    } else if(this.keyDown.isDown) {
      velocity.y += this.acceleration;
    }
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

    this.group = null;
    this.board = new Uint8Array(width * height);
    this.board.fill(TILES.EMPTY);
  },
  get(x, y) {
    return this.board[y * this.width + x];
  },
  set(x, y, type) {
    this.board[y * this.width + x] = type;
  },
  finishGeneration() {
    this.staticGroup = this.scene.physics.add.staticGroup();
    this.group = this.scene.add.group();

    for(let x = 0; x < this.width; x++) {
      for(let y = 0; y < this.height; y++) {
        let type = this.get(x, y);
        let key, group, physical;
        if(type === TILES.HORIZONTAL) {
          key = 'road-straight';
          group = this.group;
          physical = false;
        } else {
          key = 'road-empty';
          group = this.staticGroup;
          physical = true;
        }
        let sprite = group.create(x * TILE_WIDTH, y * TILE_HEIGHT, key);
        sprite.setOrigin(0, 0);
        sprite.setScale(4);
        if(physical) {
          sprite.refreshBody();
        }
      }
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

  board.finishGeneration();
  return board;
}