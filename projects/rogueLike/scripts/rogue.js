const Game = {
    display: null,
    map: {},
    width: 45,
    height: 40,

    init () {
        const displayOptions = {
            fontFamily: "Space Mono",
            fontSize: 18,
            width: this.width,
            height: this.height,
            forceSquareRatio: true
        };

        this.colors = {
            '.' : 'lightgray',
            '@' : 'aquamarine',
            '$' : 'gold',
        };
        
        this.display = new ROT.Display(displayOptions);
        document.body.appendChild(this.display.getContainer());
        this.display.clear();
        this.scheduler = new ROT.Scheduler.Simple();
        this.engine = new ROT.Engine(this.scheduler);
        GameWorld.generate();
        GameWorld.draw();
    },

    startGame() {
        this.scheduler.add(Player, true); 
        this.engine.start();
    }
};

const GameWorld = {
    map: {},
    explored: {},
    generate () {
        let digger = new ROT.Map.Digger(Game.width, Game.height);
        const freeCells = [];
        let digCallback = function (x, y, value) {
            if (value) {
            return;
            } /* do not store walls */

            const key = x + "," + y;
            this.map[key] = ".";
            freeCells.push(key);
        };
        digger.create(digCallback.bind(this));
        Player.init(freeCells);
    },
    draw () {
        for (const key in this.map) {
            const parts = key.split(",");
            const x = parseInt(parts[0]);
            const y = parseInt(parts[1]);
            Game.display.draw(x, y, this.map[key], Game.colors[this.map[key]] || '#444');
        }
        Player.draw();
    }
};

const Player = {
    x: null,
    y: null,

    init (freeCells) {
        const randomIndex = Math.floor(Math.random() * freeCells.length);
        const pos = freeCells[randomIndex];
        this.x = parseInt(pos.split(",")[0]);
        this.y = parseInt(pos.split(",")[1]);
    },

    draw () {
        Game.display.draw(this.x, this.y, "@", "aquamarine");
    },

    act () {
        Game.engine.lock(); // Stop the engine to wait for player input
        window.addEventListener("keydown", (e) => {
            let newX = this.x;
            let newY = this.y;
            if (e.key === "ArrowUp") {
                newY--;
            } else if (e.key === "ArrowDown") {
                newY++;
            } else if (e.key === "ArrowLeft") {
                newX--;
            } else if (e.key === "ArrowRight") {
                newX++;
            }

            const newPosition = newX + "," + newY;
            
            if (!(newPosition in GameWorld.map)) { 
                Game.engine.unlock(); //Skip player turn
                return;
            }
            
            Game.display.draw(this.x, this.y, GameWorld.map[`${this.x},${this.y}`], Game.colors[GameWorld.map[`${this.x},${this.y}`]]);
            this.x = newX;
            this.y = newY;
            this.draw();

            Game.engine.unlock(); // Resume once the player has moved
        }, { once: true });
    }
};

Game.init();
Game.startGame();