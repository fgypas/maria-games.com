/* Shared juice for Maria's Games: tiny WebAudio synth + particle overlays.
   No assets, no dependencies. Sounds respect one shared mute setting. */
window.FX = (function () {
  let audio = null;
  let muted = localStorage.getItem('mariasound') === 'off';

  function tone(freq, dur, type, gain, when) {
    if (muted) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      const t0 = audio.currentTime + (when || 0);
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(gain || 0.12, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g).connect(audio.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.03);
    } catch (e) { /* no audio available */ }
  }

  const sounds = {
    click:   () => tone(340, 0.06, 'triangle', 0.08),
    pop:     (m) => tone(280 + (m || 0) * 60, 0.12, 'triangle', 0.12),
    thud:    () => tone(110, 0.1, 'square', 0.1),
    whoosh:  () => tone(220, 0.15, 'sawtooth', 0.06),
    chime:   (k) => tone(520 + (k || 0) * 130, 0.18, 'triangle', 0.12),
    blast:   () => { tone(85, 0.28, 'sawtooth', 0.16); tone(150, 0.2, 'square', 0.09, 0.04); },
    buzz:    () => tone(120, 0.2, 'sawtooth', 0.08),
    tick:    () => tone(500, 0.05, 'square', 0.06),
    fanfare: () => [523, 659, 784, 1047].forEach((f, k) => tone(f, 0.16, 'triangle', 0.11, k * 0.09)),
    sad:     () => [330, 262, 196].forEach((f, k) => tone(f, 0.22, 'triangle', 0.11, k * 0.16)),
  };

  function muteButton(btn) {
    const set = () => { btn.textContent = muted ? '🔇' : '🔊'; };
    set();
    btn.addEventListener('click', () => {
      muted = !muted;
      localStorage.setItem('mariasound', muted ? 'off' : 'on');
      set();
    });
  }

  function shake(el) {
    el.classList.remove('fx-shake');
    void el.offsetWidth;
    el.classList.add('fx-shake');
  }

  // Particle overlay canvas inside a position:relative host element.
  function overlay(host) {
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';
    host.appendChild(cv);
    const ctx = cv.getContext('2d');
    let parts = [], on = false, lastT = 0;

    function size() {
      const dpr = window.devicePixelRatio || 1;
      cv.width = host.clientWidth * dpr;
      cv.height = host.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener('resize', size);

    function start() {
      if (!on) { on = true; lastT = 0; requestAnimationFrame(tick); }
    }
    function tick(t) {
      const dt = (lastT ? Math.min(40, t - lastT) : 16) / 16.7;
      lastT = t;
      ctx.clearRect(0, 0, host.clientWidth, host.clientHeight);
      parts = parts.filter(p => (p.life -= 0.018 * dt) > 0);
      parts.forEach(p => {
        if (p.text) {
          p.y -= 0.7 * dt;
          ctx.globalAlpha = Math.min(1, p.life);
          ctx.font = 'bold ' + p.size + 'px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(58,49,69,0.7)';
          ctx.strokeText(p.text, p.x, p.y);
          ctx.fillStyle = '#fff';
          ctx.fillText(p.text, p.x, p.y);
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 0.11 * dt;
          ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      if (parts.length) requestAnimationFrame(tick);
      else { on = false; ctx.clearRect(0, 0, host.clientWidth, host.clientHeight); }
    }

    return {
      boom(x, y, color, n) {
        for (let k = 0; k < (n || 8); k++) {
          const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3.5;
          parts.push({
            x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2,
            r: 2 + Math.random() * 3, life: 1, color: color || '#fff',
          });
        }
        start();
      },
      floatText(x, y, text, sizePx) {
        parts.push({ x, y, text, size: sizePx || 20, life: 1.4 });
        start();
      },
      confetti(n) {
        for (let k = 0; k < (n || 70); k++) {
          parts.push({
            x: Math.random() * host.clientWidth, y: -10 - Math.random() * 40,
            vx: (Math.random() - 0.5) * 1.5, vy: 1 + Math.random() * 2.5,
            r: 2.5 + Math.random() * 3, life: 1.6,
            color: 'hsl(' + Math.floor(Math.random() * 360) + ',85%,65%)',
          });
        }
        start();
      },
    };
  }

  return { tone, sounds, muteButton, shake, overlay };
})();
