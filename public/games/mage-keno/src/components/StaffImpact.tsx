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

  useEffect(() => {
    if (!active) {
      endedRef.current = false;
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.currentTime = 0;
        v.playbackRate = 1;
      }
      return;
    }

    endedRef.current = false;
    const video = videoRef.current;
    if (!video) return;

    const finish = () => {
      if (endedRef.current) return;
      endedRef.current = true;
      video.pause();
      onEnded();
    };

    const onTimeUpdate = () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      // End early so wall-clock runtime is ~CUT seconds shorter
      const endAt = Math.max(0.25, duration - IMPACT_CUT_WALL_SEC * IMPACT_PLAYBACK_RATE);
      if (video.currentTime >= endAt) finish();
    };

    video.playbackRate = IMPACT_PLAYBACK_RATE;
    video.currentTime = 0;
    video.addEventListener('timeupdate', onTimeUpdate);
    video.play().catch(() => finish());

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.pause();
    };
  }, [active, onEnded]);

  if (!active) return null;

  return (
    <div className="staff-impact" aria-hidden="true">
      <video
        ref={videoRef}
        className="staff-impact-video"
        muted
        playsInline
        preload="auto"
        onEnded={() => {
          if (endedRef.current) return;
          endedRef.current = true;
          onEnded();
        }}
        onError={() => {
          if (endedRef.current) return;
          endedRef.current = true;
          onEnded();
        }}
      >
        <source src={IMPACT_WEBM} type="video/webm" />
        <source src={IMPACT_MP4} type="video/mp4" />
      </video>
    </div>
  );
}
