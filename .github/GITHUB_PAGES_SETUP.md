# GitHub Pages Setup Instructions

## Problem
The GitHub Actions workflow is failing with a 404 error because GitHub Pages is not enabled for the repository.

## Solution

### Step 1: Enable GitHub Pages

1. Go to your repository settings: https://github.com/joselpq/arqcashflow/settings/pages
2. Under "Source", select **"GitHub Actions"** as the deployment source
3. Click "Save"

### Step 2: Verify Deployment

After enabling GitHub Pages:

1. Push any change to the `main` branch (or manually trigger the workflow)
2. Go to Actions tab to monitor the deployment
3. Once successful, your documentation will be available at:
   - https://joselpq.github.io/arqcashflow/

### Alternative: Manual Trigger

You can manually trigger the documentation deployment:

1. Go to Actions tab
2. Select "Documentation Build and Deploy" workflow
3. Click "Run workflow"
4. Select the `main` branch
5. Click "Run workflow" button

## What Was Fixed

1. **Removed duplicate workflows**: Deleted the conflicting workflow in `docs/docs-site/.github/workflows/`
2. **Created unified workflow**: New `docs.yml` workflow that:
   - Properly configures GitHub Pages before deployment
   - Generates API and schema documentation automatically
   - Validates documentation health
   - Supports manual triggering
   - Includes weekly health checks
3. **Added proper permissions**: Ensured the workflow has the correct permissions for Pages deployment

## Workflow Features

The new `docs.yml` workflow provides:

- ✅ Automatic documentation generation from API routes and Prisma schema
- ✅ Documentation validation and health checks
- ✅ GitHub Pages deployment with proper setup
- ✅ PR comments with validation results
- ✅ Weekly scheduled health checks
- ✅ Manual trigger option via workflow_dispatch

## Troubleshooting

If deployment still fails after enabling GitHub Pages:

1. Check that the repository is public (or you have GitHub Pro/Team for private repos)
2. Ensure no branch protection rules are blocking the deployment
3. Verify the workflow has proper permissions in repository settings
4. Try manually triggering the workflow using workflow_dispatch

## Next Steps

1. Enable GitHub Pages as described above
2. Push this fix to the main branch
3. Monitor the Actions tab for successful deployment
4. Access your documentation at the GitHub Pages URL

---

*Note: The first deployment after enabling GitHub Pages might take a few minutes to propagate.*