# Superuser Setup Guide

## 1. Google Cloud Console Setup

### Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services > OAuth consent screen**
   - Choose "External" user type
   - Fill in app name: "Superuser"
   - Add your email as developer contact
   - Add scopes:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.compose`
     - `https://www.googleapis.com/auth/gmail.modify`
   - Add test users (your Gmail addresses) while in "Testing" status

4. Navigate to **APIs & Services > Credentials**
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: **Web application**
   - Name: "Superuser Vercel"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for local dev)
     - `https://your-app.vercel.app` (your Vercel URL)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://your-app.vercel.app/api/auth/callback/google`
   - Click Create and save the **Client ID** and **Client Secret**

5. Enable Gmail API:
   - Go to **APIs & Services > Library**
   - Search for "Gmail API"
   - Click Enable

### Publishing Status

While in "Testing" mode, only added test users can sign in. To allow any Google user:
1. Go to OAuth consent screen
2. Click "Publish App"
3. Complete Google's verification (required for sensitive Gmail scopes)

---

## 2. Vercel Deployment

### Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

### Deploy via GitHub

1. Push code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Vercel auto-detects Next.js

### Environment Variables

In Vercel dashboard > Project > Settings > Environment Variables, add:

| Variable | Value |
|----------|-------|
| `GOOGLE_CLIENT_ID` | Your OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your OAuth client secret |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

---

## 3. Local Development

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env.local

# Fill in .env.local with your credentials

# Run dev server
npm run dev
```

---

## 4. After Deployment

1. Update Google OAuth credentials with your actual Vercel URL
2. Test sign-in flow
3. Grant Gmail permissions when prompted
4. Start triaging emails with AI

---

## Troubleshooting

### "Access blocked: This app's request is invalid"
- Check redirect URIs match exactly (including trailing slashes)
- Ensure NEXTAUTH_URL matches your deployed URL

### "This app isn't verified"
- Expected while in Testing mode
- Click "Advanced" > "Go to Superuser (unsafe)" to proceed
- Or publish app and complete verification

### Gmail API errors
- Ensure Gmail API is enabled in Cloud Console
- Check OAuth scopes include gmail.readonly, gmail.compose, gmail.modify
