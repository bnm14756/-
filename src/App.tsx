import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  CarFront,
  CheckCircle2,
  Coffee,
  FastForward,
  Home,
  Music,
  Navigation,
  Pause,
  PictureInPicture2,
  Play,
  Smartphone,
  Timer,
  Vibrate,
  X,
} from 'lucide-react';
import { CarPlaySplitView } from './components/CarPlaySplitView';
import { CoPilotMusicPanel } from './components/CoPilotMusicPanel';
import { DriveLogTable } from './components/DriveLogTable';
import { FloatingNavWidget } from './components/FloatingNavWidget';
import { HighwayTrafficRadar } from './components/HighwayTrafficRadar';
import { HyundaiBrandMark } from './components/HyundaiBrandMark';
import { RestCarePanel, formatDrivingDuration } from './components/RestCarePanel';
import { SafetyHabitsDashboard } from './components/SafetyHabitsDashboard';
import { SocialFuelCrewPanel } from './components/SocialFuelCrewPanel';
import { TelemetryStrip } from './components/TelemetryStrip';
import { VehicleGaragePanel } from './components/VehicleGaragePanel';
import { VehicleShowroomStage } from './components/VehicleShowroomStage';
import { WeatherAlertBanner } from './components/WeatherAlertBanner';
import {
  INITIAL_DRIVE_LOGS,
  INITIAL_PLAYLIST,
  INITIAL_QUESTS,
  NEARBY_REST_AREAS,
  PAINT_OPTIONS,
  VEHICLE_TIERS,
  WHEEL_OPTIONS,
} from './data/initialData';
import type {
  CorridorApiResponse,
  CorridorNode,
  CrewMember,
  DriveLogEntry,
  FuelTransferLog,
  PaintOption,
  ParticipantRole,
  RestAreaOption,
  SongTrack,
  ToastNotice,
  VehicleQuest,
  WeatherApiResponse,
  WeatherCondition,
  WheelOption,
  WorkspaceTab,
} from './types/driving';
import {
  playCockpitChime,
  sendRestPushNotification,
  triggerPhoneVibration,
} from './utils/hapticAlert';

