$port = 3000

Write-Host "Checking for processes on port $port..." -ForegroundColor Cyan

try {
    $tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction Stop
    foreach ($conn in $tcp) {
        try {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction Stop
            Write-Host "Killing process $($proc.Id) ($($proc.ProcessName)) on port $port..." -ForegroundColor Yellow
            Stop-Process -Id $conn.OwningProcess -Force
        } catch {
            # Process might have already ended or access denied
        }
    }
} catch {
    Write-Host "Port $port is free." -ForegroundColor Green
}

Write-Host "Starting Titanium POS on port $port..." -ForegroundColor Green
npm run dev -- --port $port
