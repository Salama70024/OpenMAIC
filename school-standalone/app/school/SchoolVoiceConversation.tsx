'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderCircle, Mic, MicOff, PhoneOff, Radio } from 'lucide-react';
import { buildSchoolVoiceInstructions } from '@/lib/school/voice-instructions';
import { parseSchoolVoiceAction, type SchoolVoiceAction } from '@/lib/school/voice-actions';
import type { LearningSnapshot } from '@/lib/school/assistant-context';

type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking';

type VoiceResources = {
  peer: RTCPeerConnection;
  stream: MediaStream;
  channel: RTCDataChannel;
  player: HTMLAudioElement;
  limitTimer: number | null;
};

const SESSION_LIMIT_MS = 3 * 60 * 1000;

type Props = {
  snapshot: LearningSnapshot;
  enabled: boolean;
  onBegin?: () => void;
  onToolAction: (action: SchoolVoiceAction) => { ok: boolean; message: string };
};

export function SchoolVoiceConversation({ snapshot, enabled, onBegin, onToolAction }: Props) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [muted, setMuted] = useState(false);
  const [message, setMessage] = useState('');
  const resourcesRef = useRef<VoiceResources | null>(null);
  const attemptRef = useRef(0);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const actionRef = useRef(onToolAction);
  actionRef.current = onToolAction;
  const handledCallsRef = useRef(new Set<string>());
  const [toolMessage, setToolMessage] = useState('');

  const stop = useCallback((reason = '') => {
    attemptRef.current += 1;
    const resources = resourcesRef.current;
    resourcesRef.current = null;
    if (resources) {
      if (resources.limitTimer !== null) window.clearTimeout(resources.limitTimer);
      resources.channel.onopen = null;
      resources.channel.onmessage = null;
      resources.channel.onclose = null;
      resources.peer.onconnectionstatechange = null;
      resources.peer.ontrack = null;
      resources.channel.close();
      resources.peer.close();
      resources.stream.getTracks().forEach((track) => track.stop());
      resources.player.pause();
      resources.player.srcObject = null;
    }
    setMuted(false);
    setStatus('idle');
    setMessage(reason);
    setToolMessage('');
    handledCallsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      // Releasing tracks on tab/navigation changes also stops billing for the session.
      stop();
    };
  }, [stop]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && (resourcesRef.current || status === 'connecting')) {
        stop('انتهت المحادثة عند مغادرة الصفحة.');
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [status, stop]);

  useEffect(() => {
    const stopForNarration = () => {
      if (resourcesRef.current || status === 'connecting') stop('أُوقفت المحادثة لتشغيل شرح الدرس.');
    };
    window.addEventListener('school-stop-live-voice', stopForNarration);
    return () => window.removeEventListener('school-stop-live-voice', stopForNarration);
  }, [status, stop]);

  useEffect(() => {
    const channel = resourcesRef.current?.channel;
    if (!channel || channel.readyState !== 'open') return;
    // Changing the illustrated stage must update the live conversation in-place.
    channel.send(JSON.stringify({
      type: 'session.update',
      session: { type: 'realtime', instructions: buildSchoolVoiceInstructions(snapshotRef.current) },
    }));
  }, [snapshot.page, snapshot.pointId, snapshot.mode, snapshot.discoveryShown, snapshot.quizChoice]);

  const start = async () => {
    if (!enabled || status !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
      setMessage('هذا المتصفح لا يدعم المحادثة الصوتية المباشرة، أو لم تُفتح الصفحة باتصال آمن.');
      return;
    }
    const attempt = ++attemptRef.current;
    setStatus('connecting');
    setMessage('');
    setToolMessage('');
    handledCallsRef.current.clear();
    setMuted(false);
    onBegin?.();

    let stream: MediaStream | null = null;
    try {
      const response = await fetch('/api/school/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
        cache: 'no-store',
      });
      const result: { value?: string; model?: string; error?: string } = await response.json();
      if (!response.ok || !result.value || !result.model) {
        throw new Error(result.error || 'تعذر تجهيز المحادثة الصوتية.');
      }
      if (attempt !== attemptRef.current) return;

      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      if (attempt !== attemptRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const peer = new RTCPeerConnection();
      const channel = peer.createDataChannel('oai-events');
      const player = new Audio();
      player.autoplay = true;
      player.onplay = () => { if (attempt === attemptRef.current) setStatus('speaking'); };
      const resources: VoiceResources = { peer, stream, channel, player, limitTimer: null };
      resourcesRef.current = resources;

      peer.ontrack = (event) => {
        if (attempt !== attemptRef.current) return;
        player.srcObject = event.streams[0];
        void player.play().catch(() => {
          if (attempt === attemptRef.current) stop('المتصفح منع تشغيل صوت المعلم. تأكد من السماح بالصوت ثم أعد المحاولة.');
        });
      };
      stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream!));

      channel.onopen = () => {
        if (attempt !== attemptRef.current) return;
        setStatus('listening');
        channel.send(JSON.stringify({
          type: 'session.update',
          session: { type: 'realtime', instructions: buildSchoolVoiceInstructions(snapshotRef.current) },
        }));
      };
      channel.onmessage = (event) => {
        if (attempt !== attemptRef.current) return;
        try {
          const item: {
            type?: string;
            error?: { message?: string };
            response?: { status?: string; output?: Array<{ type?: string; call_id?: string; name?: string; arguments?: string }> };
          } = JSON.parse(event.data);
          if (item.type === 'input_audio_buffer.speech_started') setStatus('listening');
          if (item.type === 'response.created' || item.type === 'response.output_audio.delta') setStatus('speaking');
          if (item.type === 'response.done') {
            setStatus('listening');
            const calls = item.response?.status === 'completed'
              ? (item.response.output ?? []).filter((entry) => entry.type === 'function_call' && typeof entry.call_id === 'string')
              : [];
            if (calls.length && channel.readyState === 'open') {
              void (async () => {
                let processed = 0;
                for (const call of calls) {
                  if (!call.call_id || handledCallsRef.current.has(call.call_id)) continue;
                  handledCallsRef.current.add(call.call_id);
                  const action = parseSchoolVoiceAction(call.name, call.arguments);
                  let result: { ok: boolean; message: string };
                  try {
                    result = action ? actionRef.current(action) : { ok: false, message: 'طلب غير معروف أو خارج محتوى الدرس المسموح.' };
                  } catch {
                    result = { ok: false, message: 'تعذر تنفيذ هذا الإجراء في الصفحة.' };
                  }
                  if (attempt !== attemptRef.current || channel.readyState !== 'open') return;
                  setToolMessage(result.message);
                  channel.send(JSON.stringify({
                    type: 'conversation.item.create',
                    item: { type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(result) },
                  }));
                  processed += 1;
                }
                if (processed && attempt === attemptRef.current && channel.readyState === 'open') {
                  channel.send(JSON.stringify({ type: 'response.create' }));
                }
              })();
            }
          }
          if (item.type === 'error') setMessage('حدث خلل في المحادثة الصوتية. يمكنك إنهاؤها والمحاولة مجدداً.');
        } catch {
          // Ignore unrelated or future event formats.
        }
      };
      peer.onconnectionstatechange = () => {
        if (attempt === attemptRef.current && peer.connectionState === 'failed') {
          stop('انقطع الاتصال الصوتي. تحقق من الإنترنت وحاول مجدداً.');
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const answer = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${result.value}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
        signal: AbortSignal.timeout(20000),
      });
      if (!answer.ok) throw new Error('تعذر إكمال الاتصال الصوتي. قد لا يكون النموذج متاحاً لهذا الحساب.');
      const remoteSdp = await answer.text();
      if (attempt !== attemptRef.current) return;
      await peer.setRemoteDescription({ type: 'answer', sdp: remoteSdp });
      resources.limitTimer = window.setTimeout(() => {
        if (attempt === attemptRef.current) stop('انتهت الجلسة بعد ثلاث دقائق للحد من التكلفة. يمكنك بدء جلسة جديدة.');
      }, SESSION_LIMIT_MS);
    } catch (error) {
      if (attempt !== attemptRef.current) return;
      const description = error instanceof Error ? error.message : 'تعذر تشغيل المحادثة الصوتية.';
      if (resourcesRef.current) stop(description);
      else {
        stream?.getTracks().forEach((track) => track.stop());
        setStatus('idle');
        setMessage(description);
      }
    }
  };

  const toggleMute = () => {
    const tracks = resourcesRef.current?.stream.getAudioTracks();
    if (!tracks?.length) return;
    const shouldMute = !muted;
    tracks.forEach((track) => { track.enabled = !shouldMute; });
    setMuted(shouldMute);
  };

  return <div className="school-live-voice" aria-label="المحادثة الصوتية المباشرة">
    <div className="school-live-voice-heading"><Radio size={16} /><strong>محادثة صوتية مع المعلم</strong></div>
    {status === 'idle' ? (
      <button type="button" className="school-live-voice-start" disabled={!enabled} onClick={() => void start()}>
        <Mic size={17} /> بدء المحادثة
      </button>
    ) : (
      <div className="school-live-voice-actions">
        <span className={`school-live-voice-indicator ${status}`} aria-live="polite">
          {status === 'connecting' ? <LoaderCircle size={15} className="school-spinner" /> : <span aria-hidden="true" />}
          {status === 'connecting' ? 'جارٍ الاتصال…' : status === 'speaking' ? 'المعلم يتحدث' : muted ? 'الميكروفون مكتوم' : 'المعلم يستمع إليك'}
        </span>
        <button type="button" disabled={status === 'connecting'} onClick={toggleMute} aria-pressed={muted} title={muted ? 'تشغيل الميكروفون' : 'كتم الميكروفون'}>
          {muted ? <MicOff size={17} /> : <Mic size={17} />}
        </button>
        <button type="button" className="school-live-voice-end" onClick={() => stop()}><PhoneOff size={16} /> إنهاء</button>
      </div>
    )}
    {message && <p role="status" className="school-live-voice-message">{message}</p>}
    {toolMessage && status !== 'idle' && <p role="status" className="school-live-voice-tool-message">{toolMessage}</p>}
    <small>تحدث بحرية، ويمكنك مقاطعة المعلم. تنتهي الجلسة تلقائياً بعد 3 دقائق.</small>
  </div>;
}
