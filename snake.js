
class SnakeGame {

    static NUM_ROWS = 60;
    static NUM_COLS = 120;
    static API = 'https://snake.howbout.app/api/';

    apiKey = '';
    boardCells = [];
    score = 0;

    constructor(board, controls, apiform, scoreForm) {

        this.board = board;
        this.controls = controls;
        apiform.addEventListener('submit', this.setApiKey.bind(this));
        scoreForm.addEventListener('submit', this.submitScore.bind(this));
        this.scoreForm = scoreForm;
        this.leaderBoard = this.board.querySelector('#leaderboard table');

        this.scoreCounter = this.controls.querySelector('.score');

        this.initBoard();

        this.snake = new Snake(this);
        this.food = new Food(this);

        window.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'ArrowLeft':
                case 'a':
                    this.snake.setDirection('left');
                    break;

                case 'ArrowUp':
                case 'w':
                    this.snake.setDirection('up');
                    break;

                case 'ArrowRight':
                case 'd':
                    this.snake.setDirection('right');
                    break;

                case 'ArrowDown':
                case 's':
                    this.snake.setDirection('down');
                    break;

                case 'Escape':
                    this.snake.pause();
                    break;
            }
        });

    }

    /**
     * Build the board using rows of cells
     */
    initBoard() {

        // Generate a new row
        const newRow = (rowNum) => {
            const row = document.createElement('div');
            row.classList.add('row');
            row.classList.add('row-' + rowNum);
            return row;
        }
        // Generate a new column
        const newCol = (colNum) => {
            const col = document.createElement('div');
            col.classList.add('col');
            col.classList.add('col-' + colNum);
            return col;
        }

        // For each number of rows make a new row element and fill with columns
        for (let r = 0; r < SnakeGame.NUM_ROWS; r++) {

            const row = newRow(r);
            const boardCellsRow = [];

            // For each number of columns make a new column element and add to the row
            for (let c = 0; c < SnakeGame.NUM_COLS; c++) {

                const col = newCol(c);
                row.appendChild(col);
                boardCellsRow.push(col);

            }

            this.board.appendChild(row);
            this.boardCells.push(boardCellsRow);

        }

    }

    /*
        - Set the API key based on the starting form
        - check the API key is valid by attempting to retrieve the score board
    */
    setApiKey(e) {

        e.preventDefault();
        const key = e.target[0].value;

        fetch(`${SnakeGame.API}${key}/high-scores`)
        .then(response => {
            if(response.status == 404) {
                alert('INVALID API KEY!');
                return;
            }

            if(!response.ok) {
                alert('ERROR CONNECTING TO SERVER!');
                return;
            }
            
            this.apiKey = key;
            this.board.classList.remove('welcome');
            this.controls.classList.remove('in-menu');
        });

    }

    /*
        - Submit the user's name along with their score
        - Make sure the user has set their name
        - If everything goes well then show the score board
    */
    submitScore(e) {

        e.preventDefault();
        const name = e.target.querySelector('#name').value;

        if(name == '') {
            alert('PLEASE ENTER YOUR NAME!');
            return;
        }

        fetch(`${SnakeGame.API}${this.apiKey}/high-scores`,
        {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({name: name, score: this.score}),
            method: 'post'
        })
        .then(response => {
            if(response.ok) {
                this.showLeaderboard()
            } else {
                throw Error;
            }
        })
        .catch(function() {
            alert('ERROR CONNECTING TO SERVER!');
        });

    }

    /**
     * Begin the game
     */
    play() {

        this.controls.classList.add('playing');
        this.snake.move();
        this.food.move();

    }

    /**
     * Restart the game after game over
     */
    restart() {

        this.snake.reset();
        this.food.reset();
        this.score = 0;
        this.scoreCounter.innerText = 0;
        this.controls.classList.remove('playing');
        this.controls.classList.remove('in-menu');
        this.board.classList.remove('game-over');
        this.board.classList.remove('leaderboard');

    }

    /**
     * Increment the user's score
     */
    increaseScore(amount) {

        this.score += amount;
        this.scoreCounter.innerText = this.score;

    }

    /**
     * End the game
     */
    async gameOver() {

        this.snake.pause();

        this.controls.classList.remove('playing');
        this.board.classList.remove('leaderboard');
        this.controls.classList.add('in-menu');
        this.board.classList.add('game-over');

        this.scoreForm.querySelector('#score-text').textContent = this.score;

    }

    showLeaderboard() {

        fetch(`${SnakeGame.API}${this.apiKey}/high-scores`)
        .then(response => {
            if(!response.ok) {
                throw Error;
            }
            return response.json();
        })
        .catch(e => { 
            alert('ERROR CONNECTING TO SERVER!');
            return Promise.reject(e);
        })
        .then(data => {
            this.board.classList.remove('game-over');
            this.board.classList.add('leaderboard');
    
            // Clear the leaderboard
            this.leaderBoard.innerHTML = '';
    
            // Create table headers
            const headers = ['RANK', 'NAME', 'DATE', 'SCORE'];
            var tr = this.leaderBoard.insertRow(-1);
            headers.forEach(header => {
                var th = document.createElement('th');
                th.innerHTML = header;
                tr.appendChild(th);
            });

            // Sort the entries based on score in descending order
            data.sort(function(a, b) { return b['score'] - a['score'] } );

            // Take the top 10 scores and add them to the table
            data.slice(0, 10).forEach((element, index) => {
                // Rank
                var tr = this.leaderBoard.insertRow(-1);
                var th = document.createElement('th');
                th.innerHTML = (index + 1);
                tr.appendChild(th);

                // User's Name
                var th = document.createElement('th');
                th.innerHTML = element['name'];
                tr.appendChild(th);

                // Formatted Date
                var th = document.createElement('th');
                const date = new Date(element['created_at']);
                const day = date.getDate();
                const month = date.getMonth() + 1;
                const year = date.getFullYear();
                th.innerHTML = `${day}/${month}/${year}`;
                tr.appendChild(th);

                // Score
                var th = document.createElement('th');
                th.innerHTML = element['score'];
                tr.appendChild(th);
            })
        });

    }

}

