# PAYMIND Enterprise — Credential Rotation & Security Guide

This document provides explicit instructions for rotating credentials, API keys, database secrets, and signing tokens used across PAYMIND Enterprise.

---

## 1. When to Rotate Credentials

- **Post-Hackathon or Public Submission**: If credentials were previously shared or exposed during development or demonstrations.
- **Team or Contributor Offboarding**: When team membership changes.
- **Scheduled Rotation**: Every 90 days for production keys.
- **Suspected Compromise**: Immediate emergency revocation and rotation.

---

## 2. Step-by-Step Rotation Procedures

### 2.1 Google Gemini API Key (`GEMINI_API_KEY`)
1. Navigate to [Google AI Studio — API Keys](https://aistudio.google.com/app/apikey).
2. Click **Create API Key** and choose your Google Cloud project.
3. Update `GEMINI_API_KEY` in `ai-service/.env`.
4. Return to Google AI Studio and **Delete** or disable the old key.
5. Verify health: `GET http://127.0.0.1:8000/health`.

### 2.2 PayPal Sandbox / Production Credentials (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`)
1. Log in to [PayPal Developer Portal](https://developer.paypal.com/dashboard/applications).
2. Under **Apps & Credentials**, select the application (`PAYMIND Enterprise US`).
3. Click **Add Secret** to generate a new secondary client secret.
4. Update `PAYPAL_CLIENT_SECRET` in `backend/.env`.
5. If creating a new app or rotating client ID:
   - Update `PAYPAL_CLIENT_ID` in `backend/.env`.
   - Update `VITE_PAYPAL_CLIENT_ID` in `frontend/.env`.
   - Re-build frontend: `npm run build` in `frontend/`.
6. Once verified, delete the old secret from the PayPal dashboard.

### 2.3 Neon PostgreSQL Database Password (`DATABASE_URL`)
1. Go to the [Neon Console](https://console.neon.tech).
2. Select your project → **Roles & Databases**.
3. Under the database role (`neondb_owner`), click the options menu (`...`) and choose **Reset password**.
4. Copy the new pooled connection string (`?sslmode=require`).
5. Update `DATABASE_URL` in `backend/.env`.
6. Restart the backend process to connect with the new password.

### 2.4 Application JWT Secret (`JWT_SECRET`)
1. Generate a high-entropy 64-byte cryptographic key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. Set the output as `JWT_SECRET` in `backend/.env`.
3. Restart the backend server.
4. *Effect*: All currently issued user access tokens will be invalidated immediately, forcing re-authentication with new HttpOnly session cookies.

### 2.5 Double-Submit CSRF Secret (`CSRF_SECRET`)
1. Generate a high-entropy 32-byte cryptographic key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Set the output as `CSRF_SECRET` in `backend/.env`.
3. Restart the backend server.

### 2.6 Internal Microservice Key (`AI_SERVICE_API_KEY` / `BACKEND_API_KEY`)
1. Generate a shared 32-byte hexadecimal secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update `AI_SERVICE_API_KEY` in `backend/.env`.
3. Update `BACKEND_API_KEY` in `ai-service/.env`.
4. Restart both backend and AI service.
5. Verify mutual authentication by submitting a test procurement assessment.

---

## 3. Pre-Submission Cleanliness Guarantee

All actual `.env` files are excluded from git via `.gitignore`. The repository template provides safe `.env.example` placeholder files:
- `backend/.env.example`
- `frontend/.env.example`
- `ai-service/.env.example`

Run the automated pre-submission cleanliness check before packaging:
```bash
node scripts/pre-submission-check.js
```

