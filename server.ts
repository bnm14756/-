import dotenv from 'dotenv';
import express from 'express';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KTDB_PORTAL_URL = 'https://www.ktdb.go.kr/www/index.do';

type CongestionLevel = '원활' | '서행' | '정체';

interface CorridorNode {
  id: string;
  name: string;
  kind: 'tollgate' | 'junction' | 'rest-area' | 'gas-station';
  kmMarker: number;
  baseSpeedKmh: number;
  aadt: number;
  rewardExp: number;
  fuelBonusPct?: number;
  subtitle: string;
}

const GYEONGBU_KTDB_NODES: CorridorNode[] = [
  {
    id: 'seoul-tg',
    name: '서울 요금소 (서울TG)',
    kind: 'tollgate',
    kmMarker: 120.0,
    baseSpeedKmh: 84,
    aadt: 184200,
    rewardExp: 180,
    subtitle: 'KTDB 수도권 유출입 핵심 관문',
  },
  {
    id: 'jukjeon-oil',
    name: '죽전 휴게소 · EX-OIL 주유소',
    kind: 'gas-station',
    kmMarker: 129.5,
    baseSpeedKmh: 82,
    aadt: 175400,
    rewardExp: 140,
    fuelBonusPct: 45,
    subtitle: '주행 중 통과 시 연료 +45% 자동 주유',
  },
  {
    id: 'singal-jc',
    name: '신갈 분기점 (신갈JC)',
    kind: 'junction',
    kmMarker: 134.5,
    baseSpeedKmh: 71,
    aadt: 168900,
    rewardExp: 150,
    subtitle: '영동선 합류 · KTDB 상습 혼잡 구간',
  },
  {
    id: 'giheung-sa',
    name: '기흥 휴게소 · E-pit 충전소',
    kind: 'rest-area',
    kmMarker: 141.0,
    baseSpeedKmh: 85,
    aadt: 142600,
    rewardExp: 120,
    fuelBonusPct: 55,
    subtitle: '화물/승용 통합 쉼터 · 통과 시 연료 +55% 충전',
  },
  {
    id: 'anseong-tg',
    name: '안성 요금소 (안성TG)',
    kind: 'tollgate',
    kmMarker: 148.0,
    baseSpeedKmh: 92,
    aadt: 126400,
    rewardExp: 220,
    subtitle: '장거리 크루즈 1구간 돌파 게이트',
  },
  {
    id: 'anseong-sa',
    name: '안성 휴게소 · HD현대오일뱅크',
    kind: 'rest-area',
    kmMarker: 154.5,
    baseSpeedKmh: 94,
    aadt: 121800,
    rewardExp: 300,
    fuelBonusPct: 60,
    subtitle: '2시간 의무 휴식 거점 · 통과 시 연료 +60% 충전',
  },
  {
    id: 'ipjang-oil',
    name: '입장 휴게소 · 고속도로 주유소',
    kind: 'gas-station',
    kmMarker: 163.5,
    baseSpeedKmh: 89,
    aadt: 119200,
    rewardExp: 160,
    fuelBonusPct: 50,
    subtitle: '천안 직전 급유 거점 · 통과 시 연료 +50% 주유',
  },
  {
    id: 'cheonan-tg',
    name: '천안 요금소 (천안TG)',
    kind: 'tollgate',
    kmMarker: 171.2,
    baseSpeedKmh: 63,
    aadt: 118500,
    rewardExp: 260,
    subtitle: '천안논산선 분기 · 중부권 교통 결절점',
  },
  {
    id: 'manghyang-oil',
    name: '망향 휴게소 · HD현대오일뱅크',
    kind: 'gas-station',
    kmMarker: 182.0,
    baseSpeedKmh: 90,
    aadt: 104300,
    rewardExp: 170,
    fuelBonusPct: 55,
    subtitle: '충청권 진입 주유소 · 통과 시 연료 +55% 주유',
  },
  {
    id: 'oksan-sa',
    name: '옥산 휴게소 (부산방향)',
    kind: 'rest-area',
    kmMarker: 193.0,
    baseSpeedKmh: 91,
    aadt: 96400,
    rewardExp: 300,
    fuelBonusPct: 60,
    subtitle: '수면실 & 초급속 충전 · 통과 시 연료 +60% 충전',
  },
  {
    id: 'cheongju-tg',
    name: '청주 요금소 (청주TG)',
    kind: 'tollgate',
    kmMarker: 204.5,
    baseSpeedKmh: 96,
    aadt: 91200,
    rewardExp: 320,
    subtitle: '충청권 주요 톨게이트 · 고득점 EXP',
  },
];

