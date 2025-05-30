require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// EJS configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', './layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/url-shortener', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1);
});

// Routes
app.get('/test-static', (req, res) => {
  res.send(`
    <html>
      <head>
        <link rel="stylesheet" href="/css/style.css">
      </head>
      <body>
        <h1>Testing Static Files</h1>
        <div class="card">
          <div class="card-body">
            <h2>Test Card</h2>
            <p>This should be styled if CSS is loading correctly.</p>
            <button class="btn btn-primary">Test Button</button>
          </div>
        </div>
      </body>
    </html>
  `);
});

app.use('/', require('./routes/index'));
app.use('/api/url', require('./routes/url'));
app.use('/api/auth', require('./routes/auth'));

// Handle 404
app.use((req, res) => {
  res.status(404).render('404');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 