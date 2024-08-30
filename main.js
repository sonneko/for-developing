document.addEventListener('touchmove', function (event) {
    if (event.scale !== 1) {
        event.preventDefault();
    }
}, { passive: false });

// get element
const canvasEle = document.getElementById("canvas");

const CANVAS_WIDTH = 10;
const CANVAS_HEIGHT = 10;
const WORLD_HEIGHT = 30;
const WORLD_WIDTH = 30;

const RED_FREQ = 0.05;

const WIDTH_GAP = Math.floor(CANVAS_WIDTH / 2);
const HEIGHT_GAP = Math.floor(CANVAS_HEIGHT / 2);

const texture = {
    0: "white",
    1: "black",
    2: "yellow",
    3: "blue",
    4: "red",
    5: "green"
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
let point = 0;

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
            maze[y][x] = 4; // 赤色のブロックに置き換える
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
        if (j === WIDTH_GAP || j === WORLD_WIDTH - WIDTH_GAP || i === HEIGHT_GAP || i === WORLD_HEIGHT - HEIGHT_GAP) bow.push(1)
        else bow.push(0);
    }
    world.blocks.push(bow);
}

const maze = generateMaze(WORLD_WIDTH - WIDTH_GAP - 1, WORLD_HEIGHT - HEIGHT_GAP - 1);
world.blocks = world.blocks.map((item, index) => {
    if (HEIGHT_GAP < index && index < WORLD_HEIGHT - HEIGHT_GAP) {
        return item.map((item2, index2) => {
            if (WIDTH_GAP < index2 && index2 < WORLD_WIDTH - WIDTH_GAP) {
                return maze[index - HEIGHT_GAP][index2 - WIDTH_GAP];
            }
            return item2;
        })
    }
    return item;
});

world.blocks[HEIGHT_GAP + 1][WIDTH_GAP + 1] = 5;

let playerX = 1;
let playerY = 1;

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
            // if player exit
            if (x === WIDTH_GAP && y === HEIGHT_GAP) {
                htmlStr += `<td class="cell img-${texture[relay[x][y]]}">👤</td>`
            } else {
                htmlStr += `<td class="cell img-${texture[relay[x][y]]}">　</td>`;
            }
        }
        htmlStr += `</tr>`;
    }
    htmlStr += `</table>`;
    htmlStr += `<div class="location">playerX: ${playerX} playerY: ${playerY}   </div>`
    htmlStr += `<div class="location">point: ${point}</div>`
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
    load();
    canMove = true;
}

function getNowBlock(x = 0, y = 0) {
    return world.blocks[playerY - y + HEIGHT_GAP][playerX - x + WIDTH_GAP];
}

function setNowBlock(id, x = 0, y = 0) {
    world.blocks[playerY - y + HEIGHT_GAP][playerX - x + WIDTH_GAP] = id;
}

function mainLoop() {
    const nowBlock = getNowBlock();
    if (nowBlock === 4) {
        alert("game over");
        canMove = false;
    }
    if (nowBlock === 3) {
        alert("you win");
        canMove = false;
    }
    if (nowBlock === 2) {
        point++;
        setNowBlock(0);
    }
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

