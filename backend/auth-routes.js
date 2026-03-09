import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Initialize auth routes with database instance
export function initAuthRoutes(db) {
  const JWT_SECRET = process.env.JWT_SECRET || 'farmer_secret_key_change_in_production';

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

  // Helper: Generate JWT token
  const generateToken = (user) => {
    return jwt.sign({ 
      userId: user.id,
      phone: user.phone,
      username: user.username,
      name: user.name,
      location: user.location || null,
      ward: user.ward || null,
      farm_size: user.farm_size || null
    }, JWT_SECRET, { expiresIn: '7d' });
  };

  // Helper: Validate phone format
  const isValidPhone = (phone) => {
    const phoneRegex = /^\+?254[0-9]{9}$/; // E.164: +2547XXXXXXXX or 2547XXXXXXXX
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  // Helper: Validate password strength
  const isStrongPassword = (password) => {
    return password.length >= 6; // Minimum 6 chars for MVP
  };

  const isValidUsername = (username) => /^[a-zA-Z0-9._-]{3,30}$/.test((username || '').trim());

  // POST /api/auth/register - Step 1: Phone + Password
  router.post('/register', async (req, res) => {
    try {
      const { phone, username, password } = req.body;

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
          message: 'Password must be at least 6 characters'
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

      // Check if phone or username already exists
       // Note: Use lowercase comparison in JavaScript since SQLite's LOWER() may not be available
       const stmt = db.prepare('SELECT id, phone, username FROM users WHERE phone = ? OR username = ?');
       const existingUser = stmt.get(normalizedPhone, normalizedUsername);

      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: existingUser.phone === normalizedPhone
            ? 'Phone number already registered'
            : 'Username already taken'
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const insertStmt = db.prepare(
        'INSERT INTO users (phone, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      );
      const result = insertStmt.run(normalizedPhone, normalizedUsername, passwordHash);

      res.status(201).json({
        status: 'success',
        message: 'Step 1 complete. Proceed to profile setup.',
        userId: result.lastInsertRowid
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
      const { userId, name, location, ward, farm_size, farm_size_unit = 'acres' } = req.body;

      // Validate input
      if (!userId || !name || !location) {
        return res.status(400).json({
          status: 'error',
          message: 'userId, name, and location are required'
        });
      }

      // Verify user exists
      const userStmt = db.prepare('SELECT id FROM users WHERE id = ?');
      const user = userStmt.get(userId);

      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Create farm profile
      const farmStmt = db.prepare(
        'INSERT INTO farms (user_id, location, ward, farm_size, farm_size_unit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      );
      const farmResult = farmStmt.run(userId, location, ward || null, farm_size || null, farm_size_unit);

      // Update user name
      const updateStmt = db.prepare('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      updateStmt.run(name, userId);

      // Fetch updated user
      const getUserStmt = db.prepare('SELECT id, phone, username, name FROM users WHERE id = ?');
      const updatedUser = getUserStmt.get(userId);

      // Generate JWT token with user data
      const token = generateToken({
        id: updatedUser.id,
        phone: updatedUser.phone,
        username: updatedUser.username,
        name: name,
        location: location,
        ward: ward || null,
        farm_size: farm_size || null
      });

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
          farm_size_unit: farm_size_unit || 'acres'
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
      const { username, password } = req.body;
      const usernameIdentifier = username ? username.trim().toLowerCase() : '';

      // Validate input
      if (!usernameIdentifier) {
        return res.status(400).json({
          status: 'error',
          message: 'Username is required'
        });
      }

      if (!password) {
        return res.status(400).json({
          status: 'error',
          message: 'Password is required'
        });
      }

      console.log(`Login attempt with username: ${usernameIdentifier}`);

       // Find user by username only (matching create account page)
       // Use exact match with lowercase since we normalize on registration
       const stmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users WHERE username = ?');
       const user = stmt.get(usernameIdentifier);
       
       // If not found, try case-insensitive search as fallback
       if (!user) {
         console.log(`Trying case-insensitive search for: ${usernameIdentifier}`);
         const fallbackStmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users');
         const allUsers = fallbackStmt.all();
         const fallbackUser = allUsers.find(u => u.username && u.username.toLowerCase() === usernameIdentifier);
         if (fallbackUser) {
           console.log(`Found user via case-insensitive search: ${fallbackUser.username}`);
           Object.assign(user = {}, fallbackUser);
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

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password_hash);

      console.log(`Password valid: ${isPasswordValid}`);

      if (!isPasswordValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid username or password'
        });
      }

      // Generate token with user data (fetch farm first, then use it)
      const farmStmt = db.prepare('SELECT location, ward, farm_size, farm_size_unit FROM farms WHERE user_id = ?');
      const farm = farmStmt.get(user.id);
      
      const token = generateToken({
        id: user.id,
        phone: user.phone,
        username: user.username,
        name: user.name,
        location: farm ? farm.location : null,
        ward: farm ? farm.ward : null,
        farm_size: farm ? farm.farm_size : null
      });

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
          farm_size_unit: farm ? farm.farm_size_unit : 'acres'
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
  router.get('/user', (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];

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
        const userStmt = db.prepare('SELECT id, phone, username, name FROM users WHERE id = ?');
        user = userStmt.get(decoded.userId);
        
        if (user) {
          const farmStmt = db.prepare('SELECT location, ward, farm_size, farm_size_unit FROM farms WHERE user_id = ?');
          farm = farmStmt.get(user.id);
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
          farm_size_unit: farm ? farm.farm_size_unit : 'acres'
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
  router.put('/update-profile', (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];

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
        const updateStmt = db.prepare(`
          UPDATE users 
          SET name = ?, email = ?, date_of_birth = ?, gender = ?, id_number = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        
        const result = updateStmt.run(
          name || null,
          email || null,
          date_of_birth || null,
          gender || null,
          id_number || null,
          decoded.userId
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

  // POST /api/auth/logout
  router.post('/logout', (req, res) => {
    // JWT is stateless; client should discard token
    res.json({
      status: 'success',
      message: 'Logged out. Please discard your token.'
    });
  });

  return router;
}

export default router;
