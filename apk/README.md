# Pleos Smart Motion Guard — Android APK 폴더 (`apk/`)

이 폴더에는 Android `.apk` 빌드를 위한 **Capacitor / TWA(Bubblewrap) 설정 파일과 빌드 스크립트**, 그리고 시뮬레이션 빌드 아티팩트(`pleos-guard.apk`)가 포함되어 있습니다.

## 1. 로컬 PC에서 실제 `.apk` 빌드하는 방법
Node.js 18+, Java 17+, Android SDK가 설치된 환경에서 루트의 `build-apk.sh` 또는 `apk/build-apk.sh`를 실행하면 `apk/pleos-smart-motion-guard.apk`가 생성됩니다.

```bash
chmod +x build-apk.sh
./build-apk.sh
```

## 2. GitHub Actions로 자동 `.apk` 빌드 추가하기
일부 GitHub 앱 연동 환경에서는 보안상 `.github/workflows/` 푸시 권한(`workflows`)이 제한될 수 있어 워크플로우 템플릿을 **`apk/github-workflow-template.yml`**에 저장해 두었습니다.
1. GitHub 웹 저장소에서 **Add file → Create new file** 클릭
2. 경로에 `.github/workflows/build-android-apk.yml` 입력
3. `apk/github-workflow-template.yml` 내용을 복사해 커밋
4. **Actions → Build Android APK** 실행 시 실제 설치 가능한 `.apk` 파일이 Artifacts에 생성됩니다.

## 3. 설치 없이 즉시 스마트폰 앱으로 사용 (WebAPK)
Android Chrome에서 앱 URL에 접속해 우측 상단 **메뉴(⋮) → 앱 설치**를 선택하면 Play 스토어 APK와 동일한 독립 실행 앱(WebAPK)으로 즉시 설치됩니다.
