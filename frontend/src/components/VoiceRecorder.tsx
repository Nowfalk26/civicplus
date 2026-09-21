import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, RotateCcw, Volume2, AlertCircle } from 'lucide-react';

interface VoiceRecorderProps {
  onAudioRecorded: (audioDataUrl: string | null, durationSeconds: number) => void;
  existingAudioUrl?: string | null;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioRecorded,
  existingAudioUrl = null,
  disabled = false,
}) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'recorded'>(
    existingAudioUrl ? 'recorded' : 'idle'
  );
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl);
  const [duration, setDuration] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        // Convert to base64 Data URL for persistent storage & API payload
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          setAudioUrl(base64Data);
          setStatus('recorded');
          onAudioRecorded(base64Data, duration);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(200); // 200ms time slice
      setStatus('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission was denied. Please allow microphone access in your browser settings.');
      } else {
        setError('Could not access microphone: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleDelete = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setAudioUrl(null);
    setDuration(0);
    setStatus('idle');
    setError(null);
    onAudioRecorded(null, 0);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-emerald-600" />
          Voice Description
        </span>
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Optional voice note</span>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {status === 'idle' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
          <p className="text-xs text-slate-700 dark:text-slate-300 text-center sm:text-left">
            Describe the civic problem by speaking directly. Useful if typing is inconvenient.
          </p>
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow transition-all duration-150 active:scale-95 disabled:opacity-50 shrink-0"
          >
            <Mic className="w-4 h-4" />
            Start Recording
          </button>
        </div>
      )}

      {status === 'recording' && (
        <div className="flex items-center justify-between p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg animate-pulse">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <div>
              <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                Recording audio...
              </span>
              <span className="text-sm font-mono font-bold text-red-800 dark:text-red-300 ml-2">
                {formatTime(duration)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop Recording
          </button>
        </div>
      )}

      {status === 'recorded' && audioUrl && (
        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Voice note captured {duration > 0 ? `(${formatTime(duration)})` : ''}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startRecording}
                disabled={disabled}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 dark:bg-slate-700 rounded transition-colors"
                title="Re-record audio"
              >
                <RotateCcw className="w-3 h-3" />
                Re-record
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={disabled}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/40 rounded transition-colors"
                title="Delete recording"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
          <audio controls src={audioUrl} className="w-full h-9 rounded" />
        </div>
      )}
    </div>
  );
};
