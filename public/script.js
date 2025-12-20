async function generatePlaylist(mood) {
    const resultDiv = document.getElementById('playlist-result');
    resultDiv.innerHTML = '<p class="loading-text">Criando playlist no spotify...</p>';

    try {
      const response = await fetch(`/api/generate-playlist?mood=${encodeURIComponent(mood)}`);

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
          throw new Error('Falha na resposta do servidor.');
      }

      const data = await response.json();

      if (data.success) {
        resultDiv.innerHTML = `
          <div class="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded-lg">
            <p class="font-bold">✅ Sucesso!</p>
            <p>${data.message}</p>
            <a href="${data.playlistUrl}" target="_blank" class="inline-block mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors">
                Abrir Playlist no Spotify
            </a>
          </div>
        `;
      } else {
        resultDiv.innerHTML = `
          <div class="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
            <p class="font-bold">❌ Ops!</p>
            <p>${data.error}</p>
          </div>
        `;
      }

    } catch (error) {
      console.error('Erro:', error);
      resultDiv.innerHTML = `
        <div class="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
          <p class="font-bold">❌ Erro de Conexão</p>
          <p>Ocorreu um erro ao gerar a playlist. Tente novamente.</p>
        </div>
      `;
    }
  }

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = '/logout';
        });
    }
});