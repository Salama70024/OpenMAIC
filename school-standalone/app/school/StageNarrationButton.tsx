'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { LoaderCircle, Pause, Volume2 } from 'lucide-react';

type Props = {
  audioId: string;
  className?: string;
  children: ReactNode;
};

export function StageNarrationButton({ audioId, className, children }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [error, setError] = useState('');

  const releaseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.onerror = null;
    audio.onended = null;
    audio.onplaying = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audioRef.current = null;
  }, []);

  useEffect(() => {
    const onStopNarration = () => { releaseAudio(); setStatus('idle'); };
    window.addEventListener('school-stop-narration', onStopNarration);
    return () => {
      window.removeEventListener('school-stop-narration', onStopNarration);
      releaseAudio();
    };
  }, [audioId, releaseAudio]);

  const toggle = () => {
    if (audioRef.current) {
      releaseAudio();
      setStatus('idle');
      return;
    }

    window.dispatchEvent(new Event('school-stop-narration'));
    window.dispatchEvent(new Event('school-stop-live-voice'));
    setError('');
    setStatus('loading');
    window.speechSynthesis?.cancel();
    const audio = new Audio(`/api/school/narration?id=${encodeURIComponent(audioId)}`);
    audioRef.current = audio;
    audio.onplaying = () => setStatus('playing');
    audio.onended = () => { audioRef.current = null; setStatus('idle'); };
    audio.onerror = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setStatus('idle');
        setError('تعذر تشغيل الشرح. تحقق من إعدادات الصوت واتصال الخادم، ثم حاول مجدداً.');
      }
    };
    void audio.play().catch(() => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setStatus('idle');
        setError('لم يسمح المتصفح بتشغيل الصوت. جرّب الضغط على الزر مجدداً.');
      }
    });
  };

  return <>
    <button type="button" className={className} aria-pressed={status !== 'idle'} onClick={toggle}>
      {status === 'loading' ? <LoaderCircle size={16} className="school-spinner" /> : status === 'playing' ? <Pause size={16} /> : <Volume2 size={16} />}
      {status === 'loading' ? 'جارٍ تجهيز الشرح…' : status === 'playing' ? 'إيقاف الشرح' : children}
    </button>
    {error && <p className="school-narration-error" role="alert">{error}</p>}
  </>;
}
