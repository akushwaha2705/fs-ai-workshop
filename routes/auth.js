const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// @route   POST /auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) throw error;

        res.json({
            message: 'Registration successful. Please check your email for verification.',
            user: data.user
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
    }
});

// @route   POST /auth/login
// @desc    Login user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        res.json({
            message: 'Login successful',
            session: data.session,
            user: data.user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(400).json({ error: error.message });
    }
});

// @route   POST /auth/logout
// @desc    Logout user
router.post('/logout', async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(400).json({ error: error.message });
    }
});

// @route   GET /auth/user
// @desc    Get user data
router.get('/user', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error) throw error;

        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router; 