# 🚀 Domain Migration Checklist: arqcashflow.vercel.app → arnaldo.ai

**Migration Date**: [To be completed]
**Strategy**: Clean Cut Migration
**Expected Downtime**: ~0 minutes (DNS propagation only)

---

## ✅ What I've Already Done For You (Automated)

- [x] Updated documentation configuration (`docs/docs-site/docusaurus.config.ts`)
  - Changed base URL to `https://docs.arnaldo.ai`
  - Updated app link to `https://arnaldo.ai`
  - Updated project name to "arnaldo"
- [x] Created domain redirect middleware (`middleware.ts`)
  - 301 permanent redirect from old domain to new domain
  - Preserves existing route redirects (contracts → projetos, etc.)
- [x] Updated README.md with all new domain references
  - Production URL updated
  - All curl examples updated (15+ instances)
  - Deployment section updated
- [x] Updated user documentation (`docs/docs-site/docs/user/getting-started.md`)

**Commit Message Ready**:
```
feat: migrate domain from arqcashflow.vercel.app to arnaldo.ai

- Update documentation configuration for arnaldo.ai domain
- Add 301 redirect middleware for old domain
- Update README with new domain in all examples
- Update user documentation links

BREAKING CHANGE: Users will need to re-login after domain change
```

---

## 📋 What YOU Need To Do Manually (Critical Steps)

### Phase 1: Add Domain in Vercel FIRST (5 minutes)

1. **Add Domain to Vercel (DO THIS FIRST)**

   Go to: https://vercel.com/dashboard

   - [ ] Navigate to your project (currently "arqcashflow")
   - [ ] Go to **Settings** → **Domains**
   - [ ] Click **"Add Domain"**
   - [ ] Enter: `arnaldo.ai`
   - [ ] Click **"Add"**
   - [ ] ⚠️ Vercel will show "Invalid Configuration" - **THIS IS EXPECTED**
   - [ ] 📋 **IMPORTANT**: Vercel will now display the EXACT DNS records you need to add
   - [ ] **COPY THESE VALUES** - don't use generic values from documentation!

2. **Configure DNS Records in GoDaddy**

   Now go to GoDaddy with the values Vercel provided:

   - [ ] Log into GoDaddy: https://dcc.godaddy.com/
   - [ ] Go to **My Products** → Find `arnaldo.ai` → **Manage DNS**
   - [ ] Add the EXACT records Vercel showed you (usually something like):
     ```
     Type: A or CNAME (as Vercel specified)
     Name: @ (apex domain)
     Value: [COPY FROM VERCEL]
     TTL: Auto

     Type: CNAME
     Name: www
     Value: [COPY FROM VERCEL]
     TTL: Auto
     ```
   - [ ] Click **"Save"** in GoDaddy
   - [ ] Note: DNS propagation can take 5-60 minutes
   - [ ] Check propagation status: https://dnschecker.org

---

### Phase 2: Verify Domain Configuration (10 minutes)

3. **Wait for DNS Propagation and SSL**

   After adding DNS records in GoDaddy:

   - [ ] Wait 5-15 minutes for DNS to propagate
   - [ ] Go back to Vercel → Settings → Domains
   - [ ] Check if `arnaldo.ai` shows ✅ "Valid Configuration"
   - [ ] Check that SSL certificate is provisioned (automatic, may take 5-10 min)
   - [ ] If still showing errors, check https://dnschecker.org for propagation status

4. **Add www Subdomain (Optional but Recommended)**

   - [ ] In Vercel Domains, click **"Add Domain"** again
   - [ ] Enter: `www.arnaldo.ai`
   - [ ] Vercel may show DNS records needed for www
   - [ ] Go to GoDaddy and add those records if needed
   - [ ] OR select: **"Redirect to arnaldo.ai"** (Vercel may auto-configure this)

5. **Set Primary Domain**

   - [ ] In the domains list, find `arnaldo.ai`
   - [ ] Click the three dots menu → **"Set as Primary"**
   - [ ] Confirm the change