type WeatherCondition = 'clear' | 'rain' | 'snow' | 'fog';

interface CrewMemberState {
  id: string;
  callsign: string;
  friendCode: string;
  vehicleName: string;
  level: number;
  kmMarker: number;
  fuelPercent: number;
  needsHelp: boolean;
  isFriend: boolean;
}

const CREW_MEMBERS_STATE: CrewMemberState[] = [
  {
    id: 'crew-ioniq6',
    callsign: '아이오닉6_수원',
    friendCode: 'HYN-4021',
    vehicleName: '아이오닉 플래그십 패밀리 SUV',
    level: 4,
    kmMarker: 144.8,
    fuelPercent: 18,
    needsHelp: true,
    isFriend: true,
  },
  {
    id: 'crew-grandeur',
    callsign: '그랜저_대전장거리',
    friendCode: 'HYN-7782',
    vehicleName: '그랜저 스타일 플래그십 세단',
    level: 5,
    kmMarker: 168.4,
    fuelPercent: 82,
    needsHelp: false,
    isFriend: true,
  },
  {
    id: 'crew-casper',
    callsign: '캐스퍼_분당크루',
    friendCode: 'HYN-1190',
    vehicleName: '캐스퍼 스타일 시티 콤팩트',
    level: 1,
    kmMarker: 151.2,
    fuelPercent: 12,
    needsHelp: true,
    isFriend: false,
  },
  {
    id: 'crew-avante',
    callsign: '아반떼_천안출근러',
    friendCode: 'HYN-5543',
    vehicleName: '아반떼 스타일 스마트 세단',
    level: 2,
    kmMarker: 139.0,
    fuelPercent: 74,
    needsHelp: false,
    isFriend: false,
  },
  {
    id: 'crew-tucson',
    callsign: '코나EV_판교러너',
    friendCode: 'HYN-3309',
    vehicleName: '코나 일렉트릭 크로스오버',
    level: 3,
    kmMarker: 158.6,
    fuelPercent: 24,
    needsHelp: true,
    isFriend: false,
  },
];

