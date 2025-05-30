const express = require('express');
const router = express.Router();
const Url = require('../models/Url');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../config/supabase');

// @route   GET /login
// @desc    Render login page
router.get('/login', (req, res) => {
  res.render('login', { layout: false });
});

// @route   GET /
// @desc    Render home page
router.get('/', (req, res) => {
  // Just render the page, client-side will handle auth
  res.render('index', { layout: false });
});

// @route   GET /:code
// @desc    Redirect to long/original URL
router.get('/:code', async (req, res) => {
  try {
    const url = await Url.findOne({ urlCode: req.params.code });
    if (url) {
      url.clicks++;
      await url.save();
      return res.redirect(url.longUrl);
    } else {
      return res.status(404).render('404');
    }
  } catch (err) {
    console.error(err);
    res.status(500).json('Server error');
  }
});

module.exports = router; 