6. **Keep Old Domain Active (Recommended for 1 week)**

   - [ ] Leave `arqcashflow.vercel.app` in the domains list
   - [ ] The middleware will handle 301 redirects automatically
   - [ ] This ensures users with bookmarks aren't lost

---

### Phase 3: Environment Variables (10 minutes)

6. **Update Production Environment Variables**

   In Vercel dashboard → Project → **Settings** → **Environment Variables**:

   - [ ] Find `NEXTAUTH_URL`
   - [ ] Click **"Edit"**
   - [ ] Change value from: `https://arqcashflow.vercel.app`
   - [ ] Change value to: `https://arnaldo.ai`
   - [ ] Click **"Save"**

   **Other variables to verify** (should NOT need changes):
   - [ ] `DATABASE_URL` - No change needed
   - [ ] `CLAUDE_API_KEY` - No change needed
   - [ ] `BLOB_READ_WRITE_TOKEN` - No change needed
   - [ ] `CRON_SECRET` - No change needed

---

### Phase 4: Deploy Changes (5 minutes)

7. **Commit and Push Code Changes**

   ```bash
   cd /Users/jose.lyra/Desktop/Code/Cursor\ Claude/arqcashflow

   # Review changes
   git status
   git diff

   # Stage changes
   git add docs/docs-site/docusaurus.config.ts
   git add middleware.ts
   git add README.md
   git add docs/docs-site/docs/user/getting-started.md
   git add DOMAIN_MIGRATION_CHECKLIST.md

   # Commit
   git commit -m "feat: migrate domain from arqcashflow.vercel.app to arnaldo.ai

   - Update documentation configuration for arnaldo.ai domain
   - Add 301 redirect middleware for old domain
   - Update README with new domain in all examples
   - Update user documentation links

   BREAKING CHANGE: Users will need to re-login after domain change"

   # Push to trigger deployment
   git push origin main
   ```

   - [ ] Commit changes
   - [ ] Push to main branch
   - [ ] Wait for Vercel deployment to complete (2-3 minutes)

8. **Verify Deployment**

   In Vercel dashboard:

   - [ ] Check that deployment completed successfully
   - [ ] Click on the deployment to see logs
   - [ ] Verify no build errors

---

### Phase 5: Testing & Verification (30 minutes)

9. **Test New Domain**

   Test these URLs in your browser:

   - [ ] Homepage: https://arnaldo.ai
   - [ ] Login: https://arnaldo.ai/login
   - [ ] Register: https://arnaldo.ai/register
   - [ ] Dashboard (after login): https://arnaldo.ai/
   - [ ] Projetos: https://arnaldo.ai/projetos

10. **Test User Workflows**

    - [ ] **Registration**: Create a test account
    - [ ] **Login**: Log in with test account
    - [ ] **Session Persistence**: Refresh page, verify still logged in
    - [ ] **Contract Creation**: Create a test contract
    - [ ] **AI Chat**: Test AI assistant functionality
    - [ ] **API Endpoints**: Test at least one API call (e.g., GET /api/contracts)

11. **Test Old Domain Redirect**

    - [ ] Visit: https://arqcashflow.vercel.app
    - [ ] Verify it redirects to: https://arnaldo.ai
    - [ ] Check that query parameters are preserved
    - [ ] Check that paths are preserved (e.g., /projetos)

12. **Test Critical Features**

    - [ ] File upload (onboarding/AI assistant)
    - [ ] Excel export
    - [ ] AI operations (create contract/expense)
    - [ ] Date filtering
    - [ ] Dashboard metrics loading

13. **Test Cron Jobs**

    Cron jobs need to be accessible at new domain:

    ```bash
    # Test cron endpoint accessibility
    curl https://arnaldo.ai/api/cron/generate-recurring \
      -H "Authorization: Bearer YOUR_CRON_SECRET"
    ```

    - [ ] Verify cron endpoint responds
    - [ ] Check Vercel Cron logs (Settings → Cron Jobs)
    - [ ] Ensure recurring expenses are generating

