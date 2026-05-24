import nodemailer from 'nodemailer';

/**
 * Email Service for sending OTP and notifications
 */

let transporter = null;
let resolvedFromAddress = '';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function formatRecommendationList(recommendations = []) {
  return recommendations.slice(0, 3).map((recommendation, index) => {
    const crop = recommendation.name || recommendation.crop || 'Recommended crop';
    const confidence = Math.round(Number(recommendation.confidence || recommendation.score || 0));
    const reason = recommendation.reasons?.english || recommendation.reason || recommendation.summary || 'Suitable for the selected farm conditions.';
    return `
      <tr>
        <td style="padding:14px;border-bottom:1px solid #e8efe7;font-weight:700;color:#163425;">${index + 1}. ${escapeHtml(crop)}</td>
        <td style="padding:14px;border-bottom:1px solid #e8efe7;color:#255f38;font-weight:700;">${confidence}%</td>
        <td style="padding:14px;border-bottom:1px solid #e8efe7;color:#4f6255;">${escapeHtml(reason)}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Initialize email transporter
 */
export function initializeEmailService() {
  const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || '').trim();
  const emailPassword = (process.env.EMAIL_PASSWORD || process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || '').trim();
  const emailHost = (process.env.SMTP_HOST || '').trim();
  const emailPort = Number(process.env.SMTP_PORT || 0) || 587;
  const emailSecure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || emailPort === 465;
  resolvedFromAddress = (process.env.EMAIL_FROM || emailUser || '').trim();
  const hasEmailConfig =
    !!emailUser &&
    !!emailPassword &&
    emailUser !== 'your-email@gmail.com' &&
    emailPassword !== 'your-app-password';

  if (!hasEmailConfig) {
    transporter = null;
    console.warn('⚠️  Email service not configured: EMAIL_USER and EMAIL_PASSWORD are missing');
    console.warn('   OTP codes will be logged to console instead');
    return;
  }

  if (emailHost) {
    transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailSecure,
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
  } else {
    // Gmail configuration
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
  }

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.warn('⚠️  Email service not configured:', error.message);
      console.warn('   OTP codes will be logged to console instead');
      console.warn('   Set EMAIL_USER and EMAIL_PASSWORD in .env to enable email');
    } else {
      console.log('✅ Email service configured and ready');
    }
  });
}

/**
 * Send OTP via email
 */
export async function sendOTPEmail(email, otp) {
  if (!transporter) {
    console.log(`\n🔐 OTP Code for ${email}: ${otp}\n`);
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        method: 'none',
        message: 'Email service is not configured in production'
      };
    }
    return {
      success: true,
      method: 'console',
      message: 'OTP sent to console (email not configured)'
    };
  }

  try {
    const mailOptions = {
      from: resolvedFromAddress || process.env.EMAIL_USER || process.env.SMTP_USER,
      to: email,
      subject: '🌱 Fahamu Shamba - Admin Login OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
            .header { color: #2c5f2d; font-size: 24px; margin-bottom: 20px; }
            .content { color: #333; line-height: 1.6; }
            .otp-box { background-color: #f0f0f0; border-left: 4px solid #2c5f2d; padding: 15px; margin: 20px 0; font-size: 18px; font-weight: bold; letter-spacing: 2px; }
            .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">🌱 Fahamu Shamba Admin Portal</div>
            
            <div class="content">
              <p>Hello,</p>
              
              <p>You have requested to log in to the Fahamu Shamba Admin Dashboard.</p>
              
              <p>Your One-Time Password (OTP) is:</p>
              
              <div class="otp-box">${otp}</div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This code expires in 5 minutes</li>
                <li>Never share this code with anyone</li>
                <li>Fahamu Shamba will never ask for this code via email</li>
              </ul>
              
              <p>If you did not request this code, please ignore this email.</p>
              
              <div class="footer">
                <p>© 2025 Fahamu Shamba. All rights reserved.</p>
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your Fahamu Shamba Admin OTP is: ${otp}\n\nThis code expires in 5 minutes.\n\nDo not share this code with anyone.`
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ OTP sent to ${email}`);
    
    return {
      success: true,
      method: 'email',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error.message);
    
    // Fallback: log to console
    console.log(`\n🔐 OTP Code for ${email}: ${otp}\n`);
    
    return {
      success: false,
      method: 'email',
      error: error.message,
      fallback: 'console'
    };
  }
}

/**
 * Send security alert email
 */
export async function sendSecurityAlertEmail(email, alertTitle, alertDetails) {
  if (!transporter) {
    console.log(`\n🚨 Security Alert for ${email}: ${alertTitle}\n`);
    return {
      success: true,
      method: 'console'
    };
  }

  try {
    const mailOptions = {
      from: resolvedFromAddress || process.env.EMAIL_USER || process.env.SMTP_USER,
      to: email,
      subject: `🚨 Fahamu Shamba - ${alertTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
            .alert { color: #d9534f; font-size: 18px; font-weight: bold; margin-bottom: 15px; }
            .details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="alert">🚨 ${alertTitle}</div>
            <div class="details">
              ${alertDetails.split('\n').map(line => `<p>${line}</p>`).join('')}
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, method: 'email' };
  } catch (error) {
    console.error('Error sending security alert:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email for new admin
 */
export async function sendWelcomeEmail(email, adminName) {
  if (!transporter) {
    console.log(`\n👋 Welcome email would be sent to ${email}\n`);
    return {
      success: true,
      method: 'console'
    };
  }

  try {
    const mailOptions = {
      from: resolvedFromAddress || process.env.EMAIL_USER || process.env.SMTP_USER,
      to: email,
      subject: '🌱 Welcome to Fahamu Shamba Admin Dashboard',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
            .header { color: #2c5f2d; font-size: 24px; margin-bottom: 20px; }
            .content { color: #333; line-height: 1.6; }
            .button { display: inline-block; background-color: #2c5f2d; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">🌱 Welcome to Fahamu Shamba Admin Dashboard</div>
            
            <div class="content">
              <p>Hello ${adminName},</p>
              
              <p>Your admin account has been successfully created. You can now access the Fahamu Shamba Admin Dashboard.</p>
              
              <p><strong>Quick Security Tips:</strong></p>
              <ul>
                <li>Enable Multi-Factor Authentication (MFA) on your account</li>
                <li>Use a strong, unique password</li>
                <li>Never share your login credentials</li>
                <li>Log out when finished with your session</li>
              </ul>
              
              <a href="http://localhost:5000/admin" class="button">Go to Admin Dashboard</a>
              
              <p style="margin-top: 20px; color: #666;">Questions? Contact your system administrator.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, method: 'email' };
  } catch (error) {
    console.error('Error sending welcome email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send recommendation summary to a farmer after recommendations are generated.
 */
export async function sendRecommendationEmail(email, payload = {}) {
  const recipient = String(email || '').trim();
  if (!recipient) {
    return {
      success: false,
      method: 'none',
      message: 'No farmer email address was provided'
    };
  }

  const recommendations = Array.isArray(payload.recommendations) ? payload.recommendations : [];
  if (!recommendations.length) {
    return {
      success: false,
      method: 'none',
      message: 'No recommendations were available to email'
    };
  }

  const topCrop = recommendations[0]?.name || recommendations[0]?.crop || 'your recommended crop';
  const locationLabel = payload.locationLabel || payload.selectedVillage || payload.selectedWard || payload.subCounty || 'your farm';
  const seasonLabel = String(payload.season || 'selected season').replace(/_/g, ' ');
  const farmerName = payload.farmerName || 'Farmer';

  if (!transporter) {
    console.log(`\n📧 Recommendation email for ${recipient}: ${topCrop} at ${locationLabel}\n`);
    return {
      success: process.env.NODE_ENV !== 'production',
      method: process.env.NODE_ENV === 'production' ? 'none' : 'console',
      message: process.env.NODE_ENV === 'production'
        ? 'Email service is not configured in production'
        : 'Recommendation email logged to console because email is not configured'
    };
  }

  try {
    const mailOptions = {
      from: resolvedFromAddress || process.env.EMAIL_USER || process.env.SMTP_USER,
      to: recipient,
      subject: `Fahamu Shamba Recommendation: ${topCrop}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { margin:0; padding:0; background:#edf5ef; font-family:Arial, sans-serif; color:#17231b; }
            .wrapper { max-width:680px; margin:0 auto; padding:24px; }
            .card { background:#ffffff; border-radius:20px; overflow:hidden; border:1px solid #dfeadd; box-shadow:0 16px 40px rgba(22,52,37,0.12); }
            .hero { background:linear-gradient(135deg,#163425,#255f38); color:white; padding:28px; }
            .hero h1 { margin:0 0 10px; font-size:26px; }
            .hero p { margin:0; line-height:1.6; color:#e6f3e7; }
            .content { padding:26px; }
            .summary { background:#f8f1df; border-left:5px solid #e7a73f; padding:16px; border-radius:14px; margin:18px 0; }
            table { width:100%; border-collapse:collapse; margin-top:18px; }
            th { text-align:left; background:#edf5ef; padding:12px 14px; color:#163425; font-size:13px; }
            .footer { color:#6f7f73; font-size:12px; line-height:1.5; padding:0 26px 24px; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="card">
              <div class="hero">
                <h1>Fahamu Shamba Crop Recommendation</h1>
                <p>Hello ${escapeHtml(farmerName)}, your recommendation has been generated successfully and is also available inside your Fahamu Shamba dashboard.</p>
              </div>
              <div class="content">
                <div class="summary">
                  <strong>Top recommendation:</strong> ${escapeHtml(topCrop)}<br>
                  <strong>Location:</strong> ${escapeHtml(locationLabel)}<br>
                  <strong>Season:</strong> ${escapeHtml(seasonLabel)}<br>
                  <strong>Soil:</strong> ${escapeHtml(payload.soilType || 'Selected soil profile')}<br>
                  <strong>Farm size:</strong> ${escapeHtml(payload.farmSize || 'Not specified')} acres
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Crop</th>
                      <th>Match</th>
                      <th>Why it fits</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${formatRecommendationList(recommendations)}
                  </tbody>
                </table>
              </div>
              <div class="footer">
                This is an automated Fahamu Shamba notification. Use the web dashboard for full budget, inputs, market, and soil details.
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Fahamu Shamba Recommendation\n\nHello ${farmerName},\nTop recommendation: ${topCrop}\nLocation: ${locationLabel}\nSeason: ${seasonLabel}\nSoil: ${payload.soilType || 'Selected soil profile'}\n\nRecommendations:\n${recommendations.slice(0, 3).map((rec, index) => `${index + 1}. ${rec.name || rec.crop || 'Crop'} - ${Math.round(Number(rec.confidence || rec.score || 0))}%`).join('\n')}\n\nOpen Fahamu Shamba for full details.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Recommendation email sent to ${recipient}`);
    return {
      success: true,
      method: 'email',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Error sending recommendation email:', error.message);
    return {
      success: false,
      method: 'email',
      error: error.message
    };
  }
}

export default {
  initializeEmailService,
  sendOTPEmail,
  sendSecurityAlertEmail,
  sendWelcomeEmail,
  sendRecommendationEmail
};
