@echo off
REM Build Android version: build web app then copy to assets
echo ===== Building web assets =====
call npx vite build
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

echo ===== Copying to Android assets =====
if exist android\app\src\main\assets rmdir /s /q android\app\src\main\assets
mkdir android\app\src\main\assets
xcopy /e /i dist\renderer\* android\app\src\main\assets\

echo ===== Web assets ready =====
echo.
echo Now open android/ in Android Studio and build the APK.
echo Or run: cd android ^&^& gradlew assembleRelease
echo APK will be at: android/app/build/outputs/apk/release/
