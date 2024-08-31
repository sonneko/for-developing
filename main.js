document.addEventListener('touchmove', function (event) {
    if (event.scale !== 1) {
        event.preventDefault();
    }
}, { passive: false });

// get element
const canvasEle = document.getElementById("canvas");
const titleEle = document.getElementById("titleBox");

const CANVAS_WIDTH = 7;
const CANVAS_HEIGHT = 7;
const WORLD_HEIGHT = 30;
const WORLD_WIDTH = 30;

const RED_FREQ = 0.16;

// const WIDTH_GAP = Math.floor(CANVAS_WIDTH / 2);
// const HEIGHT_GAP = Math.floor(CANVAS_HEIGHT / 2);
const WIDTH_GAP = 3
const HEIGHT_GAP = 3

const texture = {
    0: "white",     // 通路
    1: "black",     // 壁
    2: "yellow",    // ポイント
    3: "blue",      // ゴール
    4: "red",       // わな
    5: "green"      // スタート地点
}

const touchData = {
    0: false,
    1: true,
    2: false,
    3: false,
    4: false,
    5: false,
}

let canMove = false;
let canGoal = false;
let didFinish = false;
let timer = 0;
let point = 0;

let enemyList = [];

function alertTitle(str) {
    titleEle.innerHTML = `<h1>${str}</h1>`;
    setTimeout(() => {
        titleEle.innerHTML = "";
    }, 3000);
}

function generateMaze(width, height) {
    // 迷路を生成するための初期化
    const maze = Array.from({ length: height }, () => Array(width).fill(1)); // 1は壁を意味する
    const directions = [
        { x: 0, y: -2 }, // 上
        { x: 2, y: 0 },  // 右
        { x: 0, y: 2 },  // 下
        { x: -2, y: 0 }  // 左
    ];

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function carvePassages(x, y) {
        maze[y][x] = 0; // 通路を作る（0は通路を意味する）

        // ランダムな順番で4方向に進む
        const shuffledDirections = shuffle([...directions]);
        for (const { x: dx, y: dy } of shuffledDirections) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx > 0 && ny > 0 && nx < width - 1 && ny < height - 1 && maze[ny][nx] === 1) {
                maze[ny - dy / 2][nx - dx / 2] = 0; // 壁を破壊して通路を作る
                carvePassages(nx, ny);
            }
        }
    }

    // 指定された数の壁ブロックをランダムに赤色に置き換える
    function replaceRandomWallWithRed(maze, redCount) {
        const walls = [];

        // 壁ブロックの座標をリストに追加
        for (let y = 0; y < maze.length; y++) {
            for (let x = 0; x < maze[y].length; x++) {
                if (maze[y][x] === 1) {
                    walls.push({ x, y });
                }
            }
        }

        // 指定された数の壁ブロックをランダムに赤色に置き換える
        for (let i = 0; i < redCount && walls.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * walls.length);
            const { x, y } = walls.splice(randomIndex, 1)[0];
            const randomNum = Math.floor(Math.random() * 8);
            switch (randomNum) {
                case 0:
                case 1:
                case 2:
                    maze[y][x] = 2;
                    break;
                case 3:
                case 4:
                    maze[y][x] = 4;
                    break;
                default:
                    maze[y][x] = 0;
                    break;
            }
        }
        return maze;
    }

    // スタート地点から迷路を生成する
    carvePassages(1, 1);

    return replaceRandomWallWithRed(maze, Math.floor(WORLD_HEIGHT * WORLD_WIDTH * RED_FREQ));
}

let world = {
    blocks: []
}

for (let i = 0; i <= WORLD_HEIGHT; i++) {
    let bow = [];
    for (let j = 0; j <= WORLD_WIDTH; j++) {
        if (j === WIDTH_GAP - 1 || j === WORLD_WIDTH - WIDTH_GAP || i === HEIGHT_GAP - 1 || i === WORLD_HEIGHT - HEIGHT_GAP) {
            bow.push(1);
        } else bow.push(0);
    }
    world.blocks.push(bow);
}

