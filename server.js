const express = require('express');
const path = require('path');

require('./db/init');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const { router: analyticsRoutes } = require('./routes/analytics');
const { DIR: POST_PHOTOS } = require('./lib/uploads');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.get('/healthz', (req, res) => res.type('text').send('ok'));

// Admin first, so /admin always asks for the password before anything else is served.
app.use(analyticsRoutes);
app.use(adminRoutes);
app.use(express.json({ limit: '32kb' }));
app.use(publicRoutes);

app.use('/media/posts', express.static(POST_PHOTOS, { maxAge: '30d' }));
app.use(
  express.static(path.join(__dirname, 'public'), {
    extensions: ['html'],
    maxAge: '7d',
    setHeaders(res, file) {
      if (/\.(html|css|js)$/.test(file)) res.setHeader('Cache-Control', 'public, max-age=300');
    },
  })
);

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Locked & Level site listening on ${port}`));
