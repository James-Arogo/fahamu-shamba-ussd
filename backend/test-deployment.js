// Simple test for Vercel deployment
import express from 'express';

const app = express();
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Fahamu Shamba API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple USSD test endpoint
app.post('/api/ussd-test', (req, res) => {
  const { sessionId, phoneNumber, text } = req.body;
  
  res.json({
    response: 'CON Welcome to Fahamu Shamba USSD Test\n1. English\n2. Kiswahili\n3. Dholuo',
    endSession: false
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

export default app;
