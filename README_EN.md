# Tetris Multiplayer (Tetris 99 Clone)

A multiplayer Tetris game built with Node.js, Socket.io, and HTML5 Canvas, inspired by Tetris 99. Battle against other players, send garbage lines, and be the last one standing!

## Features

- **Real-time Multiplayer**: Play against friends or bots in the same room.
- **Strategic Targeting**: Switch between targeting modes on the fly:
  - **Random**: Target a random opponent.
  - **Attackers**: Target those who are targeting you.
  - **Badges**: Target players with the most badges (kills).
  - **K.O.s**: Target players close to being eliminated.
- **Garbage System**: Clearing lines sends garbage to your targets.
- **Visual Effects**: Particle sparks, hard drop flashes, and 3D-style block rendering.
- **Responsive Layout**: Adaptive interface with mobile touch controls.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- npm (Node Package Manager)

## Quick Start

1. **Clone the repository**

    ```bash
    git clone https://github.com/linyuww/teris.git
    cd teris
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Start the server**

    ```bash
    npm start
    ```

4. **Play the game**

    Open your browser and navigate to `http://localhost:3000`.
    
    - Enter a **Room ID** (e.g., `room1`) and a **Nickname**.
    - Open multiple browser tabs or connect from different devices to the same Room ID to play against each other.

## Controls

### Desktop (Keyboard)

| Key | Action |
| --- | --- |
| **Arrow Left / Right** | Move Piece Left / Right |
| **Arrow Down** | Soft Drop (Faster fall) |
| **Arrow Up** | Rotate Clockwise |
| **Z** | Rotate Counter-Clockwise |
| **Space** | Hard Drop (Instant lock) |
| **C** or **Shift** | Hold Piece |
| **1** | Target: Random |
| **2** | Target: Attackers |
| **3** | Target: Badges |
| **4** | Target: K.O.s |

### Mobile (Touch)

- On-screen buttons are provided for movement, rotation, hard drop, and hold.

## Project Structure

- `src/`: Server-side game logic.
  - `index.js`: Entry point, Socket.io setup.
  - `GameManager.js`: Manages game rooms and loops.
  - `TetrisBoard.js`: Core Tetris logic (grid, movement, clearing).
  - `PlayerController.js`: Handles user input and state.
- `public/`: Client-side static files.
  - `index.html`: Game UI.
  - `client.js`: Rendering and socket events.
  - `style.css`: Styling and layout.

## License

ISC
