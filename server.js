require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const express = require('express');
const path = require('path');
const passport = require('passport')
const SpotifyStrategy = require('passport-spotify').Strategy;
const { createClient } = require('@supabase/supabase-js');
const expressSession = require('express-session');
const OpenAI = require('openai');

const moods = require('./moods');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(expressSession({
  secret: process.env.SESSION_SECRET || 'uma-frase-secreta-bem-grande-e-dificil',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: 'none'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));

passport.use(
    new SpotifyStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: process.env.CALLBACK_URL || 'https://spotify-mood-playlist-production.up.railway.app/callback'
        },

        function(accessToken, refreshToken, expires_in, profile, done) {
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            return done(null, profile);
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Sessão expirada. Por favor, faça login novamente.' });
  }

  res.redirect('/login');
}

app.get('/login',
  passport.authenticate('spotify', {
    scope: [
      'user-read-email',
      'playlist-modify-public',
      'playlist-modify-private'
    ]
  })
);

app.get('/callback',
  passport.authenticate('spotify', {
    failureRedirect: '/login',
    failureMessage: true
  }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.get('/', ensureAuthenticated, (req, res) => {
  const timestamp = Date.now();
  let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  
  html = html.replace('<script src="/script.js"></script>', `<script src="/script.js?t=${timestamp}"></script>`);
  
  res.send(html);
});

app.get('/api/user', ensureAuthenticated, (req, res) => {
  res.json(req.user);
});

app.get('/api/search-tracks', ensureAuthenticated, async (req, res) => {
  const { moodId, query } = req.query;
  const accessToken = req.user.accessToken;

  let searchQuery;
  if (query) {
    searchQuery = query;
  } else {
    const selectedMood = moods.find(m => m.id === moodId);
    if (!selectedMood) {
      return res.status(400).json({ error: 'Humor inválido.' });
    }
    searchQuery = selectedMood.searchQuery;
  }

  try {
    const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: { q: searchQuery, type: 'track', limit: 15 }
    });
    
    res.json(searchResponse.data.tracks.items);

  } catch (error) {
    console.error('Erro ao buscar músicas:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Falha ao buscar músicas.' });
  }
});

app.post('/api/create-playlist', ensureAuthenticated, async (req, res) => {
  const { playlistName, trackUris } = req.body;
  const accessToken = req.user.accessToken;
  const userId = req.user.id;

  if (!trackUris || trackUris.length === 0) {
    return res.status(400).json({ error: 'Nenhuma música foi selecionada.' });
  }

  try {
    const createResponse = await axios.post(`https://api.spotify.com/v1/users/${userId}/playlists`, 
      {
        name: playlistName,
        description: 'Playlist criada com o Gerador de Humor.',
        public: false
      },
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const newPlaylist = createResponse.data;

    await axios.post(`https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`,
      { uris: trackUris },
      { headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    res.json({ 
      success: true,
      message: `Playlist "${newPlaylist.name}" criada com ${trackUris.length} músicas!`,
      playlistUrl: newPlaylist.external_urls.spotify
    });

    const dataToSave = {
      user_id: userId,
      name: newPlaylist.name,
      url: newPlaylist.external_urls.spotify
    };

    try {
      const { error } = await supabase
        .from('playlists')
        .insert(dataToSave)

      if (error) {
        console.error('Erro ao salvar no Supabase:', error);
      }
    } catch (supabaseError) {
      console.error('Erro inesperado ao salvar no Supabase:', supabaseError);
    }

  } catch (error) {
    console.error('Erro ao criar playlist:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Falha ao criar a playlist.' });
  }
});

app.get('/api/my-playlists', ensureAuthenticated, async (req, res) => {
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);

  } catch (error) {
    console.error('Erro ao buscar playlists:', error);
    res.status(500).json({ error: 'Falha ao buscar o histórico.' });
  }
});

app.get('/api/moods', (req, res) => {
  res.json(moods);
});

app.post('/api/generate-search-query', ensureAuthenticated, async (req, res) => {
    const { userPrompt } = req.body;

    if (!userPrompt) {
        return res.status(400).json({ error: 'O prompt do usuário não pode estar vazio.' });
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "Você é um assistente especialista em música e na API de busca do Spotify. Sua tarefa é converter sentimentos ou situações em termos de busca eficazes. Retorne APENAS os termos de busca, sem explicações ou aspas. Use uma combinação de palavras-chave que descrevam a vibe, a energia e o contexto, em vez de depender apenas de gêneros. Use termos como 'hits', 'beats', 'chill', 'energy', 'study'. Exemplos: 'upbeat happy pop hits', 'focus study beats lo-fi', 'party dance energetic tag:new'."
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            max_tokens: 50,
            temperature: 0.7,
        });

        const searchQuery = completion.choices[0].message.content.trim();
        
        if (!searchQuery) {
            return res.status(500).json({ error: 'A IA não conseguiu gerar uma busca.' });
        }

        res.json({ searchQuery });

    } catch (error) {
        console.error('Erro ao chamar a API da OpenAI:', error);
        res.status(500).json({ error: 'Falha ao gerar a busca com IA.' });
    }
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Se o servidor está rodando o código mais recente, você verá esta mensagem.' });
});

async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor iniciado com sucesso na porta ${PORT}`);
      console.log('📊 Todas as rotas foram registradas.');
    });
  } catch (error) {
    console.error('💥 FALHA FATAL AO INICIAR O SERVIDOR:', error);
    process.exit(1); 
  }
}

startServer();