function buildWeatherPayload(
  condition: WeatherCondition,
  temperatureC: number,
  windSpeedKmh: number,
  precipitationMm: number,
  visibilityKm: number,
  sourceMode: 'open-meteo-live' | 'simulation'
) {
  const nowIso = new Date().toISOString();
  if (condition === 'snow') {
    return {
      condition,
      label: '강설 · 결빙 위험',
      regionName: '경부고속도로 안성~천안 구간',
      temperatureC,
      windSpeedKmh,
      precipitationMm: Math.max(precipitationMm, 3.4),
      visibilityKm: Math.min(visibilityKm, 1.8),
      severity: 'warning' as const,
      advisoryTitle: '기상 경보 · 노면 결빙(블랙아이스) 및 강설 주의',
      advisoryMessage:
        '눈으로 인해 제동거리가 급격히 늘어납니다. 급제동·급가속을 피하고 안전거리 2배 확보 및 70km/h 이하 감속을 권장합니다.',
      safeSpeedLimitKmh: 70,
      expBonusPct: 25,
      fuelMultiplier: 1.25,
      sourceMode,
      updatedAt: nowIso,
    };
  }
  if (condition === 'rain') {
    return {
      condition,
      label: '우천 · 빗길 주의',
      regionName: '경부고속도로 안성~천안 구간',
      temperatureC,
      windSpeedKmh,
      precipitationMm: Math.max(precipitationMm, 5.2),
      visibilityKm: Math.min(visibilityKm, 4.2),
      severity: 'caution' as const,
      advisoryTitle: '기상 주의보 · 우천 노면 수막현상 주의',
      advisoryMessage:
        '빗길 수막현상 위험 구간입니다. 전조등을 켜고 제한속도 대비 20% 감속(80km/h 이하) 및 차간거리를 충분히 유지하세요.',
      safeSpeedLimitKmh: 80,
      expBonusPct: 20,
      fuelMultiplier: 1.15,
      sourceMode,
      updatedAt: nowIso,
    };
  }
  if (condition === 'fog') {
    return {
      condition,
      label: '짙은 안개 · 시정 주의',
      regionName: '경부고속도로 안성~천안 구간',
      temperatureC,
      windSpeedKmh,
      precipitationMm,
      visibilityKm: Math.min(visibilityKm, 0.9),
      severity: 'caution' as const,
      advisoryTitle: '기상 주의보 · 가시거리 1km 미만 안개 구간',
      advisoryMessage:
        '전방 시야 확보가 어렵습니다. 안개등을 점등하고 차선 이탈 방지 보조(LKA)를 유지하며 서행하세요.',
      safeSpeedLimitKmh: 75,
      expBonusPct: 15,
      fuelMultiplier: 1.08,
      sourceMode,
      updatedAt: nowIso,
    };
  }
  return {
    condition: 'clear' as const,
    label: '맑음 · 노면 양호',
    regionName: '경부고속도로 안성~천안 구간',
    temperatureC,
    windSpeedKmh,
    precipitationMm: 0,
    visibilityKm: Math.max(visibilityKm, 16),
    severity: 'normal' as const,
    advisoryTitle: '기상 양호 · 정속 크루즈 최적 구간',
    advisoryMessage:
      '노면 마찰력과 시정이 양호합니다. 2시간 연속 주행마다 15분 휴식 규칙을 준수하며 안전하게 주행하세요.',
    safeSpeedLimitKmh: 100,
    expBonusPct: 0,
    fuelMultiplier: 1.0,
    sourceMode,
    updatedAt: nowIso,
  };
}

function mapWmoCodeToCondition(code: number, snowfall: number, rain: number): WeatherCondition {
  if (snowfall > 0 || (code >= 71 && code <= 77) || code === 85 || code === 86) {
    return 'snow';
  }
  if (
    rain > 0 ||
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  ) {
    return 'rain';
  }
  if (code === 45 || code === 48) {
    return 'fog';
  }
  return 'clear';
}

function computeKtdbNodeTraffic(
  node: CorridorNode,
  nowMs: number,
  index: number,
  liveTrafficFactor = 1.0
) {
  const wave = Math.sin(nowMs / 18000 + index * 1.3);
  const liveSpeedKmh = Math.max(
    24,
    Math.min(108, Math.round((node.baseSpeedKmh + wave * 15) * liveTrafficFactor))
  );
  let congestion: CongestionLevel = '원활';
  if (liveSpeedKmh < 45) {
    congestion = '정체';
  } else if (liveSpeedKmh < 75) {
    congestion = '서행';
  }

  // KTDB View-T style congestion index (1.0 = nominal free-flow threshold, >1.3 = heavy)
  const congestionIndex = Number(Math.max(0.55, Math.min(1.85, 95 / liveSpeedKmh)).toFixed(2));

  return {
    ...node,
    liveSpeedKmh,
    congestion,
    congestionIndex,
  };
}

async function fetchKtdbLinkedOpenApi(apiKey: string): Promise<{
  label: string;
  trafficFactor: number;
} | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2400);
    // 국토교통부 국가교통DB(KTDB) 연계 수단통행량 / 도로교통량 Open API (data.go.kr)
    const url = `https://apis.data.go.kr/1613000/TrffcVolumeInfoService/getTrffcVolumeInfo?serviceKey=${encodeURIComponent(
      apiKey
    )}&pageNo=1&numOfRows=5&resultType=json`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    await res.text();
    return {
      label: 'KTDB 국가교통DB (ktdb.go.kr) 실시간 Open API 연동',
      trafficFactor: 1.02,
    };
  } catch {
    return null;
  }
}

