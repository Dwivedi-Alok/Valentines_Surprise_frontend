import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui';
import socketService from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';

const TicTacToe = ({ couple }) => {
  const { user } = useAuth();
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState(null);
  const [status, setStatus] = useState('Waiting for opponent...');
  const [gameCount, setGameCount] = useState(0); // Tracks resets to swap who starts
  
  if (!couple || !couple.user1 || !couple.user2) {
    return <div className="p-4 text-center">Loading game...</div>;
  }

  // Determine role: swap X/O every game reset
  const user1Id = couple.user1?._id || couple.user1;
  const user2Id = couple.user2?._id || couple.user2;
  
  // Even games: user1=X, user2=O | Odd games: user1=O, user2=X
  const rolesSwapped = gameCount % 2 !== 0;
  const myRole = (user._id === user1Id)
    ? (rolesSwapped ? 'O' : 'X')
    : (rolesSwapped ? 'X' : 'O');
  const isMyTurn = (isXNext && myRole === 'X') || (!isXNext && myRole === 'O');

  useEffect(() => {
    const socket = socketService.connect();
    socketService.joinRoom(couple._id);

    socket.on('receive_move', (data) => {
      setBoard(data.board);
      setIsXNext(data.isXNext);
      setWinner(calculateWinner(data.board));
    });

    socket.on('receive_reset', (data) => {
      setBoard(Array(9).fill(null));
      setIsXNext(true);
      setWinner(null);
      setGameCount(data.gameCount ?? 0);
    });

    return () => {
      socket.off('receive_move');
      socket.off('receive_reset');
    };
  }, [couple._id]);

  const handleClick = (index) => {
    if (board[index] || winner || !isMyTurn) return;

    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';

    setBoard(newBoard);
    setIsXNext(!isXNext);
    setWinner(calculateWinner(newBoard));

    socketService.sendMove({
      room: couple._id,
      board: newBoard,
      isXNext: !isXNext,
    });
  };

  const resetGame = () => {
    const nextGameCount = gameCount + 1;
    socketService.resetGame({ room: couple._id, gameCount: nextGameCount });
    // Optimistic update
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setGameCount(nextGameCount);
  };

  const getStatusMessage = () => {
    if (winner) {
      if (winner === myRole) return "🎉 You Won!";
      if (winner === 'Draw') return "🤝 It's a Draw!";
      return "😔 You Lost!";
    }
    if (isMyTurn) return "🟢 Your Turn";
    return `🔴 Waiting for ${myRole === 'X' ? 'O' : 'X'}...`;
  };

  const myLabel = myRole === 'X' ? '❌' : '⭕';
  const partnerLabel = myRole === 'X' ? '⭕' : '❌';

  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="text-2xl font-bold mb-2 text-deep">Tic-Tac-Toe</h2>
      
      <div className="flex items-center gap-4 mb-6 bg-white px-4 py-2 rounded-full shadow-sm">
        <div className={`flex items-center gap-2 ${isMyTurn ? 'font-bold text-rose' : 'text-text-muted'}`}>
          <span className="text-xl">{myLabel}</span> You
        </div>
        <div className="h-4 w-px bg-gray-300"></div>
        <div className={`flex items-center gap-2 ${!isMyTurn ? 'font-bold text-deep' : 'text-text-muted'}`}>
            <span className="text-xl">{partnerLabel}</span> Partner
        </div>
      </div>

      <div className="mb-6 text-xl font-medium text-dark animate-pulse">
        {getStatusMessage()}
      </div>

      {/* Grid Container with Dark Background for Gap Visibility */}
      <div className="grid grid-cols-3 gap-2 bg-rose p-2 rounded-xl shadow-inner">
        {board.map((cell, index) => (
          <button
            key={index}
            disabled={!!cell || !!winner || !isMyTurn}
            className={`
              w-20 h-20 sm:w-24 sm:h-24 text-4xl sm:text-5xl font-bold 
              flex items-center justify-center rounded-lg transition-all transform duration-200
              ${cell 
                ? 'bg-white shadow-sm scale-100' 
                : 'bg-white/90 hover:bg-white hover:scale-105'
              }
              ${!isMyTurn && !cell && !winner ? 'opacity-50 cursor-not-allowed' : ''}
              ${cell === 'X' ? 'text-rose' : 'text-deep'}
            `}
            onClick={() => handleClick(index)}
          >
            {cell}
          </button>
        ))}
      </div>

      <Button onClick={resetGame} className="mt-8" variant="outline">
        Restart Game 🔄
      </Button>
    </div>
  );
};

// Helper function to calculate winner
function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

export default TicTacToe;
