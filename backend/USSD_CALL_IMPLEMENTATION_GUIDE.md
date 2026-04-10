# USSD + Voice Go-Live Guide (Android Real-Time)

This guide is aligned to the current codebase and your deployed domain:

- Production URL: `https://fahamu-shamba-vert.vercel.app`
- USSD endpoints:
  - `POST /api/ussd`
  - `POST /api/ussd/africastalking`
  - `POST /api/ussd/twilio`
- Voice endpoints (new):
  - `POST /api/voice/twilio/inbound`
  - `POST /api/voice/twilio/menu`

## 1. What Is Already Implemented

1. Persistent USSD sessions in database (not memory-only).
2. USSD writes (predictions + user registration) through shared DB persistence layer.
3. Twilio voice IVR flow that reuses the USSD state machine for keypad navigation.
4. Existing multi-language USSD menus and recommendation flow.

## 2. Provider Decision (Recommended)

1. USSD: Use **Africa's Talking** for Kenya market dialing (`*123#`).
2. Voice calls: Use **Twilio Voice** first for fast setup/testing, or Africa's Talking Voice if your account is ready.

## 3. Configure Environment Variables on Vercel

Run from project root:

```bash
vercel env add AFRICASTALKING_API_KEY production
vercel env add AFRICASTALKING_USERNAME production
vercel env add TWILIO_ACCOUNT_SID production
vercel env add TWILIO_AUTH_TOKEN production
vercel env add TWILIO_PHONE_NUMBER production
vercel env add DATABASE_URL production
```

Then deploy:

```bash
vercel deploy --prod --archive=tgz
```

## 4. Configure Africa's Talking USSD (Real Dialing)

1. In Africa's Talking Dashboard, create or open your USSD service.
2. Register/assign your USSD code (e.g. `*123#`).
3. Set callback URL to:
   - `https://fahamu-shamba-vert.vercel.app/api/ussd/africastalking`
4. Set method `POST`.
5. Save and test from AT simulator first, then a real SIM.

## 5. Configure Twilio Voice (Real Call)

1. Buy/configure a voice-capable Twilio number.
2. In Twilio number settings, set "A CALL COMES IN" webhook to:
   - `https://fahamu-shamba-vert.vercel.app/api/voice/twilio/inbound`
3. Method: `HTTP POST`.
4. Save.

When a farmer calls this number:
1. System starts language/menu prompts via voice.
2. Farmer uses keypad digits.
3. Backend uses the same USSD recommendation flow and reads response back.

## 6. Validate End-to-End

1. USSD check:
   - Dial `*123#` from Android phone.
   - Confirm language menu appears.
   - Complete a recommendation journey.
2. Voice check:
   - Call Twilio number.
   - Press keypad options.
   - Confirm call progresses and ends with recommendation.
3. Persistence check:
   - Verify inserted records in `predictions`.
   - Verify registered user in `users`.

## 7. Operational Checks

1. Ensure database reports PostgreSQL in health:
   - `curl -s https://fahamu-shamba-vert.vercel.app/api/health`
2. Confirm provider webhook logs show 2xx responses.
3. If callbacks fail:
   - Verify webhook URL exact path.
   - Verify method is POST.
   - Verify SSL endpoint reachable.

## 8. Important Notes

1. USSD service code is strictly validated to `*123#` in code.
2. Session persistence is now database-backed, so cloud instance switching no longer breaks flows.
3. If you choose to use only Africa's Talking for both USSD and voice, you can add a parallel AT voice webhook using the same state engine pattern as Twilio voice.

