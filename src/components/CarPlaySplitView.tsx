import React from 'react';
import {
  Coffee,
  Flag,
  Navigation,
  Pause,
  PictureInPicture2,
  Play,
  SkipForward,
  Smartphone,
  Zap,
} from 'lucide-react';
import type {
  CorridorApiResponse,
  PaintOption,
  SongTrack,
  VehicleTierSpec,
  WeatherApiResponse,
  WheelOption,
} from '../types/driving';
import { HyundaiBrandMark } from './HyundaiBrandMark';
import { formatDrivingDuration } from './RestCarePanel';
import { VehicleIllustration } from './VehicleShowroomStage';

interface CarPlaySplitViewProps {
  corridor: CorridorApiResponse | null;
  weather: WeatherApiResponse | null;
  driveDistance: number;
  continuousTime: number;
  currentSpeed: number;
  fuelPercent: number;
  safetyScore: number;
  clearedNodeIds: string[];
  equippedVehicle: VehicleTierSpec;
  totalExp: number;
  paint: PaintOption;
  wheel: WheelOption;
  isResting: boolean;
  restTimer: number;
  activeTrack: SongTrack | undefined;
  isPlaying: boolean;
  floatingWidgetOpen: boolean;
  onStartRest: () => void;
  onPassNextTollgate: () => void;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onToggleFloatingWidget: () => void;
  onOpenPopoutPiP: () => void;
}