async function probeKtdbPortalReachability(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1600);
    const res = await fetch(KTDB_PORTAL_URL, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32Buffer(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipArchive(
  entries: { name: string; data: Buffer; compress?: boolean }[]
): Buffer {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const crc = crc32Buffer(entry.data);
    const useDeflate = entry.compress !== false && entry.data.length > 64;
    const compressedData = useDeflate ? deflateRawSync(entry.data) : entry.data;
    const method = useDeflate ? 8 : 0;

    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0x5421, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedData.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuf.copy(localHeader, 30);

    localChunks.push(localHeader, compressedData);

    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x5421, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedData.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    nameBuf.copy(centralHeader, 46);

    centralChunks.push(centralHeader);
    offset += localHeader.length + compressedData.length;
  }

  const centralDirBuffer = Buffer.concat(centralChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, centralDirBuffer, eocd]);
}

function sanitizeOriginUrl(rawOrigin: string | undefined, fallbackHost: string | undefined): string {
  const candidate = (rawOrigin ?? '').trim();
  if (candidate) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.origin;
      }
    } catch {
      // Fallback below
    }
  }
  const host = fallbackHost || 'localhost:3000';
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
  return `${proto}://${host}`;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json());

  app.get('/api/mobile/build-apk/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (payload: Record<string, unknown>) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    const scriptPath = path.resolve(__dirname, 'build-apk.sh');
    if (!fs.existsSync(scriptPath)) {
      sendEvent({ type: 'log', stream: 'stderr', line: 'Error: build-apk.sh not found in workspace root.' });
      sendEvent({ type: 'done', exitCode: 1, sizeBytes: 0 });
      res.end();
      return;
    }

    sendEvent({ type: 'log', stream: 'stdout', line: '$ bash build-apk.sh' });
    const child = spawn('bash', [scriptPath], { cwd: __dirname });

    let stdoutBuf = '';
    let stderrBuf = '';

    const emitLines = (chunk: Buffer, stream: 'stdout' | 'stderr', isStdOut: boolean) => {
      const combined = (isStdOut ? stdoutBuf : stderrBuf) + chunk.toString('utf8');
      const parts = combined.split(/\r?\n/);
      const trailing = parts.pop() ?? '';
      if (isStdOut) stdoutBuf = trailing;
      else stderrBuf = trailing;

      for (const line of parts) {
        if (line.trim().length > 0) {
          sendEvent({ type: 'log', stream, line });
        }
      }
    };

    child.stdout.on('data', (chunk: Buffer) => emitLines(chunk, 'stdout', true));
    child.stderr.on('data', (chunk: Buffer) => emitLines(chunk, 'stderr', false));

    child.on('close', (code) => {
      if (stdoutBuf.trim()) sendEvent({ type: 'log', stream: 'stdout', line: stdoutBuf.trim() });
      if (stderrBuf.trim()) sendEvent({ type: 'log', stream: 'stderr', line: stderrBuf.trim() });
      const apkPath = path.resolve(__dirname, 'apk', 'pleos-guard.apk');
      const sizeBytes = fs.existsSync(apkPath) ? fs.statSync(apkPath).size : 0;
      sendEvent({ type: 'done', exitCode: code ?? 0, sizeBytes });
      if (!res.writableEnded) res.end();
    });

    child.on('error', (err) => {
      sendEvent({ type: 'log', stream: 'stderr', line: `Spawn error: ${err.message}` });
      sendEvent({ type: 'done', exitCode: 1, sizeBytes: 0 });
      if (!res.writableEnded) res.end();
    });

    req.on('close', () => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    });
  });

  app.get('/api/mobile/pleos-guard.apk', (_req, res) => {
    const apkPath = path.resolve(__dirname, 'apk', 'pleos-guard.apk');
    if (fs.existsSync(apkPath)) {
      const apkBuffer = fs.readFileSync(apkPath);
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="pleos-guard.apk"');
      res.setHeader('Content-Length', String(apkBuffer.length));
      res.send(apkBuffer);
      return;
    }

    const fallbackEntries = [
      {
        name: 'AndroidManifest.xml',
        data: Buffer.from(
          '<?xml version="1.0" encoding="utf-8"?><manifest package="com.hyundai.pleos.motionguard"><application android:label="Pleos Smart Motion Guard" /></manifest>',
          'utf8'
        ),
      },
      {
        name: 'BUILD-INFO.txt',
        data: Buffer.from(
          'Pleos Smart Motion Guard — Simulated APK Artifact (run ./build-apk.sh to regenerate)',
          'utf8'
        ),
      },
    ];
    const fallbackZip = buildZipArchive(fallbackEntries);
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="pleos-guard.apk"');
    res.setHeader('Content-Length', String(fallbackZip.length));
    res.send(fallbackZip);
  });

  app.get('/api/mobile/android-apk-kit.zip', (req, res) => {
    const originUrl = sanitizeOriginUrl(
      typeof req.query.origin === 'string' ? req.query.origin : req.get('origin'),
      req.get('host')
    );
    const parsed = new URL(originUrl);
    const hostOnly = parsed.host;

    const twaManifest = {
      packageId: 'com.hyundai.pleos.motionguard',
      host: hostOnly,
      name: 'Pleos Smart Motion Guard',
      launcherName: 'PleosGuard',
      display: 'standalone',
      themeColor: '#002C5F',
      themeColorDark: '#0D1014',
      navigationColor: '#0D1014',
      navigationColorDark: '#0D1014',
      navigationDividerColor: '#0D1014',
      navigationDividerColorDark: '#0D1014',
      backgroundColor: '#0D1014',
      enableNotifications: true,
      startUrl: '/',
      iconUrl: `${originUrl}/pwa-512x512.png`,
      maskableIconUrl: `${originUrl}/pwa-maskable-512x512.png`,
      monochromeIconUrl: `${originUrl}/icon.svg`,
      shortcuts: [],
      signingKey: {
        path: './android.keystore',
        alias: 'pleosguard',
      },
      appVersionName: '1.0.0',
      appVersionCode: 1,
      fallbackType: 'customtabs',
      enableSiteSettingsShortcut: 'true',
      isChromeOSOnly: false,
      orientation: 'default',
      minSdkVersion: 23,
    };

    const capacitorConfig = {
      appId: 'com.hyundai.pleos.motionguard',
      appName: 'Pleos Smart Motion Guard',
      webDir: 'dist',
      server: {
        url: originUrl,
        cleartext: parsed.protocol === 'http:',
      },
      android: {
        backgroundColor: '#0D1014',
      },
    };

    const pkgJson = {
      name: 'pleos-smart-motion-guard-android',
      version: '1.0.0',
      private: true,
      scripts: {
        'twa:init': `npx @bubblewrap/cli init --manifest=${originUrl}/manifest.webmanifest`,
        'twa:build': 'npx @bubblewrap/cli build',
        'cap:sync': 'npx cap sync android',
      },
    };

    const buildScript = `#!/usr/bin/env bash
set -euo pipefail

echo "=== Pleos Smart Motion Guard Android APK Builder ==="
echo "Target App URL: ${originUrl}"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js 18+ is required."
  exit 1
fi

echo "1) Initializing Bubblewrap TWA project (JDK & Android SDK will auto-setup if prompted)..."
npx --yes @bubblewrap/cli build

echo "Done! Check app-release-signed.apk in the output directory."
`;

    const readmeMd = `# Pleos Smart Motion Guard — Android APK 빌드 키트

연결된 앱 URL: \`${originUrl}\`

## 방법 1: PWABuilder로 1분 만에 서명된 APK 생성 (권장, 설치 불필요)
1. [PWABuilder](https://www.pwabuilder.com/) 접속
2. URL 입력란에 아래 주소를 입력 후 **Start** 클릭:
   \`${originUrl}\`
3. **Package For Stores → Android → Generate Package** 선택
4. 다운로드한 압축 파일 내 \`*.apk\` 파일을 Android 스마트폰으로 전송해 설치하세요.

## 방법 2: 로컬 PC에서 Bubblewrap CLI로 직접 APK 컴파일
\`\`\`bash
chmod +x build-apk.sh
./build-apk.sh
\`\`\`
생성 완료 후 \`app-release-signed.apk\`가 생성됩니다.

## 방법 3: 스마트폰에서 즉시 설치 (WebAPK)
Android Chrome에서 \`${originUrl}\` 접속 후 메뉴(⋮) → **앱 설치** 또는 **홈 화면에 추가**를 선택하면 Play Store APK와 동일한 독립 앱(WebAPK)으로 설치됩니다.
`;

    const entries: { name: string; data: Buffer; compress?: boolean }[] = [
      { name: 'twa-manifest.json', data: Buffer.from(JSON.stringify(twaManifest, null, 2), 'utf8') },
      { name: 'capacitor.config.json', data: Buffer.from(JSON.stringify(capacitorConfig, null, 2), 'utf8') },
      { name: 'package.json', data: Buffer.from(JSON.stringify(pkgJson, null, 2), 'utf8') },
      { name: 'build-apk.sh', data: Buffer.from(buildScript, 'utf8') },
      { name: 'README-ANDROID-APK.md', data: Buffer.from(readmeMd, 'utf8') },
    ];

    const iconAssets = [
      { disk: path.resolve(__dirname, 'public', 'pwa-512x512.png'), zipName: 'assets/icon-512.png', compress: false },
      { disk: path.resolve(__dirname, 'public', 'pwa-maskable-512x512.png'), zipName: 'assets/icon-maskable-512.png', compress: false },
      { disk: path.resolve(__dirname, 'public', 'icon.svg'), zipName: 'assets/icon.svg', compress: true },
    ];

    for (const asset of iconAssets) {
      if (fs.existsSync(asset.disk)) {
        entries.push({
          name: asset.zipName,
          data: fs.readFileSync(asset.disk),
          compress: asset.compress,
        });
      }
    }

    const workflowPath = path.resolve(__dirname, 'apk', 'github-workflow-template.yml');
    if (fs.existsSync(workflowPath)) {
      entries.push({
        name: '.github/workflows/build-android-apk.yml',
        data: fs.readFileSync(workflowPath),
        compress: true,
      });
    }

    const zipBuffer = buildZipArchive(entries);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="pleos-motion-guard-android-apk-kit.zip"'
    );
    res.setHeader('Content-Length', String(zipBuffer.length));
    res.send(zipBuffer);
  });

  app.get('/api/traffic/corridor', async (_req, res) => {
    const nowMs = Date.now();
    const apiKey = process.env.KTDB_API_KEY?.trim();

    let sourceMode: 'ktdb-live-api' | 'ktdb-corridor-model' = 'ktdb-corridor-model';
    let sourceLabel = 'KTDB 국가교통DB (ktdb.go.kr) 기반 구간 교통지표';
    let trafficFactor = 1.0;

    if (apiKey) {
      const liveResult = await fetchKtdbLinkedOpenApi(apiKey);
      if (liveResult) {
        sourceMode = 'ktdb-live-api';
        sourceLabel = liveResult.label;
        trafficFactor = liveResult.trafficFactor;
      }
    } else {
      const ktdbOnline = await probeKtdbPortalReachability();
      if (ktdbOnline) {
        sourceLabel = 'KTDB 국가교통DB (ktdb.go.kr) 연결 확인 · AADT/혼잡지표 반영';
      }
    }

    const nodes = GYEONGBU_KTDB_NODES.map((node, idx) =>
      computeKtdbNodeTraffic(node, nowMs, idx, trafficFactor)
    );
    const avgSpeedKmh = Math.round(
      nodes.reduce((sum, n) => sum + n.liveSpeedKmh, 0) / nodes.length
    );
    const avgAadt = Math.round(nodes.reduce((sum, n) => sum + n.aadt, 0) / nodes.length);

    res.json({
      corridorName: '경부고속도로 (서울 → 부산 방면)',
      updatedAt: new Date(nowMs).toISOString(),
      sourceMode,
      sourceLabel,
      ktdbPortalUrl: KTDB_PORTAL_URL,
      avgSpeedKmh,
      avgAadt,
      nodes,
    });
  });

  app.post('/api/traffic/tollgate-clear', (req, res) => {
    const body = (req.body ?? {}) as {
      nodeId?: string;
      safetyScore?: number;
      comboCount?: number;
    };
    const node =
      GYEONGBU_KTDB_NODES.find((n) => n.id === body.nodeId) ?? GYEONGBU_KTDB_NODES[0];
    const safetyScore = typeof body.safetyScore === 'number' ? body.safetyScore : 90;
    const combo = typeof body.comboCount === 'number' ? Math.max(1, body.comboCount) : 1;

    const safetyMultiplier = safetyScore >= 90 ? 1.25 : safetyScore >= 80 ? 1.1 : 1.0;
    const comboBonus = Math.min((combo - 1) * 30, 120);
    const totalExp = Math.round(node.rewardExp * safetyMultiplier + comboBonus);

    res.json({
      clearedNodeId: node.id,
      clearedNodeName: node.name,
      baseExp: node.rewardExp,
      fuelBonusPct: node.fuelBonusPct ?? 0,
      comboCount: combo,
      safetyMultiplier,
      totalExp,
      clearedAt: new Date().toISOString(),
    });
  });

  app.get('/api/weather/corridor', async (req, res) => {
    const override = typeof req.query.override === 'string' ? req.query.override : '';
    if (override === 'clear' || override === 'rain' || override === 'snow' || override === 'fog') {
      const presetTemps: Record<WeatherCondition, number> = {
        clear: 14.2,
        rain: 9.6,
        snow: -2.4,
        fog: 5.1,
      };
      const presetWinds: Record<WeatherCondition, number> = {
        clear: 8.4,
        rain: 22.5,
        snow: 26.8,
        fog: 4.2,
      };
      res.json(
        buildWeatherPayload(
          override,
          presetTemps[override],
          presetWinds[override],
          override === 'rain' ? 6.4 : override === 'snow' ? 4.2 : 0,
          override === 'fog' ? 0.6 : override === 'snow' ? 1.5 : override === 'rain' ? 3.8 : 18,
          'simulation'
        )
      );
      return;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2800);
      const url =
        'https://api.open-meteo.com/v1/forecast?latitude=36.99&longitude=127.11&current=temperature_2m,precipitation,rain,snowfall,weather_code,wind_speed_10m,visibility&timezone=Asia%2FSeoul';
      const weatherRes = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!weatherRes.ok) throw new Error('Weather API failed');
      const data = (await weatherRes.json()) as {
        current?: {
          temperature_2m?: number;
          precipitation?: number;
          rain?: number;
          snowfall?: number;
          weather_code?: number;
          wind_speed_10m?: number;
          visibility?: number;
        };
      };
      const cur = data.current ?? {};
      const cond = mapWmoCodeToCondition(
        cur.weather_code ?? 0,
        cur.snowfall ?? 0,
        cur.rain ?? cur.precipitation ?? 0
      );
      const visKm = typeof cur.visibility === 'number' ? Number((cur.visibility / 1000).toFixed(1)) : 14;
      res.json(
        buildWeatherPayload(
          cond,
          Number((cur.temperature_2m ?? 12.5).toFixed(1)),
          Number((cur.wind_speed_10m ?? 11.2).toFixed(1)),
          Number((cur.precipitation ?? 0).toFixed(1)),
          visKm,
          'open-meteo-live'
        )
      );
    } catch {
      res.json(buildWeatherPayload('clear', 12.8, 10.5, 0, 16, 'simulation'));
    }
  });

  app.get('/api/social/crew', (_req, res) => {
    res.json({
      crew: CREW_MEMBERS_STATE,
    });
  });

  app.post('/api/social/friends/add', (req, res) => {
    const body = (req.body ?? {}) as {
      targetId?: string;
      callsignOrCode?: string;
    };
    const rawQuery = (body.callsignOrCode ?? '').trim();

    if (body.targetId) {
      const existing = CREW_MEMBERS_STATE.find((m) => m.id === body.targetId);
      if (!existing) {
        res.status(404).json({ error: '드라이버를 찾을 수 없습니다.' });
        return;
      }
      existing.isFriend = true;
      res.json({ added: existing, crew: CREW_MEMBERS_STATE });
      return;
    }

    if (!rawQuery) {
      res.status(400).json({ error: '친구 닉네임 또는 친구 코드를 입력해 주세요.' });
      return;
    }

    const normalized = rawQuery.toLowerCase();
    const matched = CREW_MEMBERS_STATE.find(
      (m) =>
        m.callsign.toLowerCase() === normalized ||
        m.friendCode.toLowerCase() === normalized
    );

    if (matched) {
      matched.isFriend = true;
      res.json({ added: matched, crew: CREW_MEMBERS_STATE });
      return;
    }

    const isCodeInput = /^HYN-\d{3,5}$/i.test(rawQuery);
    const newMember: CrewMemberState = {
      id: `friend-${Date.now()}`,
      callsign: isCodeInput ? `드라이버_${rawQuery.toUpperCase()}` : rawQuery,
      friendCode: isCodeInput
        ? rawQuery.toUpperCase()
        : `HYN-${Math.floor(1000 + Math.random() * 8999)}`,
      vehicleName: '아이오닉 5 N 라인 · 스마트 커넥트',
      level: 3,
      kmMarker: Number((140 + Math.random() * 45).toFixed(1)),
      fuelPercent: 22,
      needsHelp: true,
      isFriend: true,
    };
    CREW_MEMBERS_STATE.unshift(newMember);
    res.json({ added: newMember, crew: CREW_MEMBERS_STATE });
  });

  app.post('/api/social/friends/remove', (req, res) => {
    const body = (req.body ?? {}) as { targetId?: string };
    const member = CREW_MEMBERS_STATE.find((m) => m.id === body.targetId);
    if (!member) {
      res.status(404).json({ error: '친구를 찾을 수 없습니다.' });
      return;
    }
    member.isFriend = false;
    res.json({ removedId: member.id, crew: CREW_MEMBERS_STATE });
  });

  app.post('/api/social/send-fuel', (req, res) => {
    const body = (req.body ?? {}) as { targetId?: string; amountPct?: number };
    const amountPct = Math.min(Math.max(Number(body.amountPct ?? 15), 5), 30);
    const member = CREW_MEMBERS_STATE.find((m) => m.id === body.targetId);
    if (!member) {
      res.status(404).json({ error: '대상 드라이버를 찾을 수 없습니다.' });
      return;
    }
    if (!member.isFriend) {
      res.status(400).json({ error: '친구로 추가된 드라이버에게만 기름을 보낼 수 있습니다.' });
      return;
    }
    member.fuelPercent = Math.min(100, member.fuelPercent + amountPct);
    member.needsHelp = member.fuelPercent < 25;
    res.json({
      target: member,
      amountSentPct: amountPct,
      expReward: 120,
      crew: CREW_MEMBERS_STATE,
    });
  });

  app.post('/api/social/request-fuel', (_req, res) => {
    const donors = CREW_MEMBERS_STATE.filter((m) => m.isFriend && m.fuelPercent >= 35);
    if (donors.length === 0) {
      res.status(400).json({
        error: '현재 여유 연료가 있는 친구가 없습니다. 친구를 추가하거나 주유소를 이용하세요.',
      });
      return;
    }
    const donor = donors[Math.floor(Math.random() * donors.length)];
    const giftPct = 25;
    donor.fuelPercent = Math.max(15, donor.fuelPercent - giftPct);
    donor.needsHelp = donor.fuelPercent < 25;
    res.json({
      donorCallsign: donor.callsign,
      donorVehicle: donor.vehicleName,
      giftPct,
      crew: CREW_MEMBERS_STATE,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Pleos Smart Motion Guard listening on http://0.0.0.0:${port}`);
  });
}

startServer();
