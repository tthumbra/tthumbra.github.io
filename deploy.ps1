<#
    Deploy site/ to the Raspberry Pi from Windows.

    Uses the OpenSSH client that ships with Windows 11 — no extra
    install needed. Files are copied to a staging directory in the Pi
    user's home, then moved into the web root with sudo, so the web
    root is never left half-written while a copy is in flight.

    Usage:
        .\deploy.ps1
        .\deploy.ps1 -PiHost pi@192.168.1.50
#>

[CmdletBinding()]
param(
    # user@host or an entry from your ~/.ssh/config
    [string]$PiHost  = "pi@raspberrypi.local",

    # Where Caddy serves from. Must match "root *" in the Caddyfile.
    [string]$WebRoot = "/var/www/tanish",

    [string]$Staging = "~/site-staging"
)

$ErrorActionPreference = "Stop"

$siteDir = Join-Path $PSScriptRoot "site"
if (-not (Test-Path $siteDir)) {
    throw "No site/ directory found next to this script."
}

Write-Host "Deploying $siteDir -> ${PiHost}:$WebRoot" -ForegroundColor Cyan

# Fresh staging dir each time, so files deleted locally don't linger.
Write-Host "  [1/3] preparing staging directory"
ssh $PiHost "rm -rf $Staging && mkdir -p $Staging"
if ($LASTEXITCODE -ne 0) { throw "ssh failed while preparing staging directory" }

Write-Host "  [2/3] copying files"
# The /. suffix copies the *contents* of site/, not the directory itself.
scp -r "$siteDir/." "${PiHost}:$Staging/"
if ($LASTEXITCODE -ne 0) { throw "scp failed" }

Write-Host "  [3/3] publishing to web root"
$publish = @(
    "sudo mkdir -p $WebRoot",
    "sudo rsync -a --delete $Staging/ $WebRoot/",
    "sudo chown -R caddy:caddy $WebRoot",
    "sudo find $WebRoot -type d -exec chmod 755 {} +",
    "sudo find $WebRoot -type f -exec chmod 644 {} +"
) -join " && "

ssh $PiHost $publish
if ($LASTEXITCODE -ne 0) { throw "publish step failed on the Pi" }

Write-Host "Done." -ForegroundColor Green
