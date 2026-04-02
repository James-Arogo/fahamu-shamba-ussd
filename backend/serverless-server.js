import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || true 
    : true,
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', environment: process.env.NODE_ENV || 'development' });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Fahamu Shamba API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercel: IS_VERCEL
  });
});

// Simple USSD endpoint for testing
app.post('/api/ussd', (req, res) => {
  try {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    // Validate required parameters
    if (!sessionId || !phoneNumber) {
      return res.status(400).json({ error: 'Missing required parameters: sessionId, phoneNumber' });
    }

    // Simple USSD logic for testing
    let response = '';
    let endSession = false;

    if (!text || text === '') {
      response = `Welcome to Fahamu Shamba
Choose your language:
1. English
2. Kiswahili
3. Dholuo`;
    } else if (text === '1') {
      response = `Main Menu
1. Get Crop Advice
2. Market Prices
3. Farm Profile
4. Register Account`;
    } else if (text === '1\n1') {
      response = `END CROP RECOMMENDATION
Top Crop: Maize
Success Rate: 85%

Suitable for sandy soils with adequate drainage. Perfect for long rains season.
Current Market Price: KSh 65/kg

Thank you! Visit fahamu-shamba.com for more.`;
      endSession = true;
    } else if (text === '1\n2') {
      response = `END Current Market Prices:

1. Maize: KSh 65/kg
2. Beans: KSh 85/kg
3. Rice: KSh 125/kg
4. Sorghum: KSh 95/kg
5. Groundnuts: KSh 110/kg

Goodbye! Dial *123# again to use Fahamu Shamba.`;
      endSession = true;
    } else {
      response = 'Invalid option. Please try again.';
    }

    // Format response for USSD gateway
    const ussdResponse = endSession 
      ? `END ${response}`
      : `CON ${response}`;

    res.set('Content-Type', 'text/plain');
    res.send(ussdResponse);

  } catch (error) {
    console.error('USSD Error:', error);
    const response = `END An error occurred. Please try again later.`;
    res.set('Content-Type', 'text/plain');
    res.send(response);
  }
});

// Africa's Talking USSD endpoint
app.post('/api/ussd/africastalking', (req, res) => {
  try {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    console.log(`[Africa's Talking USSD] Request: sessionId=${sessionId}, phone=${phoneNumber}, text=${text}`);

    // Validate required parameters
    if (!sessionId || !phoneNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: sessionId, phoneNumber'
      });
    }

    // Simple response for testing
    const response = {
      response: "Welcome to Fahamu Shamba\nChoose your language:\n1. English\n2. Kiswahili\n3. Dholuo",
      endSession: false
    };

    res.json(response);

  } catch (error) {
    console.error('Africa\'s Talking USSD Error:', error);
    
    res.json({
      response: 'Service temporarily unavailable. Please try again later.',
      endSession: true
    });
  }
});

// Twilio USSD endpoint
app.post('/api/ussd/twilio', (req, res) => {
  try {
    const { 
      From: fromNumber, 
      To: toNumber, 
      Body: bodyText 
    } = req.body;

    console.log(`[Twilio USSD] Request: from=${fromNumber}, to=${toNumber}, body=${bodyText}`);

    // Simple Twilio response for testing
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    <Body>Welcome to Fahamu Shamba
Choose your language:
1. English
2. Kiswahili
3. Dholuo</Body>
  </Message>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twimlResponse);

  } catch (error) {
    console.error('Twilio USSD Error:', error);
    
    const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    <Body>Service temporarily unavailable. Please try again later.</Body>
  </Message>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(errorResponse);
  }
});

