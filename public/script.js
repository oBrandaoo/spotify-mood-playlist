async function loadMoods() {
  const container = document.getElementById('mood-cards-container');
  container.innerHTML = '<p class="loading-text">Carregando humores...</p>';

  try {
    const response = await fetch('/api/moods');
    if (!response.ok) throw new Error('Falha ao carregar humores.');
    
    const moods = await response.json();
    renderMoods(moods);

  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="text-red-400">Não foi possível carregar os humores.</p>';
  }
}

function renderMoods(moods) {
  const container = document.getElementById('mood-cards-container');
  container.innerHTML = '';

  const colorClasses = {
    yellow: 'bg-yellow-500 hover:bg-yellow-600',
    blue: 'bg-blue-500 hover:bg-blue-600',
    pink: 'bg-pink-500 hover:bg-pink-600',
    green: 'bg-green-500 hover:bg-green-600',
    red: 'bg-red-500 hover:bg-red-600',
    purple: 'bg-purple-500 hover:bg-purple-600'
  };

  moods.forEach(mood => {
    const cardColor = colorClasses[mood.color] || 'bg-gray-500 hover:bg-gray-600';
    const card = document.createElement('article');
    card.className = `mood-card ${cardColor} text-white rounded-xl p-6 shadow-lg flex flex-col items-center text-center space-y-3`;
    
    card.onclick = () => generatePlaylist(mood.id, mood.name);
    
    card.innerHTML = `
        <div class="emoji">${mood.emoji}</div>
        <h3 class="text-xl font-bold">${mood.name}</h3>
        <p class="text-sm opacity-90">${mood.description}</p>
    `;
    
    container.appendChild(card);
  });
}

async function generatePlaylist(moodId, moodName) {
  const resultDiv = document.getElementById('playlist-result');
  resultDiv.innerHTML = `<p class="loading-text">Criando a playlist "${moodName}"</p>`;

  try {
    const response = await fetch(`/api/generate-playlist?mood=${encodeURIComponent(moodId)}`);

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
      confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
      });
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

  loadMoods();
});