const maze = generateMaze(WORLD_WIDTH - WIDTH_GAP + 2, WORLD_HEIGHT - HEIGHT_GAP + 2);
for (let y = 0; y <= WORLD_HEIGHT; y++) {
    for (let x = 0; x <= WORLD_WIDTH; x++) {
        if (WIDTH_GAP - 1 < x && x < WORLD_WIDTH - WIDTH_GAP && HEIGHT_GAP - 1 < y && y < WORLD_HEIGHT - HEIGHT_GAP)
            world.blocks[y][x] = maze[y][x];
    }
}

// スタート地点
world.blocks[HEIGHT_GAP][WIDTH_GAP] = 5;
// ゴール地点
// ゴール地点
world.blocks
[Math.floor(Math.random() * (WORLD_HEIGHT - HEIGHT_GAP - 1)) + HEIGHT_GAP + 1]
[Math.floor(Math.random() * (WORLD_WIDTH - WIDTH_GAP - 1)) + WIDTH_GAP + 1]
    = 3;


let playerX = 0;
let playerY = 0;

function draw(relay) {
    // relay is a 2D array of numbers
    // check if the dimensions are correct
    if (relay.length !== CANVAS_WIDTH) {
        alert("error w" + relay.length);
        return;
    }
    for (let i = 0; i < CANVAS_WIDTH; i++) {
        if (relay[i].length !== CANVAS_HEIGHT) {
            alert("error h");
            return;
        }
    }
    // create table
    let htmlStr = "";
    htmlStr += `<table>`
    for (let y = 0; y < CANVAS_HEIGHT; y++) {
        htmlStr += `<tr>`;
        for (let x = 0; x < CANVAS_WIDTH; x++) {
            let enemy;
            enemyList.forEach((item) => {
                if (item.x === x + playerX - WIDTH_GAP && item.y === y+ playerY - HEIGHT_GAP) {
                    enemy = "敵"
                }
            })
            // if player exit
            if (x === WIDTH_GAP && y === HEIGHT_GAP) {
                htmlStr += `<td class="cell img-${texture[relay[x][y]]}">👤</td>`
            } else if (enemy !== undefined) {
                htmlStr += `<td class="cell img-${texture[relay[x][y]]}">${enemy}</td>`
            } else {
                htmlStr += `<td class="cell img-${texture[relay[x][y]]}">　</td>`;
            }
        }
        htmlStr += `</tr>`;
    }
    htmlStr += `</table>`;
    htmlStr += `<div class="location">playerX: ${playerX} playerY: ${playerY}   </div>`
    htmlStr += `<div class="location">point: ${point}</div>`;
    htmlStr += `<div class="location">timer: ${timer}</div>`;
    canvasEle.innerHTML = htmlStr;
    mainLoop();
}

function move(worldData, scrollY, scrollX) {
    // scrollX and scrollY check
    if (scrollX <= 0) {
        scrollX = 0;
    }
    if (scrollX >= WORLD_WIDTH - CANVAS_WIDTH) {
        scrollX = WORLD_WIDTH - CANVAS_WIDTH;
    }
    if (scrollY <= 0) {
        scrollY = 0;
    }
    if (scrollY >= WORLD_HEIGHT - CANVAS_HEIGHT) {
        scrollY = WORLD_HEIGHT - CANVAS_HEIGHT;
    }
    // worldData is a 2D array of numbers
    let newWorldData = [];
    for (let y = scrollY; y < scrollY + CANVAS_HEIGHT; y++) {
        newWorldData.push([]);
        for (let x = scrollX; x < scrollX + CANVAS_WIDTH; x++) {
            newWorldData[y - scrollY].push(worldData[x][y]);
        }
    }
    return newWorldData;
}

function init() {
    // time out
    setTimeout(() => {
        if (!didFinish) {
            canMove = false;
            alertTitle("Time Up!")
        }
    }, 1000 * 60);
    setInterval(() => {
        if (!didFinish) {
            timer++;
        }
    }, 1000)
    load();
    canMove = true;
    for (let i = 0; i <= 2; i++) summonEnemy()
    alert(JSON.stringify(enemyList[0]))
}

