# Tri-Dimensional Chess — Ryangineer house rules (v1)

This is a **Star Trek-inspired variant**, not the official tournament rule set. The first release deliberately uses fixed attack boards. The game is local, two-player, no accounts.

## Board
Three 4×4 main platforms at vertical levels z=0,1,2, plus four 2×2 attack platforms, for 64 distinct squares. Main levels use x,y=0..3. Attack boards extend beyond the corners at z=0 or z=2. Every square has a unique (x,y,z) coordinate.

## Pieces and setup
Each player has a king, queen, rook, bishop, knight, and four pawns. White occupies z=0, black z=2. The implementation uses a compact opening deployment; overlapping king/back-rank positions are resolved in favor of the king, yielding three pawns per side and seven initial pieces per side. This is a deliberate simplified opening, not traditional 16-piece chess.

## Movement
* Rook: any distance along exactly one coordinate axis.
* Bishop: any distance along exactly two axes, equal absolute displacement.
* Queen: rook, bishop, or three-axis diagonal (equal displacement along all three).
* King: one step along any combination of the three axes.
* Knight: (2,1,0) coordinate displacement in any permutation/sign, jumping blockers.
* Pawn: one level toward the opponent (white +z, black -z), with unchanged x,y; captures one horizontal square diagonally (x or y changes by one) while moving one level. Reaching the far home level automatically promotes to queen.

Sliding paths must traverse unoccupied intermediate coordinates. Squares absent from the board do not stop a sliding ray; only occupied coordinates do. Pieces can land only on board squares.

## Turns and game end
White moves first. Captures replace the target. Moves leaving your king in check are illegal. Kings cannot be captured. No legal moves in check means checkmate; no legal moves without check means stalemate. No castling, en passant, draw claims, or repetition tracking in v1. Undo restores previous board and turn.

## Known limitations
Stationary attack platforms, simplified setup, no computer opponent or remote multiplayer. 3D geometry uses CSS transforms rather than a WebGL scene. Do not describe this as an official Star Trek chess rules implementation.