class Snake {

    static STARTING_EDGE_OFFSET = 20;
    static SPEED_INCREMENT = 6;
    static MAX_SPEED = 40
    static TAIL_LENGTH = 6;

    tail = [];
    direction = 'up';
    nextDirection = 'up';
    speed = 160;
    moving = false;
    
    constructor(game) {

        this.game = game;
        this.init();

    }

    /**
     * Place the snake initially
     */
    init() {

        const x = Math.floor(Math.random() * (SnakeGame.NUM_COLS - Snake.STARTING_EDGE_OFFSET)) + (Snake.STARTING_EDGE_OFFSET / 2);
        const y = Math.floor(Math.random() * (SnakeGame.NUM_ROWS - Snake.STARTING_EDGE_OFFSET)) + (Snake.STARTING_EDGE_OFFSET / 2);
        this.position = { x, y };

        // Make the snake as long as the tailLength specifies
        for(let i = 0; i < Snake.TAIL_LENGTH; i++) {
            const startCell = this.game.boardCells[y + i][x];
            startCell.classList.add('snake');
    
            this.tail.unshift(startCell);
        }

    }

    /*
        - increase the speed based on the specified speed increment
        - clamp the value based on the max speed
    */
    increaseSpeed() {

        this.speed = Math.max(this.speed - Snake.SPEED_INCREMENT, Snake.MAX_SPEED);

    }

