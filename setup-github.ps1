# Setup GitHub Repository Script
# Author: Kamil Wiliński

param(
    [string]$RepoName = "unity-mcp-advanced",
    [string]$Description = "Advanced Unity MCP integration with 32 tools for Claude Code",
    [switch]$Private = $false
)

Write-Host "🚀 Setting up GitHub repository: $RepoName" -ForegroundColor Green

# Check if GitHub CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ GitHub CLI (gh) is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   winget install GitHub.cli" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in to GitHub
$ghStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to GitHub. Please login first:" -ForegroundColor Red
    Write-Host "   gh auth login" -ForegroundColor Yellow
    exit 1
}

# Create GitHub repository
Write-Host "📁 Creating GitHub repository..." -ForegroundColor Cyan
$visibility = if ($Private) { "private" } else { "public" }

try {
    gh repo create $RepoName --description "$Description" --$visibility --confirm
    Write-Host "✅ Repository created successfully!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to create repository: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Add remote origin
Write-Host "🔗 Adding remote origin..." -ForegroundColor Cyan
try {
    git remote add origin "https://github.com/wilendar/$RepoName.git"
    Write-Host "✅ Remote origin added!" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ Remote origin might already exist, continuing..." -ForegroundColor Yellow
}

# Push to GitHub
Write-Host "⬆️ Pushing to GitHub..." -ForegroundColor Cyan
try {
    git push -u origin master
    Write-Host "✅ Code pushed successfully!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to push: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Setup complete! Repository is now available at:" -ForegroundColor Green
Write-Host "   https://github.com/wilendar/$RepoName" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Add repository topics/tags on GitHub"
Write-Host "   2. Enable GitHub Pages for documentation"
Write-Host "   3. Set up GitHub Actions for CI/CD"
Write-Host "   4. Add contributors and collaborators"
Write-Host ""
Write-Host "🔧 Installation command for users:" -ForegroundColor Magenta
Write-Host "   git clone https://github.com/wilendar/$RepoName.git" -ForegroundColor White