Set-Location $PSScriptRoot\..

$env:Path = (Join-Path $PWD 'node_modules\.bin') + ';' + $env:Path

Get-Content .env.local -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $name, $value = $_ -split '=', 2
  if ($name) {
    Set-Item -Path "Env:$($name.Trim())" -Value $value.Trim()
  }
}

node scripts/copy-data.js
npm install --silent --no-fund --no-audit
npx --yes vercel dev --listen 3000
