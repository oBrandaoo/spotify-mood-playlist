async function generatePlaylist(mood) {
    const resultDiv = document.getElementById('playlist-result');
    resultDiv.innerHTML = '<p>Criando playlist no spotify... (pode demorar um pouco)</p>';

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

      resultDiv.innerHTML = '';

      if (data.success) {
        resultDiv.innerHTML = `
          <h3>✅ Sucesso!</h3>
          <p>${data.message}</p>
          <a href="${data.playlistUrl}" target="_blank">
            <button>Abrir Playlist no Spotify</button>
          </a>
        `;
      } else {
        resultDiv.innerHTML = `<p>❌ ${data.error}</p>`;
      }
    } catch (error) {
      console.error('Erro:', error);
      resultDiv.innerHTML = '<p>Ocorreu um erro ao gerar a playlist. Tente novamente.</p>';
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