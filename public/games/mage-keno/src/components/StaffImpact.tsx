import { useEffect, useRef } from 'react';

const IMPACT_WEBM = './assets/staff-impact.webm';
const IMPACT_MP4 = './assets/staff-impact.mp4';
/** Play at 2× so wall-clock duration is half of the source clip. */
const IMPACT_PLAYBACK_RATE = 2;
/** Trim this many seconds of wall-clock time off the end. */
const IMPACT_CUT_WALL_SEC = 2;

type Props = {
  active: boolean;
  onEnded: () => void;
};

/** Firestorm clip played behind the chroma-keyed mage after the staff hit. */
export function StaffImpact({ active, onEnded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const endedRef = useRef(false);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  // Keep the clip decoded so the first active frame isn't a blank load
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!active) {
      endedRef.current = false;
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        /* ignore seek before ready */
      }
      video.playbackRate = 1;
      return;
    }

    endedRef.current = false;

    const finish = () => {
      if (endedRef.current) return;
      endedRef.current = true;
      video.pause();
      onEndedRef.current();
    };

    const onTimeUpdate = () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      // End early so wall-clock runtime is ~CUT seconds shorter
      const endAt = Math.max(0.25, duration - IMPACT_CUT_WALL_SEC * IMPACT_PLAYBACK_RATE);
      if (video.currentTime >= endAt) finish();
    };

    const start = () => {
      video.playbackRate = IMPACT_PLAYBACK_RATE;
      try {
        video.currentTime = 0;
      } catch {
        /* ignore */
      }
      video.play().catch(() => finish());
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    if (video.readyState >= 2) start();
    else video.addEventListener('loadeddata', start, { once: true });

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadeddata', start);
      video.pause();
    };
  }, [active]);

  return (
    <div
      className={`staff-impact${active ? ' is-active' : ''}`}
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        className="staff-impact-video"
        muted
        playsInline
        preload="auto"
        onEnded={() => {
          if (endedRef.current) return;
          endedRef.current = true;
          onEndedRef.current();
        }}
        onError={() => {
          if (endedRef.current) return;
          endedRef.current = true;
          onEndedRef.current();
        }}
      >
        <source src={IMPACT_WEBM} type="video/webm" />
        <source src={IMPACT_MP4} type="video/mp4" />
      </video>
    </div>
  );
}
