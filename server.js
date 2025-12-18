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
app.use(passport.use());

app.use(express.static(path.join(__dirname, 'public')));

passport.use(
    new SpotifyStrategy(
        {
            clientID: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
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

app.get('/login', passport.authenticate('spotify', {
  scope: ['user-read-email', 'playlist-modify-public', 'playlist-modify-private'] // Permissões que estamos pedindo
}));

app.get('/callback',
  passport.authenticate('spotify', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

app.get('/', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/user', ensureAuthenticated, (req, res) => {
  res.json(req.user);
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
})