import * as util from '/lib/util.js';

export function init() {
  const game = new Phaser.Game({
    width: 640,
    height: 480,
    parent: 'gameContainer',
    scene: new util.BootScene('main-menu'),
    pixelArt: true,
    physics: {
      default: 'arcade'
    }
  });

  game.scene.add('main-menu', new MainMenuScene());
  game.scene.add('lose-menu', new LoseMenuScene());
  game.scene.add('play', new PlayScene());
  return game;
}

function menuBase(scene, spriteScale) {
  const background = scene.add.sprite(0, 0, 'menu-background');
  background.setScale(spriteScale);
  background.setOrigin(0, 0);

  const width = scene.cameras.main.width;
  const height = scene.cameras.main.height;
  const playButton = scene.add.sprite(width / 2, height / 2, 'play-button');
  playButton.setScale(spriteScale);
  playButton.setInteractive();
  playButton.on('pointerdown', () => {
    scene.scene.stop('main-menu');
    scene.scene.start('play');
  });
}

const MainMenuScene = util.extend(Phaser.Scene, 'MainMenuScene', {
  constructor: function() {
    this.constructor$Scene();
    this.spriteScale = 16;
  },
  create() {
    menuBase(this, this.spriteScale);
  }
});

const LoseMenuScene = util.extend(Phaser.Scene, 'LoseMenuScene', {
  constructor: function() {
    this.constructor$Scene();
    this.spriteScale = 16;
    this.scoreNum = 0;
    this.score = null;
  },
  init(data) {
    this.scoreNum = data.scoreNum;
  },
  create() {
    menuBase(this, this.spriteScale);
    this.score = new Score(this, this.scoreNum);
  }
});

const SCALE = 5;
const PLAYER_SCALE = 1.5;
const TILE_WIDTH = 8 * SCALE;
const TILE_HEIGHT = 8 * SCALE;
const HUD_HEIGHT = 2;

const PlayScene = util.extend(Phaser.Scene, 'PlayScene', {
  constructor: function() {
    this.constructor$Scene();
    this.board = null;
    this.car = null;
    this.carMover = null;
    this.currentTime = null;
    this.replayer = null;
    this.depot = null;
    this.ghostCollision = null;
    this.hud = null;
  },
  create() {
    this.board = generateBoard(this);
    this.car = new Car(this, this.board);
    this.carMover = new CarMover(this, this.car);
    this.replayer = new Replayer(this, this.car);
    this.depot = new Depot(this, this.car, this.board);
    this.ghostCollision = new GhostCollision(this, this.replayer, this.car, this.depot);
    this.hud = new Hud(this, this.depot);
    this.physics.add.collider(this.car.sprite, this.board.staticGroup);

    let rate = 1;
    const music = this.sound.add('music');
    music.play();
    music.on('complete', () => {
      rate += 0.1;
      if(rate > 2) {
        rate = 2;
      }
      music.setRate(rate);
      music.play();
    });
  },
  update(time) {
    this.currentTime = time;
    this.carMover.update();
    this.depot.update();
    this.ghostCollision.update();
    this.replayer.update();
    this.hud.update();
  }
});

