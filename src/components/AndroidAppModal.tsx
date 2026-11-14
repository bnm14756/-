import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  Loader2,
  PackageCheck,
  Play,
  Smartphone,
  Terminal,
  WifiOff,
  X,
} from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 lg:bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-amber-500 text-slate-950 text-xs font-extrabold shadow-xl flex items-center gap-2 whitespace-nowrap"
    >
      <WifiOff size={14} aria-hidden="true" />
      <span>오프라인 모드 — 캐시된 차량 · 휴식 데이터로 동작 중</span>
    </div>
  );
};

interface BuildLogEntry {
  id: string;
  stream: 'stdout' | 'stderr';
  line: string;
}

type BuildPhase = 'idle' | 'building' | 'success' | 'error';

interface AndroidAppModalProps {
  open: boolean;
  onClose: () => void;
  onNotify?: (title: string, message: string, tone: 'success' | 'info' | 'warning') => void;
}

export const AndroidAppModal: React.FC<AndroidAppModalProps> = ({ open, onClose, onNotify }) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [downloadingApk, setDownloadingApk] = useState(false);
  const [downloadingKit, setDownloadingKit] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [buildPhase, setBuildPhase] = useState<BuildPhase>('idle');
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildLogs, setBuildLogs] = useState<BuildLogEntry[]>([]);
  const [builtApkBytes, setBuiltApkBytes] = useState<number | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [buildLogs]);

  useEffect(() => {
    if (!open && eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000';
  const currentUrl =
    typeof window !== 'undefined' ? window.location.href : 'https://localhost:3000/';
  const dummyApkDownloadUrl = '/api/mobile/pleos-guard.apk';
  const apkKitDownloadUrl = `/api/mobile/android-apk-kit.zip?origin=${encodeURIComponent(
    currentOrigin
  )}`;

  const handleInstallWebApk = async () => {
    setInstalling(true);
    try {
      const outcome = await install();
      if (outcome === 'accepted') {
        onNotify?.(
          'Android 앱 설치 완료',
          'Pleos Smart Motion Guard가 기기 앱 서랍에 설치되었습니다.',
          'success'
        );
      } else if (outcome === 'unavailable') {
        onNotify?.(
          '브라우저 메뉴 설치 안내',
          '브라우저 우측 상단 메뉴(⋮)에서 "앱 설치" 또는 "홈 화면에 추가"를 선택해 주세요.',
          'info'
        );
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleDownloadDummyApk = async () => {
    setDownloadingApk(true);
    try {
      const res = await fetch(dummyApkDownloadUrl);
      if (!res.ok) throw new Error('APK download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'pleos-guard.apk';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
      onNotify?.(
        'pleos-guard.apk 다운로드 완료',
        '시뮬레이션 빌드 환경(build-apk.sh)으로 생성된 테스트용 APK 아티팩트가 다운로드되었습니다.',
        'success'
      );
    } catch {
      onNotify?.(
        '다운로드 실패',
        'pleos-guard.apk 파일을 내려받지 못했습니다. 잠시 후 다시 시도해 주세요.',
        'warning'
      );
    } finally {
      setDownloadingApk(false);
    }
  };

  const handleRunSimulatedBuild = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setBuildPhase('building');
    setBuildProgress(10);
    setBuiltApkBytes(null);
    setBuildLogs([
      {
        id: `init-${Date.now()}`,
        stream: 'stdout',
        line: '[build-status] Connecting to Android simulated build runner...',
      },
    ]);

    const es = new EventSource('/api/mobile/build-apk/stream');
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as
          | { type: 'log'; stream: 'stdout' | 'stderr'; line: string }
          | { type: 'done'; exitCode: number; sizeBytes: number };

        if (data.type === 'log') {
          setBuildLogs((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              stream: data.stream,
              line: data.line,
            },
          ]);
          if (data.line.includes('[1/4]')) setBuildProgress(25);
          else if (data.line.includes('[2/4]')) setBuildProgress(50);
          else if (data.line.includes('[3/4]')) setBuildProgress(78);
          else if (data.line.includes('[4/4]')) setBuildProgress(100);
        } else if (data.type === 'done') {
          es.close();
          eventSourceRef.current = null;
          if (data.exitCode === 0) {
            setBuildPhase('success');
            setBuildProgress(100);
            setBuiltApkBytes(data.sizeBytes);
            onNotify?.(
              'APK 빌드 완료 (pleos-guard.apk)',
              `시뮬레이션 빌드가 성공했습니다 (${Math.round(data.sizeBytes / 1024)} KB). 다운로드 버튼으로 내려받으세요.`,
              'success'
            );
          } else {
            setBuildPhase('error');
            onNotify?.(
              'APK 빌드 실패',
              'Build Status 콘솔 로그를 확인해 주세요.',
              'warning'
            );
          }
        }
      } catch {
        // Ignore malformed SSE payload
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setBuildPhase((prev) => (prev === 'building' ? 'error' : prev));
      setBuildLogs((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          stream: 'stderr',
          line: '[build-status] Connection closed during build stream.',
        },
      ]);
    };
  };

  const handleDownloadKit = async () => {
    setDownloadingKit(true);
    try {
      const res = await fetch(apkKitDownloadUrl);
      if (!res.ok) throw new Error('ZIP download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'pleos-motion-guard-android-apk-kit.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
      onNotify?.(
        'Android APK 빌드 키트 다운로드 완료',
        '압축 해제 후 build-apk.sh 실행 또는 PWABuilder에서 서명된 .apk를 생성할 수 있습니다.',
        'success'
      );
    } catch {
      onNotify?.(
        '다운로드 실패',
        'APK 빌드 키트를 내려받지 못했습니다. 잠시 후 다시 시도해 주세요.',
        'warning'
      );
    } finally {
      setDownloadingKit(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentOrigin);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      onNotify?.('앱 URL 복사 완료', `${currentOrigin} 주소가 클립보드에 복사되었습니다.`, 'info');
    } catch {
      onNotify?.('복사 실패', '주소창의 URL을 직접 복사해 주세요.', 'warning');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="android-apk-modal-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-[#121720] border border-white/15 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-gradient-to-r from-[#002C5F] to-[#121720]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Smartphone size={20} className="text-[#7CC4FF]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="android-apk-modal-title"
                className="text-base font-extrabold text-white truncate"
              >
                Android 앱 설치 &amp; APK 다운로드 센터
              </h2>
              <p className="text-xs text-slate-300 truncate">
                WebAPK 즉시 설치 · pleos-guard.apk 아티팩트 · APK 빌드 키트 (.zip)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="창 닫기"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Path 1: Instant Android WebAPK / PWA Install */}
          <section className="rounded-xl bg-[#161D28] border border-emerald-500/30 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PackageCheck size={18} className="text-[#3EE84B]" aria-hidden="true" />
                <h3 className="text-sm font-extrabold text-white">
                  1. Android 스마트폰 즉시 앱 설치 (WebAPK)
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-[#3EE84B] border border-emerald-500/30">
                실제 기기 설치 가능
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Android Chrome에서는 표준 PWA 매니페스트(WebAPK)를 통해 Google Play / APK와 동일하게
              홈 화면 및 앱 서랍에 독립 실행 앱으로 바로 설치됩니다.
            </p>

            {isInstalled ? (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-[#3EE84B]">
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>현재 독립 실행형(Standalone) 앱으로 실행 중입니다.</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5">
                {isInstallable && (
                  <button
                    type="button"
                    disabled={installing}
                    onClick={handleInstallWebApk}
                    className="px-4 py-2.5 rounded-xl bg-[#3EE84B] hover:bg-[#32D43E] disabled:opacity-60 text-[#071809] text-xs font-extrabold flex items-center gap-2 transition-colors"
                  >
                    <Download size={15} aria-hidden="true" />
                    <span>{installing ? '설치 창 여는 중...' : '지금 바로 앱 설치하기'}</span>
                  </button>
                )}

                {isInIframe && (
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-[#0070F3] hover:bg-blue-600 text-white text-xs font-extrabold flex items-center gap-2 transition-colors"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    <span>새 탭에서 열어 바로 설치하기</span>
                  </a>
                )}

                {!isInstallable && !isInIframe && (
                  <div className="w-full rounded-xl bg-black/30 border border-white/10 p-3 text-xs text-slate-200 space-y-1">
                    {isIOS ? (
                      <>
                        <div className="font-bold text-white">iOS Safari 설치 방법</div>
                        <p className="text-slate-300">
                          하단 <strong>공유(□↑)</strong> 버튼 탭 →{' '}
                          <strong>&ldquo;홈 화면에 추가&rdquo;</strong> 선택
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="font-bold text-white">Android Chrome 수동 설치 방법</div>
                        <p className="text-slate-300">
                          우측 상단 <strong>메뉴(⋮)</strong> →{' '}
                          <strong>&ldquo;앱 설치&rdquo;</strong> 또는{' '}
                          <strong>&ldquo;홈 화면에 추가&rdquo;</strong> 선택 시 WebAPK로 자동 설치됩니다.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Path 2: Simulated APK Artifact + Build Status Console + Build Kit (.zip) */}
          <section className="rounded-xl bg-[#161D28] border border-white/12 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileArchive size={18} className="text-[#7CC4FF]" aria-hidden="true" />
                <h3 className="text-sm font-extrabold text-white">
                  2. APK 아티팩트 빌드 &amp; 다운로드 센터
                </h3>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-[#7CC4FF] border border-blue-500/30">
                build-apk.sh · apk/pleos-guard.apk
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              루트 <code className="text-[#7CC4FF]">build-apk.sh</code> 스크립트를 실행해{' '}
              <code className="text-slate-100">apk/pleos-guard.apk</code> 아티팩트를 생성하고
              실시간 빌드 로그를 확인할 수 있습니다. (시뮬레이션 빌드 환경의 테스트용 더미 APK이므로
              실제 단말기 설치는 위 1번 WebAPK 또는{' '}
              <code className="text-[#7CC4FF]">apk/github-workflow-template.yml</code> 기반 서명
              빌드를 이용하세요.)
            </p>

            {/* Build Status Log Console */}
            <div className="rounded-xl bg-[#090D14] border border-white/12 overflow-hidden">
              <div className="px-3.5 py-2 border-b border-white/10 bg-[#0F1622] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-[#7CC4FF]" aria-hidden="true" />
                  <span className="text-xs font-extrabold tracking-wide text-white">
                    Build Status
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {buildPhase === 'building' && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                      <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                      <span>BUILDING · {buildProgress}%</span>
                    </span>
                  )}
                  {buildPhase === 'success' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3EE84B]">
                      <CheckCircle2 size={12} aria-hidden="true" />
                      <span>
                        SUCCESS
                        {builtApkBytes ? ` · ${Math.round(builtApkBytes / 1024)} KB` : ''}
                      </span>
                    </span>
                  )}
                  {buildPhase === 'error' && (
                    <span className="text-[11px] font-bold text-red-400">FAILED</span>
                  )}
                  {buildPhase === 'idle' && (
                    <span className="text-[11px] font-medium text-slate-400">READY</span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1 w-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    buildProgress >= 100
                      ? 'w-full'
                      : buildProgress >= 75
                        ? 'w-3/4'
                        : buildProgress >= 50
                          ? 'w-1/2'
                          : buildProgress >= 25
                            ? 'w-1/4'
                            : buildProgress > 0
                              ? 'w-[10%]'
                              : 'w-0'
                  } ${
                    buildPhase === 'success'
                      ? 'bg-[#3EE84B]'
                      : buildPhase === 'error'
                        ? 'bg-red-500'
                        : 'bg-[#0070F3]'
                  }`}
                />
              </div>

              {/* Scrollable Log Output */}
              <div
                aria-live="polite"
                className="p-3 max-h-44 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1 text-slate-300"
              >
                {buildLogs.length === 0 ? (
                  <div className="text-slate-500">
                    &gt; &ldquo;APK 빌드 실행 (build-apk.sh)&rdquo; 버튼을 누르면 실시간 빌드
                    진행 로그가 여기에 표시됩니다.
                  </div>
                ) : (
                  buildLogs.map((entry) => (
                    <div
                      key={entry.id}
                      className={
                        entry.stream === 'stderr'
                          ? 'text-amber-300'
                          : entry.line.includes('[4/4]') || entry.line.includes('Packaged')
                            ? 'text-[#3EE84B]'
                            : entry.line.startsWith('$ ')
                              ? 'text-[#7CC4FF] font-semibold'
                              : 'text-slate-200'
                      }
                    >
                      {entry.line}
                    </div>
                  ))
                )}
                <div ref={consoleEndRef} />
              </div>
            </div>

            <div className="rounded-xl bg-black/30 border border-white/10 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">패키지에 연결되는 앱 도메인</div>
                <div className="text-xs font-mono text-slate-100 truncate">{currentOrigin}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-100 flex items-center gap-1.5 shrink-0"
              >
                {copiedUrl ? <Check size={13} className="text-[#3EE84B]" /> : <Copy size={13} />}
                <span>{copiedUrl ? '복사됨' : 'URL 복사'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={buildPhase === 'building'}
                onClick={handleRunSimulatedBuild}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 text-xs font-extrabold flex items-center gap-2 transition-colors"
              >
                {buildPhase === 'building' ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Play size={14} aria-hidden="true" />
                )}
                <span>
                  {buildPhase === 'building'
                    ? 'APK 빌드 진행 중...'
                    : 'APK 빌드 실행 (build-apk.sh)'}
                </span>
              </button>

              <button
                type="button"
                disabled={downloadingApk || buildPhase === 'building'}
                onClick={handleDownloadDummyApk}
                className={`px-4 py-2.5 rounded-xl disabled:opacity-60 text-xs font-extrabold flex items-center gap-2 transition-colors ${
                  buildPhase === 'success'
                    ? 'bg-[#3EE84B] hover:bg-[#32D43E] text-[#071809]'
                    : 'bg-[#0070F3] hover:bg-blue-600 text-white'
                }`}
              >
                <Download size={15} aria-hidden="true" />
                <span>
                  {downloadingApk ? 'APK 준비 중...' : 'pleos-guard.apk 다운로드 (테스트용)'}
                </span>
              </button>

              <button
                type="button"
                disabled={downloadingKit}
                onClick={handleDownloadKit}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-950 text-xs font-extrabold flex items-center gap-2 transition-colors"
              >
                <Download size={15} aria-hidden="true" />
                <span>
                  {downloadingKit
                    ? 'APK 빌드 키트 생성 중...'
                    : 'Android APK 빌드 키트 (.zip) 다운로드'}
                </span>
              </button>

              <a
                href="https://www.pwabuilder.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-[#1F2937] hover:bg-slate-700 border border-white/15 text-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink size={14} aria-hidden="true" />
                <span>PWABuilder에서 바로 .apk 패키징</span>
              </a>
            </div>

            <div className="rounded-xl bg-black/25 border border-white/10 p-3 space-y-1.5 text-[11px] text-slate-300">
              <div className="font-bold text-slate-100">ZIP 압축 해제 후 .apk 생성 방법 (택 1)</div>
              <p>
                • <strong className="text-white">방법 A (클라우드 무료 원클릭):</strong> 위{' '}
                <strong>URL 복사</strong> 후 PWABuilder에 붙여넣기 →{' '}
                <em>Package for Stores → Android</em> 선택 시 서명된 <code>.apk</code> /{' '}
                <code>.aab</code> 즉시 다운로드
              </p>
              <p>
                • <strong className="text-white">방법 B (로컬 CLI):</strong> 압축 해제 폴더에서{' '}
                <code className="text-[#7CC4FF]">./build-apk.sh</code> 실행 (Bubblewrap TWA로{' '}
                <code>app-release-signed.apk</code> 자동 빌드)
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
