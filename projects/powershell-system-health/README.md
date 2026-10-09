# PowerShell System Health Reporter

A small Windows administration utility that summarizes operating-system details, uptime, and local disk capacity. It can display the report in the terminal or export it as JSON.

## Requirements
- Windows PowerShell 5.1 or PowerShell 7+
- Permission to read local system information

## Usage
Run from PowerShell:

```powershell
.\Get-SystemHealth.ps1
.\Get-SystemHealth.ps1 -OutputPath .\system-health.json
```

The script is read-only: it gathers information and writes a report only when an output path is supplied.

## Skills demonstrated
PowerShell functions and parameters, CIM/WMI queries, structured objects, error handling, and JSON serialization.

## Notes
This is a portfolio demonstration. Review and test scripts in your own environment before using them operationally.
