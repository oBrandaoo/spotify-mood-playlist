require('dotenv').config();
const axios = require('axios');
const express = require('express');
const path = require('path');
const passport = require('passport')
const SpotifyStrategy = require('passport-spotify').Strategy;
const expressSession = require('express-session');

const app = express();
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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/user', ensureAuthenticated, (req, res) => {
  res.json(req.user);
});

app.get('/api/generate-playlist', ensureAuthenticated, async (req, res) => {
  const mood = req.query.mood;
  const accessToken = req.user.accessToken;
  const userId = req.user.id;

  if (!accessToken) {
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }

  const searchQueries = {
    'Triste para Animar': 'genre:pop upbeat happy',
    'Concentração': 'genre:ambient chill focus instrumental',
    'Festa': 'genre:dance party energetic'
  };

  const query = searchQueries[mood] || 'happy';

  try {
    const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: { q: query, type: 'track', limit: 10 }
    });
    const tracks = searchResponse.data.tracks.items;
    const trackUris = tracks.map(track => track.uri);

    if (tracks.length === 0) {
      return res.json({ error: 'Nenhuma música encontrada para este humor.' });
    }

    const createPlaylistResponse = await axios.post(`https://api.spotify.com/v1/users/${userId}/playlists`, 
      {
        name: `Playlist ${mood} - Gerada por App`,
        description: `Uma playlist para o humor "${mood}", criada automaticamente.`,
        public: false
      },
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    const newPlaylist = createPlaylistResponse.data;
    const playlistId = newPlaylist.id;

    await axios.post(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        uris: trackUris
      },
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    res.json({ 
      success: true,
      message: `Playlist "${newPlaylist.name}" criada com sucesso!`,
      playlistUrl: newPlaylist.external_urls.spotify
    });

  } catch (error) {
    console.error('Erro ao criar playlist no Spotify:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Falha ao criar a playlist no Spotify.' });
  }
})

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
})