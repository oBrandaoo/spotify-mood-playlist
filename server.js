require('dotenv').config();
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
            callbackURL: 'https://localhost:3000/callback'
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

  if(req.headers['accept'] === 'application/json') {
    return res.status(401).json({ error: 'Sessão expirada. Por favor, faça login novamente.'});
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
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        q: query,
        type: 'track',
        limit: 10
      }
    });

    res.json(response.data.tracks.items);

  } catch (error) {
    console.error('Erro ao buscar músicas no Spotify:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Falha ao buscar músicas.' });
  }
})

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
})