@echo off
REM 构建Android版本：先将Web应用构建到android/app/src/main/assets/
echo Building web app for Android...
call npx vite build

echo Copying to Android assets...
if exist android\app\src\main\assets rmdir /s /q android\app\src\main\assets
mkdir android\app\src\main\assets
xcopy /e /i dist\renderer\* android\app\src\main\assets\

echo.
echo Web assets ready. Now open android/ in Android Studio and build the APK.
echo Or run: cd android && gradlew assembleRelease
