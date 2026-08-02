import { useEffect, useRef } from 'react';
import { drawChromaKeyedFrame } from '../utils/chromaKey';

const CLOUD_SRC = './assets/mage-cloud.mp4';

/** Looping cloud backdrop behind the mage — green-screen keyed out. */
export function MageCloud() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const offscreen = document.createElement('canvas');
    offscreenRef.current = offscreen;

    const video = document.createElement('video');
    video.src = CLOUD_SRC;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    videoRef.current = video;
    video.load();

    const tryPlay = () => {
      video.play().catch(() => {});
    };
    video.addEventListener('loadeddata', tryPlay);
    const unlock = () => tryPlay();
    window.addEventListener('pointerdown', unlock, { once: true });

    let raf = 0;
    const tick = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);
      const w = Math.max(1, Math.floor(cssW * dpr));
      const h = Math.max(1, Math.floor(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, w, h);
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (
          vw > 0 &&
          vh > 0 &&
          !video.seeking &&
          video.readyState >= 2
        ) {
          // object-fit: cover into the mage column
          const scale = Math.max(w / vw, h / vh);
          const dw = vw * scale;
          const dh = vh * scale;
          const dx = (w - dw) / 2;
          const dy = (h - dh) / 2;
          drawChromaKeyedFrame(
            ctx,
            video,
            0,
            0,
            vw,
            vh,
            dx,
            dy,
            dw,
            dh,
            offscreen,
            {
              keyR: 25,
              keyG: 225,
              keyB: 13,
              similarity: 0.5,
              blend: 0.05,
              despill: 0.9,
              expandPasses: 4,
              maxKeyWidth: 420,
            },
          );
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      /* tick handles resize */
    });
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointerdown', unlock);
      video.removeEventListener('loadeddata', tryPlay);
      video.pause();
      video.removeAttribute('src');
      video.load();
      videoRef.current = null;
      offscreenRef.current = null;
    };
  }, []);

  return (
    <div ref={wrapRef} className="mage-cloud" aria-hidden="true">
      <canvas ref={canvasRef} className="mage-cloud-canvas" />
    </div>
  );
}
