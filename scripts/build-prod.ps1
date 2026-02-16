Write-Host "Building Production Bundle (Multi-Path)..." -ForegroundColor Yellow

# 1. Clean Dist
if (Test-Path "dist") {
    Remove-Item "dist" -Recurse -Force
}
New-Item -ItemType Directory -Force -Path "dist"

# 2. Build Vite App (Admin/POS)
Write-Host "Building Admin/POS App..." -ForegroundColor Cyan

# Re-run typescript check for safety
Write-Host " running tsc..."
cmd /c "npx tsc --noEmit"
if ($LASTEXITCODE -ne 0) { exit 1 }

# Vite build
Write-Host " running vite build..."
cmd /c "npx vite build"
if ($LASTEXITCODE -ne 0) { exit 1 }

# 3. Build eCommerce (Next.js)
Write-Host "Building eCommerce Store..." -ForegroundColor Cyan
Set-Location "ecommerce"

# Install if needed
if (-not (Test-Path "node_modules")) {
    Write-Host " installing ecommerce dependencies..."
    cmd /c "npm ci"
}

# Build Next.js
Write-Host " running next build..."
cmd /c "npm run build"
if ($LASTEXITCODE -ne 0) { 
    Set-Location ..
    Write-Error "Next.js build failed"
    exit 1 
}

Set-Location ..

# 4. Merge eCommerce into Root
Write-Host "Merging eCommerce into Root..." -ForegroundColor Cyan
if (Test-Path "ecommerce/out") {
    Copy-Item "ecommerce/out/*" "dist" -Recurse -Force
}
else {
    Write-Error "eCommerce build output not found!"
    exit 1
}

Write-Host "Build Complete! Ready for Firebase Deploy." -ForegroundColor Green
Write-Host "   - /        -> eCommerce (Next.js Static)"
Write-Host "   - /portal  -> Staff Login (Next.js)"
Write-Host "   - /sys     -> Admin/POS (Vite SPA)"
