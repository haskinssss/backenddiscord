require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const REQUIRED_ROLE_ID = process.env.REQUIRED_ROLE_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_DISCORD_ID = process.env.ADMIN_DISCORD_ID;

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

app.use(cors({
  origin: [DISCORD_REDIRECT_URI.replace('/auth/discord/callback', ''), 'http://localhost:3000'],
  credentials: true
}));

app.use(session({
  secret: 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

// Login route
app.get('/auth/discord/login', (req, res) => {
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
  res.redirect(discordAuthUrl);
});

// Callback route
app.get('/auth/discord/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect('/login.html?error=no_code');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', {
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: DISCORD_REDIRECT_URI
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const user = userResponse.data;

    // Check guild membership and role using bot token
    if (!DISCORD_BOT_TOKEN) {
      console.error('DISCORD_BOT_TOKEN not configured');
      return res.redirect('/login.html?error=server_config');
    }

    try {
      const memberResponse = await axios.get(
        `https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`,
        { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
      );

      const member = memberResponse.data;
      const hasRequiredRole = member.roles.includes(REQUIRED_ROLE_ID);

      if (!hasRequiredRole) {
        return res.redirect('/login.html?error=no_role');
      }

      // User has required role - set session
      req.session.user = {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        hasRole: true
      };

      req.session.save((err) => {
        if (err) {
          return res.redirect('/login.html?error=session_error');
        }
        res.redirect('/database.html');
      });

    } catch (guildError) {
      console.error('Guild membership check failed:', guildError.response?.status, guildError.response?.data);
      if (guildError.response?.status === 404) {
        return res.redirect('/login.html?error=not_in_guild');
      }
      return res.redirect('/login.html?error=no_role');
    }

  } catch (error) {
    console.error('OAuth error:', error.message);
    res.redirect('/login.html?error=auth_failed');
  }
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

app.post('/api/audit-logs', requireAuth, async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const { action, target, details } = req.body || {};
  const entry = {
    actor_id: req.session.user.id,
    actor_name: req.session.user.username,
    action: action || 'unknown',
    target: target || null,
    details: details || null
  };

  const { error } = await supabase.from('ems_audit_logs').insert([entry]);
  if (error) {
    console.error('Audit log insert error:', error.message);
    return res.status(500).json({ error: 'Log write failed' });
  }

  return res.json({ success: true });
});

app.get('/api/audit-logs', requireAuth, async (req, res) => {
  if (req.session.user.id !== ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const { data, error } = await supabase
    .from('ems_audit_logs')
    .select('id, actor_id, actor_name, action, target, details, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Audit log read error:', error.message);
    return res.status(500).json({ error: 'Log read failed' });
  }

  return res.json({ logs: data || [] });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Protected route example
app.get('/api/protected', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ message: 'You are authenticated!', user: req.session.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
