---
title: "Google Sheets Integration"
type: "guide"
audience: ["developer", "agent"]
contexts: ["integration", "google-api", "oauth", "export"]
complexity: "beginner"
last_updated: "2025-09-22"
version: "1.0"
agent_roles: ["integration-developer", "api-implementer"]
related:
  - developer/setup.md
  - developer/deployment/production.md
dependencies: ["google-apis", "oauth2"]
---

# Google Sheets Integration
*Ultra-Simple Setup for Seamless Data Export*

## Context for LLM Agents

**Scope**: Complete Google Sheets integration setup and configuration
**Prerequisites**: Understanding of OAuth2 flows, Google Cloud Console, and environment variables
**Key Patterns**:
- Zero-configuration demo mode for immediate functionality
- Simple production setup with single environment variable
- Browser-based OAuth2 authentication flow
- Automated spreadsheet creation and formatting

## 🎉 Works Out of the Box!

**Great news!** Google Sheets export works immediately without any setup - it uses demo credentials that work for testing and development.

## 🚀 Try It Now (Zero Setup)

1. Start your development server: `npm run dev`
2. Go to http://localhost:3000
3. Click "🔐 Conectar e Criar Google Sheets (Demo)"
4. Sign in with your Google account when prompted
5. Watch as it creates a Google Sheets document with your data!

## 🏆 Production Setup (Optional - Only 1 Environment Variable)

For production or to use your own Google Cloud project:

### Quick Steps (5 minutes):

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create new project** (e.g., "my-arqcashflow")
3. **Enable APIs**:
   - Go to "APIs & Services" → "Library"
   - Enable "Google Sheets API"
   - Enable "Google Drive API"
4. **Create OAuth2 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add `http://localhost:3000` to "Authorized JavaScript origins"
   - Add your production domain (if deploying)
   - Copy the **Client ID**

5. **Add to .env**:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

6. **Restart and enjoy!**

## 🔄 How It Works

### Demo Mode (Default):
- Uses safe demo credentials
- Works immediately for testing
- Creates real Google Sheets documents
- Perfect for development and demos

### Production Mode:
- Uses your own Google Cloud project
- One environment variable
- Full control over quotas and limits
- Professional setup

## 🎯 User Experience

**First Time:**
1. Click button → Google popup appears
2. Sign in with Google account
3. Grant permissions to create sheets
4. ArqCashflow creates and opens spreadsheet

**Subsequent Uses:**
1. Click button → No popup needed
2. Creates new spreadsheet instantly
3. Opens in new tab automatically

## 📊 What You Get

Every export creates a Google Sheets document with:

1. **Contracts Sheet**: Complete overview with totals
2. **Receivables Sheet**: Detailed payment tracking
3. **Expenses Sheet**: Cost breakdown and analysis
4. **Monthly Cashflow Sheet**: Month-by-month analysis

Features:
- ✅ Professional formatting (headers, currency, colors)
- ✅ Publicly readable (anyone with link can view)
- ✅ Timestamped titles for version tracking
- ✅ Opens automatically in new browser tab
- ✅ Brazilian Portuguese labels and formatting
- ✅ Proper currency formatting (R$ 1.234,56)

## 🛠️ Technical Implementation

### Architecture
```typescript
// Browser-based OAuth2 flow
Google Identity Services → User Authentication → API Access → Sheet Creation
```

### API Usage
- **Google Sheets API v4**: For spreadsheet creation and data insertion
- **Google Drive API v3**: For file permissions and sharing
- **Google Identity Services**: For modern OAuth2 authentication

### Code Structure
```typescript
// Client-side authentication
const auth = await google.accounts.oauth2.initTokenClient({
  client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
});

// Sheet creation and formatting
const spreadsheet = await sheets.spreadsheets.create({
  properties: { title: `ArqCashflow Report - ${timestamp}` },
  sheets: [contractsSheet, receivablesSheet, expensesSheet, cashflowSheet]
});
```

### Security Features
- **OAuth2 browser flow**: User controls permissions
- **No server credentials**: No sensitive keys in code
- **Scoped permissions**: Only spreadsheet and drive access
- **Demo rate limiting**: Safe shared credentials

## 🚨 Important Notes

### Demo Limitations:
- Shared quota with other demo users
- Rate limits apply
- Use your own credentials for heavy usage

### Production Benefits:
- Your own quota and limits
- Professional branding
- Full control over permissions
- Better for business use

## 🎯 Migration Path

**Start**: Use demo mode immediately
**Later**: Add your Client ID when ready
**Result**: Seamless transition with zero downtime

## ❓ Troubleshooting

### "Popup blocked"
- Allow popups for localhost:3000 in browser settings
- Try again after allowing popups

### "Access denied"
- Make sure you signed in with a Google account
- Grant permissions when prompted
- Check browser console for details

### "Rate limit exceeded"
- Demo credentials have usage limits
- Set up your own credentials for unlimited use
- Wait a few minutes and try again

### "Client ID not working"
- Make sure it ends with `.apps.googleusercontent.com`
- Check that both APIs are enabled in Google Cloud
- Verify JavaScript origins are configured correctly

## 🔧 Development Notes

### Environment Variables
```env
# Optional - uses demo credentials if not set
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### API Endpoints
- **Client-side**: `/api/export/google-sheets` - Processes export request
- **Google APIs**: Direct browser calls using Google Identity Services

### Error Handling
```typescript
try {
  const result = await createGoogleSheets(data);
  window.open(result.spreadsheetUrl, '_blank');
} catch (error) {
  console.error('Export failed:', error);
  // User-friendly error message
}
```

## 🎉 Best Part

**You get the same seamless experience as Google Colab**, but it works in any web browser with any Google account - no special environment needed!

This is exactly what modern web applications should provide: simple browser authentication that "just works" without complex credential management.

## Related Documentation

- [Development Setup](../setup.md) - Environment configuration
- [Production Deployment](../deployment/production.md) - Production environment setup
- [API Reference](../../reference/api/contracts.md) - Export API details

---

*This integration demonstrates how modern OAuth2 flows can provide seamless user experiences while maintaining security and simplicity.*