require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const express = require('express');
const path = require('path');
const passport = require('passport')
const SpotifyStrategy = require('passport-spotify').Strategy;
const expressSession = require('express-session');
const moods = require('./moods');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use(expressSession({
    secret: 'uma-frase-secreta-bem-grande-e-dificil',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));

passport.use(
    new SpotifyStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/callback'
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

app.get('/login', passport.authenticate('spotify', {
  scope: ['user-read-email', 'playlist-modify-public', 'playlist-modify-private'] // Permissões que estamos pedindo
}));

app.get('/callback',
  passport.authenticate('spotify', { failureRedirect: '/login' }),
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
  const moodId = req.query.moodId;
  const accessToken = req.user.accessToken;

  const selectedMood = moods.find(m => m.id === moodId);
  if (!selectedMood) {
    return res.status(400).json({ error: 'Humor inválido.' });
  }

  try {
    const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: { q: selectedMood.searchQuery, type: 'track', limit: 15 } // Buscamos mais músicas para dar opção
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

  } catch (error) {
    console.error('Erro ao criar playlist:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Falha ao criar a playlist.' });
  }
});

app.get('/api/moods', (req, res) => {
  res.json(moods);
})

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
})