const NAV_ITEMS: { id: WorkspaceTab; label: string }[] = [
  { id: 'showroom', label: '쇼룸' },
  { id: 'carplay', label: '카플레이' },
  { id: 'habits', label: '안전습관' },
  { id: 'rest', label: '휴식케어' },
  { id: 'garage', label: '진화차고' },
  { id: 'music', label: '동승뮤직' },
  { id: 'logs', label: '운행기록' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('showroom');

  // 1. Vehicle SDK & Live Highway Traffic telemetry state
  const [driveDistance, setDriveDistance] = useState(142.5);
  const [continuousTime, setContinuousTime] = useState(6840); // 1h 54m
  const [currentSpeed, setCurrentSpeed] = useState(88);
  const [safetyScore, setSafetyScore] = useState(94);
  const [harshAccelEvents, setHarshAccelEvents] = useState(0);
  const [harshBrakeEvents, setHarshBrakeEvents] = useState(0);
  const harshEvents = harshAccelEvents + harshBrakeEvents;
  const [isDrivingSimActive, setIsDrivingSimActive] = useState(true);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState<1 | 60>(1);

  // Live Traffic Corridor & Tollgate Stage Clear state
  const [corridor, setCorridor] = useState<CorridorApiResponse | null>(null);
  const [loadingTraffic, setLoadingTraffic] = useState(false);
  const [clearedNodeIds, setClearedNodeIds] = useState<string[]>([
    'seoul-tg',
    'singal-jc',
    'giheung-sa',
  ]);
  const [comboCount, setComboCount] = useState(3);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 2-hour vibration alert & CarPlay floating mini-window state
  const [twoHourAlertVisible, setTwoHourAlertVisible] = useState(false);
  const [isVibratingVisual, setIsVibratingVisual] = useState(false);
  const [floatingWidgetOpen, setFloatingWidgetOpen] = useState(false);
  const twoHourAlertTriggeredRef = useRef(false);

  // 2. Multi-vehicle evolution state: LV.1 small compact car -> LV.6 GT sports car
  const [totalExp, setTotalExp] = useState(420);
  const [equippedLevel, setEquippedLevel] = useState(1);
  const [selectedPaint, setSelectedPaint] = useState<PaintOption>(PAINT_OPTIONS[0]);
  const [selectedWheel, setSelectedWheel] = useState<WheelOption>(WHEEL_OPTIONS[0]);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [doorsAndLightsOpen, setDoorsAndLightsOpen] = useState(false);
  const [quests, setQuests] = useState<VehicleQuest[]>(INITIAL_QUESTS);

  // 3. Statutory 2h/15m rest timer state
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(900);
  const [restActive, setRestActive] = useState(false);
  const [selectedRestArea, setSelectedRestArea] = useState<RestAreaOption>(NEARBY_REST_AREAS[0]);

  // 4. Co-Pilot passenger connect & shared music state
  const [passengerConnected, setPassengerConnected] = useState(true);
  const [currentGenre, setCurrentGenre] = useState('신나는 드라이브 K-POP');
  const [playlist, setPlaylist] = useState<SongTrack[]>(INITIAL_PLAYLIST);
  const [activeTrackId, setActiveTrackId] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);

  // 5. Drive log & in-app notifications
  const [driveLogs, setDriveLogs] = useState<DriveLogEntry[]>(INITIAL_DRIVE_LOGS);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  // 6. Fuel energy (0% blocks EXP), Weather Advisory & Social Fuel Gifting Crew
  const [fuelPercent, setFuelPercent] = useState(68);
  const fuelPercentRef = useRef(68);
  const lowFuelWarnedRef = useRef(false);
  const emptyFuelWarnedRef = useRef(false);

  const [weather, setWeather] = useState<WeatherApiResponse | null>(null);
  const [weatherOverride, setWeatherOverride] = useState<WeatherCondition | 'live'>('live');
  const [loadingWeather, setLoadingWeather] = useState(false);

  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [transferLogs, setTransferLogs] = useState<FuelTransferLog[]>([
    {
      id: 'init-tx-1',
      fromName: '그랜저_대전장거리',
      toName: '내 차량',
      amountPct: 20,
      expBonus: 0,
      timestamp: '17:32',
      direction: 'received',
    },
  ]);
  const [sendingToId, setSendingToId] = useState<string | null>(null);
  const [requestingFuel, setRequestingFuel] = useState(false);

  useEffect(() => {
    fuelPercentRef.current = fuelPercent;
    if (fuelPercent > 20) {
      lowFuelWarnedRef.current = false;
      emptyFuelWarnedRef.current = false;
    } else if (fuelPercent > 0.5) {
      emptyFuelWarnedRef.current = false;
    }
  }, [fuelPercent]);

  const highestUnlockedLevel = useMemo(() => {
    let unlocked = 1;
    for (const tier of VEHICLE_TIERS) {
      if (totalExp >= tier.requiredTotalExp) unlocked = tier.level;
    }
    return unlocked;
  }, [totalExp]);

  const equippedVehicle = useMemo(
    () => VEHICLE_TIERS.find((t) => t.level === equippedLevel) ?? VEHICLE_TIERS[0],
    [equippedLevel]
  );

  const activeTrack = useMemo(
    () => playlist.find((t) => t.id === activeTrackId) ?? playlist[0],
    [playlist, activeTrackId]
  );

  const nextCorridorNode = useMemo(() => {
    const nodes = corridor?.nodes ?? [];
    return (
      nodes.find((n) => !clearedNodeIds.includes(n.id) && n.kmMarker >= driveDistance - 0.5) ??
      nodes.find((n) => !clearedNodeIds.includes(n.id)) ??
      nodes[nodes.length - 1]
    );
  }, [corridor, clearedNodeIds, driveDistance]);

  const distToNextNodeKm = nextCorridorNode
    ? Math.max(nextCorridorNode.kmMarker - driveDistance, 0)
    : 0;

  const pushToast = useCallback(
    (title: string, message: string, tone: ToastNotice['tone'] = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-2), { id, title, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 5000);
    },
    []
  );

  const fetchCorridorTraffic = useCallback(async () => {
    setLoadingTraffic(true);
    try {
      const res = await fetch('/api/traffic/corridor');
      if (res.ok) {
        const data = (await res.json()) as CorridorApiResponse;
        setCorridor(data);
      }
    } catch {
      // Keep existing corridor state on transient network glitch
    } finally {
      setLoadingTraffic(false);
    }
  }, []);

  const nextFuelNode = useMemo(() => {
    const nodes = (corridor?.nodes ?? []).filter((n) => (n.fuelBonusPct ?? 0) > 0);
    return (
      nodes.find((n) => !clearedNodeIds.includes(n.id) && n.kmMarker >= driveDistance - 0.5) ??
      nodes[0]
    );
  }, [corridor, clearedNodeIds, driveDistance]);

  const distToFuelNodeKm = nextFuelNode
    ? Math.max(nextFuelNode.kmMarker - driveDistance, 0)
    : 0;

  const fetchWeather = useCallback(
    async (mode: WeatherCondition | 'live' = weatherOverride) => {
      setLoadingWeather(true);
      try {
        const query = mode === 'live' ? '' : `?override=${encodeURIComponent(mode)}`;
        const res = await fetch(`/api/weather/corridor${query}`);
        if (res.ok) {
          const data = (await res.json()) as WeatherApiResponse;
          setWeather(data);
        }
      } catch {
        // Keep last weather state
      } finally {
        setLoadingWeather(false);
      }
    },
    [weatherOverride]
  );

  const fetchCrew = useCallback(async () => {
    try {
      const res = await fetch('/api/social/crew');
      if (res.ok) {
        const data = (await res.json()) as { crew: CrewMember[] };
        setCrewMembers(data.crew);
      }
    } catch {
      // Ignore transient glitch
    }
  }, []);

  useEffect(() => {
    fetchCorridorTraffic();
    fetchCrew();
    const timer = window.setInterval(fetchCorridorTraffic, 12000);
    return () => window.clearInterval(timer);
  }, [fetchCorridorTraffic, fetchCrew]);

  useEffect(() => {
    void fetchWeather(weatherOverride);
    if (weatherOverride !== 'live') return;
    const timer = window.setInterval(() => void fetchWeather('live'), 60000);
    return () => window.clearInterval(timer);
  }, [fetchWeather, weatherOverride]);

  const handleSelectWeatherMode = useCallback(
    (mode: WeatherCondition | 'live') => {
      setWeatherOverride(mode);
      void fetchWeather(mode);
      if (mode === 'rain') {
        pushToast(
          '기상 주의보 · 우천 구간 진입',
          '비로 인해 노면이 미끄럽습니다. 80km/h 이하 감속 및 안전거리 확보를 권장합니다.',
          'warning'
        );
      } else if (mode === 'snow') {
        pushToast(
          '기상 경보 · 강설 및 결빙 위험',
          '눈길 결빙 주의 구간입니다. 급제동 금지 및 70km/h 이하 서행을 권장합니다.',
          'warning'
        );
      } else if (mode === 'fog') {
        pushToast(
          '기상 주의보 · 짙은 안개 시정 저하',
          '가시거리가 짧습니다. 안개등을 점등하고 서행하세요.',
          'warning'
        );
      }
    },
    [fetchWeather, pushToast]
  );

  const awardExp = useCallback(
    (amount: number, reason: string, options?: { bypassFuelCheck?: boolean }) => {
      if (!options?.bypassFuelCheck && fuelPercentRef.current <= 0.5) {
        pushToast(
          '연료 고갈(0%) · 경험치 획득 중단',
          `${reason} 완료되었으나 기름이 바닥나 경험치(+0 EXP)를 얻지 못했습니다. 주유소 통과 또는 동료에게 기름을 받아주세요.`,
          'warning'
        );
        return;
      }

      const weatherBonus =
        weather && weather.expBonusPct > 0 && safetyScore >= 85
          ? Math.round(amount * (weather.expBonusPct / 100))
          : 0;
      const finalAmount = amount + weatherBonus;
      const bonusLabel =
        weatherBonus > 0 ? ` (악천후 안전 +${weatherBonus} EXP 포함)` : '';

      setTotalExp((prevExp) => {
        const nextExp = prevExp + finalAmount;
        let prevUnlocked = 1;
        let nextUnlocked = 1;
        for (const tier of VEHICLE_TIERS) {
          if (prevExp >= tier.requiredTotalExp) prevUnlocked = tier.level;
          if (nextExp >= tier.requiredTotalExp) nextUnlocked = tier.level;
        }
        if (nextUnlocked > prevUnlocked) {
          const unlockedTier = VEHICLE_TIERS.find((t) => t.level === nextUnlocked);
          const newlyUnlockedPaints = PAINT_OPTIONS.filter(
            (p) => p.unlockLevel > prevUnlocked && p.unlockLevel <= nextUnlocked
          ).map((p) => p.name);
          const newlyUnlockedWheels = WHEEL_OPTIONS.filter(
            (w) => w.unlockLevel > prevUnlocked && w.unlockLevel <= nextUnlocked
          ).map((w) => w.name);
          const customUnlockedParts = [...newlyUnlockedPaints, ...newlyUnlockedWheels];
          const customNote =
            customUnlockedParts.length > 0
              ? ` 신규 커스텀 해금: ${customUnlockedParts.join(', ')}`
              : '';

          setEquippedLevel(nextUnlocked);
          if (unlockedTier) {
            pushToast(
              `신규 차종 진화 · LV.${unlockedTier.level} ${unlockedTier.categoryLabel}`,
              `${reason} (+${finalAmount} EXP${bonusLabel}) 보상으로 '${unlockedTier.name}'이 해금되었습니다.${customNote}`,
              'success'
            );
          }
        } else {
          pushToast(
            `경험치 +${finalAmount} EXP 획득`,
            `${reason} 완료${bonusLabel} · 누적 ${nextExp.toLocaleString()} EXP`,
            'info'
          );
        }
        return nextExp;
      });
    },
    [pushToast, safetyScore, weather]
  );

  const clearTollgateNode = useCallback(
    async (node: CorridorNode, advanceDistanceToGate: boolean) => {
      if (clearedNodeIds.includes(node.id)) return;

      const nextCombo = comboCount + 1;
      setClearedNodeIds((prev) => (prev.includes(node.id) ? prev : [...prev, node.id]));
      setComboCount(nextCombo);

      if (advanceDistanceToGate && driveDistance < node.kmMarker) {
        setDriveDistance(Number((node.kmMarker + 0.2).toFixed(1)));
      }

      let totalEarned = Math.round(node.rewardExp * (safetyScore >= 90 ? 1.25 : 1.0));
      try {
        const res = await fetch('/api/traffic/tollgate-clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: node.id,
            safetyScore,
            comboCount: nextCombo,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { totalExp: number };
          totalEarned = data.totalExp;
        }
      } catch {
        // Fallback calculation already set
      }

      const fuelGain = node.fuelBonusPct ?? 0;
      const wasEmpty = fuelPercentRef.current <= 0.5;
      if (fuelGain > 0) {
        const nextFuel = Math.min(100, Math.round(fuelPercentRef.current + fuelGain));
        fuelPercentRef.current = nextFuel;
        setFuelPercent(nextFuel);
      }

      if (soundEnabled) {
        triggerPhoneVibration([70, 40, 110]);
        playCockpitChime('tollgate');
      }

      if (fuelGain > 0) {
        pushToast(
          `주유·충전 완료 (+${fuelGain}%)`,
          `${node.name} 통과로 연료가 ${Math.round(fuelPercentRef.current)}%까지 충전되었습니다.${wasEmpty ? ' 경험치 획득이 재개됩니다!' : ''}`,
          'success'
        );
      }

      const expAllowed = fuelPercentRef.current > 0.5;
      awardExp(totalEarned, `${node.name} 통과 (${nextCombo}연속 안전 콤보)`);

      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setDriveLogs((prev) => [
        {
          id: `log-tg-${Date.now()}`,
          timestamp: hhmm,
          segment: `${node.name} 통과`,
          type: fuelGain > 0 ? '주유 · 충전' : '톨게이트 돌파',
          durationLabel:
            fuelGain > 0
              ? `연료 +${fuelGain}% 충전`
              : `${node.liveSpeedKmh}km/h ${node.congestion}`,
          distanceKm: node.kmMarker,
          safetyDelta: `${nextCombo}연속 콤보`,
          expEarned: expAllowed ? totalEarned : 0,
        },
        ...prev,
      ]);
    },
    [awardExp, clearedNodeIds, comboCount, driveDistance, pushToast, safetyScore, soundEnabled]
  );

  const triggerTwoHourRestAlert = useCallback(async () => {
    setTwoHourAlertVisible(true);
    setIsVibratingVisual(true);
    window.setTimeout(() => setIsVibratingVisual(false), 1800);

    const vibrated = triggerPhoneVibration([320, 140, 320, 140, 520]);
    if (soundEnabled) {
      playCockpitChime('rest-alert');
    }
    await sendRestPushNotification(
      'Pleos Smart Motion Guard · 15분 휴식 권장',
      `연속 주행 2시간에 도달했습니다. 전방 ${selectedRestArea.name}에서 15분 휴식을 권장합니다.`
    );

    pushToast(
      '2시간 도달 · 스마트폰 자동 진동 알림',
      vibrated
        ? '휴대폰 진동과 함께 15분 필수 휴식 권장 알림이 발동되었습니다.'
        : '15분 필수 휴식 권장 알림이 발동되었습니다. (모바일 기기에서 실제 진동 지원)',
      'warning'
    );
  }, [pushToast, selectedRestArea.name, soundEnabled]);

  const completeRestCycle = useCallback(() => {
    setIsResting(false);
    setRestActive(false);
    setRestTimer(900);
    setContinuousTime(0);
    setTwoHourAlertVisible(false);
    twoHourAlertTriggeredRef.current = false;
    setSafetyScore((prev) => Math.min(prev + 3, 100));
    setQuests((prev) =>
      prev.map((q) => (q.id === 'rest-2h' ? { ...q, completed: true } : q))
    );
    const refueled = Math.min(100, Math.round(fuelPercentRef.current + 50));
    fuelPercentRef.current = refueled;
    setFuelPercent(refueled);

    awardExp(300, '15분 법정 의무 휴식 & 휴게소 충전 완수');

    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setDriveLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: hhmm,
        segment: `${selectedRestArea.name} (연료 +50%)`,
        type: '휴식 완료',
        durationLabel: '15분 00초',
        distanceKm: 0,
        safetyDelta: '+3점',
        expEarned: 300,
      },
      ...prev,
    ]);
  }, [awardExp, selectedRestArea.name]);

  // Continuous driving + real-time traffic speed + automatic tollgate clear + 2h vibration
  useEffect(() => {
    const interval = window.setInterval(() => {
      const stepSeconds = simSpeedMultiplier;

      if (isResting) {
        if (restActive) {
          setRestTimer((prev) => (prev <= stepSeconds ? 0 : prev - stepSeconds));
        }
        return;
      }

      if (isDrivingSimActive) {
        setContinuousTime((prev) => {
          const next = prev + stepSeconds;
          if (next >= 7200 && !twoHourAlertTriggeredRef.current) {
            twoHourAlertTriggeredRef.current = true;
            void triggerTwoHourRestAlert();
          }
          return next;
        });

        const liveNodeSpeed = nextCorridorNode?.liveSpeedKmh ?? corridor?.avgSpeedKmh ?? 88;
        const weatherSafeCap = weather?.safeSpeedLimitKmh ?? 100;
        const effectiveSpeed = Math.min(liveNodeSpeed, weatherSafeCap);
        setCurrentSpeed(effectiveSpeed);
        const addedKm = (effectiveSpeed / 3600) * stepSeconds;
        setDriveDistance((prev) => Number((prev + addedKm).toFixed(2)));

        // Consume fuel based on distance and weather multiplier
        const fuelMult = weather?.fuelMultiplier ?? 1.0;
        const fuelDrop = Math.max(0.03 * stepSeconds, addedKm * 1.45) * fuelMult;
        setFuelPercent((prev) => {
          const next = Math.max(0, Number((prev - fuelDrop).toFixed(2)));
          fuelPercentRef.current = next;
          if (next <= 20 && next > 0.5 && !lowFuelWarnedRef.current) {
            lowFuelWarnedRef.current = true;
            pushToast(
              '연료 부족 경고 (20% 이하)',
              '전방 주유소·휴게소를 지나거나 동료에게 기름을 요청해 연료를 보충하세요.',
              'warning'
            );
          } else if (next <= 0.5 && !emptyFuelWarnedRef.current) {
            emptyFuelWarnedRef.current = true;
            pushToast(
              '연료 고갈(0%) · 경험치 획득 중단',
              '기름이 모두 소진되어 더 이상 경험치(EXP)를 얻을 수 없습니다!',
              'warning'
            );
          }
          return next;
        });

        setQuests((prevQuests) =>
          prevQuests.map((q) => {
            if (q.id === 'cruise-100km' && !q.completed) {
              return { ...q, progress: Math.min(q.progress + addedKm, q.target) };
            }
            return q;
          })
        );
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    corridor?.avgSpeedKmh,
    isDrivingSimActive,
    isResting,
    nextCorridorNode?.liveSpeedKmh,
    pushToast,
    restActive,
    simSpeedMultiplier,
    triggerTwoHourRestAlert,
    weather?.fuelMultiplier,
    weather?.safeSpeedLimitKmh,
  ]);

  // Auto-clear next corridor node when driveDistance reaches its kmMarker
  useEffect(() => {
    if (
      !isResting &&
      isDrivingSimActive &&
      nextCorridorNode &&
      !clearedNodeIds.includes(nextCorridorNode.id) &&
      driveDistance >= nextCorridorNode.kmMarker
    ) {
      void clearTollgateNode(nextCorridorNode, false);
    }
  }, [
    clearedNodeIds,
    clearTollgateNode,
    driveDistance,
    isDrivingSimActive,
    isResting,
    nextCorridorNode,
  ]);

  useEffect(() => {
    if (isResting && restTimer === 0) {
      completeRestCycle();
    }
  }, [isResting, restTimer, completeRestCycle]);

  const handleStartRest = useCallback(() => {
    setIsResting(true);
    setRestActive(true);
    setRestTimer(900);
    setTwoHourAlertVisible(false);
    pushToast(
      '휴게소 정차 휴식 시작',
      `${selectedRestArea.name}에서 15분 필수 휴식 타이머를 시작했습니다.`,
      'info'
    );
  }, [pushToast, selectedRestArea.name]);

  const handleResetRest = () => {
    setIsResting(false);
    setRestActive(false);
    setRestTimer(900);
    pushToast('휴식 타이머 취소', '휴식 모드를 종료하고 주행 화면으로 복귀했습니다.', 'warning');
  };

  const handlePassNextTollgate = () => {
    if (nextCorridorNode && !clearedNodeIds.includes(nextCorridorNode.id)) {
      void clearTollgateNode(nextCorridorNode, true);
      return;
    }
    // If all corridor gates cleared, reset corridor loop for continuous highway stages
    setClearedNodeIds([]);
    setDriveDistance(118.0);
    pushToast(
      '신규 고속도로 구간 진입',
      '경부고속도로 모든 게이트를 돌파하여 다음 주행 스테이지로 진입했습니다.',
      'success'
    );
  };

  const handleOpenPopoutPiP = async () => {
    const pipApi = (
      window as unknown as {
        documentPictureInPicture?: {
          requestWindow: (opts: { width: number; height: number }) => Promise<Window>;
        };
      }
    ).documentPictureInPicture;

    if (!pipApi) {
      setFloatingWidgetOpen(true);
      pushToast(
        '내비 사이드 미니 창 활성화',
        '현재 브라우저에서 인앱 플로팅 미니 창으로 CarPlay 사이드 위젯을 띄웠습니다.',
        'info'
      );
      return;
    }

    try {
      const pipWin = await pipApi.requestWindow({ width: 340, height: 240 });
      pipWin.document.body.innerHTML = `
        <div style="margin:0;padding:16px;background:#0D1014;color:#F8FAFC;font-family:sans-serif;height:100vh;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="font-size:11px;color:#3EE84B;font-weight:700;">PLEOS MOTION GUARD · LV.${equippedVehicle.level}</div>
            <div style="font-size:15px;font-weight:800;margin-top:4px;">${equippedVehicle.name}</div>
          </div>
          <div style="background:#161B24;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);">
            <div style="font-size:11px;color:#94A3B8;">연속 주행 / 다음 톨게이트</div>
            <div style="font-size:16px;font-weight:700;margin-top:4px;">${formatDrivingDuration(continuousTime)} · ${distToNextNodeKm.toFixed(1)}km</div>
          </div>
          <div style="font-size:11px;color:#CBD5E1;">누적 ${totalExp.toLocaleString()} EXP · 안전점수 ${safetyScore}점</div>
        </div>
      `;
    } catch {
      setFloatingWidgetOpen(true);
    }
  };

  const handleClaimQuest = (questId: string) => {
    const targetQuest = quests.find((q) => q.id === questId);
    if (!targetQuest || targetQuest.completed) return;
    setQuests((prev) =>
      prev.map((q) => (q.id === questId ? { ...q, completed: true } : q))
    );
    awardExp(targetQuest.rewardExp, targetQuest.title);
  };

  const handleSelectPaint = useCallback(
    (paintOpt: PaintOption) => {
      if (paintOpt.unlockLevel > highestUnlockedLevel) {
        pushToast(
          `외장 컬러 잠금 · LV.${paintOpt.unlockLevel} 해금`,
          `'${paintOpt.name}' 컬러는 LV.${paintOpt.unlockLevel} 달성 시 사용할 수 있습니다.`,
          'warning'
        );
        return;
      }
      setSelectedPaint(paintOpt);
      pushToast('외장 컬러 변경', `'${paintOpt.name}' 컬러가 적용되었습니다.`, 'info');
    },
    [highestUnlockedLevel, pushToast]
  );

  const handleSelectWheel = useCallback(
    (wheelOpt: WheelOption) => {
      if (wheelOpt.unlockLevel > highestUnlockedLevel) {
        pushToast(
          `휠 옵션 잠금 · LV.${wheelOpt.unlockLevel} 해금`,
          `'${wheelOpt.name}'은(는) LV.${wheelOpt.unlockLevel} 달성 시 사용할 수 있습니다.`,
          'warning'
        );
        return;
      }
      setSelectedWheel(wheelOpt);
      pushToast('휠 옵션 변경', `'${wheelOpt.name}'이(가) 장착되었습니다.`, 'info');
    },
    [highestUnlockedLevel, pushToast]
  );

  const handleToggleAutoRotate = useCallback(() => setAutoRotate((prev) => !prev), []);
  const handleToggleDoorsAndLights = useCallback(
    () => setDoorsAndLightsOpen((prev) => !prev),
    []
  );
  const handleOpenGarage = useCallback(() => setActiveTab('garage'), []);
  const handleEarnDemoExp = useCallback(
    (amt: number) => awardExp(amt, '안전운전 시뮬레이션 보상'),
    [awardExp]
  );
  const handleEvolveNext = useCallback(() => {
    const nextTier = VEHICLE_TIERS.find((t) => t.level === equippedLevel + 1);
    if (!nextTier) {
      setActiveTab('garage');
      return;
    }
    if (totalExp >= nextTier.requiredTotalExp) {
      setEquippedLevel(nextTier.level);
      if (soundEnabled) {
        triggerPhoneVibration([80, 40, 120]);
        playCockpitChime('tollgate');
      }
      pushToast(
        `차량 진화 완료 · LV.${nextTier.level}`,
        `'${nextTier.name}'(으)로 성공적으로 진화했습니다!`,
        'success'
      );
    } else {
      const need = nextTier.requiredTotalExp - totalExp;
      setActiveTab('garage');
      pushToast(
        `진화 필요 경험치 안내`,
        `${nextTier.name} 진화까지 ${need.toLocaleString()} EXP가 더 필요합니다. 톨게이트 돌파 또는 휴식으로 EXP를 모아보세요.`,
        'info'
      );
    }
  }, [equippedLevel, pushToast, soundEnabled, totalExp]);

  const handleVoteTrack = (trackId: number) => {
    setPlaylist((prev) =>
      prev.map((track) => {
        if (track.id !== trackId) return track;
        const alreadyVoted = Boolean(track.userVoted);
        return {
          ...track,
          votes: alreadyVoted ? Math.max(track.votes - 1, 0) : track.votes + 1,
          userVoted: !alreadyVoted,
        };
      })
    );
  };

  const handleAddTrack = (title: string, artist: string, pickedBy: ParticipantRole) => {
    const nextId = Math.max(0, ...playlist.map((p) => p.id)) + 1;
    const newSong: SongTrack = {
      id: nextId,
      title,
      artist,
      duration: '3:28',
      genre: currentGenre,
      pickedBy,
      votes: 1,
      userVoted: true,
    };
    setPlaylist((prev) => [newSong, ...prev]);
    pushToast('신청곡 등록 완료', `${pickedBy} 신청곡 '${title}'이 목록에 추가되었습니다.`, 'info');
  };

  const handleNextTrack = () => {
    if (playlist.length === 0) return;
    const sorted = [...playlist].sort((a, b) => b.votes - a.votes);
    const currentIdx = sorted.findIndex((t) => t.id === activeTrackId);
    const nextTrack = sorted[(currentIdx + 1) % sorted.length];
    setActiveTrackId(nextTrack.id);
    setIsPlaying(true);
  };

  const handleRecordHarshAccel = () => {
    setHarshAccelEvents((prev) => prev + 1);
    setSafetyScore((prev) => Math.max(prev - 2, 65));
    pushToast(
      '급가속 이벤트 기록',
      '급가속(+3.2m/s²)이 감지되어 주간 안전 습관 그래프에 반영되었습니다 (-2점).',
      'warning'
    );
  };

  const handleRecordHarshBrake = () => {
    setHarshBrakeEvents((prev) => prev + 1);
    setSafetyScore((prev) => Math.max(prev - 2, 65));
    pushToast(
      '급제동 이벤트 기록',
      '급제동(-3.6m/s²)이 감지되어 주간 안전 습관 그래프에 반영되었습니다 (-2점).',
      'warning'
    );
  };

  const handleRecordSmoothCruise = () => {
    setSafetyScore((prev) => Math.min(prev + 2, 100));
    awardExp(80, '정속 안전 주행 구간 완주');
  };

  const handleSendFuel = useCallback(
    async (member: CrewMember) => {
      if (fuelPercentRef.current < 20) {
        pushToast(
          '내 연료 부족',
          '다른 드라이버에게 기름을 보내려면 내 차량 연료가 최소 20% 이상이어야 합니다.',
          'warning'
        );
        return;
      }
      setSendingToId(member.id);
      const nextFuel = Math.max(0, Math.round(fuelPercentRef.current - 15));
      fuelPercentRef.current = nextFuel;
      setFuelPercent(nextFuel);

      let expReward = 120;
      try {
        const res = await fetch('/api/social/send-fuel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetId: member.id, amountPct: 15 }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            expReward: number;
            crew: CrewMember[];
          };
          expReward = data.expReward;
          setCrewMembers(data.crew);
        }
      } catch {
        setCrewMembers((prev) =>
          prev.map((m) =>
            m.id === member.id
              ? {
                  ...m,
                  fuelPercent: Math.min(100, m.fuelPercent + 15),
                  needsHelp: m.fuelPercent + 15 < 25,
                }
              : m
          )
        );
      } finally {
        setSendingToId(null);
      }

      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setTransferLogs((prev) => [
        {
          id: `tx-sent-${Date.now()}`,
          fromName: '내 차량',
          toName: member.callsign,
          amountPct: 15,
          expBonus: expReward,
          timestamp: hhmm,
          direction: 'sent',
        },
        ...prev,
      ]);
      setDriveLogs((prev) => [
        {
          id: `log-fuel-send-${Date.now()}`,
          timestamp: hhmm,
          segment: `${member.callsign} 연료 선물 (-15%)`,
          type: '연료 나눔',
          durationLabel: '크루 협동',
          distanceKm: 0,
          safetyDelta: '나눔 완료',
          expEarned: expReward,
        },
        ...prev,
      ]);

      if (soundEnabled) {
        playCockpitChime('tollgate');
      }
      awardExp(expReward, `${member.callsign}님에게 기름 선물`);
    },
    [awardExp, pushToast, soundEnabled]
  );

  const handleRequestFuelFromCrew = useCallback(async () => {
    setRequestingFuel(true);
    let donorCallsign = '그랜저_대전장거리';
    let giftPct = 25;
    try {
      const res = await fetch('/api/social/request-fuel', { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as {
          donorCallsign: string;
          giftPct: number;
          crew: CrewMember[];
        };
        donorCallsign = data.donorCallsign;
        giftPct = data.giftPct;
        setCrewMembers(data.crew);
      }
    } catch {
      // Fallback gift
    } finally {
      setRequestingFuel(false);
    }

    const nextFuel = Math.min(100, Math.round(fuelPercentRef.current + giftPct));
    fuelPercentRef.current = nextFuel;
    setFuelPercent(nextFuel);

    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setTransferLogs((prev) => [
      {
        id: `tx-recv-${Date.now()}`,
        fromName: donorCallsign,
        toName: '내 차량',
        amountPct: giftPct,
        expBonus: 0,
        timestamp: hhmm,
        direction: 'received',
      },
      ...prev,
    ]);
    setDriveLogs((prev) => [
      {
        id: `log-fuel-recv-${Date.now()}`,
        timestamp: hhmm,
        segment: `${donorCallsign} 긴급 연료 지원 (+${giftPct}%)`,
        type: '연료 나눔',
        durationLabel: `연료 ${nextFuel}%`,
        distanceKm: 0,
        safetyDelta: '수령 완료',
        expEarned: 0,
      },
      ...prev,
    ]);
    pushToast(
      `긴급 연료 도착 (+${giftPct}%)`,
      `${donorCallsign}님이 기름을 보내주어 연료가 ${nextFuel}%가 되었습니다!`,
      'success'
    );
  }, [pushToast]);

  const handleSimulateLowFuel = useCallback(
    (level: number) => {
      fuelPercentRef.current = level;
      setFuelPercent(level);
      pushToast(
        level <= 0 ? '연료 고갈 상태 테스트 (0%)' : `연료 부족 테스트 (${level}%)`,
        '기름이 0%일 때는 톨게이트·퀘스트 경험치를 획득할 수 없습니다. 주유소 통과나 동료에게 기름 요청으로 충전해보세요!',
        'warning'
      );
    },
    [pushToast]
  );

  const handleRefuelAtNearestStation = useCallback(() => {
    if (nextFuelNode && !clearedNodeIds.includes(nextFuelNode.id)) {
      void clearTollgateNode(nextFuelNode, true);
      return;
    }
    const refilled = Math.min(100, Math.round(fuelPercentRef.current + 50));
    fuelPercentRef.current = refilled;
    setFuelPercent(refilled);
    pushToast('휴게소 주유 완료 (+50%)', `연료가 ${refilled}%까지 충전되었습니다.`, 'success');
  }, [clearedNodeIds, clearTollgateNode, nextFuelNode, pushToast]);

  return (
    <div
      className={`min-h-screen bg-[#0D1014] text-slate-100 pb-20 lg:pb-8 ${
        isVibratingVisual ? 'animate-[vibrate_0.15s_ease-in-out_6]' : ''
      }`}
    >
      {/* Prominent Hyundai Motor Group Top Brand Bar & Cockpit Navigation */}
      <header className="sticky top-0 z-30 bg-[#0A1322]/95 backdrop-blur-md border-b border-white/15">
        {/* Top Hyundai Group Submission Emblem Strip */}
        <div className="bg-gradient-to-r from-[#002C5F] via-[#092147] to-[#0E1624] border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('showroom')}
              className="flex items-center gap-4 text-left focus-visible:outline-none"
            >
              <HyundaiBrandMark size="lg" showWordmark />
            </button>
            <div className="hidden sm:block text-right">
              <div className="text-xs font-extrabold tracking-wide text-white">
                Pleos Smart Motion Guard
              </div>
              <div className="text-[11px] text-slate-300">
                현대자동차그룹 스마트 모빌리티 · 안전휴식 · 연료 크루 플랫폼
              </div>
            </div>
          </div>
        </div>

        {/* Single-row Cockpit Navigation Bar */}
        <div className="max-w-7xl mx-auto h-13 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('showroom')}
            className="text-sm sm:text-base font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none"
          >
            스마트 드라이빙 허브
          </button>

          <nav aria-label="주 메뉴" className="hidden lg:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`text-sm font-semibold whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    active
                      ? 'text-[#3EE84B] border-[#3EE84B]'
                      : 'text-slate-300 border-transparent hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            {!isResting ? (
              <button
                type="button"
                onClick={handleStartRest}
                className="px-4 py-1.5 rounded-full bg-[#3EE84B] hover:bg-[#32D43E] text-[#071809] text-xs font-extrabold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors min-h-[36px]"
              >
                <Coffee size={14} aria-hidden="true" />
                <span>15분 휴식 시작</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={completeRestCycle}
                className="px-4 py-1.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-extrabold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors min-h-[36px]"
              >
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>휴식 완료 처리</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2-Hour Automatic Phone Vibration + 15-Minute Rest Recommendation Banner */}
      {twoHourAlertVisible && !isResting && (
        <div
          role="alert"
          className="bg-amber-500 text-slate-950 px-4 py-3 border-b border-amber-600"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm font-extrabold">
              <Vibrate size={18} aria-hidden="true" />
              <span>
                연속 주행 2시간 도달 — 휴대폰 자동 진동 알림! 전방 {selectedRestArea.name}에서 15분
                휴식을 권장합니다.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartRest}
                className="px-4 py-1.5 rounded-full bg-slate-950 text-[#3EE84B] text-xs font-extrabold whitespace-nowrap"
              >
                지금 15분 휴식 시작
              </button>
              <button
                type="button"
                onClick={() => setTwoHourAlertVisible(false)}
                aria-label="휴식 권장 알림 닫기"
                className="p-1.5 rounded-full hover:bg-black/10"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 space-y-6">
        {/* Simulation & CarPlay Mini-Window Utility Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 flex flex-wrap items-center gap-2">
            <span>현재 탑승 차종:</span>
            <span className="font-bold text-white">
              LV.{equippedVehicle.level} {equippedVehicle.name}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-[#3EE84B]">
              {totalExp.toLocaleString()} EXP
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-300">
              {corridor?.sourceLabel ?? '도로교통 피드 연결 중'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFloatingWidgetOpen((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                floatingWidgetOpen
                  ? 'bg-[#0070F3]/20 border-[#0070F3] text-blue-300 font-semibold'
                  : 'bg-[#161B22] border-white/10 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <PictureInPicture2 size={13} aria-hidden="true" />
              <span>{floatingWidgetOpen ? '미니 창 켜짐' : '네비 옆 미니 창'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDrivingSimActive((prev) => !prev)}
              disabled={isResting}
              className="px-3 py-1.5 rounded-lg bg-[#161B22] border border-white/10 text-slate-200 hover:bg-slate-800 flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
            >
              {isDrivingSimActive ? <Pause size={13} /> : <Play size={13} />}
              <span>{isDrivingSimActive ? '주행 일시정지' : '주행 재개'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSimSpeedMultiplier((prev) => (prev === 1 ? 60 : 1))}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                simSpeedMultiplier === 60
                  ? 'bg-[#3EE84B]/15 border-[#3EE84B]/50 text-[#3EE84B] font-semibold'
                  : 'bg-[#161B22] border-white/10 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <FastForward size={13} />
              <span>{simSpeedMultiplier === 60 ? '60배속 테스트 중' : '60배속 시뮬레이션'}</span>
            </button>
          </div>
        </div>

        {/* Real-time / Simulated Weather Advisory Banner */}
        <WeatherAlertBanner
          weather={weather}
          weatherOverride={weatherOverride}
          loadingWeather={loadingWeather}
          onSelectWeatherMode={handleSelectWeatherMode}
          onRefreshWeather={() => void fetchWeather(weatherOverride)}
        />

        {/* SHOWROOM VIEW */}
        {activeTab === 'showroom' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-6">
                <VehicleShowroomStage
                  equippedVehicle={equippedVehicle}
                  highestUnlockedLevel={highestUnlockedLevel}
                  totalExp={totalExp}
                  fuelPercent={fuelPercent}
                  weather={weather}
                  safetyScore={safetyScore}
                  continuousTimeLabel={formatDrivingDuration(continuousTime)}
                  paint={selectedPaint}
                  wheel={selectedWheel}
                  autoRotate={autoRotate}
                  doorsAndLightsOpen={doorsAndLightsOpen}
                  isResting={isResting}
                  onToggleAutoRotate={handleToggleAutoRotate}
                  onToggleDoorsAndLights={handleToggleDoorsAndLights}
                  onSelectPaint={handleSelectPaint}
                  onSelectWheel={handleSelectWheel}
                  onOpenGarage={handleOpenGarage}
                  onEvolveNext={handleEvolveNext}
                  onStartRest={handleStartRest}
                  onEarnDemoExp={handleEarnDemoExp}
                />

                <TelemetryStrip
                  driveDistance={driveDistance}
                  currentSpeed={currentSpeed}
                  fuelPercent={fuelPercent}
                  safetyScore={safetyScore}
                  harshEvents={harshEvents}
                  isDriving={isDrivingSimActive}
                  isResting={isResting}
                />
              </div>

              <div className="lg:col-span-5 space-y-6">
                <RestCarePanel
                  continuousTime={continuousTime}
                  isResting={isResting}
                  restTimer={restTimer}
                  restActive={restActive}
                  selectedRestArea={selectedRestArea}
                  restAreas={NEARBY_REST_AREAS}
                  onSelectRestArea={setSelectedRestArea}
                  onStartRest={handleStartRest}
                  onToggleRestPause={() => setRestActive((prev) => !prev)}
                  onResetRest={handleResetRest}
                  onCompleteRestNow={completeRestCycle}
                />

                <CoPilotMusicPanel
                  passengerConnected={passengerConnected}
                  onTogglePassenger={() => setPassengerConnected((prev) => !prev)}
                  currentGenre={currentGenre}
                  onSelectGenre={setCurrentGenre}
                  playlist={playlist}
                  activeTrackId={activeTrackId}
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying((prev) => !prev)}
                  onSelectTrack={(id) => {
                    setActiveTrackId(id);
                    setIsPlaying(true);
                  }}
                  onNextTrack={handleNextTrack}
                  onVoteTrack={handleVoteTrack}
                  onAddTrack={handleAddTrack}
                />
              </div>
            </div>

            <SocialFuelCrewPanel
              fuelPercent={fuelPercent}
              crewMembers={crewMembers}
              transferLogs={transferLogs}
              nextFuelNode={nextFuelNode}
              distToFuelNodeKm={distToFuelNodeKm}
              sendingToId={sendingToId}
              requestingFuel={requestingFuel}
              onSendFuel={(member) => void handleSendFuel(member)}
              onRequestFuelFromCrew={() => void handleRequestFuelFromCrew()}
              onSimulateLowFuel={handleSimulateLowFuel}
              onRefuelAtNearestStation={handleRefuelAtNearestStation}
            />

            <HighwayTrafficRadar
              corridor={corridor}
              loadingTraffic={loadingTraffic}
              driveDistance={driveDistance}
              fuelPercent={fuelPercent}
              clearedNodeIds={clearedNodeIds}
              comboCount={comboCount}
              soundEnabled={soundEnabled}
              onRefreshTraffic={fetchCorridorTraffic}
              onPassNextTollgate={handlePassNextTollgate}
              onToggleSound={() => setSoundEnabled((prev) => !prev)}
              onTriggerVibrationDemo={() => {
                setContinuousTime(7200);
                void triggerTwoHourRestAlert();
              }}
            />

            <SafetyHabitsDashboard
              safetyScore={safetyScore}
              harshAccelEvents={harshAccelEvents}
              harshBrakeEvents={harshBrakeEvents}
              driveDistance={driveDistance}
              isResting={isResting}
              continuousTime={continuousTime}
              onRecordHarshAccel={handleRecordHarshAccel}
              onRecordHarshBrake={handleRecordHarshBrake}
              onRecordSmoothCruise={handleRecordSmoothCruise}
            />
          </div>
        )}

        {/* APPLE CARPLAY SPLIT-SCREEN & NAVIGATION WIDGET TAB */}
        {activeTab === 'carplay' && (
          <CarPlaySplitView
            corridor={corridor}
            weather={weather}
            driveDistance={driveDistance}
            continuousTime={continuousTime}
            currentSpeed={currentSpeed}
            fuelPercent={fuelPercent}
            safetyScore={safetyScore}
            clearedNodeIds={clearedNodeIds}
            equippedVehicle={equippedVehicle}
            totalExp={totalExp}
            paint={selectedPaint}
            wheel={selectedWheel}
            isResting={isResting}
            restTimer={restTimer}
            activeTrack={activeTrack}
            isPlaying={isPlaying}
            floatingWidgetOpen={floatingWidgetOpen}
            onStartRest={handleStartRest}
            onPassNextTollgate={handlePassNextTollgate}
            onTogglePlay={() => setIsPlaying((prev) => !prev)}
            onNextTrack={handleNextTrack}
            onToggleFloatingWidget={() => setFloatingWidgetOpen((prev) => !prev)}
            onOpenPopoutPiP={() => void handleOpenPopoutPiP()}
          />
        )}

        {/* DRIVER SAFETY HABITS ANALYTICS TAB */}
        {activeTab === 'habits' && (
          <div className="space-y-6">
            <TelemetryStrip
              driveDistance={driveDistance}
              currentSpeed={currentSpeed}
              fuelPercent={fuelPercent}
              safetyScore={safetyScore}
              harshEvents={harshEvents}
              isDriving={isDrivingSimActive}
              isResting={isResting}
            />
            <SafetyHabitsDashboard
              safetyScore={safetyScore}
              harshAccelEvents={harshAccelEvents}
              harshBrakeEvents={harshBrakeEvents}
              driveDistance={driveDistance}
              isResting={isResting}
              continuousTime={continuousTime}
              onRecordHarshAccel={handleRecordHarshAccel}
              onRecordHarshBrake={handleRecordHarshBrake}
              onRecordSmoothCruise={handleRecordSmoothCruise}
            />
          </div>
        )}

        {/* REST & TELEMETRY TAB */}
        {activeTab === 'rest' && (
          <div className="space-y-6">
            <TelemetryStrip
              driveDistance={driveDistance}
              currentSpeed={currentSpeed}
              fuelPercent={fuelPercent}
              safetyScore={safetyScore}
              harshEvents={harshEvents}
              isDriving={isDrivingSimActive}
              isResting={isResting}
            />
            <SocialFuelCrewPanel
              fuelPercent={fuelPercent}
              crewMembers={crewMembers}
              transferLogs={transferLogs}
              nextFuelNode={nextFuelNode}
              distToFuelNodeKm={distToFuelNodeKm}
              sendingToId={sendingToId}
              requestingFuel={requestingFuel}
              onSendFuel={(member) => void handleSendFuel(member)}
              onRequestFuelFromCrew={() => void handleRequestFuelFromCrew()}
              onSimulateLowFuel={handleSimulateLowFuel}
              onRefuelAtNearestStation={handleRefuelAtNearestStation}
            />
            <RestCarePanel
              continuousTime={continuousTime}
              isResting={isResting}
              restTimer={restTimer}
              restActive={restActive}
              selectedRestArea={selectedRestArea}
              restAreas={NEARBY_REST_AREAS}
              onSelectRestArea={setSelectedRestArea}
              onStartRest={handleStartRest}
              onToggleRestPause={() => setRestActive((prev) => !prev)}
              onResetRest={handleResetRest}
              onCompleteRestNow={completeRestCycle}
            />
            <HighwayTrafficRadar
              corridor={corridor}
              loadingTraffic={loadingTraffic}
              driveDistance={driveDistance}
              fuelPercent={fuelPercent}
              clearedNodeIds={clearedNodeIds}
              comboCount={comboCount}
              soundEnabled={soundEnabled}
              onRefreshTraffic={fetchCorridorTraffic}
              onPassNextTollgate={handlePassNextTollgate}
              onToggleSound={() => setSoundEnabled((prev) => !prev)}
              onTriggerVibrationDemo={() => {
                setContinuousTime(7200);
                void triggerTwoHourRestAlert();
              }}
            />
          </div>
        )}

        {/* GARAGE EVOLUTION TAB */}
        {activeTab === 'garage' && (
          <VehicleGaragePanel
            totalExp={totalExp}
            highestUnlockedLevel={highestUnlockedLevel}
            equippedLevel={equippedLevel}
            paint={selectedPaint}
            wheel={selectedWheel}
            quests={quests}
            onEquipLevel={(lvl) => {
              setEquippedLevel(lvl);
              const model = VEHICLE_TIERS.find((t) => t.level === lvl);
              if (model) {
                pushToast(
                  '차종 변경 완료',
                  `쇼룸 차량이 '${model.name}'(으)로 변경되었습니다.`,
                  'info'
                );
              }
              setActiveTab('showroom');
            }}
            onSelectPaint={handleSelectPaint}
            onSelectWheel={handleSelectWheel}
            onClaimQuest={handleClaimQuest}
            onEarnDemoExp={(amt) => awardExp(amt, '안전운전 시뮬레이션 보상')}
          />
        )}

        {/* CO-PILOT MUSIC TAB */}
        {activeTab === 'music' && (
          <CoPilotMusicPanel
            passengerConnected={passengerConnected}
            onTogglePassenger={() => setPassengerConnected((prev) => !prev)}
            currentGenre={currentGenre}
            onSelectGenre={setCurrentGenre}
            playlist={playlist}
            activeTrackId={activeTrackId}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((prev) => !prev)}
            onSelectTrack={(id) => {
              setActiveTrackId(id);
              setIsPlaying(true);
            }}
            onNextTrack={handleNextTrack}
            onVoteTrack={handleVoteTrack}
            onAddTrack={handleAddTrack}
          />
        )}

        {/* DRIVE LOGS TAB */}
        {activeTab === 'logs' && <DriveLogTable logs={driveLogs} />}
      </main>

      {/* Persistent Navigation Side Floating Mini-Window */}
      {floatingWidgetOpen && (
        <FloatingNavWidget
          equippedVehicle={equippedVehicle}
          totalExp={totalExp}
          fuelPercent={fuelPercent}
          weather={weather}
          continuousTime={continuousTime}
          isResting={isResting}
          restTimer={restTimer}
          nextNode={nextCorridorNode}
          distToNextKm={distToNextNodeKm}
          activeTrack={activeTrack}
          isPlaying={isPlaying}
          onStartRest={handleStartRest}
          onPassNextTollgate={handlePassNextTollgate}
          onTogglePlay={() => setIsPlaying((prev) => !prev)}
          onClose={() => setFloatingWidgetOpen(false)}
        />
      )}

      {/* Mobile Bottom 5-Tab Navigation Bar (Image 22 White Bar + Center Blue Circle) */}
      <nav
        aria-label="모바일 하단 내비게이션"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white border-t border-slate-200 grid grid-cols-5 items-center px-1"
      >
        <button
          type="button"
          onClick={() => setActiveTab('showroom')}
          className={`flex flex-col items-center justify-center min-h-[44px] ${
            activeTab === 'showroom' ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <Home size={20} aria-hidden="true" />
          <span className="text-[10px] mt-0.5 whitespace-nowrap">쇼룸홈</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('carplay')}
          className={`flex flex-col items-center justify-center min-h-[44px] ${
            activeTab === 'carplay' ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <Navigation size={20} aria-hidden="true" />
          <span className="text-[10px] mt-0.5 whitespace-nowrap">카플레이</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('garage')}
          className="flex flex-col items-center justify-center min-h-[44px]"
        >
          <span
            className={`w-11 h-11 -mt-5 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
              activeTab === 'garage'
                ? 'bg-[#0057B8] text-white ring-4 ring-white'
                : 'bg-[#0070F3] text-white ring-4 ring-white'
            }`}
          >
            <CarFront size={20} aria-hidden="true" />
          </span>
          <span
            className={`text-[10px] mt-0.5 whitespace-nowrap ${
              activeTab === 'garage' ? 'text-[#0070F3] font-bold' : 'text-slate-600 font-medium'
            }`}
          >
            진화차고
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('habits')}
          className={`flex flex-col items-center justify-center min-h-[44px] ${
            activeTab === 'habits' ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <Activity size={20} aria-hidden="true" />
          <span className="text-[10px] mt-0.5 whitespace-nowrap">안전습관</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('music')}
          className={`flex flex-col items-center justify-center min-h-[44px] ${
            activeTab === 'music' ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <Music size={20} aria-hidden="true" />
          <span className="text-[10px] mt-0.5 whitespace-nowrap">동승뮤직</span>
        </button>
      </nav>

      {/* In-App Toast Notifications */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-5 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)]"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="bg-[#181D25] border border-white/15 rounded-2xl p-4 shadow-2xl flex items-start justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div
                  className={`text-xs font-bold flex items-center gap-1.5 ${
                    toast.tone === 'success'
                      ? 'text-[#3EE84B]'
                      : toast.tone === 'warning'
                        ? 'text-amber-400'
                        : 'text-blue-400'
                  }`}
                >
                  {toast.tone === 'warning' && <Smartphone size={13} aria-hidden="true" />}
                  <span>{toast.title}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{toast.message}</p>
              </div>
              <button
                type="button"
                aria-label="알림 닫기"
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
                className="text-slate-400 hover:text-slate-200 p-1 rounded shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
