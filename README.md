# Fahamu Shamba 🌱
**Smart Farming Platform for Smallholder Farmers in Siaya County**

---

## 📌 Overview

Fahamu Shamba is a multilingual, farmer-centric platform designed to empower smallholder farmers with **timely, personalized, and hyper-local crop suitability recommendations**. By combining soil properties, micro-climatic conditions, water availability, and management constraints, Fahamu Shamba helps farmers move beyond outdated generic advice and make data-driven farming decisions.

---

## 🚜 Problem Statement

Smallholder farmers in Siaya County face **low yields and reduced incomes** due to:
- Lack of **timely, personalized crop recommendations**
- Absence of guidance tailored to **specific farming conditions**
- Limited access to **real-time market information**
- Inability to share experiences and **learn from peer farmers**

---

## 🎯 Objectives

✓ Deliver **site-specific crop suitability recommendations**  
✓ Provide **real-time weather and market price updates**  
✓ Enable **community feedback and farmer networking**  
✓ Support **multilingual access** (English, Kiswahili, Dhulo)  
✓ Ensure **responsive, mobile-friendly experience** across all pages  

---

## 🌟 Key Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Personalized crop tips, weather updates, and market insights at a glance |
| **Recommendations** | Hyper-local crop suitability guidance based on farm conditions |
| **Market Prices** | Real-time commodity pricing and trend analysis |
| **Community** | Farmer feedback, peer learning, and experience sharing |
| **Multilingual** | Full support for English, Kiswahili, and Dhulo |
| **Mobile Navigation** | Smooth hamburger menu with intuitive overlay design |
| **Ward-Level Data** | Location-specific recommendations and analytics |

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript (with i18n JSON translations) |
| **Backend** | Node.js / Express.js |
| **Database** | PostgreSQL (Neon) / SQLite |
| **Hosting** | Vercel via `backend/server.js` |
| **APIs** | RESTful API design, Chart.js for data visualization |

---

## 🚀 Getting Started

### Runtime Source Of Truth

The supported backend runtime is `backend/server.js`.

The legacy `api/` directory is retired and should not be used as a separate deployment target.

### Prerequisites
- Node.js 18 or higher
- npm
- PostgreSQL via `DATABASE_URL` for production, or SQLite for local fallback

### Web App Setup

```bash
# 1. Clone the repository
git clone https://github.com/derrickomwanza/fahamu-shamba.git
cd fahamu-shamba/backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp ../.env.example .env
# Edit .env with your secrets and API credentials

# 4. Start the development server
npm start
```

The web application will run at `http://localhost:5000`

### Mobile App Setup

The Expo mobile app lives in `frontend/FahamuShamba` and is a separate client application.

---

## 📂 Project Structure

```
fahamu-shamba/
├── backend/           # Canonical Express.js API server
├── public/            # Static web app served by the backend
├── frontend/          # Separate mobile/Expo client and helper scripts
├── api/               # Retired legacy Vercel API prototype
├── docs/              # Documentation
└── README.md          # This file
```

---

## 🌍 How to Use

1. **Select Your Language** – Choose English, Kiswahili, or Dhulo
2. **Create Account** – Register with your details and farm location
3. **View Dashboard** – See personalized crop tips, weather, and market data
4. **Get Recommendations** – Receive crop suggestions tailored to your farm
5. **Engage Community** – Share feedback and learn from other farmers
6. **Check Market Prices** – Stay updated on commodity prices

---

## 📊 Database Schema

The platform uses the following key tables:
- `users` – Farmer profiles and preferences
- `farm_data` – Farm location, soil type, water availability
- `crops` – Crop database with suitability criteria
- `market_prices` – Real-time market data
- `community_feedback` – Farmer comments and ratings
- `weather_data` – Weather updates and forecasts

---

## 🔑 Environment Variables

Create a `.env` file in `backend/` from the root `.env.example`:

```bash
cd backend
cp ../.env.example .env
```

Important variables:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_JWT_SECRET=replace-with-a-long-random-admin-secret
ADMIN_REFRESH_SECRET=replace-with-a-long-random-refresh-secret
PASSWORD_SALT=replace-with-a-long-random-password-salt
# DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
OPENWEATHER_API_KEY=your_api_key_here
```

---

## 🛣️ Roadmap

- [ ] **Auto-detect browser/device language** preferences
- [ ] **Offline support** for farmers with limited connectivity
- [ ] **Expand crop database** for additional regions
- [ ] **SMS/USSD integration** for non-smartphone users
- [ ] **ML-powered recommendations** based on historical data
- [ ] **Mobile app** (iOS & Android)
- [ ] **Voice interface** for accessibility
- [ ] **Multi-region expansion** beyond Siaya County

---

## 🤝 Contributing

We welcome contributions! Here's how to get involved:

1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

Please ensure your code follows the project's style guidelines and includes appropriate tests.

---

## 📞 Support & Feedback

- **Issues**: Report bugs via [GitHub Issues](https://github.com/derrickomwanza/fahamu-shamba/issues)
- **Discussions**: Share ideas and feedback in [GitHub Discussions](https://github.com/derrickomwanza/fahamu-shamba/discussions)
- **Email**: Contact us at [your-email@example.com]

---

## 📜 License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

## 👩🏾‍🌾 Acknowledgements

- **Smallholder farmers in Siaya County** for inspiring and testing this solution
- **Community contributors** who have provided feedback and improvements
- **Open-source libraries** and frameworks that power this platform
- **Agricultural extension officers** for domain expertise

---

## 🔗 Quick Links

- [GitHub Repository](https://github.com/derrickomwanza/fahamu-shamba)
- [Live Demo](#) *(Coming soon)*
- [Project Documentation](./docs/)
- [Issue Tracker](https://github.com/derrickomwanza/fahamu-shamba/issues)

---

<div align="center">

**Built with ❤️ for smallholder farmers in Siaya County**

*Empowering farmers through technology and data*

</div>
# Project01-fahamu-shamba-
