$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
node (Join-Path $scriptDir "deploy-workers.js")