// Simple login endpoint for testing
app.post('/api/login', (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginId = (username || email || '').toString().trim();
    const loginIdLower = loginId.toLowerCase();
    
    console.log(`[LOGIN] Attempt for identifier: ${loginId}`);
    
    // Simple validation for demo
    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required'
      });
    }

    // User-requested demo credentials
    if (loginIdLower === 'jemo' && password === 'Jemo@721') {
      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: 3,
          username: 'Jemo',
          email: 'jemo@fahamu-shamba.com',
          role: 'farmer',
          name: 'Jemo'
        },
        token: 'jwt-token-' + Date.now()
      });
    }
    
    // Demo user validation (in production, use proper database)
    if (loginIdLower === 'demo@fahamu-shamba.com' && password === 'demo123') {
      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: 1,
          email: 'demo@fahamu-shamba.com',
          name: 'Demo Farmer',
          phone: '+254712345678'
        },
        token: 'demo-jwt-token-' + Date.now()
      });
    }
    
    // Check for existing users (simplified)
    const users = [
      { email: 'admin@fahamu-shamba.com', password: 'admin123', role: 'admin' },
      { email: 'farmer@fahamu-shamba.com', password: 'farmer123', role: 'farmer' }
    ];
    
    const user = users.find(u => u.email.toLowerCase() === loginIdLower && u.password === password);
    
    if (user) {
      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.email === 'admin@fahamu-shamba.com' ? 1 : 2,
          email: user.email,
          role: user.role,
          name: user.role === 'admin' ? 'Admin User' : 'Farmer User'
        },
        token: 'jwt-token-' + Date.now()
      });
    }
    
    // For demo purposes, accept any email/password with minimum validation
    if (loginId.includes('@') && password.length >= 6) {
      const name = loginId.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: Date.now(),
          email: loginId,
          name: name,
          phone: '+254712345678'
        },
        token: 'jwt-token-' + Date.now()
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
    
  } catch (error) {
    console.error('[LOGIN] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Handle GET requests to login endpoint (return proper JSON error)
app.get('/api/login', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Method not allowed. Use POST request for login.'
  });
});

// User registration endpoint
app.post('/api/register', (req, res) => {
  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      email,
      subCounty,
      soilType,
      farmSize,
      waterSource,
      budget,
      isGroup,
      groupName,
      preferredLanguage,
      password
    } = req.body;
    
    console.log(`[REGISTER] New user: ${firstName} ${lastName}, ${email}, subCounty: ${subCounty}`);
    
    // Validate required fields
    if (!phoneNumber || !firstName || !lastName || !email || !subCounty) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, name, email, and sub-county are required'
      });
    }
    
    // Demo success response with all fields
    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: Date.now(),
        phoneNumber: phoneNumber || '+254712345678',
        firstName: firstName || 'Demo',
        lastName: lastName || 'Farmer',
        email: email,
        subCounty: subCounty || 'Siaya',
        soilType: soilType || 'Loam',
        farmSize: farmSize || '1-2 acres',
        waterSource: waterSource || 'Rainfall',
        budget: budget || '5000-10000',
        isGroup: isGroup || false,
        groupName: groupName || null,
        preferredLanguage: preferredLanguage || 'english'
      }
    });
    
  } catch (error) {
    console.error('[REGISTER] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Farmer registration endpoint (matches the original API)
app.post('/api/farmers/register', (req, res) => {
  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      email,
      subCounty,
      soilType,
      farmSize,
      waterSource,
      budget,
      isGroup,
      groupName,
      preferredLanguage
    } = req.body;
    
    console.log(`[FARMER REGISTER] New farmer: ${firstName} ${lastName}, subCounty: ${subCounty}`);
    
    // Validate required fields
    if (!phoneNumber || !firstName || !lastName || !subCounty) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, first name, last name, and sub-county are required'
      });
    }
    
    // Demo success response
    res.json({
      success: true,
      message: 'Farmer registration successful',
      farmer: {
        id: Date.now(),
        phoneNumber,
        firstName,
        lastName,
        email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@fahamu-shamba.com`,
        subCounty,
        soilType: soilType || 'Loam',
        farmSize: farmSize || '1-2 acres',
        waterSource: waterSource || 'Rainfall',
        budget: budget || '5000-10000',
        isGroup: isGroup || false,
        groupName: groupName || null,
        preferredLanguage: preferredLanguage || 'english',
        registeredAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[FARMER REGISTER] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during farmer registration'
    });
  }
});

// Serve static files (if public directory exists)
import { existsSync } from 'fs';
const publicDir = path.join(__dirname, '..', 'public');
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// Export for serverless
export default app;
