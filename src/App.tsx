import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Users, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  Play, 
  Atom,
  Crown
} from 'lucide-react';

// --- Types ---
interface Player {
  id: string;
  name: string;
  score: number;
}

interface Question {
  id: number;
  text: string;
  options: string[];
  summary: string;
}

interface GameState {
  state: 'WAITING' | 'QUESTION' | 'BUZZED' | 'SUMMARY' | 'FINISHED';
  currentQuestionIndex: number;
  questionsCount: number;
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>({ state: 'WAITING', currentQuestionIndex: 0, questionsCount: 0 });
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [buzzedWinner, setBuzzedWinner] = useState<{ playerId: string; playerName: string } | null>(null);
  const [lastResult, setLastResult] = useState<{ correct: boolean; winnerId: string; summary: string | null } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio refs (optional placeholders)
  const buzzSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('playersUpdate', (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    newSocket.on('gameStateUpdate', (gs: GameState) => {
      setGameState(gs);
    });

    newSocket.on('gameStarted', (q: Question) => {
      setCurrentQuestion(q);
      setBuzzedWinner(null);
      setLastResult(null);
    });

    newSocket.on('newQuestion', (q: Question) => {
      setCurrentQuestion(q);
      setBuzzedWinner(null);
      setLastResult(null);
    });

    newSocket.on('buzzerWinner', (winner) => {
      setBuzzedWinner(winner);
    });

    newSocket.on('buzzerReset', (msg) => {
      setBuzzedWinner(null);
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
    });

    newSocket.on('answerResult', (result) => {
      setLastResult(result);
    });

    newSocket.on('gameFinished', () => {
      setBuzzedWinner(null);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && socket) {
      socket.emit('join', name.trim());
      setJoined(true);
    }
  };

  const handleStartGame = () => {
    socket?.emit('startGame');
  };

  const handleBuzz = () => {
    socket?.emit('buzz');
  };

  const handleAnswer = (index: number) => {
    socket?.emit('submitAnswer', index);
  };

  const handleNext = () => {
    socket?.emit('nextQuestion');
  };

  // --- Render Helpers ---

  if (!joined) {
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md w-full border-4 border-blue-400 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-yellow-400 rounded-full opacity-20"></div>
          
          <div className="flex flex-col items-center mb-10 relative z-10">
            <div className="w-20 h-20 bg-yellow-400 rounded-2xl flex items-center justify-center mb-6 shadow-xl border-b-8 border-yellow-600">
              <Atom className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-blue-900 tracking-tighter uppercase italic">原子能小學堂</h1>
            <div className="bg-orange-100 px-4 py-1 rounded-full text-orange-600 font-black text-xs uppercase tracking-widest mt-2">
              ABC 搶答大賽
            </div>
          </div>
          
          <form onSubmit={handleJoin} className="space-y-6 relative z-10">
            <div>
              <label className="block text-sm font-black text-blue-900 mb-2 uppercase tracking-wide">玩家暱稱</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：小明"
                className="w-full px-5 py-4 rounded-2xl border-4 border-slate-100 bg-slate-50 focus:border-blue-400 focus:bg-white outline-none transition-all font-bold text-lg"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-xl border-b-8 border-blue-800 active:border-b-0 active:translate-y-2 text-xl"
            >
              進入遊戲室
            </button>
          </form>

          <div className="mt-10 pt-6 border-t-2 border-slate-100 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
              <Users className="w-4 h-4" /> 目前 {players.length} 位小朋友在線
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yellow-50 flex flex-col font-sans text-slate-800 overflow-hidden">
      {/* Header */}
      <header className="h-20 bg-white border-b-4 border-yellow-200 flex items-center justify-between px-8 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center shadow-lg border-b-4 border-yellow-600">
            <Atom className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-blue-900 leading-none">原子能小學堂</h1>
            <span className="text-orange-500 italic font-black text-xs uppercase tracking-widest">ABC 搶答大賽</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full border-b-4 border-blue-200">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-black text-blue-700 uppercase tracking-tight">{players.length} 在線</span>
          </div>
          <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full border-b-4 border-green-200">
            <Trophy className="w-4 h-4 text-green-600" />
            <span className="text-sm font-black text-green-700">
              {players.find(p => p.id === socket?.id)?.score || 0} 分
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 overflow-hidden">
        {/* Sidebar: Leaderboard */}
        <aside className="w-full md:w-72 bg-white rounded-[2rem] shadow-2xl flex flex-col border-r-4 border-yellow-200 overflow-hidden shrink-0">
          <div className="p-6 bg-blue-500 text-white">
            <h2 className="text-2xl font-black uppercase tracking-tight italic flex items-center gap-2">
              <Crown className="w-6 h-6" /> 玩家排行榜
            </h2>
            <p className="text-blue-100 text-xs font-bold mt-1 uppercase tracking-widest">連線房間：#ATOMIC-88</p>
          </div>
          <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-slate-50/50">
            {players.sort((a, b) => b.score - a.score).map((p, idx) => (
              <motion.div 
                layout
                key={p.id} 
                className={`flex items-center p-3 rounded-2xl border-b-4 transition-all ${
                  p.id === socket?.id 
                    ? 'bg-green-100 border-green-300' 
                    : 'bg-white border-slate-200 opacity-90'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white mr-3 shadow-md ${
                  idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-blue-400' : idx === 2 ? 'bg-orange-400' : 'bg-slate-400'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 font-black text-slate-700 truncate">
                  {p.name} {p.id === socket?.id && '(你)'}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-black shadow-inner whitespace-nowrap ${
                  p.id === socket?.id ? 'bg-white text-green-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {p.score.toLocaleString()}
                </div>
              </motion.div>
            ))}
          </div>
        </aside>

        {/* Center: Game Area */}
        <div className="flex-1 relative flex flex-col">
          <AnimatePresence mode="wait">
            {gameState.state === 'WAITING' ? (
              <motion.div 
                key="waiting"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white rounded-[3rem] border-4 border-yellow-200 shadow-xl"
              >
                <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-8 relative">
                   <Users className="w-12 h-12 text-yellow-500" />
                   <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-full border-4 border-yellow-400 opacity-20"
                   />
                </div>
                <h3 className="text-3xl font-black text-blue-900 mb-4 uppercase tracking-tighter italic">準備好挑戰了嗎？</h3>
                <p className="text-slate-500 mb-10 max-w-sm font-bold text-lg">探索關於放射性、原子與居禮夫人的奇妙知識！</p>
                <button 
                  onClick={handleStartGame}
                  className="bg-red-500 hover:bg-red-600 text-white font-black py-5 px-16 rounded-[2rem] transition-all shadow-2xl border-b-8 border-red-800 active:border-b-0 active:translate-y-2 text-2xl flex items-center gap-3 uppercase tracking-widest"
                >
                  <Play className="w-6 h-6 fill-current" />
                  開始多人搶答
                </button>
              </motion.div>
            ) : gameState.state === 'FINISHED' ? (
              <motion.div 
                key="finished"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white rounded-[3rem] border-4 border-yellow-200 shadow-xl"
              >
                <div className="relative mb-8">
                  <Trophy className="w-24 h-24 text-yellow-400" />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                    className="absolute -inset-4 border-4 border-dashed border-yellow-200 rounded-full"
                  />
                </div>
                <h3 className="text-4xl font-black text-blue-900 mb-4 italic uppercase tracking-tighter">挑戰圓滿結束！</h3>
                <p className="text-slate-500 mb-10 font-bold text-xl">太棒了，你對原子能知識有了更深的了解。</p>
                
                <div className="w-full max-w-sm px-6 py-8 bg-blue-50 rounded-[2rem] mb-10 border-4 border-blue-100 shadow-inner">
                  <h4 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em] mb-6">🏆 最終榮譽榜</h4>
                  {players.sort((a, b) => b.score - a.score).slice(0, 3).map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between mb-4 last:mb-0">
                      <span className={`font-black text-lg ${idx === 0 ? 'text-yellow-600' : 'text-slate-600'}`}>
                        {idx + 1}. {p.name}
                      </span>
                      <span className="font-black text-xl text-blue-900">{p.score} <span className="text-xs">分</span></span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleStartGame}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-black py-4 px-12 rounded-2xl transition-all border-b-8 border-blue-800 active:border-b-0 active:translate-y-2 text-xl"
                >
                  再來一局！
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="game"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col space-y-8"
              >
                {/* Question Section */}
                <div className="w-full bg-white rounded-[3rem] p-10 shadow-xl border-4 border-blue-400 relative overflow-hidden">
                  <div className="absolute -top-6 left-10 bg-blue-500 text-white px-8 py-2 rounded-full font-black text-lg shadow-lg italic uppercase tracking-tight z-10">
                    知識大考驗
                  </div>
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-50 rounded-full opacity-50"></div>
                  
                  <div className="relative z-10">
                    <h3 className="text-3xl font-black text-center leading-relaxed text-slate-700 mb-10">
                      {currentQuestion?.text}
                    </h3>

                    {gameState.state === 'BUZZED' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion?.options.map((opt, idx) => (
                          <motion.button
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={idx}
                            disabled={buzzedWinner?.playerId !== socket?.id}
                            onClick={() => handleAnswer(idx)}
                            className={`
                              p-5 rounded-2xl text-left border-4 transition-all font-black text-xl flex items-center gap-4
                              ${buzzedWinner?.playerId === socket?.id 
                                ? 'bg-blue-50 border-blue-500 text-blue-700 hover:bg-blue-100 hover:scale-[1.02]' 
                                : 'bg-slate-50 border-slate-100 text-slate-300 opacity-50 cursor-not-allowed'}
                            `}
                          >
                            <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${buzzedWinner?.playerId === socket?.id ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-slate-300 border-slate-200'}`}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            {opt}
                          </motion.button>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[120px] items-center">
                         <div className="col-span-1 md:col-span-2 text-center">
                            <p className="text-slate-400 font-black uppercase tracking-[0.4em] italic text-sm animate-pulse">
                              等待玩家按鈴搶答...
                            </p>
                         </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Summary Panel */}
                <AnimatePresence>
                  {gameState.state === 'SUMMARY' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full bg-orange-100 rounded-[2rem] p-8 border-l-8 border-orange-400 flex items-start shadow-inner relative overflow-hidden"
                    >
                      <div className="text-5xl mr-6 filter drop-shadow-md">💡</div>
                      <div className="relative z-10">
                        <h4 className="font-black text-orange-800 text-xl uppercase tracking-tighter mb-2 italic">重點節錄：精彩回顧</h4>
                        <p className="text-orange-700 font-black text-lg leading-snug">
                          {lastResult?.summary}
                        </p>
                        <button 
                          onClick={handleNext}
                          className="mt-6 bg-orange-500 hover:bg-orange-600 text-white font-black py-3 px-10 rounded-xl transition-all shadow-lg border-b-6 border-orange-700 active:border-b-0 active:translate-y-1 flex items-center gap-2 uppercase tracking-widest text-sm"
                        >
                          下一題知識挑戰 <Play className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                      <Atom className="absolute -right-8 -bottom-8 w-48 h-48 text-orange-200 opacity-40 rotate-12" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Buzzer Button Section */}
                {gameState.state === 'QUESTION' && (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleBuzz}
                      className="w-48 h-48 md:w-56 md:h-56 bg-red-500 rounded-full border-b-[16px] border-red-800 flex items-center justify-center active:border-b-0 active:translate-y-4 transition-all shadow-2xl group"
                    >
                      <span className="text-white font-black text-4xl tracking-widest drop-shadow-lg uppercase italic">搶答！</span>
                    </motion.button>
                    <p className="mt-8 font-black text-red-800 animate-pulse text-lg tracking-widest uppercase italic">第一位按下按鈕者獲得回答權！</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Progress Bar */}
          {!['WAITING', 'FINISHED'].includes(gameState.state) && (
            <div className="h-6 bg-slate-200 w-full mt-auto rounded-full overflow-hidden border-2 border-white shadow-inner relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${((gameState.currentQuestionIndex + 1) / gameState.questionsCount) * 100}%` }}
                className="h-full bg-blue-500 relative"
              >
                <div className="absolute -right-3 -top-1 w-8 h-8 bg-white border-4 border-blue-500 rounded-full shadow-md z-10 flex items-center justify-center font-black text-[10px] text-blue-500">
                  {Math.round(((gameState.currentQuestionIndex + 1) / gameState.questionsCount) * 100)}%
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>

      {/* Overlays / Notifications */}
      <AnimatePresence>
        {gameState.state === 'BUZZED' && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-10 py-5 rounded-[2rem] font-black text-xl flex items-center gap-4 shadow-2xl border-4 z-50 uppercase italic tracking-tighter ${
              buzzedWinner?.playerId === socket?.id 
                ? 'bg-yellow-400 text-blue-900 border-yellow-500' 
                : 'bg-blue-900 text-white border-blue-800'
            }`}
          >
            <Zap className="w-8 h-8 fill-current" />
            {buzzedWinner?.playerId === socket?.id ? "你搶到了！請作答" : `[${buzzedWinner?.playerName}] 搶到了！`}
          </motion.div>
        )}

        {lastResult && gameState.state !== 'SUMMARY' && !lastResult.correct && (
          <motion.div 
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-red-900/40 backdrop-blur-md z-[100]"
          >
            <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-8 border-red-500 flex flex-col items-center">
              <XCircle className="w-32 h-32 text-red-500 mb-6" />
              <h3 className="text-5xl font-black text-red-600 uppercase italic tracking-tighter">真可惜，答錯了！</h3>
              <p className="mt-4 text-slate-500 font-bold text-xl uppercase tracking-widest animate-bounce">再接再厲！</p>
            </div>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="fixed top-24 right-6 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl border-l-8 border-yellow-400 z-[101] font-black italic tracking-tight"
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