const Car = util.extend(Object, 'Car', {
  constructor: function Car(scene, board) {
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
    this.sprite.setScale(PLAYER_SCALE);
    this.sprite.refreshBody();
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

const CarMover = util.extend(Object, 'CarMover', {
  constructor: function CarMover(scene, car) {
    this.scene = scene;
    this.car = car;
    this.keyLeft = this.scene.input.keyboard.addKey('A');
    this.keyRight = this.scene.input.keyboard.addKey('D');
    this.keyUp = this.scene.input.keyboard.addKey('W');
    this.keyDown = this.scene.input.keyboard.addKey('S');
    this.acceleration = 10;
    this.friction = 0.9;
    this.horizontalDirection = 'none';
    this.verticalDirection = 'none';
  },
  update() {
    const velocity = this.car.sprite.body.velocity;
    velocity.x *= this.friction;
    velocity.y *= this.friction;

    if(this.horizontalDirection === 'left' && !this.keyLeft.isDown) {
      if(this.keyRight.isDown) {
        this.horizontalDirection = 'right';
      } else {
        this.horizontalDirection = 'none';
      }
    } else if(this.horizontalDirection === 'right' && !this.keyRight.isDown) {
      if(this.keyLeft.isDown) {
        this.horizontalDirection = 'left';
      } else {
        this.horizontalDirection = 'none';
      }
    } else if(this.horizontalDirection === 'none') {
      if(this.keyLeft.isDown) {
        this.horizontalDirection = 'left';
      } else if(this.keyRight.isDown) {
        this.horizontalDirection = 'right';
      }
    }

    if(this.verticalDirection === 'up' && !this.keyUp.isDown) {
      if(this.keyDown.isDown) {
        this.verticalDirection = 'down';
      } else {
        this.verticalDirection = 'none';
      }
    } else if(this.verticalDirection === 'down' && !this.keyDown.isDown) {
      if(this.keyUp.isDown) {
        this.verticalDirection = 'up';
      } else {
        this.verticalDirection = 'none';
      }
    } else if(this.verticalDirection === 'none') {
      if(this.keyUp.isDown) {
        this.verticalDirection = 'up';
      } else if(this.keyDown.isDown) {
        this.verticalDirection = 'down';
      }
    }

    if(this.horizontalDirection === 'left') {
      velocity.x -= this.acceleration;
    } else if(this.horizontalDirection === 'right') {
      velocity.x += this.acceleration;
    }

    if(this.verticalDirection === 'up') {
      velocity.y -= this.acceleration;
    } else if(this.verticalDirection === 'down') {
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
  constructor: function Board(scene, width, height) {
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
        sprite.setScale(SCALE);
        if(physical) {
          sprite.refreshBody();
        }
      }
    }
  }
});

const RECT_COUNT = 4;
const MAX_TRIES = 100;
const MIN_RECT_WIDTH = 7;
const MAX_RECT_WIDTH = 20;
const MIN_RECT_HEIGHT = 7;
const MAX_RECT_HEIGHT = 20;

function generateBoard(scene) {
  const width = scene.cameras.main.width / TILE_WIDTH;
  const height = scene.cameras.main.height / TILE_HEIGHT - HUD_HEIGHT;

  const board = new Board(scene, width, height + HUD_HEIGHT);

  const rects = [];
  let tries = 0;

  while(rects.length < RECT_COUNT && tries < MAX_TRIES) {
    tries++;

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

const AppendableFloatArray = util.extend(Object, 'AppendableFloatArray', {
  constructor: function AppendableFloatArray() {
    this.sectionSize = 1024;
    this.sections = [];
    this.length = 0;
  },
  get(index) {
    if(index < 0 || index >= this.length) {
      throw (new Error('index out of bounds'));
    }

    const section = this.sections[Math.floor(index / this.sectionSize)];
    return section[index % this.sectionSize];
  },
  append(value) {
    const offset = this.length % this.sectionSize;
    if(offset === 0) {
      this.sections.push(new Float32Array(this.sectionSize));
    }
    this.sections[this.sections.length - 1][offset] = value;
    this.length++;
  },
});

const Ghost = util.extend(Object, 'Ghost', {
  constructor: function(replayer) {
    this.index = 0;
    this.replayer = replayer;
    const x = replayer.xPositions.get(0);
    const y = replayer.yPositions.get(0);
    this.sprite = replayer.group.create(x, y, 'ghost');
    this.sprite.setOrigin(0);
    this.sprite.setScale(PLAYER_SCALE);
    this.sprite.refreshBody();
  },
  update() {
    this.index++;
    this.sprite.x = this.replayer.xPositions.get(this.index);
    this.sprite.y = this.replayer.yPositions.get(this.index);
  }
});

const GhostCollision = util.extend(Object, 'GhostCollision', {
  constructor: function GhostCollision(scene, replayer, car, depot) {
    this.scene = scene;
    this.replayer = replayer;
    this.car = car;
    this.depot = depot;
  },
  update() {
    for(let ghost of this.replayer.ghosts) {
      if(this.scene.physics.overlap(ghost.sprite, this.car.sprite)) {
        this.scene.game.scene.stop('play');
        this.scene.game.scene.start('lose-menu', { scoreNum: this.depot.score });
        this.scene.sound.stopAll();
        this.scene.sound.play('lose');
        break;
      }
    }
  }
});

const Replayer = util.extend(Object, 'Replayer', {
  constructor: function(scene, car) {
    this.scene = scene;
    this.car = car;
    this.xPositions = new AppendableFloatArray();
    this.yPositions = new AppendableFloatArray();
    //this.times = new AppendableFloatArray();
    this.group = scene.physics.add.group();
    this.ghosts = [];
    this.lastSpawn = null;
    this.spawnRate = 10 * 1000;
  },
  update() {
    this.xPositions.append(this.car.sprite.x);
    this.yPositions.append(this.car.sprite.y);
    //this.times.append(this.scene.currentTime);

    this.ghosts.forEach(ghost => ghost.update());

    if(this.lastSpawn === null) {
      this.lastSpawn = this.scene.currentTime;
    } else if(this.lastSpawn + this.spawnRate < this.scene.currentTime) {
      this.ghosts.push(new Ghost(this));
      this.lastSpawn = this.scene.currentTime;
    }
  }
});

const Depot = util.extend(Object, 'Depot', {
  constructor: function Depot(scene, car, board) {
    this.scene = scene;
    this.car = car;
    this.board = board;
    this.sprite = scene.physics.add.sprite(0, 0, 'depot');
    this.sprite.setOrigin(0, 0);
    this.sprite.setScale(SCALE);
    this.changePosition();
    this.score = 0;
  },
  changePosition() {
    let choices = [];

    for(let x = 0; x < this.board.width; x++) {
      for(let y = 0; y < this.board.height; y++) {
        if(this.board.get(x, y) != TILES.EMPTY) {
          choices.push({ x, y });
        }
      }
    }

    const choice = Phaser.Math.RND.pick(choices);
    this.sprite.x = choice.x * TILE_WIDTH;
    this.sprite.y = choice.y * TILE_HEIGHT;
  },
  update() {
    if(this.scene.physics.overlap(this.sprite, this.car.sprite)) {
      this.changePosition();
      this.score++;
      this.scene.sound.play('score-sound');
    }
  }
});

const Score = util.extend(Object, 'Score', {
  constructor: function Score(scene, score) {
    this.scene = scene;

    const y = scene.cameras.main.height - HUD_HEIGHT * TILE_HEIGHT;
    const scoreSprite = scene.add.sprite(0, y, 'score');
    scoreSprite.setScale(HUD_HEIGHT * SCALE);
    scoreSprite.setOrigin(0, 0);

    this.scoreDigits = 3;
    this.scoreSprites = [];
    this.setScore(score);
  },
  setScore(num) {
    this.scoreSprites.forEach(x => x.destroy());
    this.scoreSprites = [];
    const offset = 3.5;

    const y = this.scene.cameras.main.height - HUD_HEIGHT * TILE_HEIGHT;
    let str = `${num % 1000}`.split('');
    while(str.length < this.scoreDigits) {
      str.unshift('0');
    }

    for(let i = 0; i < this.scoreDigits; i++) {
      let key = 'digit-' + str[i];
      const sprite = this.scene.add.sprite((i + offset) * HUD_HEIGHT * TILE_WIDTH, y, key);
      sprite.setOrigin(0, 0);
      sprite.setScale(HUD_HEIGHT * SCALE);
      this.scoreSprites.push(sprite);
    }
  }
});

const Hud = util.extend(Object, 'Hud', {
  constructor: function Hud(scene, depot) {
    this.scene = scene;
    this.depot = depot;
    this.score = new Score(scene, 0);
  },
  update() {
    if(this.lastScore !== this.depot.score) {
      this.score.setScore(this.depot.score);
      this.lastScore = this.depot.score;
    }
  }
});