// Web Audio 효과음 (PRD F-43, F-54)
export function createSound() {
  let actx = null;
  let enabled = true;
  return {
    setEnabled(v) { enabled = v; },
    beep(freq, dur) {
      if (!enabled) return;
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const o = actx.createOscillator(), gain = actx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
        o.connect(gain);
        gain.connect(actx.destination);
        o.start();
        o.stop(actx.currentTime + dur);
      } catch {
        // 오디오를 쓸 수 없는 환경이면 소리 없이 진행
      }
    },
    close() {
      try { actx?.close(); } catch { /* 무시 */ }
      actx = null;
    },
  };
}
