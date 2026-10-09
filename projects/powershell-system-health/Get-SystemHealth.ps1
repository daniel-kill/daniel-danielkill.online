[CmdletBinding()]
param(
    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string] $OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-SystemHealthReport {
    [CmdletBinding()]
    param()

    $os = Get-CimInstance -ClassName Win32_OperatingSystem
    $computer = Get-CimInstance -ClassName Win32_ComputerSystem
    $now = Get-Date
    $lastBoot = $os.LastBootUpTime

    $disks = @(
        Get-CimInstance -ClassName Win32_LogicalDisk -Filter 'DriveType=3' |
            ForEach-Object {
                [pscustomobject]@{
                    Drive       = $_.DeviceID
                    VolumeName  = $_.VolumeName
                    SizeGB      = if ($_.Size) { [math]::Round($_.Size / 1GB, 2) } else { $null }
                    FreeGB      = if ($_.FreeSpace) { [math]::Round($_.FreeSpace / 1GB, 2) } else { 0 }
                    FreePercent = if ($_.Size -gt 0) {
                        [math]::Round(100 * $_.FreeSpace / $_.Size, 1)
                    } else { $null }
                }
            }
    )

    [pscustomobject]@{
        ComputerName = $computer.Name
        Manufacturer = $computer.Manufacturer
        Model        = $computer.Model
        OperatingSystem = $os.Caption
        Version      = $os.Version
        Architecture = $os.OSArchitecture
        LastBoot     = $lastBoot
        Uptime       = ($now - $lastBoot).ToString('d\d hh\h mm\m')
        GeneratedAt  = $now.ToString('o')
        Disks        = $disks
    }
}

try {
    $report = Get-SystemHealthReport

    if ($OutputPath) {
        $fullPath = [System.IO.Path]::GetFullPath($OutputPath)
        $parent = Split-Path -Parent $fullPath
        if ($parent -and -not (Test-Path -LiteralPath $parent -PathType Container)) {
            throw "Output directory does not exist: $parent"
        }

        $report | ConvertTo-Json -Depth 5 |
            Set-Content -LiteralPath $fullPath -Encoding UTF8
        Write-Host "Report written to $fullPath" -ForegroundColor Green
    }
    else {
        $report | Format-List ComputerName, Manufacturer, Model, OperatingSystem,
            Version, Architecture, LastBoot, Uptime, GeneratedAt
        $report.Disks | Format-Table -AutoSize
    }
}
catch {
    Write-Error "Unable to create the system health report: $($_.Exception.Message)"
    exit 1
}
