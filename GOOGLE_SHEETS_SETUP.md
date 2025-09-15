# Google Sheets API Setup Guide (OAuth2 - Easy Setup!)

This guide will walk you through the **simple OAuth2 setup** for Google Sheets integration in ArqCashflow. This approach uses browser authentication with a popup window - much easier than service accounts!

## Prerequisites

- A Google account
- 5 minutes of your time

## Step-by-Step Setup (Much Simpler!)

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "arqcashflow-sheets")
5. Click "Create"
6. Wait for the project to be created and select it

### Step 2: Enable APIs

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for and enable these APIs:
   - **"Google Sheets API"** - Click "Enable"
   - **"Google Drive API"** - Click "Enable"

### Step 3: Create OAuth2 Credentials (The Easy Way!)

1. Go to **APIs & Services** > **Credentials**
2. Click "Create Credentials" > **"OAuth 2.0 Client IDs"**
3. If prompted to configure OAuth consent screen:
   - Click "Configure Consent Screen"
   - Choose **"External"** (unless you have Google Workspace)
   - Fill in required fields:
     - **App name**: "ArqCashflow"
     - **User support email**: Your email
     - **Developer contact**: Your email
   - Click "Save and Continue" through all steps
4. Back in Credentials, click "Create Credentials" > "OAuth 2.0 Client IDs"
5. Choose **"Web application"**
6. Name it: "ArqCashflow Web Client"
7. Add **Authorized JavaScript origins**:
   - `http://localhost:3000` (for development)
   - Your production domain (if deploying)
8. Click "Create"

### Step 4: Copy Your Credentials

After creating the OAuth2 client, you'll see a dialog with:
- **Client ID**: Something like `123456789-abc123.apps.googleusercontent.com`
- **Client Secret**: Something like `GOCSPX-abcdef123456`

### Step 5: Update Your .env File

Add these to your `.env` file:

```env
# Existing variables
OPENAI_API_KEY=your-openai-key-here
DATABASE_URL="file:./dev.db"

# Google Sheets API Configuration (OAuth2)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdef123456
```

**That's it!** Only 2 lines to add!

### Step 6: Restart Your Development Server

After updating the `.env` file:

```bash
npm run dev
```

### Step 7: Test the Integration

1. Go to your ArqCashflow home page (`http://localhost:3000`)
2. Look for the "🔐 Conectar e Criar Google Sheets" button
3. Click it - **a Google authentication popup will appear**
4. **Sign in with your Google account** and grant permissions
5. The app will create a Google Sheets document and open it automatically!

## How It Works (The Magic!)

### First Time Use:
1. Click "🔐 Conectar e Criar Google Sheets"
2. **Google popup appears** asking for permission
3. You sign in and grant access to Google Sheets
4. ArqCashflow creates a new spreadsheet with your data
5. Opens the spreadsheet in a new tab

### Subsequent Uses:
1. Click "📈 Criar Relatório Google Sheets" (no lock icon!)
2. **No popup needed** - you're already authenticated
3. Creates new spreadsheet instantly

## Troubleshooting

### "Google Sheets não configurado"
- Check that `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in `.env`
- Restart your development server
- Make sure the client ID ends with `.apps.googleusercontent.com`

### "Popup blocked" or "Authentication failed"
- Allow popups for localhost:3000 in your browser
- Try again - sometimes the first attempt fails
- Check browser console for detailed error messages

### "Access denied" or "Forbidden"
- Make sure you enabled both Google Sheets API and Google Drive API
- Check that your localhost:3000 is in "Authorized JavaScript origins"

## Production Deployment

For production (Vercel, Railway, etc.):

1. Add your production domain to "Authorized JavaScript origins" in Google Cloud Console
2. Add the same environment variables to your hosting platform:
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Your client ID
   - `GOOGLE_CLIENT_SECRET`: Your client secret (not used in current implementation, but good to have)

## What You Get

The Google Sheets export creates a spreadsheet with:

1. **Contracts Sheet**: Overview of all contracts with totals
2. **Receivables Sheet**: Detailed list of all receivables
3. **Monthly Cashflow Sheet**: Month-by-month breakdown

The spreadsheet is:
- ✅ **Automatically formatted** with headers and currency
- ✅ **Made publicly viewable** (read-only)
- ✅ **Opened in new tab** for immediate access
- ✅ **Timestamped** so you can track different exports

## Why This Approach is Better

**VS Service Account (old way):**
- ❌ Complex JSON key management
- ❌ Security risks with private keys
- ❌ Manual credential extraction

**OAuth2 Browser Auth (new way):**
- ✅ **Simple popup authentication**
- ✅ **No sensitive keys to manage**
- ✅ **Works like any Google login**
- ✅ **User controls permissions**

Just like when you use "Sign in with Google" on any website!

```bash
npm run dev
```

### Step 8: Test the Integration

1. Go to your ArqCashflow home page (`http://localhost:3000`)
2. Look for the "📈 Criar Relatório Google Sheets" button
3. Click it to test the integration
4. If configured correctly, it will create a new Google Sheets document and open it in a new tab

## Troubleshooting

### Common Issues

#### "Google Sheets API not configured"
- Check that all three environment variables are set in `.env`
- Restart your development server after updating `.env`

#### "credentials are not properly configured"
- Verify the service account email is correct
- Check that the private key is properly formatted with `\n` newlines
- Ensure the private key includes the BEGIN and END markers

#### "quota exceeded" or "rate limit"
- Google Sheets API has usage limits
- Wait a few minutes and try again
- For production, consider implementing rate limiting

#### "Permission denied"
- Make sure both Google Sheets API and Google Drive API are enabled
- Verify the service account has the correct permissions

### Security Best Practices

1. **Never commit the JSON key file to git**
2. **Keep your `.env` file in `.gitignore`**
3. **Rotate your service account keys periodically**
4. **Use different service accounts for development and production**

## Production Deployment

For production (Vercel, Railway, etc.):

1. Add the same environment variables to your hosting platform
2. For the private key, you may need to escape it differently depending on your platform
3. Consider using your hosting platform's secret management features

### Vercel Example

In Vercel dashboard:
- Go to your project settings
- Add environment variables:
  - `GOOGLE_CLIENT_EMAIL`: `your-service-account@project.iam.gserviceaccount.com`
  - `GOOGLE_PRIVATE_KEY`: Copy the entire private key including newlines
  - `GOOGLE_PROJECT_ID`: `your-project-id`

## What the Integration Does

Once configured, the Google Sheets export will:

1. **Create a new spreadsheet** with a timestamped name
2. **Generate 3 sheets**:
   - **Contracts**: Overview of all contracts with totals
   - **Receivables**: Detailed list of all receivables
   - **Monthly Cashflow**: Month-by-month breakdown
3. **Apply formatting**: Headers, currency formatting, borders
4. **Make it publicly viewable** (read-only)
5. **Return a direct link** to open the spreadsheet

The created spreadsheet will have the same data and structure as the Excel export, but will be accessible online through Google Sheets.