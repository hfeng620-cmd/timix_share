$ErrorActionPreference = "Continue"

function Test-Command($Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) {
    Write-Host "[OK] $Name -> $($cmd.Source)" -ForegroundColor Green
    return $true
  }
  Write-Host "[MISS] $Name not found in PATH" -ForegroundColor Yellow
  return $false
}

Write-Host "TiMix Android build environment check" -ForegroundColor Cyan
Write-Host ""

$javaOk = Test-Command "java"
$javacOk = Test-Command "javac"

if ($env:JAVA_HOME) {
  Write-Host "[OK] JAVA_HOME=$env:JAVA_HOME" -ForegroundColor Green
} else {
  Write-Host "[MISS] JAVA_HOME is not set" -ForegroundColor Yellow
}

$androidHome = $env:ANDROID_HOME
if (-not $androidHome) { $androidHome = $env:ANDROID_SDK_ROOT }
if ($androidHome) {
  Write-Host "[OK] Android SDK=$androidHome" -ForegroundColor Green
} else {
  Write-Host "[MISS] ANDROID_HOME / ANDROID_SDK_ROOT is not set" -ForegroundColor Yellow
}

$adbOk = Test-Command "adb"
$sdkmanagerOk = Test-Command "sdkmanager"

$gradlew = Join-Path (Resolve-Path ".") "android\gradlew.bat"
if (Test-Path $gradlew) {
  Write-Host "[OK] Gradle wrapper found: $gradlew" -ForegroundColor Green
} else {
  Write-Host "[MISS] android\gradlew.bat not found" -ForegroundColor Yellow
}

Write-Host ""
if ($javaOk -and $javacOk -and $env:JAVA_HOME -and $androidHome -and $adbOk) {
  Write-Host "Ready enough to try: npm run mobile:apk:debug" -ForegroundColor Green
} else {
  Write-Host "Install JDK 17+ and Android SDK before building APK." -ForegroundColor Yellow
  Write-Host "Required: JAVA_HOME, Android SDK Platform 36, Build Tools, Platform Tools." -ForegroundColor Yellow
}
