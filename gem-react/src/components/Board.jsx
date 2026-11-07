import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { GemEngine } from '../game/engine';

/**
 * 게임 판. 캔버스와 GemEngine 수명을 React 컴포넌트에 묶는다.
 * 부모는 ref로 newGame()과 hint()를 부른다.
 */
const Board = forwardRef(function Board({ onStats, sound }, ref) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  useEffect(() => {
    const engine = new GemEngine(canvasRef.current, {
      onStats: stats => onStatsRef.current?.(stats),
    });
    engineRef.current = engine;
    if (import.meta.env.DEV) window.__gemEngine = engine; // 개발 중 디버깅용
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setSound(sound);
  }, [sound]);

  useImperativeHandle(ref, () => ({
    newGame: () => engineRef.current?.newGame(),
    hint: () => engineRef.current?.showHint(),
  }), []);

  return <canvas ref={canvasRef} className="board" aria-label="보석 게임 판" />;
});

export default Board;