    /**
     * Move the snake
     */
    move() {

        // If this is the first move, make sure the game isn't paused
        if (!this.moving) {
            this.moving = true;
            this.game.controls.classList.remove('paused');
        }

        // Calculate the snake's next tile position
        this.stepDirection();

        // If the snake is out of bounds the game is over
        if(!this.isInBounds()) {
            this.game.gameOver();
            return;
        }

        /* 
            Changing the direction after we step slightly increases input lag at low speeds
            but allows us to change direction when we eat
        */
        this.direction = this.nextDirection;

        // Check for collisions

        const cell = this.game.boardCells[this.position['y']][this.position['x']];

        // If the snake has collided with itself the game is over
        if(cell.classList.contains('snake')) {
            this.game.gameOver();
            return;
        }

        if(cell.classList.contains('food')) {
            this.eat(cell);
            // As eating moves the snake forward another step we need to check we're in bounds again
            if(!this.isInBounds()) {
                this.game.gameOver();
                return;
            }
        }

        // Render the new snake
        this.render();

        // Move another step in `this.speed` number of milliseconds
        this.movementTimer = setTimeout(() => { this.move(); }, this.speed);

    }

    /*
        - Turn the cell from food to snake
        - Add the cell to the tail list
        - Step direction to accomodate for the new length of the snake
        - Spawn new food, increase score and speed
    */
    eat(cell) {

        cell.classList.remove('food');
        cell.classList.add('snake');
        this.tail.push(cell);
        this.stepDirection();
        this.game.food.move();
        this.game.increaseScore(1);
        this.increaseSpeed();

    }

    /*
        - Render the snake based on its new position (turn the next cell based on direction into snake and remove the last tail cell)
    */
    render() {

        const newCell = this.game.boardCells[this.position['y']][this.position['x']];
        newCell.classList.add('snake');
        
        this.tail.push(newCell);

        const oldCell = this.tail.shift();
        oldCell.classList.remove('snake');

    }

    /*
        - Returns a boolean that verifies if the snake is still in the grid
    */
    isInBounds() {

        if(this.position['x'] >= SnakeGame.NUM_COLS) {
            return false;
        }else if(this.position['x'] < 0) {
            return false;
        }else if(this.position['y'] >= SnakeGame.NUM_ROWS) {
            return false;
        }else if(this.position['y'] < 0) {
            return false;
        }

        return true;

    }

    /**
     * Set the snake's direction
     */
    setDirection(direction) {

        // Make sure the snake can't go back on itself
        if(['up', 'down'].includes(direction) && ['up', 'down'].includes(this.direction)) {
            return;
        }

        if(['left', 'right'].includes(direction) && ['left', 'right'].includes(this.direction)) {
            return;
        }

        /*  
            Not directly changing the direction means if you accidentally press 2 keys before the snake is moved
            it won't break the going back on itself logic
        */
        this.nextDirection = direction;

    }

    /*
        - Translates the direction words into vector movements 
    */
    stepDirection() {

        switch (this.direction) {
            case 'left':
                this.position['x'] -= 1
                break;

            case 'up':
                this.position['y'] -= 1
                break;

            case 'right':
                this.position['x'] += 1
                break;

            case 'down':
                this.position['y'] += 1
                break;
        }

    }

    /**
     * Pause the snake's movement
     */
    pause() {

        clearTimeout(this.movementTimer);
        this.moving = false;
        this.game.controls.classList.add('paused');

    }

    /**
     * Reset the snake back to the initial defaults
     */
    reset() {

        for (let i = 0; i < this.tail.length; i++) {
            this.tail[i].classList.remove('snake');
        }

        this.tail.length = 0;
        this.direction = 'up';
        this.nextDirection = 'up';
        this.speed = 160;
        this.moving = false;

        this.init();
    }

}

class Food {

    constructor(game) {

        this.game = game;
        this.cell = null;

    }

    /**
     * Place the food randomly on the board, by adding the class 'food' to one of the cells
     */
    move() {

        this.reset();

        const x = Math.floor(Math.random() * SnakeGame.NUM_COLS);
        const y = Math.floor(Math.random() * SnakeGame.NUM_ROWS);
        this.position = { x, y };

        this.cell = this.game.boardCells[y][x];

        if(this.cell.classList.contains('snake')) {
            move();
        }

        this.cell.classList.add('food');

    }

    /*
        - If there is food on the grid; delete it
    */
    reset() {

        if(this.cell) {
            this.cell.classList.remove('food');
        }

    }
}
