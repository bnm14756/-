import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, AlertTriangle, CheckCircle2, ShieldCheck, TrendingUp } from 'lucide-react';
import { WEEKLY_SAFETY_HISTORY } from '../data/initialData';
import type { DailySafetyMetric } from '../types/driving';

interface SafetyHabitsDashboardProps {
  safetyScore: number;
  harshAccelEvents: number;
  harshBrakeEvents: number;
  driveDistance: number;
  isResting: boolean;
  continuousTime: number;
  onRecordHarshAccel: () => void;
  onRecordHarshBrake: () => void;
  onRecordSmoothCruise: () => void;
}

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

interface CustomChartTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
  unit: string;
}

const ChartTooltipBox: React.FC<CustomChartTooltipProps> = ({
  active,
  payload,
  label,
  unit,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-[#0B0E13] border border-white/15 rounded-xl px-3.5 py-2.5 shadow-2xl text-xs space-y-1">
      <div className="font-bold text-white border-b border-white/10 pb-1">{label}</div>
      {payload.map((entry) => (
        <div key={String(entry.dataKey)} className="flex items-center justify-between gap-4">
          <span className="text-slate-300 flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: entry.color ?? '#3EE84B' }}
            />
            {entry.name}
          </span>
          <span className="font-mono tabular-nums font-bold text-white">
            {entry.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
};

export const SafetyHabitsDashboard: React.FC<SafetyHabitsDashboardProps> = ({
  safetyScore,
  harshAccelEvents,
  harshBrakeEvents,
  driveDistance,
  isResting,
  continuousTime,
  onRecordHarshAccel,
  onRecordHarshBrake,
  onRecordSmoothCruise,
}) => {
  const [comparePrevWeek, setComparePrevWeek] = useState(true);

  const weeklyData: DailySafetyMetric[] = useMemo(() => {
    return WEEKLY_SAFETY_HISTORY.map((item) => {
      if (!item.isToday) return item;
      return {
        ...item,
        safetyScore,
        harshAccel: harshAccelEvents,
        harshBrake: harshBrakeEvents,
        distanceKm: Number(driveDistance.toFixed(1)),
        restCompliant: isResting || continuousTime < 7200,
      };
    });
  }, [safetyScore, harshAccelEvents, harshBrakeEvents, driveDistance, isResting, continuousTime]);

  const summary = useMemo(() => {
    const avgScore =
      weeklyData.reduce((sum, d) => sum + d.safetyScore, 0) / weeklyData.length;
    const prevAvgScore =
      weeklyData.reduce((sum, d) => sum + d.prevWeekScore, 0) / weeklyData.length;
    const scoreDelta = avgScore - prevAvgScore;
    const totalAccel = weeklyData.reduce((sum, d) => sum + d.harshAccel, 0);
    const totalBrake = weeklyData.reduce((sum, d) => sum + d.harshBrake, 0);
    const totalWeeklyKm = weeklyData.reduce((sum, d) => sum + d.distanceKm, 0);
    const compliantDays = weeklyData.filter((d) => d.restCompliant).length;
    const complianceRate = Math.round((compliantDays / weeklyData.length) * 100);

    return {
      avgScore: Number(avgScore.toFixed(1)),
      scoreDelta: Number(scoreDelta.toFixed(1)),
      totalAccel,
      totalBrake,
      totalWeeklyKm: Number(totalWeeklyKm.toFixed(1)),
      complianceRate,
    };
  }, [weeklyData]);

  const coachingHint = useMemo(() => {
    if (summary.totalBrake > summary.totalAccel + 1) {
      return `이번 주 급제동(${summary.totalBrake}회)이 급가속(${summary.totalAccel}회)보다 많습니다. 전방 톨게이트·합류부 진입 500m 전부터 탄력 주행으로 감속하면 안전 점수와 연비가 함께 상승합니다.`;
    }
    if (summary.totalAccel > summary.totalBrake + 1) {
      return `이번 주 급가속(${summary.totalAccel}회) 비중이 높습니다. 정지 후 출발 시 부드러운 가속 페달링을 유지하면 안전 점수 +5점 달성이 가능합니다.`;
    }
    return `주간 평균 안전점수 ${summary.avgScore}점으로 우수 등급(90점 이상)을 안정적으로 유지하고 있습니다. 2시간 의무 휴식 준수율 ${summary.complianceRate}%를 이어가세요.`;
  }, [summary]);

  return (
    <section
      aria-label="운전자 안전 습관 대시보드"
      className="bg-[#12161C] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-6"
    >
      {/* Header & Live Telemetry Simulation Controls */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Activity size={14} className="text-[#3EE84B]" aria-hidden="true" />
            <span>주간 텔레메트리 분석 · 실시간 오늘 데이터 연동</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              주간 누적 {summary.totalWeeklyKm.toLocaleString()} km
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            운전자 안전 습관 대시보드
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRecordHarshAccel}
            className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold min-h-[36px] whitespace-nowrap transition-colors"
          >
            + 급가속 감지 테스트
          </button>
          <button
            type="button"
            onClick={onRecordHarshBrake}
            className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs font-semibold min-h-[36px] whitespace-nowrap transition-colors"
          >
            + 급제동 감지 테스트
          </button>
          <button
            type="button"
            onClick={onRecordSmoothCruise}
            className="px-3 py-1.5 rounded-lg bg-[#3EE84B]/15 hover:bg-[#3EE84B]/25 border border-[#3EE84B]/40 text-[#3EE84B] text-xs font-semibold min-h-[36px] whitespace-nowrap transition-colors"
          >
            정속 안전 보너스 (+2점)
          </button>
        </div>
      </div>

      {/* 4-Column Weekly KPI Summary Strip (Single elevation, hairline dividers) */}
      <div className="border-y border-white/10 grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
        <div className="py-3.5 sm:pr-4 space-y-1">
          <div className="text-xs text-slate-400">주간 평균 안전점수</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono tabular-nums text-white">
              {summary.avgScore}점
            </span>
            <span
              className={`text-xs font-mono tabular-nums font-bold ${
                summary.scoreDelta >= 0 ? 'text-[#3EE84B]' : 'text-red-400'
              }`}
            >
              {summary.scoreDelta >= 0 ? `+${summary.scoreDelta}` : summary.scoreDelta} 전주 대비
            </span>
          </div>
        </div>

        <div className="py-3.5 sm:px-4 space-y-1">
          <div className="text-xs text-slate-400">주간 급가속 빈도</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono tabular-nums text-amber-400">
              {summary.totalAccel}회
            </span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              오늘 {harshAccelEvents}회
            </span>
          </div>
        </div>

        <div className="py-3.5 sm:px-4 space-y-1">
          <div className="text-xs text-slate-400">주간 급제동 빈도</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono tabular-nums text-red-400">
              {summary.totalBrake}회
            </span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              오늘 {harshBrakeEvents}회
            </span>
          </div>
        </div>

        <div className="py-3.5 sm:pl-4 space-y-1">
          <div className="text-xs text-slate-400">2시간 휴식 준수율</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono tabular-nums text-[#3EE84B]">
              {summary.complianceRate}%
            </span>
            <span className="text-xs text-slate-400">최근 7일 기준</span>
          </div>
        </div>
      </div>

      {/* Dual Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Weekly Safety Score Trend */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <TrendingUp size={15} className="text-[#3EE84B]" aria-hidden="true" />
                <span>주간 안전운전 점수 변동 추이</span>
              </h3>
              <p className="text-xs text-slate-400">
                일별 종합 안전점수 및 우수 등급(90점) 기준선
              </p>
            </div>

            <div
              role="tablist"
              aria-label="주간 비교 모드"
              className="inline-flex items-center gap-1 p-1 bg-[#0B0E13] rounded-lg border border-white/10"
            >
              <button
                type="button"
                role="tab"
                aria-selected={comparePrevWeek}
                onClick={() => setComparePrevWeek(true)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  comparePrevWeek
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                전주 비교
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!comparePrevWeek}
                onClick={() => setComparePrevWeek(false)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  !comparePrevWeek
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                금주만 보기
              </button>
            </div>
          </div>

          <div className="h-64 w-full bg-[#0D1117] border border-white/5 rounded-xl p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="safetyScoreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3EE84B" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3EE84B" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#64748B"
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                  axisLine={{ stroke: '#1E293B' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[65, 100]}
                  stroke="#64748B"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltipBox unit="점" />} />
                <ReferenceLine
                  y={90}
                  stroke="#38BDF8"
                  strokeDasharray="4 4"
                  label={{
                    value: '우수 90점',
                    position: 'insideTopRight',
                    fill: '#38BDF8',
                    fontSize: 10,
                  }}
                />
                {comparePrevWeek && (
                  <Area
                    type="monotone"
                    dataKey="prevWeekScore"
                    name="지난주 점수"
                    stroke="#64748B"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    fill="transparent"
                    dot={false}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="safetyScore"
                  name="이번주 점수"
                  stroke="#3EE84B"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#safetyScoreFill)"
                  activeDot={{ r: 5, fill: '#3EE84B', stroke: '#071809', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Weekly Harsh Accel & Brake Frequency */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-amber-400" aria-hidden="true" />
              <span>주간 급가속 · 급제동 발생 빈도</span>
            </h3>
            <p className="text-xs text-slate-400">
              관성 센서 기반 급가속(±3.0m/s²) 및 급제동 이벤트 일별 집계
            </p>
          </div>

          <div className="h-64 w-full bg-[#0D1117] border border-white/5 rounded-xl p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#64748B"
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                  axisLine={{ stroke: '#1E293B' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#64748B"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltipBox unit="회" />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }}
                  iconType="circle"
                />
                <Bar
                  dataKey="harshAccel"
                  name="급가속"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                />
                <Bar
                  dataKey="harshBrake"
                  name="급제동"
                  fill="#EF4444"
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Actionable Driving Habit Diagnostic Footer */}
      <div className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 text-xs text-slate-300">
          {summary.totalAccel + summary.totalBrake <= 8 ? (
            <CheckCircle2 size={16} className="text-[#3EE84B] shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
          ) : (
            <ShieldCheck size={16} className="text-amber-400 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
          )}
          <p className="leading-relaxed">{coachingHint}</p>
        </div>
        <span className="text-[11px] font-mono tabular-nums text-slate-400 whitespace-nowrap">
          오늘 주행 {driveDistance.toFixed(1)} km 실시간 반영 중
        </span>
      </div>
    </section>
  );
};
