import React from 'react';
import { Award, CheckCircle2, Flame, Lock, Palette, ShieldCheck, Sparkles } from 'lucide-react';
import { PAINT_OPTIONS, VEHICLE_TIERS, WHEEL_OPTIONS } from '../data/initialData';
import type { PaintOption, VehicleQuest, VehicleTierSpec, WheelOption } from '../types/driving';
import { VehicleIllustration } from './VehicleShowroomStage';

interface VehicleGaragePanelProps {
  totalExp: number;
  highestUnlockedLevel: number;
  equippedLevel: number;
  paint: PaintOption;
  wheel: WheelOption;
  quests: VehicleQuest[];
  onEquipLevel: (level: number) => void;
  onSelectPaint: (paint: PaintOption) => void;
  onSelectWheel: (wheel: WheelOption) => void;
  onClaimQuest: (questId: string) => void;
  onEarnDemoExp: (amount: number) => void;
}

export const VehicleGaragePanel: React.FC<VehicleGaragePanelProps> = ({
  totalExp,
  highestUnlockedLevel,
  equippedLevel,
  paint,
  wheel,
  quests,
  onEquipLevel,
  onSelectPaint,
  onSelectWheel,
  onClaimQuest,
  onEarnDemoExp,
}) => {
  const maxExp = VEHICLE_TIERS[VEHICLE_TIERS.length - 1].requiredTotalExp;
  const overallPct = Math.min((totalExp / maxExp) * 100, 100);

  return (
    <div className="space-y-6">
      {/* 6-Stage Evolution Lineup Card */}
      <section
        aria-label="차종 진화 로드맵"
        className="bg-[#12161C] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-[#3EE84B]">
              안전운전 · 톨게이트 돌파 기반 6단계 차종 진화 라인업
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">
              단계별 다차종 업그레이드 차고
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400">누적 성장 경험치</div>
              <div className="text-base font-bold font-mono tabular-nums text-white">
                {totalExp.toLocaleString()} / {maxExp.toLocaleString()} EXP
              </div>
            </div>
            <button
              type="button"
              onClick={() => onEarnDemoExp(1000)}
              className="px-3.5 py-2 rounded-full bg-[#3EE84B] hover:bg-[#32D43E] text-[#071809] text-xs font-extrabold transition-colors flex items-center gap-1.5 min-h-[40px] whitespace-nowrap"
            >
              <Sparkles size={14} aria-hidden="true" />
              <span>+1,000 EXP 즉시 진화</span>
            </button>
          </div>
        </div>

        {/* Overall Lineup Progress */}
        <div className="space-y-1.5">
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3EE84B] transition-[width] duration-300"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400">
            <span>LV.1 경형 컴팩트</span>
            <span>LV.3 컴팩트 SUV</span>
            <span>LV.5 프리미엄 세단</span>
            <span>LV.6 GT 스포츠카</span>
          </div>
        </div>

        {/* 6 Vehicle Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VEHICLE_TIERS.map((tier: VehicleTierSpec) => {
            const unlocked = tier.level <= highestUnlockedLevel;
            const equipped = tier.level === equippedLevel;

            return (
              <div
                key={tier.level}
                className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-colors ${
                  equipped
                    ? 'bg-[#17202B] border-[#3EE84B]'
                    : unlocked
                      ? 'bg-[#151A22] border-slate-700 hover:border-slate-500'
                      : 'bg-[#0E1117] border-slate-800/80 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-400">
                      LV.{tier.level} · {tier.categoryLabel}
                    </div>
                    <h3 className="text-sm font-bold text-white mt-0.5">{tier.name}</h3>
                  </div>
                  {equipped ? (
                    <span className="text-[11px] font-extrabold text-[#3EE84B] whitespace-nowrap">
                      탑승 중
                    </span>
                  ) : !unlocked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums text-slate-400 whitespace-nowrap">
                      <Lock size={12} aria-hidden="true" />
                      {tier.requiredTotalExp.toLocaleString()}
                    </span>
                  ) : null}
                </div>

                {/* Vehicle Studio Preview */}
                <div className="h-28 w-full flex items-center justify-center rounded-xl bg-gradient-to-b from-[#2A2F37] to-[#111419] px-2">
                  <VehicleIllustration
                    bodyType={tier.bodyType}
                    paint={paint}
                    wheel={wheel}
                    viewAngle="side"
                    doorsOpen={equipped}
                    compact
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-300 leading-snug">{tier.subtitle}</p>
                  <div className="text-[11px] font-mono tabular-nums text-slate-400">
                    전장 {(tier.lengthMm / 1000).toFixed(2)}m · {tier.powerLabel}
                  </div>
                  <div className="text-[11px] text-[#3EE84B] font-medium">
                    혜택: {tier.safetyBonus}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!unlocked || equipped}
                  onClick={() => onEquipLevel(tier.level)}
                  className={`w-full py-2 px-3 rounded-full text-xs font-bold transition-colors min-h-[40px] ${
                    equipped
                      ? 'bg-[#3EE84B]/15 text-[#3EE84B] cursor-default'
                      : unlocked
                        ? 'bg-white hover:bg-slate-200 text-slate-900'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {equipped
                    ? '현재 쇼룸 적용 중'
                    : unlocked
                      ? '이 차량으로 갈아타기'
                      : `${Math.max(tier.requiredTotalExp - totalExp, 0).toLocaleString()} EXP 더 필요`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Level-Locked Paint & Wheel Collection */}
      <section
        aria-label="외장 컬러 및 휠 해금 컬렉션"
        className="bg-[#12161C] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-[#3EE84B] flex items-center gap-1.5">
              <Palette size={13} aria-hidden="true" />
              <span>레벨업 커스터마이징 해금</span>
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">
              외장 컬러 &amp; 휠 업그레이드 컬렉션
            </h3>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            현재 해금 레벨 LV.{highestUnlockedLevel}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Paint Unlocks */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-300">외장 컬러 ({PAINT_OPTIONS.filter((p) => p.unlockLevel <= highestUnlockedLevel).length}/{PAINT_OPTIONS.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PAINT_OPTIONS.map((opt) => {
                const unlocked = opt.unlockLevel <= highestUnlockedLevel;
                const active = opt.id === paint.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectPaint(opt)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-left transition-colors ${
                      active
                        ? 'bg-[#17202B] border-[#3EE84B] text-white'
                        : unlocked
                          ? 'bg-[#0E1117] border-slate-700 text-slate-200 hover:border-slate-500'
                          : 'bg-[#0B0D11] border-slate-800 text-slate-500 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: opt.bodyHex }}
                      />
                      <span className="text-xs font-semibold truncate">{opt.name}</span>
                    </div>
                    {active ? (
                      <span className="text-[11px] font-bold text-[#3EE84B] shrink-0">적용 중</span>
                    ) : !unlocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums text-amber-400 shrink-0">
                        <Lock size={11} aria-hidden="true" />
                        LV.{opt.unlockLevel}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 shrink-0">선택</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wheel Unlocks */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-300">휠 옵션 ({WHEEL_OPTIONS.filter((w) => w.unlockLevel <= highestUnlockedLevel).length}/{WHEEL_OPTIONS.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WHEEL_OPTIONS.map((w) => {
                const unlocked = w.unlockLevel <= highestUnlockedLevel;
                const active = w.id === wheel.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onSelectWheel(w)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-left transition-colors ${
                      active
                        ? 'bg-[#17202B] border-[#3EE84B] text-white'
                        : unlocked
                          ? 'bg-[#0E1117] border-slate-700 text-slate-200 hover:border-slate-500'
                          : 'bg-[#0B0D11] border-slate-800 text-slate-500 opacity-75'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold font-mono tabular-nums">{w.sizeInch}인치</div>
                      <div className="text-[11px] truncate opacity-85">
                        {w.name.replace(`${w.sizeInch}인치 `, '')}
                      </div>
                    </div>
                    {active ? (
                      <span className="text-[11px] font-bold text-[#3EE84B] shrink-0">적용 중</span>
                    ) : !unlocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums text-amber-400 shrink-0">
                        <Lock size={11} aria-hidden="true" />
                        LV.{w.unlockLevel}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 shrink-0">선택</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Growth Quests */}
      <section
        aria-label="실시간 텔레메트리 성장 과제"
        className="bg-[#12161C] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">안전운전 연동 미션</div>
            <h3 className="text-base font-bold text-white">경험치 획득 퀘스트</h3>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            완료 {quests.filter((q) => q.completed).length} / {quests.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quests.map((quest) => {
            const pct = Math.min(Math.round((quest.progress / quest.target) * 100), 100);
            const ready = !quest.completed && quest.progress >= quest.target;

            return (
              <div
                key={quest.id}
                className="p-4 rounded-xl bg-[#0E1117] border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {quest.completed ? (
                      <CheckCircle2 size={18} className="text-[#3EE84B]" aria-hidden="true" />
                    ) : quest.id === 'cruise-100km' ? (
                      <Flame size={18} className="text-amber-400" aria-hidden="true" />
                    ) : quest.id === 'zero-harsh' ? (
                      <ShieldCheck size={18} className="text-blue-400" aria-hidden="true" />
                    ) : (
                      <Award size={18} className="text-[#3EE84B]" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{quest.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{quest.description}</div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-300 mt-1">
                      +{quest.rewardExp} EXP ·{' '}
                      {quest.completed
                        ? '보상 수령 완료'
                        : `${quest.progress.toFixed(0)}/${quest.target}${quest.unit} (${pct}%)`}
                    </div>
                  </div>
                </div>

                {ready && (
                  <button
                    type="button"
                    onClick={() => onClaimQuest(quest.id)}
                    className="px-3 py-2 rounded-full bg-[#3EE84B] hover:bg-[#32D43E] text-[#071809] text-xs font-extrabold whitespace-nowrap shrink-0 min-h-[38px]"
                  >
                    받기
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
