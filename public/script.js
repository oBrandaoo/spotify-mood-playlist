async function generatePlaylist(mood) {
    const resultDiv = document.getElementById('playlist-result');
    resultDiv.innerHTML = '<p>Buscando músicas... </p>';

    try {
    const response = await fetch(`/api/generate-playlist?mood=${encodeURIComponent(mood)}`);

    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }

    if (!response.ok) {
        throw new Error('Falha na resposta do servidor.');
    }
    const tracks = await response.json();

    resultDiv.innerHTML = '';

    if (tracks.length === 0) {
      resultDiv.innerHTML = '<p>Nenhuma música encontrada para este humor.</p>';
      return;
    }

    const trackList = document.createElement('ol');
    tracks.forEach(track => {
      const listItem = document.createElement('li');
      listItem.textContent = `${track.name} - ${track.artists[0].name}`;
      trackList.appendChild(listItem);
    });

    resultDiv.innerHTML = `<h3>Playlist para: ${mood}</h3>`;
    resultDiv.appendChild(trackList);

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