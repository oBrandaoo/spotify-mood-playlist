let selectedTracks = new Set();

const moodIcons = {
  upbeat: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  `,
  focus: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 3"/>
    </svg>
  `,
  party: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M4 15l8-8 8 8"/>
      <path d="M12 7v10"/>
    </svg>
  `,
  chill: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M3 12h18"/>
      <path d="M6 9h12M6 15h12"/>
    </svg>
  `,
  workout: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M2 12h4M18 12h4"/>
      <path d="M6 10v4M18 10v4"/>
    </svg>
  `,
  nostalgic: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  `
};


async function loadMoods() {
  const container = document.getElementById('mood-cards-container');
  renderMoodSkeletons();

  try {
    const response = await fetch('/api/moods');
    if (!response.ok) throw new Error('Falha ao carregar humores.');
    
    const moods = await response.json();
    renderMoods(moods);

  } catch (error) {
    console.error(error);
    showToast('Não foi possível carregar os humores.', 'error');
  }
}

function renderMoods(moods) {
  const container = document.getElementById('mood-cards-container');
  container.innerHTML = '';

    moods.forEach(mood => {
    const card = document.createElement('article');

    card.className = 'mood-card flex flex-col items-start text-left';
    card.onclick = () => searchAndDisplayTracks(mood.id, mood.name);

    card.innerHTML = `
      <div class="mood-icon">
        ${moodIcons[mood.id] || ''}
      </div>
      <h3 class="mood-title">${mood.name}</h3>
      <p class="mood-desc">${mood.description}</p>
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

    renderTrackSkeletons();

    const response = await fetch(`/api/search-tracks?moodId=${encodeURIComponent(moodId)}`);
    if (!response.ok) throw new Error('Falha ao buscar músicas.');
    
    const tracks = await response.json();
    
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
      trackElement.classList.remove('outline-2', 'outline-green-400', 'ring-offset-2', 'ring-offset-gray-800');
    } else {
      selectedTracks.add(trackUri);
      unselectedIcon.classList.add('hidden');
      selectedIcon.classList.remove('hidden');
      trackElement.classList.add('outline-2', 'outline-green-400', 'ring-offset-2', 'ring-offset-gray-800');
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
          el.classList.add('outline-2', 'outline-green-400', 'ring-offset-2', 'ring-offset-gray-800');
      } else {
          unselectedIcon.classList.remove('hidden');
          selectedIcon.classList.add('hidden');
          el.classList.remove('outline-2', 'outline-green-400', 'ring-offset-2', 'ring-offset-gray-800');
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
      showToast(data.message, 'success', data.playlistUrl);
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
      document.getElementById('track-selection').classList.add('hidden');
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Erro:', error);
    showToast('Ocorreu um erro ao criar a playlist. Tente novamente.', 'error');
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
      const sessionCheck = await fetch('/api/user');
      if (!sessionCheck.ok) {
        window.location.href = '/login';
        return;
      }

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

function renderMoodSkeletons() {
    const container = document.getElementById('mood-cards-container');
    container.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton skeleton-card';
        container.appendChild(skeleton);
    }
}

function renderTrackSkeletons() {
    const trackListDiv = document.getElementById('track-list');
    trackListDiv.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton skeleton-track flex items-center space-x-4 p-3 rounded-lg';
        trackListDiv.appendChild(skeleton);
    }
}

function showToast(message, type = 'info', url = null) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    if (url) {
        toast.style.cursor = 'pointer';
        toast.addEventListener('click', () => {
            window.open(url, '_blank');
        });
    }
    
    container.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 4000);
}

async function showHistory() {
    const historySection = document.getElementById('history-section');
    const mainContent = document.getElementById('main-content');

    const sessionCheck = await fetch('/api/user');
    if (!sessionCheck.ok) {
      window.location.href = '/login';
      return;
    }
    
    document.getElementById('playlist-result').innerHTML = '';
    document.getElementById('track-selection').classList.add('hidden');

    historySection.classList.remove('hidden');
    mainContent.classList.add('hidden');

    loadHistoryData();
}

function hideHistory() {
    const historySection = document.getElementById('history-section');
    const mainContent = document.getElementById('main-content');

    historySection.classList.add('hidden');
    mainContent.classList.remove('hidden');
}

async function loadHistoryData() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<p class="loading-text">Carregando seu histórico...</p>';

    try {
      const response = await fetch('/api/my-playlists');
      if (!response.ok) throw new Error('Falha ao carregar histórico.');
      
      const playlists = await response.json();
      historyList.innerHTML = '';

      if (playlists.length === 0) {
        historyList.innerHTML = '<p class="text-gray-400">Você ainda não criou nenhuma playlist.</p>';
        return;
      }

      playlists.forEach(playlist => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center p-3 bg-gray-700 rounded-lg';
        item.innerHTML = `
            <div>
                <p class="font-semibold">${playlist.name}</p>
                <p class="text-xs text-gray-400">${new Date(playlist.created_at).toLocaleString()}</p>
            </div>
            <a href="${playlist.url}" target="_blank" class="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-1 px-3 rounded transition-colors">
                Abrir
            </a>
        `;
        historyList.appendChild(item);
      });

    } catch (error) {
      console.error(error);
      historyList.innerHTML = '<p class="text-red-400">Não foi possível carregar o histórico.</p>';
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
  document.getElementById('my-history-btn').addEventListener('click', showHistory);
  document.getElementById('close-history-btn').addEventListener('click', hideHistory);
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