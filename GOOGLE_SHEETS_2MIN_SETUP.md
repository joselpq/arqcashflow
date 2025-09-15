# Google Sheets Setup - 2 Minute Guide

## 🚀 Super Quick Setup (Really 2 minutes!)

The 400 error you saw happens because Google needs to know your app is allowed to use their services. Here's the **fastest way** to fix it:

## 📋 Step by Step

### 1. Open Google Cloud Console
🔗 **Go to:** https://console.cloud.google.com

### 2. Create Project (30 seconds)
- Click the project dropdown at the top
- Click **"New Project"**
- Name: `arqcashflow-sheets` (or anything you want)
- Click **"Create"**
- Wait for it to be created and **select it**

### 3. Enable APIs (30 seconds)
- Go to **"APIs & Services"** → **"Library"**
- Search **"Google Sheets API"** → Click **"Enable"**
- Search **"Google Drive API"** → Click **"Enable"**

### 4. Create Credentials (45 seconds)
- Go to **"APIs & Services"** → **"Credentials"**
- Click **"Create Credentials"** → **"OAuth 2.0 Client IDs"**
- **If asked about consent screen:**
  - Click **"Configure Consent Screen"**
  - Choose **"External"**
  - App name: **"ArqCashflow"**
  - Your email in both email fields
  - Click **"Save and Continue"** through all steps
- Back to **"Create Credentials"** → **"OAuth 2.0 Client IDs"**
- Application type: **"Web application"**
- Name: **"ArqCashflow Web"**

### 5. Add Your Domain (15 seconds)
- In **"Authorized JavaScript origins"** click **"ADD URI"**
- Add: `http://localhost:3000`
- If deploying to production, also add your production URL
- Click **"Create"**

### 6. Copy Your Client ID (15 seconds)
- A popup shows your credentials
- **Copy the Client ID** (looks like: `123456-abc123.apps.googleusercontent.com`)
- Click **"OK"**

### 7. Add to Your .env File (30 seconds)
Open your `.env` file and add:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=paste-your-client-id-here.apps.googleusercontent.com
```

### 8. Restart and Test!
```bash
npm run dev
```

Go to http://localhost:3000 and click the Google Sheets button - it should work now!

## 🎯 What You Should See

**Before setup:** "🔧 Configure Google Sheets para usar"
**After setup:** "🔐 Conectar e Criar Google Sheets" (working button!)

## ❓ Troubleshooting

### "Still getting 400 error"
- Double-check the Client ID was copied correctly
- Make sure `http://localhost:3000` is in "Authorized JavaScript origins"
- Restart your dev server after updating .env

### "OAuth consent screen error"
- Make sure you configured the consent screen in step 4
- Fill in all required fields (app name, emails)

### "APIs not enabled"
- Both Google Sheets API AND Google Drive API must be enabled
- Check in "APIs & Services" → "Enabled APIs"

## 🎉 Success!

Once working, you'll get the same seamless experience as Google Colab:
1. Click button
2. Google popup appears
3. Sign in and grant permissions
4. ArqCashflow creates and opens your Google Sheets!

## 💡 Pro Tip

The Client ID is **public and safe** - it's designed to be included in client-side code. No security risk!