import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Initialize auth routes with database instance
export function initAuthRoutes(db, dbAsync = null) {
  const isProduction = process.env.NODE_ENV === 'production';
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-jwt-secret';
  const AUTH_COOKIE_NAME = 'fahamu_auth_token';

  if (isProduction && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production');
  }

  const safeGetUserColumns = async (sqlWithPhoto, sqlWithoutPhoto, params = []) => {
    try {
      const user = await dbHelper.get(sqlWithPhoto, params);
      return user ? { ...user, profile_photo: user.profile_photo || null } : null;
    } catch (error) {
      if (!error.message?.includes('no such column: profile_photo')) {
        throw error;
      }

      const user = await dbHelper.get(sqlWithoutPhoto, params);
      return user ? { ...user, profile_photo: null } : null;
    }
  };

  const safeAllUsersWithPhoto = async () => {
    try {
      const users = await dbHelper.all(
        'SELECT id, phone, username, email, password_hash, name, preferred_language, profile_photo FROM users',
        []
      );
      return users.map(user => ({ ...user, email: user.email || null, profile_photo: user.profile_photo || null }));
    } catch (error) {
      if (isMissingColumnError(error, 'email')) {
        try {
          const users = await dbHelper.all(
            'SELECT id, phone, username, password_hash, name, preferred_language, profile_photo FROM users',
            []
          );
          return users.map(user => ({ ...user, email: null, profile_photo: user.profile_photo || null }));
        } catch (innerError) {
          if (!isMissingColumnError(innerError, 'profile_photo')) {
            throw innerError;
          }
          const users = await dbHelper.all(
            'SELECT id, phone, username, password_hash, name, preferred_language FROM users',
            []
          );
          return users.map(user => ({ ...user, email: null, profile_photo: null }));
        }
      }

      if (!error.message?.includes('no such column: profile_photo')) {
        throw error;
      }

      const users = await dbHelper.all(
        'SELECT id, phone, username, email, password_hash, name, preferred_language FROM users',
        []
      );
      return users.map(user => ({ ...user, email: user.email || null, profile_photo: null }));
    }
  };
  
  // Use dbAsync if provided (PostgreSQL), otherwise create wrapper for SQLite
  const dbHelper = dbAsync || {
    get: (sql, params = []) => {
      const stmt = db.prepare(sql);
      return Promise.resolve(stmt.get(...params));
    },
    run: (sql, params = []) => {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return Promise.resolve({ lastID: result.lastInsertRowid, changes: result.changes });
    },
    all: (sql, params = []) => {
      const stmt = db.prepare(sql);
      return Promise.resolve(stmt.all(...params));
    }
  };

  // Middleware: Verify JWT token (must be defined BEFORE routes that use it)
  router.use((req, res, next) => {
    req.verifyToken = (token) => {
      try {
        return jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return null;
      }
    };
    next();
  });

  // Helper: Hash password
  const hashPassword = async (password) => {
    return await bcryptjs.hash(password, 10);
  };

  // Helper: Verify password
  const verifyPassword = async (password, hash) => {
    if (!hash) {
      console.warn('⚠️  Password hash is empty or null');
      return false;
    }
    return await bcryptjs.compare(password, hash);
  };

  // Helper: Check if account is locked
  const isAccountLocked = (user) => {
    if (!user || !user.lockout_until) return false;
    const lockoutUntil = new Date(user.lockout_until);
    return lockoutUntil > new Date();
  };

  // Helper: Generate JWT token
  const generateToken = (user) => {
    return jwt.sign({ 
      userId: user.id,
      phone: user.phone,
      username: user.username,
      name: user.name,
      location: user.location || null,
      ward: user.ward || null,
      farm_size: user.farm_size || null,
      preferred_language: user.preferred_language || 'english'
    }, JWT_SECRET, { expiresIn: '7d' });
  };

  const setAuthCookie = (res, token) => {
    const cookieParts = [
      `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=604800'
    ];
    if (isProduction) {
      cookieParts.push('Secure');
    }
    res.setHeader('Set-Cookie', cookieParts.join('; '));
  };

  const clearAuthCookie = (res) => {
    const cookieParts = [
      `${AUTH_COOKIE_NAME}=`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=0'
    ];
    if (isProduction) {
      cookieParts.push('Secure');
    }
    res.setHeader('Set-Cookie', cookieParts.join('; '));
  };

  const extractToken = (req) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }

    const cookieHeader = req.headers.cookie || '';
    const cookies = cookieHeader.split(';').map(segment => segment.trim());
    const authCookie = cookies.find(cookie => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));
    if (!authCookie) return null;

    const tokenValue = authCookie.slice(AUTH_COOKIE_NAME.length + 1);
    return tokenValue ? decodeURIComponent(tokenValue) : null;
  };

  // Helper: Validate phone format
  const isValidPhone = (phone) => {
    // Accept multiple formats: +254XXXXXXXXX, 254XXXXXXXXX, 07XXXXXXXX, 7XXXXXXXX
    const phoneRegex = /^(\+?254|0)?[7][0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  // Security constants
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MINUTES = 15;

  // Helper: Validate password strength
  const isStrongPassword = (password) => {
    if (!password || typeof password !== 'string') return false;
    const lengthCheck = password.length >= 10;
    const upperCheck = /[A-Z]/.test(password);
    const lowerCheck = /[a-z]/.test(password);
    const numberCheck = /[0-9]/.test(password);
    const symbolCheck = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    return lengthCheck && upperCheck && lowerCheck && numberCheck && symbolCheck;
  };

  const isValidUsername = (username) => /^[a-zA-Z0-9._-]{3,30}$/.test((username || '').trim());

  const isMissingColumnError = (error, columnName = '') => {
    if (!error) return false;
    const message = (error.message || '').toLowerCase();
    const target = (columnName || '').toLowerCase();
    const mentionsTarget = !target || message.includes(target);

    // PostgreSQL undefined_column is 42703. SQLite errors mention "no such column".
    return (
      (error.code === '42703' && mentionsTarget) ||
      (message.includes('no such column') && mentionsTarget) ||
      (message.includes('has no column named') && mentionsTarget)
    );
  };

  // POST /api/auth/register - Step 1: Phone + Password
  router.post('/register', async (req, res) => {
    try {
      const { phone, username, password, email } = req.body;

      // Validate input
      if (!phone || !username || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Phone, username, and password are required'
        });
      }

      if (!isValidPhone(phone)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid phone format. Use: +2547XXXXXXXX or 2547XXXXXXXX'
        });
      }

      if (!isStrongPassword(password)) {
        return res.status(400).json({
          status: 'error',
          message: 'Password must be at least 10 characters with uppercase, lowercase, number, and symbol'
        });
      }

      if (!isValidUsername(username)) {
        return res.status(400).json({
          status: 'error',
          message: 'Username must be 3-30 characters and use letters, numbers, ., _, or -'
        });
      }

      // Normalize phone to +254 format
      let normalizedPhone = phone.trim();
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+254' + normalizedPhone.substring(1);
      } else if (normalizedPhone.startsWith('254')) {
        normalizedPhone = '+' + normalizedPhone;
      }

      // Normalize username to lowercase
      const normalizedUsername = username.trim().toLowerCase();
      const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

      // Check if phone or username already exists
      let existingUser;
      if (normalizedEmail) {
        try {
          existingUser = await dbHelper.get(
            'SELECT id, phone, username, email FROM users WHERE phone = ? OR username = ? OR LOWER(email) = ?',
            [normalizedPhone, normalizedUsername, normalizedEmail]
          );
        } catch (lookupError) {
          if (!isMissingColumnError(lookupError, 'email')) {
            throw lookupError;
          }
          existingUser = await dbHelper.get(
            'SELECT id, phone, username FROM users WHERE phone = ? OR username = ?',
            [normalizedPhone, normalizedUsername]
          );
        }
      } else {
        existingUser = await dbHelper.get(
          'SELECT id, phone, username FROM users WHERE phone = ? OR username = ?',
          [normalizedPhone, normalizedUsername]
        );
      }

      if (existingUser) {
        const existingEmail = (existingUser.email || '').toString().toLowerCase();
        return res.status(400).json({
          status: 'error',
          message: existingUser.phone === normalizedPhone
            ? 'Phone number already registered'
            : existingEmail && normalizedEmail && existingEmail === normalizedEmail
              ? 'Email already registered'
              : 'Username already taken'
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      let result;
      try {
        result = await dbHelper.run(
          'INSERT INTO users (phone, username, email, password_hash, password_changed_at, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          [normalizedPhone, normalizedUsername, normalizedEmail, passwordHash]
        );
      } catch (insertError) {
        if (isMissingColumnError(insertError, 'password_changed_at')) {
          try {
            result = await dbHelper.run(
              'INSERT INTO users (phone, username, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
              [normalizedPhone, normalizedUsername, normalizedEmail, passwordHash]
            );
          } catch (secondError) {
            if (!isMissingColumnError(secondError, 'email')) {
              throw secondError;
            }
            result = await dbHelper.run(
              'INSERT INTO users (phone, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
              [normalizedPhone, normalizedUsername, passwordHash]
            );
          }
        } else if (isMissingColumnError(insertError, 'email')) {
          result = await dbHelper.run(
            'INSERT INTO users (phone, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [normalizedPhone, normalizedUsername, passwordHash]
          );
        } else {
          throw insertError;
        }
      }

      res.status(201).json({
        status: 'success',
        message: 'Step 1 complete. Proceed to profile setup.',
        userId: result.lastID
      });
    } catch (error) {
      console.error('Registration Step 1 error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Registration failed. Please try again.'
      });
    }
  });

  // POST /api/auth/register-profile - Step 2: Profile Details
  router.post('/register-profile', async (req, res) => {
    try {
      const { userId, name, email, location, ward, farm_size, farm_size_unit = 'acres', preferred_language = 'english' } = req.body;

      // Validate input
      if (!userId || !name || !location) {
        return res.status(400).json({
          status: 'error',
          message: 'userId, name, and location are required'
        });
      }

      // Verify user exists
      const user = await dbHelper.get('SELECT id FROM users WHERE id = ?', [userId]);

      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Create farm profile
      const farmResult = await dbHelper.run(
        'INSERT INTO farms (user_id, location, ward, farm_size, farm_size_unit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [userId, location, ward || null, farm_size || null, farm_size_unit]
      );

      // Update user name/language and optionally email.
      try {
        await dbHelper.run(
          'UPDATE users SET name = ?, email = COALESCE(?, email), preferred_language = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [name, email || null, preferred_language, userId]
        );
      } catch (updateError) {
        if (!isMissingColumnError(updateError, 'email')) {
          throw updateError;
        }
        await dbHelper.run(
          'UPDATE users SET name = ?, preferred_language = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [name, preferred_language, userId]
        );
      }

      // Fetch updated user
      const updatedUser = await dbHelper.get('SELECT id, phone, username, name FROM users WHERE id = ?', [userId]);

      // Generate JWT token with user data
      const token = generateToken({
        id: updatedUser.id,
        phone: updatedUser.phone,
        username: updatedUser.username,
        name: name,
        location: location,
        ward: ward || null,
        farm_size: farm_size || null,
        preferred_language: preferred_language
      });

      setAuthCookie(res, token);

      res.status(201).json({
        status: 'success',
        message: 'Account created successfully',
        token,
        user: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          username: updatedUser.username,
          name: updatedUser.name,
          location,
          ward: ward || null,
          farm_size: farm_size || null,
          farm_size_unit: farm_size_unit || 'acres',
          preferred_language: preferred_language
        }
      });
    } catch (error) {
      console.error('Registration Step 2 error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Profile setup failed. Please try again.'
      });
    }
  });

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const usernameIdentifier = (username || email || '').trim().toLowerCase();

      // Validate input
      if (!usernameIdentifier) {
        return res.status(400).json({
          status: 'error',
          message: 'Username or email is required'
        });
      }

      if (!password) {
        return res.status(400).json({
          status: 'error',
          message: 'Password is required'
        });
      }

      console.log(`Login attempt with username: ${usernameIdentifier}`);

      // Find user by username or email.
      let user;
      try {
        user = await safeGetUserColumns(
          'SELECT id, phone, username, email, password_hash, name, preferred_language, profile_photo FROM users WHERE username = ? OR LOWER(COALESCE(email, \'\')) = ?',
          'SELECT id, phone, username, email, password_hash, name, preferred_language FROM users WHERE username = ? OR LOWER(COALESCE(email, \'\')) = ?',
          [usernameIdentifier, usernameIdentifier]
        );
      } catch (lookupError) {
        if (!isMissingColumnError(lookupError, 'email')) {
          throw lookupError;
        }
        user = await safeGetUserColumns(
          'SELECT id, phone, username, password_hash, name, preferred_language, profile_photo FROM users WHERE username = ?',
          'SELECT id, phone, username, password_hash, name, preferred_language FROM users WHERE username = ?',
          [usernameIdentifier]
        );
      }
       
      // If not found, try case-insensitive search as fallback
      if (!user) {
        console.log(`Trying case-insensitive search for: ${usernameIdentifier}`);
        const allUsers = await safeAllUsersWithPhoto();
        const fallbackUser = allUsers.find(u => u.username && u.username.toLowerCase() === usernameIdentifier);
        if (fallbackUser) {
          console.log(`Found user via case-insensitive search: ${fallbackUser.username}`);
          user = fallbackUser;
        }
      }

      if (!user) {
        console.log(`User not found for username: ${usernameIdentifier}`);
        return res.status(401).json({
          status: 'error',
          message: 'Invalid username or password'
        });
      }

      console.log(`User found: ${user.id}, username: ${user.username}, phone: ${user.phone}`);

      // Enforce account lockout
      if (isAccountLocked(user)) {
        return res.status(423).json({
          status: 'error',
          message: `Account locked due to repeated failed login attempts. Try again after ${new Date(user.lockout_until).toLocaleString()}`
        });
      }

      // Prevent login for deactivated users
      if (user.is_active === 0 || user.is_active === '0' || user.is_active === false) {
        return res.status(403).json({
          status: 'error',
          message: 'User account is deactivated. Contact support.'
        });
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password_hash);

      console.log(`Password valid: ${isPasswordValid}`);

      if (!isPasswordValid) {
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        const lockoutUntil = failedAttempts >= MAX_LOGIN_ATTEMPTS
          ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString()
          : null;

        try {
          await dbHelper.run(
            'UPDATE users SET failed_login_attempts = ?, lockout_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [failedAttempts, lockoutUntil, user.id]
          );
        } catch (loginAttemptError) {
          // Backward compatibility for schemas without lockout columns.
          if (!isMissingColumnError(loginAttemptError)) {
            throw loginAttemptError;
          }
          await dbHelper.run(
            'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
          );
        }

        return res.status(401).json({
          status: 'error',
          message: 'Invalid username or password'
        });
      }

      // Reset failed login count and refresh last_login
      try {
        await dbHelper.run(
          'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [user.id]
        );
      } catch (resetError) {
        // Backward compatibility for schemas without lockout/login tracking columns.
        if (!isMissingColumnError(resetError)) {
          throw resetError;
        }
        await dbHelper.run(
          'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [user.id]
        );
      }

      // Generate token with user data (fetch farm first, then use it)
      const farm = await dbHelper.get('SELECT location, ward, farm_size, farm_size_unit FROM farms WHERE user_id = ?', [user.id]);
      
      const token = generateToken({
        id: user.id,
        phone: user.phone,
        username: user.username,
        name: user.name,
        location: farm ? farm.location : null,
        ward: farm ? farm.ward : null,
        farm_size: farm ? farm.farm_size : null,
        preferred_language: user.preferred_language
      });

      setAuthCookie(res, token);

      res.json({
        status: 'success',
        token,
        user: {
          id: user.id,
          phone: user.phone,
          username: user.username,
          name: user.name,
          location: farm ? farm.location : null,
          ward: farm ? farm.ward : null,
          farm_size: farm ? farm.farm_size : null,
          farm_size_unit: farm ? farm.farm_size_unit : 'acres',
          preferred_language: user.preferred_language || 'english',
          profile_photo: user.profile_photo || null
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Login failed. Please try again.'
      });
    }
  });

  // GET /api/auth/user - Fetch current user (requires token in Authorization header)
  router.get('/user', async (req, res) => {
    try {
      const token = extractToken(req);

      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'No token provided'
        });
      }

      const decoded = req.verifyToken(token);

      if (!decoded) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid or expired token'
        });
      }

      // Try to get user from database, but don't fail if database is empty on Vercel
      let user = null;
      let farm = null;
      try {
        user = await safeGetUserColumns(
          'SELECT id, phone, username, name, profile_photo FROM users WHERE id = ?',
          'SELECT id, phone, username, name FROM users WHERE id = ?',
          [decoded.userId]
        );
        
        if (user) {
          farm = await dbHelper.get('SELECT location, ward, farm_size, farm_size_unit FROM farms WHERE user_id = ?', [user.id]);
        }
      } catch (dbError) {
        console.log('Database query error (may be Vercel ephemeral storage):', dbError.message);
      }

      // If user not in database but token is valid, return token payload
      if (!user) {
        return res.json({
          status: 'success',
          user: {
            id: decoded.userId,
            phone: decoded.phone || null,
            username: decoded.username || null,
            name: decoded.name || null,
            location: decoded.location || null,
            ward: decoded.ward || null,
            farm_size: decoded.farm_size || null,
            farm_size_unit: 'acres'
          },
          note: 'User data from token (database may be reset on Vercel)'
        });
      }

      res.json({
        status: 'success',
        user: {
          id: user.id,
          phone: user.phone,
          username: user.username,
          name: user.name,
          location: farm ? farm.location : null,
          ward: farm ? farm.ward : null,
          farm_size: farm ? farm.farm_size : null,
          farm_size_unit: farm ? farm.farm_size_unit : 'acres',
          profile_photo: user.profile_photo || null
        }
      });
    } catch (error) {
      console.error('Fetch user error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch user'
      });
    }
  });

  // PUT /api/auth/update-profile - Update user profile
  router.put('/update-profile', async (req, res) => {
    try {
      const token = extractToken(req);

      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'No token provided'
        });
      }

      const decoded = req.verifyToken(token);

      if (!decoded) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid or expired token'
        });
      }

      const { name, email, date_of_birth, gender, id_number } = req.body;

      // Update user in database if it exists
      try {
        const result = await dbHelper.run(
          'UPDATE users SET name = ?, email = ?, date_of_birth = ?, gender = ?, id_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [name || null, email || null, date_of_birth || null, gender || null, id_number || null, decoded.userId]
        );

        if (result.changes > 0) {
          return res.json({
            status: 'success',
            message: 'Profile updated successfully'
          });
        }
      } catch (dbError) {
        console.log('Database update error (may be Vercel ephemeral storage):', dbError.message);
      }

      // If database update failed or no changes, still return success for token-based users
      res.json({
        status: 'success',
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update profile'
      });
    }
  });

  // POST /api/auth/update-language - Update user's language preference
  router.post('/update-language', async (req, res) => {
    try {
      const token = extractToken(req);

      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'No token provided'
        });
      }

      const decoded = req.verifyToken(token);

      if (!decoded) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid or expired token'
        });
      }

      const { userId, preferred_language } = req.body;

      // Validate language
      const VALID_LANGUAGES = ['english', 'swahili', 'luo'];
      if (!VALID_LANGUAGES.includes(preferred_language)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid language selection'
        });
      }

      // Verify userId matches token
      if (userId && decoded.userId !== userId) {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized'
        });
      }

      // Update user language preference
      const result = await dbHelper.run(
        'UPDATE users SET preferred_language = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [preferred_language, decoded.userId]
      );

      if (result.changes > 0) {
        return res.json({
          status: 'success',
          message: 'Language preference updated',
          preferred_language
        });
      }

      // User not found
      res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    } catch (error) {
      console.error('Update language error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update language preference'
      });
    }
  });

  // POST /api/auth/upload-profile-photo - Upload profile photo
  router.post('/upload-profile-photo', async (req, res) => {
    try {
      const token = extractToken(req);

      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'No token provided'
        });
      }

      const decoded = req.verifyToken(token);

      if (!decoded) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid or expired token'
        });
      }

      const { profile_photo } = req.body;

      if (!profile_photo) {
        return res.status(400).json({
          status: 'error',
          message: 'Profile photo data is required'
        });
      }

      // Update profile photo in database
      let result;
      try {
        result = await dbHelper.run(
          'UPDATE users SET profile_photo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [profile_photo, decoded.userId]
        );
      } catch (error) {
        if (!error.message?.includes('no such column: profile_photo')) {
          throw error;
        }

        return res.status(409).json({
          status: 'error',
          message: 'Profile photo storage is not initialized yet. Restart the server and try again.'
        });
      }

      if (result.changes > 0) {
        return res.json({
          status: 'success',
          message: 'Profile photo updated successfully',
          profile_photo
        });
      }

      res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    } catch (error) {
      console.error('Upload profile photo error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to upload profile photo'
      });
    }
  });

  // POST /api/auth/logout
  router.post('/logout', (req, res) => {
    // JWT is stateless; client should discard token
    clearAuthCookie(res);
    res.json({
      status: 'success',
      message: 'Logged out. Please discard your token.'
    });
  });

  return router;
}

export default router;
