<#
.SYNOPSIS
    Install the "research" (科研工作站) agent preset into DeepSeek Harness (DSH).
.DESCRIPTION
    Copies the preset (agent.cordis.yml + preset.yml + skills/) into the DSH
    user preset root (~/.dsh/.agent-presets/research), and optionally installs
    the bundled tools (mem, pdfread) into a directory on PATH.
    After install, open DSH, create a new session, and pick "科研工作站".
.PARAMETER SkipTools
    Do not install the bundled mem/pdfread tools.
.PARAMETER ToolDir
    Directory to install bundled tools into (default: $HOME\bin, which is
    typically already on PATH).
.EXAMPLE
    .\install-windows.ps1
    .\install-windows.ps1 -SkipTools
#>
param(
    [switch]$SkipTools,
    [string]$ToolDir = "$HOME\bin"
)

$ErrorActionPreference = 'Stop'

# Force UTF-8 console output so Chinese messages render correctly.
try {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
    $OutputEncoding = [System.Text.UTF8Encoding]::new()
} catch { }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PresetSrc = Join-Path $ScriptDir 'preset'
$ToolsSrc  = Join-Path $ScriptDir 'tools'

try {
    $DshHome = if (-not [string]::IsNullOrWhiteSpace($env:DSH_HOME)) { $env:DSH_HOME.Trim() } else { Join-Path $HOME '.dsh' }
    $PresetRoot = Join-Path $DshHome '.agent-presets'
    $PresetDst  = Join-Path $PresetRoot 'research'

    Write-Host "==> Installing 'research' preset to $PresetDst" -ForegroundColor Cyan
    if (-not (Test-Path -LiteralPath $PresetSrc)) { throw "preset directory not found: $PresetSrc" }
    New-Item -ItemType Directory -Force -Path $PresetRoot | Out-Null
    if (Test-Path -LiteralPath $PresetDst) {
        Write-Host "    Existing preset found at $PresetDst — overwriting." -ForegroundColor Yellow
        try {
            Remove-Item -LiteralPath $PresetDst -Recurse -Force -ErrorAction Stop
        } catch {
            # Retry: clear read-only/hidden attributes first, then use .NET delete.
            Get-ChildItem -LiteralPath $PresetDst -Recurse -Force -ErrorAction SilentlyContinue |
                ForEach-Object { try { $_.Attributes = 'Normal' } catch { } }
            [System.IO.Directory]::Delete($PresetDst, $true)
        }
    }
    New-Item -ItemType Directory -Force -Path $PresetDst | Out-Null
    # `-Path` (not -LiteralPath) so the '*' wildcard expands; copy contents into the
    # pre-created target to avoid a `preset\preset` nesting.
    Copy-Item -Path (Join-Path $PresetSrc '*') -Destination $PresetDst -Recurse -Force
    $skillCount = (Get-ChildItem -LiteralPath $PresetDst -Recurse -Filter 'SKILL.md').Count
    Write-Host "    OK: $skillCount skills installed." -ForegroundColor Green

    if (-not $SkipTools) {
        Write-Host "==> Installing bundled tools to $ToolDir" -ForegroundColor Cyan
        if ((Resolve-Path -LiteralPath $ToolDir -ErrorAction SilentlyContinue).Path -ieq (Resolve-Path -LiteralPath $ToolsSrc).Path) {
            throw "ToolDir cannot be the repository's own tools directory."
        }
        New-Item -ItemType Directory -Force -Path $ToolDir | Out-Null
        Copy-Item -Force (Join-Path $ToolsSrc 'mem.cmd'),  (Join-Path $ToolsSrc 'mem.js')   -Destination $ToolDir
        Copy-Item -Force (Join-Path $ToolsSrc 'pdfread.cmd'), (Join-Path $ToolsSrc 'pdfread.py') -Destination $ToolDir
        Write-Host "    OK: mem + pdfread installed." -ForegroundColor Green

        $ToolDirNorm = $ToolDir.Trim().TrimEnd('\')
        $inPath = [bool](($env:PATH -split ';') |
            ForEach-Object { $_.Trim().TrimEnd('\') } |
            Where-Object { $_ -ieq $ToolDirNorm })
        if (-not $inPath) {
            Write-Host "    NOTE: $ToolDir is not on your PATH." -ForegroundColor Yellow
            Write-Host "          Either add it manually, or run: [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path','User') + ';$ToolDir', 'User')" -ForegroundColor Yellow
        }

        # Dependency checks so tools fail loudly at install time, not at first use.
        if (Get-Command node -ErrorAction SilentlyContinue) {
            & node -e "require('node:sqlite')" 2>$null
            if ($LASTEXITCODE -eq 0) { Write-Host "    OK: node $(node -v) (supports node:sqlite)" -ForegroundColor Green }
            else { Write-Host "    WARNING: node $(node -v) is too old — mem requires Node >= 22.13 (or 23.4+)." -ForegroundColor Yellow }
        } else { Write-Host "    WARNING: 'node' not found on PATH — mem will not run (needs Node >= 22.13)." -ForegroundColor Yellow }

        if (Get-Command python -ErrorAction SilentlyContinue) {
            & python -c "import fitz, pdfplumber" 2>$null
            if ($LASTEXITCODE -eq 0) { Write-Host "    OK: python + pymupdf/pdfplumber ready" -ForegroundColor Green }
            else { Write-Host "    WARNING: pymupdf/pdfplumber missing — run: python -m pip install pymupdf pdfplumber" -ForegroundColor Yellow }
        } else { Write-Host "    WARNING: 'python' not found on PATH — pdfread will not run." -ForegroundColor Yellow }
    }

    if (Get-Command officecli -ErrorAction SilentlyContinue) {
        Write-Host "==> officecli already installed — skipping optional hint." -ForegroundColor Green
    } else {
        Write-Host "==> Optional: officecli (third-party, for .docx/.xlsx/.pptx automation)" -ForegroundColor Cyan
        Write-Host "    Install with:  irm https://d.officecli.ai/install.ps1 | iex" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "Done! Open DSH -> New Session -> choose preset 科研工作站 (research)." -ForegroundColor Green
    Write-Host "Optional: copy the .dsh-research/ folder into your working directory to activate the structured research registry." -ForegroundColor Gray
}
catch {
    Write-Host "`nERROR: install failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Common causes: insufficient permission, files locked (close DSH and retry), or a bad DSH_HOME." -ForegroundColor Yellow
    exit 1
}