function summonEnemy() {
    const walls = [];

    // 通路の座標をリストに追加
    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            if (maze[y][x] === 0) {
                walls.push({ x, y });
            }
        }
    }

    // 通路からランダムに敵を生成
    const randomIndex = Math.floor(Math.random() * walls.length);
    const { x, y } = walls[randomIndex];
    enemyList.push({ x, y })
}

function getNowBlock(x = 0, y = 0) {
    return world.blocks[playerY - y + HEIGHT_GAP][playerX - x + WIDTH_GAP];
}

function getBlock(x, y) {
    return world.blocks[y][x];
}

function setNowBlock(id, x = 0, y = 0) {
    world.blocks[playerY - y + HEIGHT_GAP][playerX - x + WIDTH_GAP] = id;
}

function mainLoop() {
    const nowBlock = getNowBlock();
    enemyList.forEach((item) => {
        if (item.x === playerX && item.y === playerY) {
            alertTitle("game over");
            canMove = false;
            didFinish = true;
        }
    })
    if (nowBlock === 4) {
        alertTitle("game over");
        canMove = false;
        didFinish = true;
    }
    if (nowBlock === 3) {
        alertTitle("you win");
        canMove = false;
        didFinish = true;
    }
    if (nowBlock === 2) {
        point++;
        setNowBlock(0);
    }
    if (nowBlock === 3) {
        if (canGoal) {
            alertTitle("you win");
            canMove = false;
            didFinish = true;
        } else {
            alertTitle("collect point!");
            canMove = true;
        }
    }
    if (point === 25) {
        alertTitle("Go to goal");
        canGoal = true;
    }
    // move enemy
    enemyList.forEach((item) => {
        const { x, y } = item;
        let canMoveRange = [];
        if (getBlock(x - 1, y) === 1) canMoveRange.push([1,0])
        if (getBlock(x + 1, y) === 1) canMoveRange.push([-1,0])
        if (getBlock(x, y - 1) === 1) canMoveRange.push([0,1])
        if (getBlock(x, y + 1) === 1) canMoveRange.push([0,-1])
        alertTitle(JSON.stringify(canMoveRange));
        const randomNum = Math.floor(Math.random() * canMoveRange.length);
        item.x += canMoveRange[randomNum][0];
        item.y += canMoveRange[randomNum][1];
    })
}

function load() {
    draw(move(world.blocks, playerX, playerY));
}

const senser = {
    top: () => {
        if (playerY === 0) return
        if (touchData[getNowBlock(0, 1)]) return
        playerY--;
        draw(move(world.blocks, playerX, playerY));
    },
    bottom: () => {
        if (playerY === WORLD_HEIGHT - CANVAS_HEIGHT) return
        if (touchData[getNowBlock(0, -1)]) return
        playerY++;
        draw(move(world.blocks, playerX, playerY));
    },
    left: () => {
        if (playerX === 0) return
        if (touchData[getNowBlock(1, 0)]) return
        playerX--;
        draw(move(world.blocks, playerX, playerY));
    },
    right: () => {
        if (playerX === WORLD_WIDTH - CANVAS_WIDTH) return
        if (touchData[getNowBlock(-1, 0)]) return
        playerX++;
        draw(move(world.blocks, playerX, playerY));
    }
}

// btn event
document.getElementById("up").addEventListener("click", () => {
    if (canMove) senser.top();
})

document.getElementById("down").addEventListener("click", () => {
    if (canMove) senser.bottom();
})

document.getElementById("left").addEventListener("click", () => {
    if (canMove) senser.left();
})

document.getElementById("right").addEventListener("click", () => {
    if (canMove) senser.right();
})
document.addEventListener('keydown', function (event) {
    if (canMove) {
        switch (event.key) {
            case 'ArrowUp':
                if (canMove) senser.top();
                break;
            case 'ArrowDown':
                if (canMove) senser.bottom();
                break;
            case 'ArrowLeft':
                if (canMove) senser.left();
                break;
            case 'ArrowRight':
                if (canMove) senser.right();
                break;
            default:
                break;
        }
    }
});

init();
