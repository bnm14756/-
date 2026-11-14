import React from 'react';
import { Fuel, Gauge, Route, ShieldCheck, Zap } from 'lucide-react';

interface TelemetryStripProps {
  driveDistance: number;
  currentSpeed: number;
  fuelPercent: number;
  safetyScore: number;
  harshEvents: number;
  isDriving: boolean;
  isResting: boolean;
}

export const TelemetryStrip: React.FC<TelemetryStripProps> = ({
  driveDistance,
  currentSpeed,
  fuelPercent,
  safetyScore,
  harshEvents,
  isDriving,
  isResting,
}) => {
  const isActivelyMoving = isDriving && !isResting && currentSpeed > 0;
  const isFuelEmpty = fuelPercent <= 0.5;
  const isFuelLow = fuelPercent > 0.5 && fuelPercent <= 20;

  const metrics = [
    {
      label: '금일 누적 주행거리',
      value: `${driveDistance.toFixed(1)} km`,
      sub: isResting ? '휴게소 정차 중' : isDriving ? '경부고속도로 하행 주행' : '대기 상태',
      icon: Route,
      tone: 'text-slate-100',
      showLivePulse: false,
    },
    {
      label: '실시간 주행 속도',
      value: `${isResting || !isDriving ? 0 : currentSpeed} km/h`,
      sub: isResting ? '변속기 P단 · 시동 대기' : isActivelyMoving ? '주행 중 · 정속 크루즈' : '일시 정차',
      icon: Gauge,
      tone: isResting ? 'text-slate-400' : 'text-blue-400',
      showLivePulse: isActivelyMoving,
    },
    {
      label: '잔여 연료 · 에너지',
      value: `${Math.round(fuelPercent)}%`,
      sub: isFuelEmpty
        ? '고갈 · EXP 획득 중단'
        : isFuelLow
          ? '부족 · 주유소 급유 필요'
          : '주유소/휴게소 통과 시 충전',
      icon: Fuel,
      tone: isFuelEmpty
        ? 'text-red-400'
        : isFuelLow
          ? 'text-amber-400'
          : 'text-[#3EE84B]',
      showLivePulse: false,
    },
    {
      label: '안전운전 점수',
      value: `${safetyScore}점`,
      sub: safetyScore >= 90 ? '우수 등급 · EXP +10%' : '주의 구간 감지',
      icon: ShieldCheck,
      tone: safetyScore >= 90 ? 'text-emerald-400' : 'text-amber-400',
      showLivePulse: false,
    },
    {
      label: '급가속 · 급제동',
      value: `${harshEvents}회`,
      sub: harshEvents === 0 ? '관성 충격 0회 달성' : '부드러운 감속 권장',
      icon: Zap,
      tone: harshEvents === 0 ? 'text-emerald-400' : 'text-amber-400',
      showLivePulse: false,
    },
  ];

  return (
    <section
      aria-label="실시간 차량 텔레메트리 요약"
      className={`border rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/90 transition-colors duration-300 ${
        isActivelyMoving ? 'telemetry-active-driving' : 'bg-[#111826] border-slate-800'
      }`}
    >
      {metrics.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                {item.showLivePulse && (
                  <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3EE84B] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3EE84B]" />
                  </span>
                )}
                <span>{item.label}</span>
              </div>
              <div className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${item.tone}`}>
                {item.value}
              </div>
              <div className="text-xs text-slate-400 truncate">{item.sub}</div>
            </div>
            <div
              className={`p-2 rounded-lg border shrink-0 transition-colors ${
                item.showLivePulse
                  ? 'bg-blue-500/15 border-blue-400/40 text-blue-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Icon size={17} aria-hidden="true" />
            </div>
          </div>
        );
      })}
    </section>
  );
};
