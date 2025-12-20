Write-Host "Iniciando ngrok em segundo plano..."
Start-Process -WindowStyle Hidden ngrok http 3000

Write-Host "Aguardando ngrok inicializar..."
Start-Sleep -Seconds 5

Write-Host "Obtendo URL do ngrok..."
try {
    $response = Invoke-RestMethod -Uri http://127.0.0.1:4040/api/tunnels
    $ngrokUrl = $response.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -ExpandProperty public_url
    $callbackUrl = "$ngrokUrl/callback"

    if (-not $ngrokUrl) {
        Write-Error "Não foi possível obter a URL do ngrok. Verifique se ele está rodando."
        return
    }

    Write-Host "URL de Callback encontrada: $callbackUrl"
    Write-Host "Iniciando o servidor Node.js com a URL dinâmica..."

    # Define a variável de ambiente e inicia o servidor
    $env:CALLBACK_URL = $callbackUrl
    npm run dev

} catch {
    Write-Error "Ocorreu um erro ao tentar se comunicar com a API do ngrok. Verifique se o ngrok está instalado e rodando."
}