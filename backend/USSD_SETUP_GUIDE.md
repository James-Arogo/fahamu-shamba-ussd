# Complete USSD Implementation Guide for Fahamu Shamba

## 🎯 Overview
Your Fahamu Shamba system already has a fully functional USSD service that provides:
- Multilingual crop recommendations (English, Kiswahili, Dholuo)
- Market price information
- User registration and profiles
- Real-time ML-powered recommendations

## 📋 Implementation Options

### Option 1: Twilio USSD (Recommended for International Testing)

#### Step 1: Set Up Twilio Account
1. **Sign up**: [https://console.twilio.com/](https://console.twilio.com/)
2. **Get credentials** from dashboard:
   - Account SID
   - Auth Token
3. **Purchase a USSD-capable number** (Kenyan numbers recommended)

#### Step 2: Configure Environment
Add to your `backend/.env`:
```env
USSD_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+254123456789
```

#### Step 3: Configure Twilio Webhook
1. Go to Twilio Console → Phone Numbers → Active Numbers
2. Select your USSD number
3. Set "Messaging" webhook to: `https://your-domain.com/api/ussd/twilio`
4. For local testing, use ngrok: `ngrok http 5000`

#### Step 4: Test the Service
```bash
# Start your server
cd backend
npm start

# Test with curl
curl -X POST http://localhost:5000/api/ussd/twilio \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+254712345678&To=+1234567890&Body=1"
```

### Option 2: Africa's Talking (Recommended for Kenyan Market)

#### Step 1: Set Up Africa's Talking Account
1. **Sign up**: [https://account.africastalking.com/](https://account.africastalking.com/)
2. **Get credentials**:
   - API Key
   - Username

#### Step 2: Configure Environment
Add to your `backend/.env`:
```env
USSD_PROVIDER=africastalking
AFRICASTALKING_API_KEY=your_api_key_here
AFRICASTALKING_USERNAME=your_username_here
```

#### Step 3: Configure Africa's Talking USSD
1. Go to Africa's Talking Dashboard → USSD
2. Create new USSD service with code: `*123#`
3. Set webhook URL to: `https://your-domain.com/api/ussd/africastalking`

#### Step 4: Test the Service
```bash
# Test with curl
curl -X POST http://localhost:5000/api/ussd/africastalking \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_session",
    "serviceCode": "*123#",
    "phoneNumber": "+254712345678",
    "text": "1"
  }'
```

## 🚀 Deployment Steps

### 1. Production Environment Setup
```bash
# Set production environment
export NODE_ENV=production
export PORT=5000

# Deploy to Vercel (already configured)
vercel --prod
```

### 2. Public URL Configuration
For production, update your webhook URLs:
- Twilio: `https://your-vercel-app.vercel.app/api/ussd/twilio`
- Africa's Talking: `https://your-vercel-app.vercel.app/api/ussd/africastalking`

### 3. USSD Code Registration
Register your USSD code with mobile operators:
- Safaricom: `*123#`
- Airtel: `*123#`
- Telkom: `*123#`

## 📱 User Experience Flow

### USSD Menu Structure
```
*123# → Language Selection → Main Menu → Services
├── 1. Get Crop Advice
│   ├── Location → Ward → Soil → Season → Size → Budget → Recommendation
├── 2. Market Prices
│   └── Current crop prices list
├── 3. Farm Profile
│   └── User profile information
└── 4. Register Account
    └── Phone → Name → Confirmation
```

### Example User Journey
1. **User dials**: `*123#`
2. **Selects language**: 1 (English)
3. **Chooses service**: 1 (Get Crop Advice)
4. **Enters location**: 1 (Siaya)
5. **Selects ward**: 1 (Bondo)
6. **Chooses soil**: 2 (Sandy)
7. **Selects season**: 1 (Long Rains)
8. **Enters farm size**: 2 (1-2 acres)
9. **Sets budget**: 3 (5000-10000 KSh)
10. **Gets recommendation**: "Maize - Success Rate: 85%"

## 🧪 Testing Checklist

### Local Testing
- [ ] Server starts without errors
- [ ] API endpoints respond correctly
- [ ] Database connections work
- [ ] Translation files load properly

### Provider Testing
- [ ] Twilio webhook receives requests
- [ ] Africa's Talking webhook receives requests
- [ ] USSD responses format correctly
- [ ] Session management works

### End-to-End Testing
- [ ] Complete user flow works
- [ ] Recommendations are generated
- [ ] Market prices display
- [ ] User registration saves to database
- [ ] Multilingual support functions

## 🔧 Troubleshooting

### Common Issues
1. **Webhook timeouts**: Check server response times
2. **Invalid USSD code**: Ensure `*123#` is registered
3. **Database errors**: Verify database connectivity
4. **Translation missing**: Check `ussd-translations.json`

### Debug Commands
```bash
# Check server logs
tail -f server.log

# Test database connection
node test-db.js

# Verify translations
node -e "console.log(JSON.parse(require('fs').readFileSync('ussd-translations.json', 'utf8')))"
```

## 📊 Monitoring & Analytics

### Key Metrics
- Daily USSD sessions
- User registration rates
- Recommendation requests
- Language preferences
- Error rates

### Database Queries
```sql
-- USSD usage statistics
SELECT DATE(created_at) as date, COUNT(*) as sessions 
FROM predictions 
GROUP BY DATE(created_at);

-- Popular crops
SELECT predicted_crop, COUNT(*) as count 
FROM predictions 
GROUP BY predicted_crop 
ORDER BY count DESC;
```

## 🌍 Scaling Considerations

### Performance Optimization
- Implement Redis for session storage
- Add database connection pooling
- Use CDN for static assets
- Enable response caching

### Geographic Expansion
- Add new counties and wards
- Include additional languages
- Integrate local market data
- Support multiple currencies

## 📞 Support & Maintenance

### Regular Tasks
- Monitor USSD service uptime
- Update market prices daily
- Review user feedback
- Backup database regularly

### Emergency Contacts
- Twilio Support: +1 (415) 886-7906
- Africa's Talking: support@africastalking.com
- System Administrator: [Your Contact]

---

**Your USSD system is now ready for production!** 🎉

Farmers can dial `*123#` to access intelligent crop recommendations, market prices, and farming advice in their preferred language.
