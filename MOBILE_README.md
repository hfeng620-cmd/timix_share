# ⚠️ 移动端专用分支

此分支（`mobile-app`）专门用于 Android APK 构建，修改不会影响桌面 Web 版本。

## 📱 分支说明

- **`main`**: 桌面端 Web 版本（生产环境）
- **`mobile-app`**: 移动端 APK 版本（独立开发）

## 🔄 开发流程

### 移动端开发（在 mobile-app 分支）

```bash
git checkout mobile-app
git pull origin mobile-app

# 修改代码...

git add .
git commit -m "fix(mobile): 修复XXX问题"
git push origin mobile-app
```

### 发布移动端 APK

```bash
git checkout mobile-app

# 确保代码已提交
git tag mobile-v1.0.x
git push origin mobile-v1.0.x

# GitHub Actions 自动构建 APK 并发布到 Release
```

## ✅ 已完成的移动端优化

- ✅ Ultimate Mobile App Audit (4阶段)
- ✅ Desktop Purge (450+ hover转换)
- ✅ Touch Ergonomics (44px标准)
- ✅ Modal → Bottom Sheet (11个模态框)
- ✅ Visual Harmony & Safe Areas
- ✅ Feed密度优化
- ✅ Modal对比度修复

## 🚀 构建状态

- 构建触发：推送到 `mobile-app` 分支或打 `mobile-v*` 标签
- 构建平台：GitHub Actions
- 构建产物：TiMix-debug.apk
- 发布位置：GitHub Releases

## 📝 注意事项

1. ⚠️ **不要直接在 main 分支做移动端修改**
2. ⚠️ **所有移动端改动必须在 mobile-app 分支**
3. ✅ 桌面端和移动端现已完全隔离
4. ✅ APK 构建不会影响 main 分支

## 🔗 相关链接

- Releases: https://github.com/hfeng620-cmd/timix_share/releases
- Issues: https://github.com/hfeng620-cmd/timix_share/issues
- 桌面端分支: `main`
- 移动端分支: `mobile-app`
