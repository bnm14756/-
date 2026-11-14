import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Coffee,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Timer,
} from 'lucide-react';
import type { RestAreaOption } from '../types/driving';

interface RestCarePanelProps {
  continuousTime: number;
  isResting: boolean;
  restTimer: number;
  restActive: boolean;
  selectedRestArea: RestAreaOption;
  restAreas: RestAreaOption[];
  onSelectRestArea: (area: RestAreaOption) => void;
  onStartRest: () => void;
  onToggleRestPause: () => void;
  onResetRest: () => void;
  onCompleteRestNow: () => void;
}

export function formatDrivingDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}시간 ${String(mins).padStart(2, '0')}분`;
  }
  return `${mins}분 ${String(secs).padStart(2, '0')}초`;
}

export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const RestCarePanel: React.FC<RestCarePanelProps> = ({
  continuousTime,
  isResting,
  restTimer,
  restActive,
  selectedRestArea,
  restAreas,
  onSelectRestArea,
  onStartRest,
  onToggleRestPause,
  onResetRest,
  onCompleteRestNow,
}) => {
  const legalLimitSeconds = 7200; // 2 hours
  const warningThresholdSeconds = 6600; // 1h 50m
  const remainingToLimit = Math.max(legalLimitSeconds - continuousTime, 0);
  const progressPct = Math.min((continuousTime / legalLimitSeconds) * 100, 100);
  const restProgressPct = Math.min(((900 - restTimer) / 900) * 100, 100);

  const isOverLimit = continuousTime >= legalLimitSeconds;
  const isApproachingLimit = continuousTime >= warningThresholdSeconds && !isOverLimit;

  return (
    <section
      aria-label="법정 의무 휴식 케어"
      className="bg-[#111826] border border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-6"
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>법정 의무 휴식 케어</span>
            <span aria-hidden="true">·</span>
            <span>2시간 연속 주행 / 15분 휴식</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-100">
            {isResting
              ? `${selectedRestArea.name} 정차 휴식`
              : isOverLimit
                ? '즉시 휴게소 정차 필요'
                : isApproachingLimit
                  ? '의무 휴식 시간 임박'
                  : '정상 연속 주행 구간'}
          </h2>
        </div>

        <div
          className={`flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
            isResting
              ? 'text-blue-400'
              : isOverLimit
                ? 'text-red-400'
                : isApproachingLimit
                  ? 'text-amber-400'
                  : 'text-emerald-400'
          }`}
        >
          {isResting ? (
            <Coffee size={16} aria-hidden="true" />
          ) : isOverLimit || isApproachingLimit ? (
            <AlertTriangle size={16} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={16} aria-hidden="true" />
          )}
          <span>
            {isResting
              ? restActive
                ? '휴식 카운트 진행 중'
                : '휴식 일시정지'
              : isOverLimit
                ? '법정 기준 초과'
                : isApproachingLimit
                  ? `${Math.ceil(remainingToLimit / 60)}분 내 휴식 권장`
                  : '안전 기준 준수'}
          </span>
        </div>
      </div>

      {/* Main Meter Display */}
      {!isResting ? (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400 mb-1">현재 연속 주행 시간</div>
              <div
                className={`text-3xl font-bold font-mono tabular-nums tracking-tight ${
                  isOverLimit
                    ? 'text-red-400'
                    : isApproachingLimit
                      ? 'text-amber-400'
                      : 'text-slate-100'
                }`}
              >
                {formatDrivingDuration(continuousTime)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 mb-1">법정 한도 잔여</div>
              <div className="text-lg font-semibold font-mono tabular-nums text-slate-300">
                {remainingToLimit > 0 ? formatDrivingDuration(remainingToLimit) : '0분 00초'}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="w-full h-2.5 bg-slate-800 rounded-md overflow-hidden">
              <div
                className={`h-full transition-[width] duration-300 ${
                  isOverLimit
                    ? 'bg-red-500'
                    : isApproachingLimit
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-mono tabular-nums text-slate-400">
              <span>00:00</span>
              <span>권장 알림 01:50</span>
              <span>의무 한도 02:00</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-4 border-y border-slate-800/80 space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs text-blue-400 font-medium mb-1">15분 필수 휴식 잔여 시간</div>
              <div className="text-4xl font-bold font-mono tabular-nums text-slate-50 tracking-tight">
                {formatCountdown(restTimer)}
              </div>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-1">
              <div>완료 보상</div>
              <div className="text-sm font-semibold font-mono tabular-nums text-emerald-400">
                +300 EXP · +3점
              </div>
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded-md overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-[width] duration-300"
              style={{ width: `${restProgressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Nearby Rest Area Selector */}
      <div className="border-t border-slate-800/80 pt-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Navigation size={14} className="text-blue-400" aria-hidden="true" />
            <span>전방 휴게소 경로 안내</span>
          </span>
          <span className="text-slate-400 font-mono tabular-nums">
            {selectedRestArea.highway} · {selectedRestArea.distanceKm}km 전방
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {restAreas.map((area) => {
            const active = area.id === selectedRestArea.id;
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => onSelectRestArea(area)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? 'bg-blue-600/15 border-blue-500/60 text-slate-100'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-semibold truncate">{area.name}</div>
                <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                  {area.distanceKm}km · 충전 {area.evChargersAvailable}대
                  {area.sleepLounge ? ' · 수면실' : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Action Controls */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {!isResting ? (
          <button
            type="button"
            onClick={onStartRest}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[44px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <Timer size={18} aria-hidden="true" />
            <span>{selectedRestArea.name} 도착 — 15분 휴식 시작</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onToggleRestPause}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-2 min-h-[44px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {restActive ? (
                <>
                  <Pause size={16} aria-hidden="true" />
                  <span>휴식 일시정지</span>
                </>
              ) : (
                <>
                  <Play size={16} aria-hidden="true" />
                  <span>휴식 재개</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onResetRest}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-lg border border-slate-800 transition-colors flex items-center justify-center gap-1.5 min-h-[44px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <RotateCcw size={15} aria-hidden="true" />
              <span>취소</span>
            </button>
            <button
              type="button"
              onClick={onCompleteRestNow}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 min-h-[44px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>휴식 완료 처리</span>
            </button>
          </>
        )}
      </div>
    </section>
  );
};
