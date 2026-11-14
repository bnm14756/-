import React from 'react';
import {
  ExternalLink,
  Flag,
  Fuel,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Sparkles,
  TrafficCone,
  Zap,
} from 'lucide-react';
import type { CorridorApiResponse, CorridorNode } from '../types/driving';

interface HighwayTrafficRadarProps {
  corridor: CorridorApiResponse | null;
  loadingTraffic: boolean;
  driveDistance: number;
  fuelPercent: number;
  clearedNodeIds: string[];
  comboCount: number;
  soundEnabled: boolean;
  onRefreshTraffic: () => void;
  onPassNextTollgate: () => void;
  onToggleSound: () => void;
  onTriggerVibrationDemo: () => void;
}

export const HighwayTrafficRadar: React.FC<HighwayTrafficRadarProps> = ({
  corridor,
  loadingTraffic,
  driveDistance,
  fuelPercent,
  clearedNodeIds,
  comboCount,
  soundEnabled,
  onRefreshTraffic,
  onPassNextTollgate,
  onToggleSound,
  onTriggerVibrationDemo,
}) => {
  const nodes: CorridorNode[] = corridor?.nodes ?? [];
  const nextNode =
    nodes.find((node) => !clearedNodeIds.includes(node.id) && node.kmMarker >= driveDistance - 0.5) ??
    nodes.find((node) => !clearedNodeIds.includes(node.id)) ??
    nodes[nodes.length - 1];

  const remainingKm = nextNode ? Math.max(nextNode.kmMarker - driveDistance, 0) : 0;
  const isFuelEmpty = fuelPercent <= 0.5;

  return (
    <section
      aria-label="KTDB 국가교통DB 연동 및 톨게이트 돌파 시스템"
      className="bg-[#12161C] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <TrafficCone size={14} className="text-[#3EE84B]" aria-hidden="true" />
            <span>{corridor?.sourceLabel ?? 'KTDB 국가교통DB (ktdb.go.kr) 수신 중'}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              평균 속도 {corridor?.avgSpeedKmh ?? 86} km/h
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              평균 AADT {(corridor?.avgAadt ?? 131000).toLocaleString()}대/일
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-bold text-white">
              KTDB 국가교통DB 연동 · 톨게이트 &amp; 주유소 스테이지
            </h2>
            <a
              href={corridor?.ktdbPortalUrl ?? 'https://www.ktdb.go.kr/www/index.do'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3EE84B] hover:underline"
            >
              <span>ktdb.go.kr</span>
              <ExternalLink size={11} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[36px] ${
              soundEnabled
                ? 'bg-[#3EE84B]/15 border-[#3EE84B]/40 text-[#3EE84B]'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {soundEnabled ? '효과음 · 진동 ON' : '효과음 OFF'}
          </button>
          <button
            type="button"
            onClick={onRefreshTraffic}
            disabled={loadingTraffic}
            aria-label="KTDB 도로교통 새로고침"
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-slate-200 flex items-center gap-1.5 min-h-[36px] disabled:opacity-50"
          >
            <RefreshCw size={13} className={loadingTraffic ? 'animate-spin' : ''} aria-hidden="true" />
            <span>KTDB 갱신</span>
          </button>
        </div>
      </div>

      {/* Next Tollgate / Gas Station Target Stage Banner */}
      {nextNode && (
        <div className="border-y border-white/10 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#3EE84B]">
              {nextNode.kind === 'gas-station' || nextNode.kind === 'rest-area' ? (
                <Fuel size={13} aria-hidden="true" />
              ) : (
                <Flag size={13} aria-hidden="true" />
              )}
              <span>
                다음 돌파 타겟 (
                {nextNode.kind === 'tollgate'
                  ? '톨게이트'
                  : nextNode.kind === 'gas-station'
                    ? '주유소 · 자동 급유'
                    : nextNode.kind === 'rest-area'
                      ? '휴게소 · 충전 거점'
                      : '분기점'}
                )
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">연속 안전 콤보 {comboCount}x</span>
            </div>
            <div className="text-base sm:text-lg font-extrabold text-white truncate">
              {nextNode.name}
            </div>
            <div className="text-xs text-slate-400">
              {nextNode.subtitle} · KTDB 혼잡강도{' '}
              <span className="font-mono tabular-nums text-slate-200">
                {nextNode.congestionIndex.toFixed(2)}
              </span>{' '}
              · 구간 소통{' '}
              <span
                className={`font-semibold ${
                  nextNode.congestion === '원활'
                    ? 'text-[#3EE84B]'
                    : nextNode.congestion === '서행'
                      ? 'text-amber-400'
                      : 'text-red-400'
                }`}
              >
                {nextNode.congestion} ({nextNode.liveSpeedKmh} km/h)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[11px] text-slate-400">돌파 보상 / 잔여</div>
              <div className="text-sm font-bold font-mono tabular-nums text-[#3EE84B]">
                {isFuelEmpty && !nextNode.fuelBonusPct
                  ? '연료 0% · EXP 잠금'
                  : `+${nextNode.rewardExp} EXP`}
                {nextNode.fuelBonusPct ? ` · 연료 +${nextNode.fuelBonusPct}%` : ''} ·{' '}
                {remainingKm.toFixed(1)} km
              </div>
            </div>
            <button
              type="button"
              onClick={onPassNextTollgate}
              className="px-4 py-2.5 rounded-full bg-[#3EE84B] hover:bg-[#32D43E] text-[#071809] text-xs font-extrabold transition-colors flex items-center gap-1.5 min-h-[42px] whitespace-nowrap"
            >
              <Zap size={14} aria-hidden="true" />
              <span>
                {nextNode.fuelBonusPct ? '주유·휴게소 통과' : '게이트 돌파 테스트'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Highway Route Timeline with KTDB AADT & Fuel Stations */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{corridor?.corridorName ?? '경부고속도로 구간 노드 (KTDB 기준)'}</span>
          <span className="font-mono tabular-nums">
            완료 {clearedNodeIds.length} / {nodes.length} 거점
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {nodes.map((node) => {
            const cleared = clearedNodeIds.includes(node.id);
            const isTarget = nextNode?.id === node.id && !cleared;
            const hasFuel = Boolean(node.fuelBonusPct && node.fuelBonusPct > 0);

            return (
              <div
                key={node.id}
                className={`p-3 rounded-xl border transition-colors ${
                  cleared
                    ? 'bg-[#0E1319] border-emerald-500/30 opacity-75'
                    : isTarget
                      ? 'bg-[#17212C] border-[#3EE84B]'
                      : hasFuel
                        ? 'bg-[#101820] border-sky-500/25'
                        : 'bg-[#0F131A] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                  <span className="text-slate-400">{node.kmMarker.toFixed(1)} km</span>
                  <span
                    className={`font-semibold ${
                      cleared
                        ? 'text-emerald-400'
                        : node.congestion === '원활'
                          ? 'text-[#3EE84B]'
                          : node.congestion === '서행'
                            ? 'text-amber-400'
                            : 'text-red-400'
                    }`}
                  >
                    {cleared ? '통과 완료' : `${node.congestion} ${node.liveSpeedKmh}km/h`}
                  </span>
                </div>
                <div className="text-xs font-bold text-white mt-1 truncate">{node.name}</div>
                <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                  AADT {(node.aadt / 10000).toFixed(1)}만대 · 혼잡 {node.congestionIndex.toFixed(2)}
                </div>
                <div className="text-[11px] font-mono tabular-nums mt-0.5 flex items-center justify-between gap-1">
                  <span className="text-[#3EE84B] inline-flex items-center gap-1">
                    <Sparkles size={11} aria-hidden="true" />
                    <span>+{node.rewardExp} EXP</span>
                  </span>
                  {hasFuel && (
                    <span className="text-sky-400 font-bold inline-flex items-center gap-0.5">
                      <Fuel size={11} aria-hidden="true" />
                      +{node.fuelBonusPct}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-Hour Phone Vibration & Push Rest Trigger */}
      <div className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <Smartphone size={16} className="text-amber-400 shrink-0" aria-hidden="true" />
          <span>
            연속 주행 <strong className="font-mono tabular-nums text-white">2시간</strong> 도달 시
            스마트폰 자동 진동 패턴과 15분 휴식 권장 알림이 전송됩니다.
          </span>
        </div>
        <button
          type="button"
          onClick={onTriggerVibrationDemo}
          className="px-3.5 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 min-h-[38px] whitespace-nowrap"
        >
          <ShieldAlert size={14} aria-hidden="true" />
          <span>2시간 도달 진동 알림 테스트</span>
        </button>
      </div>
    </section>
  );
};