export const CarPlaySplitView: React.FC<CarPlaySplitViewProps> = ({
  corridor,
  weather,
  driveDistance,
  continuousTime,
  currentSpeed,
  fuelPercent,
  safetyScore,
  clearedNodeIds,
  equippedVehicle,
  totalExp,
  paint,
  wheel,
  isResting,
  restTimer,
  activeTrack,
  isPlaying,
  floatingWidgetOpen,
  onStartRest,
  onPassNextTollgate,
  onTogglePlay,
  onNextTrack,
  onToggleFloatingWidget,
  onOpenPopoutPiP,
}) => {
  const nodes = corridor?.nodes ?? [];
  const nextNode =
    nodes.find((n) => !clearedNodeIds.includes(n.id) && n.kmMarker >= driveDistance - 0.5) ??
    nodes[nodes.length - 1];
  const distToNext = nextNode ? Math.max(nextNode.kmMarker - driveDistance, 0) : 0;

  const restPct = Math.min((continuousTime / 7200) * 100, 100);
  const needsRestSoon = continuousTime >= 6600;

  return (
    <section aria-label="애플 카플레이 및 내비게이션 사이드 위젯 뷰" className="space-y-5">
      {/* Controls Bar */}
      <div className="bg-[#12161C] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-[#3EE84B]">
            Apple CarPlay Split-Screen · 내비게이션 사이드 미니 창 연동
          </div>
          <h2 className="text-lg font-bold text-white">
            차량 내비게이션 옆 자그만 플로팅 케어 창
          </h2>
          <p className="text-xs text-slate-400">
            운전 중 시야를 가리지 않도록 내비게이션 우측 35% 영역 또는 별도 작은 창(PiP)으로
            휴식·톨게이트 EXP·음악을 동시에 표시합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleFloatingWidget}
            className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 min-h-[40px] ${
              floatingWidgetOpen
                ? 'bg-[#3EE84B] text-[#071809] border-[#3EE84B]'
                : 'bg-slate-900 text-white border-white/15 hover:bg-slate-800'
            }`}
          >
            <Smartphone size={14} aria-hidden="true" />
            <span>{floatingWidgetOpen ? '미니 창 켜짐 (전체 탭 유지)' : '미니 창 화면에 띄우기'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenPopoutPiP}
            className="px-3.5 py-2 rounded-full bg-[#0070F3] hover:bg-[#0060D0] text-white text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[40px]"
          >
            <PictureInPicture2 size={14} aria-hidden="true" />
            <span>독립 작은 창(PiP) 열기</span>
          </button>
        </div>
      </div>

      {/* Widescreen Apple CarPlay Bezel Simulator */}
      <div className="rounded-3xl bg-[#07090D] border-4 border-[#202631] p-3 sm:p-4 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[420px]">
          {/* CarPlay Left Dock Strip (1 col on lg) */}
          <div className="hidden lg:flex lg:col-span-1 flex-col items-center justify-between py-4 px-2 rounded-2xl bg-[#10141C] border border-white/5">
            <div className="space-y-3 flex flex-col items-center">
              <div className="text-xs font-mono tabular-nums font-bold text-white">17:45</div>
              <div className="text-[10px] font-mono text-[#3EE84B]">5G</div>
            </div>
            <div className="flex flex-col gap-3 items-center">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Navigation size={18} aria-hidden="true" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#3EE84B] text-[#071809] flex items-center justify-center">
                <Coffee size={18} aria-hidden="true" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 grid grid-cols-2 gap-0.5 p-2">
              <span className="bg-slate-300 rounded-xs" />
              <span className="bg-slate-300 rounded-xs" />
              <span className="bg-slate-300 rounded-xs" />
              <span className="bg-slate-300 rounded-xs" />
            </div>
          </div>

          {/* Left 7 Cols: Live Turn-by-Turn Highway Navigation Map */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0F1722] border border-white/10 relative overflow-hidden flex flex-col justify-between p-5">
            {/* Top Turn Banner */}
            <div className="relative z-10 flex items-center justify-between gap-3 bg-[#102A1E]/95 border border-emerald-500/40 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3EE84B] text-[#071809] flex items-center justify-center shrink-0">
                  <Navigation size={20} aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xs font-mono tabular-nums text-[#3EE84B] font-bold">
                    {distToNext.toFixed(1)} km 전방 · {nextNode?.congestion ?? '원활'} ·{' '}
                    {weather?.label ?? '맑음'}
                  </div>
                  <div className="text-base font-extrabold text-white">
                    {nextNode ? `${nextNode.name} 방면 직진` : '경부고속도로 본선 주행'}
                  </div>
                </div>
              </div>
              <div className="text-right font-mono tabular-nums">
                <div className="text-2xl font-extrabold text-white">
                  {isResting ? 0 : currentSpeed}
                </div>
                <div className="text-[10px] text-slate-400">
                  권장 {weather?.safeSpeedLimitKmh ?? 100}km/h
                </div>
              </div>
            </div>

            {/* Interactive SVG Navigation Corridor Map */}
            <div className="my-4 relative h-52 rounded-xl bg-[#0A1019] border border-white/5 overflow-hidden">
              <svg viewBox="0 0 600 220" className="w-full h-full" aria-label="고속도로 실시간 내비게이션 맵">
                {/* Map grid roads */}
                <path d="M 0 60 L 600 40" stroke="#1E293B" strokeWidth="4" />
                <path d="M 0 165 L 600 185" stroke="#1E293B" strokeWidth="4" />
                <path d="M 180 0 L 140 220" stroke="#1E293B" strokeWidth="3" />
                <path d="M 430 0 L 470 220" stroke="#1E293B" strokeWidth="3" />

                {/* Highway Main Path with Live Traffic Color Segments */}
                <path
                  d="M 40 190 Q 200 155 310 110 T 560 32"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <path
                  d="M 40 190 Q 150 164 240 136"
                  fill="none"
                  stroke="#3EE84B"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M 240 136 Q 350 96 420 74"
                  fill="none"
                  stroke={nextNode?.congestion === '정체' ? '#EF4444' : nextNode?.congestion === '서행' ? '#F59E0B' : '#3EE84B'}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M 420 74 Q 490 52 560 32"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                {/* Player Vehicle Arrow */}
                <g transform="translate(220, 140) rotate(-22)">
                  <circle cx="0" cy="0" r="16" fill="#3B82F6" fillOpacity="0.25" />
                  <polygon points="0,-11 9,9 0,5 -9,9" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />
                </g>

                {/* Next Tollgate Target Pin */}
                <g transform="translate(415, 75)">
                  <circle cx="0" cy="0" r="14" fill="#3EE84B" fillOpacity="0.25" />
                  <circle cx="0" cy="0" r="7" fill="#3EE84B" />
                  <rect x="-45" y="-34" width="110" height="22" rx="11" fill="#111827" stroke="#3EE84B" strokeWidth="1" />
                  <text
                    x="10"
                    y="-20"
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#FFFFFF"
                  >
                    {nextNode ? `${nextNode.name.split(' ')[0]} +${nextNode.rewardExp}EXP` : '다음 게이트'}
                  </text>
                </g>
              </svg>
            </div>

            {/* Bottom Navigation ETA Strip */}
            <div className="flex items-center justify-between text-xs text-slate-300 font-mono tabular-nums">
              <span>{corridor?.corridorName ?? '경부고속도로'}</span>
              <span>누적 {driveDistance.toFixed(1)} km · 안전점수 {safetyScore}점</span>
            </div>
          </div>

          {/* Right 4 Cols: THE COMPACT SIDE MINI-WINDOW (네비 옆 자그만 창) */}
          <div className="lg:col-span-4 rounded-2xl bg-[#161B24] border border-white/15 p-4 flex flex-col justify-between gap-3.5">
            {/* Compact Vehicle & Evolution Row */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
              <div className="min-w-0 space-y-0.5">
                <HyundaiBrandMark size="sm" showWordmark={false} />
                <div className="text-[11px] font-mono tabular-nums text-[#3EE84B] font-bold">
                  LV.{equippedVehicle.level} · {totalExp.toLocaleString()} EXP · 연료 {Math.round(fuelPercent)}%
                </div>
                <div className="text-xs font-bold text-white truncate">
                  {equippedVehicle.name}
                </div>
              </div>
              <div className="w-20 h-11 shrink-0">
                <VehicleIllustration
                  bodyType={equippedVehicle.bodyType}
                  paint={paint}
                  wheel={wheel}
                  viewAngle="side"
                  doorsOpen={false}
                  compact
                />
              </div>
            </div>

            {/* Compact 2-Hour Rest Guard */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">2시간 의무 휴식</span>
                <span
                  className={`font-mono tabular-nums font-bold ${
                    isResting
                      ? 'text-blue-400'
                      : needsRestSoon
                        ? 'text-amber-400'
                        : 'text-[#3EE84B]'
                  }`}
                >
                  {isResting
                    ? `휴식 ${Math.floor(restTimer / 60)}:${String(restTimer % 60).padStart(2, '0')}`
                    : formatDrivingDuration(continuousTime)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-[width] ${
                    needsRestSoon ? 'bg-amber-400' : 'bg-[#3EE84B]'
                  }`}
                  style={{ width: `${restPct}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onStartRest}
                  className="py-2 px-2.5 rounded-xl bg-[#3EE84B] hover:bg-[#32D43E] text-[#071809] text-xs font-extrabold flex items-center justify-center gap-1 min-h-[38px]"
                >
                  <Coffee size={13} aria-hidden="true" />
                  <span>15분 휴식</span>
                </button>
                <button
                  type="button"
                  onClick={onPassNextTollgate}
                  className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-white/10 flex items-center justify-center gap-1 min-h-[38px]"
                >
                  <Zap size={13} className="text-[#3EE84B]" aria-hidden="true" />
                  <span>TG 돌파</span>
                </button>
              </div>
            </div>

            {/* Compact Tollgate Next Gate Target */}
            {nextNode && (
              <div className="p-2.5 rounded-xl bg-[#0E131B] border border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Flag size={14} className="text-[#3EE84B] shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white truncate">{nextNode.name}</div>
                    <div className="text-[10px] font-mono tabular-nums text-slate-400">
                      {distToNext.toFixed(1)} km 남음 · {nextNode.congestion}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono tabular-nums font-bold text-[#3EE84B] shrink-0">
                  +{nextNode.rewardExp}
                </span>
              </div>
            )}

            {/* Compact Co-Pilot Music Strip */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400">동승자 공동 뮤직</div>
                <div className="text-xs font-semibold text-white truncate">
                  {activeTrack ? `${activeTrack.title} · ${activeTrack.artist}` : '재생 대기'}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onTogglePlay}
                  aria-label={isPlaying ? '일시정지' : '재생'}
                  className="w-8 h-8 rounded-lg bg-white text-slate-900 flex items-center justify-center"
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  type="button"
                  onClick={onNextTrack}
                  aria-label="다음 곡"
                  className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center"
                >
                  <SkipForward size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
