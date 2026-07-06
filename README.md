# 超级座位图 Super Seat Map

从"花生宠物教学助手"独立出来的班级座位管理工具。

## 功能

- 多班级管理（支持3个班级）
- 拖拽式座位排列（6x8 默认网格）
- 学生管理（单个添加 / 批量导入）
- 违纪 / 表扬记录（附历史备注）
- 学困学科标记
- 统计面板（雷达图 + 柱状图）
- 随机点名
- 深色/浅色主题自适应
- 中英文双语界面
- 数据保存在本地（localStorage）

## 项目结构

```
super-seat-map/
├── src/
│   ├── renderer/          # React 前端
│   │   ├── index.html     # 入口 HTML
│   │   ├── index.tsx      # React 入口
│   │   ├── App.tsx        # 主组件
│   │   └── components/
│   │       └── SeatingChart.tsx  # 座位图核心组件
│   └── main/
│       ├── main.ts        # Electron 主进程源码
│       └── preload.ts
├── dist/                  # 构建产物
│   ├── main/              # Electron 主进程 (JS)
│   └── renderer/          # Web 前端
├── android/               # Android WebView 项目
│   └── app/src/main/
│       ├── java/com/superseatmap/MainActivity.java
│       ├── AndroidManifest.xml
│       └── assets/        # 构建后的前端文件
├── assets/icons/          # 应用图标
├── package.json
├── vite.config.ts
└── build-android.bat      # Android 构建脚本
```

## 构建与运行

### Windows 桌面版 (Electron)

前置条件: Node.js 18+

```bash
# 安装依赖
npm install

# 开发模式（Web 预览）
npm run dev

# 构建 + 启动 Electron
npm run build && npm start

# 打包为 Windows 安装程序 (.exe)
npm run dist:win
```

打包后的 exe 在 `release/` 目录下。

### Android 版 (WebView)

前置条件: Android Studio + JDK 17+

```bash
# 1. 构建 Web 前端并复制到 Android assets
build-android.bat

# 2. 用 Android Studio 打开 android/ 目录
# 3. Build > Build Bundle(s) / APK(s) > Build APK
#    或运行: cd android && gradlew assembleRelease
# 4. APK 在 android/app/build/outputs/apk/release/
```

## 数据

所有数据存储在你的设备本地（浏览器 localStorage / WebView 本地存储），不会上传到任何服务器。
