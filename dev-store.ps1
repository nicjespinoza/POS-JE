$port = 3001

Write-Host "Checking for processes on port $port..." -ForegroundColor Cyan

try {
    $tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction Stop
    foreach ($conn in $tcp) {
        try {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction Stop
            Write-Host "Killing process $($proc.Id) ($($proc.ProcessName)) on port $port..." -ForegroundColor Yellow
            Stop-Process -Id $conn.OwningProcess -Force
        }
        catch {
            # Process might have already ended
        }
    }
}
catch {
    Write-Host "Port $port is free." -ForegroundColor Green
}

if (Test-Path "ecommerce") {
    Write-Host "Starting Titanium Store on port $port..." -ForegroundColor Green
    cd ecommerce
    npm run dev -- --port $port
}
else {
    Write-Host "Error: 'ecommerce' directory not found. Did the installation finish?" -ForegroundColor Red
}
