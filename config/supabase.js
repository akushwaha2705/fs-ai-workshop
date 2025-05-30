const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nipwozyekynveynhvjqt.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
    throw new Error('Missing Supabase key. Please set SUPABASE_KEY in your environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase; 