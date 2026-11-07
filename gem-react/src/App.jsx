import { useCallback, useEffect, useRef, useState } from 'react';
import Board from './components/Board';
import Hud from './components/Hud';
import ProgressBar from './components/ProgressBar';
import Controls from './components/Controls';
import { BEST_KEY, LEVEL_STEP } from './game/constants';

// 저장소를 쓸 수 없어도 게임은 동작해야 한다 (PRD F-34)
function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch { /* 무시 */ }
}

export default function App() {
  const boardRef = useRef(null);
  const [stats, setStats] = useState({ score: 0, level: 1 });
  const [best, setBest] = useState(loadBest);
  const [sound, setSound] = useState(true);

  const handleStats = useCallback(s => setStats(s), []);

  useEffect(() => {
    if (stats.score > best) {
      setBest(stats.score);
      saveBest(stats.score);
    }
  }, [stats.score, best]);

  const progress = (stats.score - (stats.level - 1) * LEVEL_STEP) / LEVEL_STEP;

  return (
    <main className="app">
      <h1>💎 보석 팡팡</h1>
      <Hud score={stats.score} level={stats.level} best={best} />
      <Board ref={boardRef} onStats={handleStats} sound={sound} />
      <ProgressBar value={progress} />
      <Controls
        onHint={() => boardRef.current?.hint()}
        onNewGame={() => boardRef.current?.newGame()}
        sound={sound}
        onToggleSound={() => setSound(s => !s)}
      />
      <p className="help">
        같은 보석 3개 이상을 가로·세로로, 또는 2×2 사각형으로 맞추세요. 클릭 두 번 또는 드래그로 교환!
      </p>
    </main>
  );
}
