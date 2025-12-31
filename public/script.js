let selectedTracks = new Set();

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
    
    card.onclick = () => searchAndDisplayTracks(mood.id, mood.name);
    
    card.innerHTML = `
      <div class="emoji">${mood.emoji}</div>
      <h3 class="text-xl font-bold">${mood.name}</h3>
      <p class="text-sm opacity-90">${mood.description}</p>
    `;
    
    container.appendChild(card);
  });
}

async function searchAndDisplayTracks(moodId, moodName) {
  const resultDiv = document.getElementById('playlist-result');
  const selectionSection = document.getElementById('track-selection');
  
  resultDiv.innerHTML = `<p class="loading-text">Verificando sessão e buscando músicas...</p>`;
  selectionSection.classList.add('hidden');
  selectedTracks.clear();

  try {
    const sessionCheck = await fetch('/api/user');
    if (!sessionCheck.ok) {
      window.location.href = '/login';
      return;
    }

    const response = await fetch(`/api/search-tracks?moodId=${encodeURIComponent(moodId)}`);
    if (!response.ok) throw new Error('Falha ao buscar músicas.');
    
    const tracks = await response.json();
    resultDiv.innerHTML = '';
    
    if (tracks.length === 0) {
      resultDiv.innerHTML = `<p class="text-gray-400">Nenhuma música encontrada para este humor.</p>`;
      return;
    }

    renderTrackList(tracks);
    selectionSection.classList.remove('hidden');

  } catch (error) {
    console.error('Erro:', error);
    resultDiv.innerHTML = `<p class="text-red-400">Ocorreu um erro ao buscar as músicas. Tente fazer login novamente.</p>`;
  }
}

function renderTrackList(tracks) {
  const trackListDiv = document.getElementById('track-list');
  trackListDiv.innerHTML = '';

  tracks.forEach(track => {
    const trackUri = track.uri;
    const trackElement = document.createElement('div');
    trackElement.className = 'flex items-center space-x-4 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors';
    trackElement.dataset.trackUri = trackUri;
    
    trackElement.innerHTML = `
      <img src="${track.album.images[2]?.url || 'https://via.placeholder.com/64'}" alt="Capa do Álbum" class="w-12 h-12 rounded">
      <div class="flex-1">
        <p class="font-semibold">${track.name}</p>
        <p class="text-sm text-gray-400">${track.artists.map(a => a.name).join(', ')}</p>
      </div>
      <div class="track-checkbox text-2xl">
        <span class="unselected-icon">⭕</span>
        <span class="selected-icon hidden text-green-400">✅</span>
      </div>
    `;

    trackElement.addEventListener('click', () => toggleTrackSelection(trackUri));
    trackListDiv.appendChild(trackElement);
  });
}

function toggleTrackSelection(trackUri) {
    const trackElement = document.querySelector(`[data-track-uri="${trackUri}"]`);
    const unselectedIcon = trackElement.querySelector('.unselected-icon');
    const selectedIcon = trackElement.querySelector('.selected-icon');

    if (selectedTracks.has(trackUri)) {
      selectedTracks.delete(trackUri);
      unselectedIcon.classList.remove('hidden');
      selectedIcon.classList.add('hidden');
      trackElement.classList.remove('ring-2', 'ring-green-400');
    } else {
      selectedTracks.add(trackUri);
      unselectedIcon.classList.add('hidden');
      selectedIcon.classList.remove('hidden');
      trackElement.classList.add('ring-2', 'ring-green-400');
    }
    updateCreateButton();
}

function toggleAllTracks() {
    const allTrackElements = document.querySelectorAll('#track-list > div');
    const allTrackUris = Array.from(allTrackElements).map(el => el.dataset.trackUri);
    const toggleBtn = document.getElementById('toggle-all-btn');

    if (selectedTracks.size === allTrackUris.length) {
      selectedTracks.clear();
      toggleBtn.textContent = 'Selecionar Todas';
    } else {
      selectedTracks = new Set(allTrackUris);
      toggleBtn.textContent = 'Desmarcar Todas';
    }
    
    allTrackElements.forEach(el => {
      const trackUri = el.dataset.trackUri;
      const unselectedIcon = el.querySelector('.unselected-icon');
      const selectedIcon = el.querySelector('.selected-icon');
      if (selectedTracks.has(trackUri)) {
          unselectedIcon.classList.add('hidden');
          selectedIcon.classList.remove('hidden');
          el.classList.add('ring-2', 'ring-green-400');
      } else {
          unselectedIcon.classList.remove('hidden');
          selectedIcon.classList.add('hidden');
          el.classList.remove('ring-2', 'ring-green-400');
      }
    });

    updateCreateButton();
}

function updateCreateButton() {
  const btn = document.getElementById('create-final-playlist-btn');
  const count = selectedTracks.size;
  btn.textContent = `Criar Playlist com ${count} músicas`;
  btn.disabled = count === 0;
}

async function createFinalPlaylist() {
  const btn = document.getElementById('create-final-playlist-btn');
  const resultDiv = document.getElementById('playlist-result');
  
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Criando Playlist...';

  try {
    const response = await fetch('/api/create-playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playlistName: `Playlist Personalizada - ${new Date().toLocaleDateString()}`,
        trackUris: Array.from(selectedTracks)
      })
    });

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
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
      document.getElementById('track-selection').classList.add('hidden');
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Erro:', error);
    resultDiv.innerHTML = `<p class="text-red-400">Ocorreu um erro ao criar a playlist. Tente novamente.</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function generateWithAI(prompt) {
    const resultDiv = document.getElementById('playlist-result');
    const selectionSection = document.getElementById('track-selection');
    
    resultDiv.innerHTML = `<p class="loading-text">Pensando em uma playlist perfeita para você...</p>`;
    selectionSection.classList.add('hidden');
    selectedTracks.clear();

    try {
      const response = await fetch('/api/generate-search-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: prompt })
      });

      if (!response.ok) {
          throw new Error('Falha ao gerar a busca.');
      }

      const { searchQuery } = await response.json();

      resultDiv.innerHTML = `<p class="loading-text">Buscando músicas para "${prompt}"...</p>`;
      const tracksResponse = await fetch(`/api/search-tracks?moodId=ai&query=${encodeURIComponent(searchQuery)}`);

      if (!tracksResponse.ok) throw new Error('Falha ao buscar músicas.');
      const tracks = await tracksResponse.json();
      
      resultDiv.innerHTML = '';
      if (tracks.length === 0) {
        resultDiv.innerHTML = `<p class="text-gray-400">Nenhuma música encontrada para este momento.</p>`;
        return;
      }

      renderTrackList(tracks);
      selectionSection.classList.remove('hidden');

    } catch (error) {
      console.error('Erro:', error);
      resultDiv.innerHTML = `<p class="text-red-400">Ocorreu um erro. Tente novamente.</p>`;
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

  document.getElementById('toggle-all-btn').addEventListener('click', toggleAllTracks);
  document.getElementById('create-final-playlist-btn').addEventListener('click', createFinalPlaylist);
  const aiPromptInput = document.getElementById('ai-prompt-input');
  const generateAiBtn = document.getElementById('generate-ai-btn');

  if (generateAiBtn) {
    generateAiBtn.addEventListener('click', async () => {
      const prompt = aiPromptInput.value.trim();
      if (!prompt) {
        alert('Por favor, descreva seu momento.');
        return;
      }
      await generateWithAI(prompt);
    });

    aiPromptInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        generateAiBtn.click();
      }
    });
  }
});