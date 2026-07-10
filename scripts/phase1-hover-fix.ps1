# PHASE 1: Desktop Purge - Batch Hover Fix Script
# 批量移除 hover 状态，转换为 active + md:hover

$files = @(
    "src\components\post-detail-modal.tsx",
    "src\components\community-post-panel.tsx",
    "src\components\forum-post-modal.tsx",
    "src\components\stations-board.tsx",
    "src\components\navbar.tsx",
    "src\components\user-profile-card.tsx",
    "src\components\hot-topics-panel.tsx",
    "src\components\home-live-stations.tsx",
    "src\components\appearance-modal.tsx",
    "src\components\edit-panel-modal.tsx",
    "src\components\station-detail-modal.tsx",
    "src\components\relay-station-detail-modal.tsx",
    "src\components\share-create-modal.tsx",
    "src\components\station-editor-modal.tsx",
    "src\components\station-edit-modal.tsx",
    "src\components\notification-bell.tsx",
    "src\components\global-inbox-modal.tsx",
    "src\components\direct-message-modal.tsx",
    "src\components\drop-claim-modal.tsx",
    "src\components\github-issue-review-panel.tsx",
    "src\components\auth-button.tsx",
    "src\components\admin-drop-manager.tsx",
    "src\components\campaign-admin.tsx",
    "src\components\donate-modal.tsx",
    "src\components\ai-news-submit.tsx",
    "src\components\ai-news-panel.tsx",
    "src\components\announcement-modal.tsx",
    "src\components\announcement-detail-modal.tsx",
    "src\app\admin\page.tsx",
    "src\app\community\page.tsx",
    "src\app\guides\page.tsx",
    "src\app\models\page.tsx",
    "src\app\drops\page.tsx",
    "src\app\legacy\page.tsx",
    "src\app\user\page.tsx",
    "src\app\not-found.tsx"
)

$patterns = @(
    # 标准按钮/链接 hover
    @{
        Find = ' hover:bg-\[var\(--color-([^\]]+)\)\]'
        Replace = (' active:[background-color:var(--color-' + '$1' + ')] md:hover:[background-color:var(--color-' + '$1' + ')]')
    },
    @{
        Find = ' hover:text-\[var\(--color-([^\]]+)\)\]'
        Replace = (' active:[color:var(--color-' + '$1' + ')] md:hover:[color:var(--color-' + '$1' + ')]')
    },
    @{
        Find = ' hover:border-\[var\(--color-([^\]]+)\)\]'
        Replace = (' active:[border-color:var(--color-' + '$1' + ')] md:hover:[border-color:var(--color-' + '$1' + ')]')
    },

    # 通用颜色类
    @{
        Find = ' hover:bg-(white|zinc|slate|gray|red|blue|green)-'
        Replace = (' active:bg-' + '$1' + '- md:hover:bg-' + '$1' + '-')
    },
    @{
        Find = ' hover:text-(white|zinc|slate|gray|red|blue|green)-'
        Replace = (' active:text-' + '$1' + '- md:hover:text-' + '$1' + '-')
    },

    # 不透明度
    @{
        Find = ' hover:opacity-(\d+)'
        Replace = (' active:opacity-' + '$1' + ' md:hover:opacity-' + '$1')
    },

    # 移除装饰性动画
    @{
        Find = ' hover:-translate-y-[\d\.]+'
        Replace = ''
    },
    @{
        Find = ' hover:translate-y-[\d\.]+'
        Replace = ''
    },
    @{
        Find = ' hover:scale-\[[\d\.]+\]'
        Replace = ''
    },

    # group-hover (保留，但添加响应式)
    @{
        Find = ' group-hover:opacity-(\d+)'
        Replace = (' group-active:opacity-' + '$1' + ' md:group-hover:opacity-' + '$1')
    }
)

$totalFixed = 0

foreach ($file in $files) {
    $fullPath = "D:\github\TiMix_Mibille\$file"

    if (-not (Test-Path $fullPath)) {
        Write-Host "⏭️  跳过: $file (文件不存在)" -ForegroundColor Yellow
        continue
    }

    $content = Get-Content $fullPath -Raw -Encoding UTF8
    $originalContent = $content
    $fileFixed = 0

    foreach ($pattern in $patterns) {
        $matches = [regex]::Matches($content, $pattern.Find)
        if ($matches.Count -gt 0) {
            $content = $content -replace $pattern.Find, $pattern.Replace
            $fileFixed += $matches.Count
        }
    }

    if ($content -ne $originalContent) {
        Set-Content $fullPath -Value $content -Encoding UTF8 -NoNewline
        Write-Host "✅ $file - 修复 $fileFixed 处" -ForegroundColor Green
        $totalFixed += $fileFixed
    } else {
        Write-Host "⚪ $file - 无需修改" -ForegroundColor Gray
    }
}

Write-Host "`n📊 总计修复 $totalFixed 处 hover 状态" -ForegroundColor Cyan
Write-Host "🔨 运行 npm run build 验证构建..." -ForegroundColor Cyan