---

### Phase 6: Post-Migration (Optional but Recommended)

14. **Update External References**

    If you have external links or bookmarks:

    - [ ] Update browser bookmarks
    - [ ] Update any documentation outside the repo
    - [ ] Update any social media or marketing materials
    - [ ] Update email signatures if applicable

15. **Monitor for 24-48 Hours**

    - [ ] Check Vercel logs for errors
    - [ ] Monitor user activity (any drop-off?)
    - [ ] Check for failed API calls
    - [ ] Verify cron jobs run successfully

16. **Remove Old Domain (After 1 Week)**

    After confirming everything works for 1 week:

    - [ ] Go to Vercel → Settings → Domains
    - [ ] Find `arqcashflow.vercel.app`
    - [ ] Click **"Remove"**
    - [ ] Optionally remove redirect middleware code

---

## 🚨 Rollback Plan (If Something Goes Wrong)

If critical issues occur:

1. **Quick Rollback (5 minutes)**
   ```bash
   # In Vercel dashboard:
   - Settings → Domains
   - Set "arqcashflow.vercel.app" as Primary Domain
   - Settings → Environment Variables
   - Change NEXTAUTH_URL back to old domain
   - Redeploy from previous deployment
   ```

2. **Revert Code Changes**
   ```bash
   git revert HEAD
   git push origin main
   ```

---

## 📊 Expected Impact

### ✅ Positive
- Shorter, more memorable domain (arnaldo.ai)
- Better brand alignment with AI assistant name
- Professional .ai extension
- SEO preserved with 301 redirects

### ⚠️ Temporary
- **All users logged out** (session cookies tied to domain)
- Users need to log in again (one-time inconvenience)
- Bookmarks need manual update (or rely on redirect)

### ❌ None Expected
- No data loss (database unchanged)
- No functionality breaks (code uses relative paths)
- No downtime (DNS propagation is gradual)

---

## 🔍 Post-Migration Verification Checklist

After 24 hours:

- [ ] Check Vercel Analytics for traffic on new domain
- [ ] Verify SSL certificate is valid and auto-renewing
- [ ] Check that old domain redirects are working
- [ ] Confirm all users can log in successfully
- [ ] Verify AI features work (file processing, chat)
- [ ] Check cron jobs executed successfully
- [ ] Review error logs (should be minimal)

---

## 📞 Support Information

**If You Encounter Issues:**

1. **Domain Not Resolving**
   - Check DNS propagation: https://dnschecker.org
   - Verify DNS records are correct
   - Wait up to 48 hours for full propagation

2. **SSL Certificate Issues**
   - Vercel auto-provisions SSL (5-10 minutes)
   - Check Vercel dashboard for certificate status
   - Contact Vercel support if certificate fails

3. **Authentication Issues**
   - Clear browser cookies/cache
   - Verify NEXTAUTH_URL is correct in Vercel
   - Check that users can register new accounts

4. **Redirect Loop**
   - Check middleware.ts logic
   - Verify no conflicting redirects in Vercel config
   - Clear browser cache

---

## ✅ Final Checklist Before Starting

Before you begin:

- [ ] Backup your database (just in case)
- [ ] Inform any active users about planned maintenance
- [ ] Choose a low-traffic time (weekend/evening)
- [ ] Have your DNS provider credentials ready
- [ ] Have your Vercel dashboard access ready
- [ ] Allocate 1-2 hours for the full process

---

**Estimated Total Time**: 1-2 hours (excluding DNS propagation)

**Best Time To Migrate**: Weekend or evening (low traffic)

**Confidence Level**: HIGH ✅ (simple migration, well-planned)

---

*Good luck with your migration! The arnaldo.ai domain is a great choice for your AI-powered platform.* 🚀
