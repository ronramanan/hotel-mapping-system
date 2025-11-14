# 🚀 Complete Deployment Guide

## Quick Start (30 minutes)

Follow these exact steps to deploy your hotel mapping system to AWS Amplify.

---

## Step 1: Create GitHub Repository (5 min)

1. Go to https://github.com
2. Sign in (or create account)
3. Click "+" → "New repository"
4. Fill in:
   - Name: `hotel-mapping-system`
   - Description: `Hotel mapping system for AWS Amplify`
   - ✅ Public (or Private)
   - ✅ Add README
5. Click "Create repository"

---

## Step 2: Upload Code to GitHub (5 min)

### Option A: Upload Files (Easiest)

1. In your GitHub repository, click "Add file" → "Upload files"
2. Drag ALL files from this folder
3. Commit message: "Initial commit"
4. Click "Commit changes"

### Option B: Use Git Command Line

```bash
cd hotel-mapping-system
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/hotel-mapping-system.git
git push -u origin main
```

---

## Step 3: Set Up AWS RDS PostgreSQL (10 min)

1. Sign in to AWS Console: https://console.aws.amazon.com
2. Search for "RDS" and click
3. Click "Create database"
4. Settings:
   - Engine: **PostgreSQL**
   - Version: Latest (15.x)
   - Templates: **Free tier**
   - DB instance identifier: `hotel-mapping-db`
   - Master username: `postgres`
   - Master password: (Create strong password - SAVE THIS!)

5. Instance configuration:
   - Class: **db.t3.micro** (free tier)
   - Storage: 20 GB

6. Connectivity:
   - Public access: **Yes** (for now)
   - Create new security group

7. Additional:
   - Initial database name: `hotelmapping`

8. Click "Create database"
9. **Wait 5-10 minutes** for creation
10. Click on your database → Copy **Endpoint** (save this!)

---

## Step 4: Configure Security Group (5 min)

1. In RDS, click your database
2. Click on the security group (under "VPC security groups")
3. Click "Edit inbound rules"
4. Click "Add rule"
5. Settings:
   - Type: **PostgreSQL**
   - Port: **5432**
   - Source: **Anywhere-IPv4** (0.0.0.0/0)
6. Click "Save rules"

⚠️ **Note**: For production, restrict this to your Amplify app's IP

---

## Step 5: Deploy to AWS Amplify (10 min)

1. Go to AWS Amplify: https://console.aws.amazon.com/amplify
2. Click "Get Started" under Amplify Hosting
3. Connect to GitHub:
   - Select **GitHub**
   - Click "Authorize AWS Amplify"
   - Grant permissions

4. Select repository:
   - Repository: `hotel-mapping-system`
   - Branch: `main`
   - Click "Next"

5. Build settings:
   - App name: `hotel-mapping-system`
   - Keep default build settings
   - Click "Next"

6. Review and deploy:
   - Review settings
   - Click "Save and deploy"
   - **Wait 5-10 minutes**

---

## Step 6: Add Environment Variables (5 min)

1. In Amplify Console, click your app
2. Click "Environment variables" (left menu)
3. Click "Manage variables"
4. Add these variables:

```
Key                      Value
━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REACT_APP_DB_HOST        [Your RDS Endpoint from Step 3]
REACT_APP_DB_PORT        5432
REACT_APP_DB_NAME        hotelmapping
REACT_APP_DB_USER        postgres
REACT_APP_DB_PASSWORD    [Your password from Step 3]
REACT_APP_DB_SSL         true
```

5. Click "Save"
6. Go to "Deployments" tab
7. Click "Redeploy this version"

---

## Step 7: Initialize Database (2 min)

1. Open your deployed app URL (looks like: https://main.xxxxx.amplifyapp.com)
2. Click "Admin" in navigation
3. Click "Test Connection" (should show ✅)
4. Click "Initialize Database"
5. Wait for success message

🎉 **Done! Your app is live!**

---

## Using Your App

### Import Your First Hotel

1. Click "Import Hotels"
2. Click "Load Sample Data" button
3. Click "Import Hotel"
4. System will automatically try to match it

### Review Pending Matches

1. Click "Review Queue"
2. Review suggested matches
3. Click a match to select it
4. Click "Accept Selected Match" OR "Create New Master"

### View Dashboard

1. Click "Dashboard"
2. See statistics and mapping rates
3. Track progress by supplier

---

## Troubleshooting

### "Failed to connect to database"

**Fix**:
1. Check environment variables are correct
2. Check RDS security group allows connections
3. Verify database is "Available" status in RDS console

### "Build failed" in Amplify

**Fix**:
1. Go to Amplify → Build settings
2. Make sure `amplify.yml` is in root of repository
3. Redeploy

### App shows white screen

**Fix**:
1. Press F12 to open browser console
2. Check for errors
3. Verify all environment variables are set
4. Try hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

---

## Security Recommendations

Before production use:

1. **Restrict Database Access**:
   - Change security group from "Anywhere" to your Amplify app's IP
   - Or use AWS VPC for private access

2. **Use Secrets Manager**:
   - Store database password in AWS Secrets Manager
   - Reference from Amplify

3. **Enable Authentication**:
   - Add AWS Cognito for user login
   - Restrict admin features

4. **Set Up Monitoring**:
   - Enable CloudWatch logs
   - Set up alerts for errors
   - Monitor costs with AWS Budgets

---

## Cost Estimates

**Free Tier** (first 12 months):
- Amplify: 1000 build minutes free
- RDS t3.micro: Free
- Data transfer: 15 GB free
- **Total**: $0/month

**After Free Tier**:
- Amplify: ~$5-10/month
- RDS t3.micro: ~$15-20/month  
- **Total**: ~$20-30/month

---

## Next Steps

1. Import hotels from your suppliers
2. Review and accept matches
3. Monitor accuracy in Dashboard
4. Add team members to help with reviews
5. Set up automated imports via API

---

## Support

- AWS Amplify Docs: https://docs.amplify.aws
- AWS RDS Docs: https://docs.aws.amazon.com/rds
- GitHub Issues: Create issue in your repository

---

**Congratulations! Your hotel mapping system is live on AWS!** 🎉
