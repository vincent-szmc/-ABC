import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

// Question Bank based on "原子能 ABC"
const questions = [
  {
    id: 1,
    text: "測量人體接受輻射影響的單位是什麼？",
    options: ["(A) 公斤", "(B) 西弗 (Sv)", "(C) 分貝", "(D) 伏特"],
    answer: 1,
    summary: "輻射計量單位是「西弗 (Sv)」，常用單位為「毫西弗 (mSv)」。"
  },
  {
    id: 2,
    text: "哪位科學家是第一位獲得兩次諾貝爾獎的女性？",
    options: ["(A) 居禮夫人", "(B) 南丁格爾", "(C) 愛因斯坦", "(D) 居禮先生"],
    answer: 0,
    summary: "居禮夫人與其丈夫共同研究放射性，她是歷史上首位兩度獲頒諾貝爾獎的科學家。"
  },
  {
    id: 3,
    text: "搭飛機前往高處時受到的輻射增加，主要是因為？",
    options: ["(A) 飛機引擎", "(B) 飛機餐", "(C) 宇宙射線", "(D) 機場安檢"],
    answer: 2,
    summary: "高度越高，大氣層越薄，來自外太空的「宇宙射線」輻射就會越強。"
  },
  {
    id: 4,
    text: "考古學家利用哪種放射性同位素來鑑定木乃伊年代？",
    options: ["(A) 鉀-40", "(B) 碳-14", "(C) 鈾-235", "(D) 鉛-210"],
    answer: 1,
    summary: "碳-14 是生物體內的天然放射性物質，常用於考古鑑定古物年代。"
  },
  {
    id: 5,
    text: "台灣北投特有的珍貴放射性礦石叫什麼？",
    options: ["(A) 藍寶石", "(B) 玫瑰石", "(C) 北投石 (Hokutolite)", "(D) 大理石"],
    answer: 2,
    summary: "北投石是全世界唯一以台灣地名命名的礦物，具有微弱放射性。"
  },
  {
    id: 6,
    text: "香蕉中含有哪種天然的放射性物質？",
    options: ["(A) 鎂-24", "(B) 鈣-40", "(C) 鉀-40", "(D) 鐵-56"],
    answer: 2,
    summary: "天然放射性物質存在於所有食物中，如香蕉富含鉀-40。"
  },
  {
    id: 7,
    text: "下列哪項不是原子能與輻射的醫療應用？",
    options: ["(A) X光攝影", "(B) 電腦斷層 (CT)", "(C) 注射流感疫苗", "(D) 放射性治療"],
    answer: 2,
    summary: "X光與 CT 是醫療輻射的重要應用，用於疾病診斷與治療。"
  },
  {
    id: 8,
    text: "核能發電的主要優點之一是什麼？",
    options: ["(A) 燃料隨處可得", "(B) 二氧化碳排放極低", "(C) 發電成本完全免費", "(D) 廢棄物可直接回收"],
    answer: 1,
    summary: "低碳發電：核能發電產生的二氧化碳極低，有助於減緩全球暖化。"
  }
];

// Game State
let players: Record<string, { id: string; name: string; score: number }> = {};
let gameState: 'WAITING' | 'QUESTION' | 'BUZZED' | 'SUMMARY' | 'FINISHED' = 'WAITING';
let currentQuestionIndex = 0;
let buzzedPlayerId: string | null = null;
let buzzerTimeLimit: NodeJS.Timeout | null = null;

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("join", (name: string) => {
    players[socket.id] = { id: socket.id, name, score: 0 };
    io.emit("playersUpdate", Object.values(players));
    socket.emit("gameStateUpdate", { state: gameState, currentQuestionIndex, questionsCount: questions.length });
  });

  socket.on("startGame", () => {
    if (gameState === 'WAITING' || gameState === 'FINISHED') {
      gameState = 'QUESTION';
      currentQuestionIndex = 0;
      buzzedPlayerId = null;
      Object.values(players).forEach(p => p.score = 0);
      io.emit("playersUpdate", Object.values(players));
      io.emit("gameStarted", questions[currentQuestionIndex]);
      io.emit("gameStateUpdate", { state: gameState, currentQuestionIndex, questionsCount: questions.length });
    }
  });

  socket.on("buzz", () => {
    if (gameState === 'QUESTION' && !buzzedPlayerId) {
      gameState = 'BUZZED';
      buzzedPlayerId = socket.id;
      io.emit("buzzerWinner", { playerId: socket.id, playerName: players[socket.id]?.name });
      io.emit("gameStateUpdate", { state: gameState, currentQuestionIndex, questionsCount: questions.length });

      // Automatically reset if they don't answer in 10s
      buzzerTimeLimit = setTimeout(() => {
        if (gameState === 'BUZZED' && buzzedPlayerId === socket.id) {
          gameState = 'QUESTION';
          buzzedPlayerId = null;
          io.emit("buzzerReset", "時間到！重新開放搶答。");
          io.emit("gameStateUpdate", { state: gameState, currentQuestionIndex, questionsCount: questions.length });
        }
      }, 10000);
    }
  });

  socket.on("submitAnswer", (answerIndex: number) => {
    if (gameState === 'BUZZED' && buzzedPlayerId === socket.id) {
      if (buzzerTimeLimit) clearTimeout(buzzerTimeLimit);
      
      const correct = questions[currentQuestionIndex].answer === answerIndex;
      if (correct) {
        players[socket.id].score += 10;
        gameState = 'SUMMARY';
        io.emit("answerResult", { correct: true, winnerId: socket.id, summary: questions[currentQuestionIndex].summary });
      } else {
        players[socket.id].score = Math.max(0, players[socket.id].score - 5);
        gameState = 'QUESTION';
        buzzedPlayerId = null;
        io.emit("answerResult", { correct: false, winnerId: socket.id, summary: null });
      }
      
      io.emit("playersUpdate", Object.values(players));
      io.emit("gameStateUpdate", { state: gameState, currentQuestionIndex, questionsCount: questions.length });
    }
  });

  socket.on("nextQuestion", () => {
    if (gameState === 'SUMMARY') {
      currentQuestionIndex++;
      if (currentQuestionIndex < questions.length) {
        gameState = 'QUESTION';
        buzzedPlayerId = null;
        io.emit("newQuestion", questions[currentQuestionIndex]);
      } else {
        gameState = 'FINISHED';
        io.emit("gameFinished");
      }
      io.emit("gameStateUpdate", { state: gameState, currentQuestionIndex, questionsCount: questions.length });
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("playersUpdate", Object.values(players));
    if (Object.keys(players).length === 0) {
      gameState = 'WAITING';
      currentQuestionIndex = 0;
      buzzedPlayerId = null;
    }
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
