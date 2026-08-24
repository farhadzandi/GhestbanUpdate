param([int]$Port = 8765)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$UpdateBase = 'https://raw.githubusercontent.com/farhadzandi/GhestbanUpdate/main'
$script:Running = $true

function Write-JsonResponse($stream, $status, $obj) {
    $json = $obj | ConvertTo-Json -Depth 8 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $reason = if ($status -eq 200) { 'OK' } elseif ($status -eq 400) { 'Bad Request' } elseif ($status -eq 404) { 'Not Found' } else { 'Error' }
    $headers = "HTTP/1.1 $status $reason`r`nContent-Type: application/json; charset=utf-8`r`nCache-Control: no-store`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
    $h = [Text.Encoding]::ASCII.GetBytes($headers); $stream.Write($h,0,$h.Length); $stream.Write($bytes,0,$bytes.Length)
}
function Get-Mime($path) {
    switch ([IO.Path]::GetExtension($path).ToLowerInvariant()) {
      '.html' {'text/html; charset=utf-8'} '.json' {'application/json; charset=utf-8'} '.js' {'text/javascript; charset=utf-8'}
      '.css' {'text/css; charset=utf-8'} '.svg' {'image/svg+xml'} '.png' {'image/png'} '.ico' {'image/x-icon'} default {'application/octet-stream'}
    }
}
function Send-File($stream, $file, $method) {
    if (!(Test-Path -LiteralPath $file -PathType Leaf)) { Write-JsonResponse $stream 404 @{ok=$false;message='Not found'}; return }
    $bytes=[IO.File]::ReadAllBytes($file); $mime=Get-Mime $file
    $name=[IO.Path]::GetFileName($file).ToLowerInvariant(); $cache='public, max-age=3600'
    if($name -in @('index.html','version.json','updates.json','sw.js')) { $cache='no-cache, no-store, must-revalidate' }
    $headers="HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nCache-Control: $cache`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
    $h=[Text.Encoding]::ASCII.GetBytes($headers); $stream.Write($h,0,$h.Length)
    if($method -ne 'HEAD'){ $stream.Write($bytes,0,$bytes.Length) }
}
function Get-LocalVersion {
    try { return (Get-Content -LiteralPath (Join-Path $Root 'version.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version } catch { return '0.0.0' }
}
function Invoke-GhestbanUpdate {
    $stamp=Get-Date -Format 'yyyyMMdd-HHmmss'; $temp=Join-Path $Root ".ghestban-update-$stamp"; New-Item -ItemType Directory -Path $temp -Force | Out-Null
    try {
        $remoteFile=Join-Path $temp 'version.json'; Invoke-WebRequest -UseBasicParsing -TimeoutSec 12 -Uri "${UpdateBase}/version.json?t=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())" -OutFile $remoteFile
        $remote=Get-Content -LiteralPath $remoteFile -Raw -Encoding UTF8 | ConvertFrom-Json; $localVersion=Get-LocalVersion
        try { $isNew = ([version]$remote.version -gt [version]$localVersion) } catch { $isNew = ($remote.version -ne $localVersion) }
        if(!$isNew){ Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue; return @{ok=$true;updated=$false;version=$localVersion;message='Already up to date'} }
        $files=@('index.html','manifest.json','sw.js','version.json','updates.json','icons/icon-192.svg','icons/icon-512.svg','local_server.ps1','Start_Ghestban.bat','Stop_Ghestban_Server.bat','README_OFFLINE.txt')
        foreach($rel in $files){
            $dest=Join-Path $temp ($rel -replace '/','\'); $dir=Split-Path -Parent $dest; if($dir){New-Item -ItemType Directory -Path $dir -Force|Out-Null}
            Invoke-WebRequest -UseBasicParsing -TimeoutSec 20 -Uri "${UpdateBase}/${rel}?t=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())" -OutFile $dest
        }
        $idx=Get-Content -LiteralPath (Join-Path $temp 'index.html') -Raw -Encoding UTF8
        if($idx -notmatch [regex]::Escape('const APP_VERSION = "'+$remote.version+'";')){ throw 'Downloaded index.html does not match version.json' }
        $backup=Join-Path $Root ".ghestban-rollback\$stamp"; New-Item -ItemType Directory -Path $backup -Force|Out-Null
        foreach($rel in $files){ $old=Join-Path $Root ($rel -replace '/','\'); if(Test-Path -LiteralPath $old){ $bd=Join-Path $backup ($rel -replace '/','\'); $bdir=Split-Path -Parent $bd; if($bdir){New-Item -ItemType Directory -Path $bdir -Force|Out-Null}; Copy-Item -LiteralPath $old -Destination $bd -Force } }
        foreach($rel in $files){ $from=Join-Path $temp ($rel -replace '/','\'); $to=Join-Path $Root ($rel -replace '/','\'); $tdir=Split-Path -Parent $to; if($tdir){New-Item -ItemType Directory -Path $tdir -Force|Out-Null}; Copy-Item -LiteralPath $from -Destination $to -Force }
        Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
        return @{ok=$true;updated=$true;version=$remote.version;backup=$backup;message='Update installed'}
    } catch {
        Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
        return @{ok=$false;updated=$false;version=(Get-LocalVersion);message=$_.Exception.Message}
    }
}

$listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$Port)
try { $listener.Start() } catch { exit 0 }
while($script:Running){
  try {
    $client=$listener.AcceptTcpClient(); $client.ReceiveTimeout=5000; $stream=$client.GetStream(); $reader=New-Object IO.StreamReader($stream,[Text.Encoding]::ASCII,$false,4096,$true)
    $line=$reader.ReadLine(); if([string]::IsNullOrWhiteSpace($line)){ $client.Close(); continue }
    $parts=$line.Split(' '); $method=$parts[0].ToUpperInvariant(); $target=$parts[1]
    while(($hline=$reader.ReadLine()) -ne $null -and $hline -ne ''){}
    $uri=[Uri]("http://127.0.0.1:$Port"+$target); $path=[Uri]::UnescapeDataString($uri.AbsolutePath)
    if($path -eq '/__qestban/status'){ Write-JsonResponse $stream 200 @{ok=$true;server='Ghestban Portable';version=(Get-LocalVersion)} }
    elseif($path -eq '/__qestban/update' -and $method -eq 'POST'){ $r=Invoke-GhestbanUpdate; Write-JsonResponse $stream ($(if($r.ok){200}else{500})) $r }
    elseif($path -eq '/__qestban/stop' -and $method -eq 'POST'){ Write-JsonResponse $stream 200 @{ok=$true}; $script:Running=$false }
    elseif($method -in @('GET','HEAD')){
      if($path -eq '/'){ $path='/index.html' }
      $relative=$path.TrimStart('/').Replace('/','\')
      if($relative.Contains('..')){ Write-JsonResponse $stream 400 @{ok=$false;message='Invalid path'} }
      else { Send-File $stream (Join-Path $Root $relative) $method }
    } else { Write-JsonResponse $stream 400 @{ok=$false;message='Unsupported request'} }
    $stream.Flush(); $client.Close()
  } catch { try{$client.Close()}catch{} }
}
$listener.Stop()
