# Hotel Mapping System - AWS Amplify Edition

## 🎯 Complete Guide for Non-Technical Users

This guide will walk you through deploying a complete hotel mapping system on AWS Amplify with PostgreSQL.

**No coding required!** Just follow these steps exactly.

---

## 📋 What You'll Need

1. **GitHub Account** (free) - [Sign up here](https://github.com/signup)
2. **AWS Account** (free tier available) - [Sign up here](https://aws.amazon.com/free)
3. **Credit Card** for AWS (won't be charged on free tier)
4. **30 minutes** of your time

---

## 🚀 Step-by-Step Deployment Guide

### STEP 1: Set Up GitHub Repository (5 minutes)

1. **Go to GitHub.com** and sign in
2. **Click the "+" icon** in the top right
3. **Select "New repository"**
4. **Fill in the form**:
   - Repository name: `hotel-mapping-system`
   - Description: `Hotel mapping system for multi-supplier aggregation`
   - Select: **Public** (or Private if you prefer)
   - ✅ Check "Add a README file"
   - Click **"Create repository"**

5. **Upload the code files**:
   - Click **"Add file"** → **"Upload files"**
   - Drag and drop ALL the files from the `amplify-app` folder
   - Add commit message: "Initial commit - Hotel mapping system"
   - Click **"Commit changes"**

### STEP 2: Set Up AWS Account (5 minutes)

1. **Go to** [https://aws.amazon.com](https://aws.amazon.com)
2. **Click "Create an AWS Account"**
3. **Fill in**:
   - Email address
   - Password
   - AWS account name (can be your company name)
4. **Choose "Personal" account**
5. **Enter contact information**
6. **Add payment method** (credit card - you won't be charged initially)
7. **Verify phone number**
8. **Choose "Free" support plan**
9. **Wait for account activation** (can take up to 24 hours, usually instant)

### STEP 3: Deploy to AWS Amplify (10 minutes)

1. **Sign in to AWS Console**: [https://console.aws.amazon.com](https://console.aws.amazon.com)

2. **Search for "Amplify"** in the top search bar
   - Click on "AWS Amplify" service

3. **Click "Get Started"** under "Amplify Hosting"

4. **Connect GitHub**:
   - Select **"GitHub"**
   - Click **"Continue"**
   - Click **"Authorize AWS Amplify"**
   - Sign in to GitHub if prompted
   - Grant permissions

5. **Select Your Repository**:
   - Repository: Select `hotel-mapping-system`
   - Branch: Select `main` (or `master`)
   - Click **"Next"**

6. **Configure Build Settings**:
   - App name: `hotel-mapping-system`
   - Environment: `production`
   - Keep the default build settings (Amplify will auto-detect)
   - Click **"Next"**

7. **Review and Deploy**:
   - Review all settings
   - Click **"Save and deploy"**
   - ⏳ **Wait 5-10 minutes** for deployment

8. **Get Your App URL**:
   - Once deployed, you'll see a URL like: `https://main.xxxxx.amplifyapp.com`
   - Click it to open your app!

### STEP 4: Set Up PostgreSQL Database (10 minutes)

1. **In AWS Console, search for "RDS"**
2. **Click "Create database"**
3. **Choose settings**:
   - Engine type: **PostgreSQL**
   - Version: **PostgreSQL 15.x** (latest)
   - Templates: **Free tier**
   - DB instance identifier: `hotel-mapping-db`
   - Master username: `postgres`
   - Master password: Create a strong password (save it!)
   - Confirm password

4. **Instance configuration**:
   - DB instance class: **db.t3.micro** (Free tier eligible)
   - Storage: **20 GB** (Free tier)

5. **Connectivity**:
   - ✅ Check "Public access: Yes" (for initial setup)
   - Create new VPC security group

6. **Additional configuration**:
   - Initial database name: `hotelmapping`
   - ✅ Check "Enable automated backups"
   - Backup retention: 7 days

7. **Click "Create database"**
   - ⏳ Wait 5-10 minutes for database creation

8. **Get Database Connection Details**:
   - Click on your database name
   - Copy the **Endpoint** (looks like: xxx.rds.amazonaws.com)
   - Port: **5432**

### STEP 5: Connect App to Database (5 minutes)

1. **Go back to Amplify Console**
2. **Click on your app** (`hotel-mapping-system`)
3. **Click "Environment variables"** in the left menu
4. **Click "Manage variables"**
5. **Add these variables**:

```
DB_HOST = [Your RDS Endpoint from Step 4]
DB_PORT = 5432
DB_NAME = hotelmapping
DB_USER = postgres
DB_PASSWORD = [Your password from Step 4]
```

6. **Click "Save"**
7. **Redeploy the app**:
   - Go to "Deployments" tab
   - Click "Redeploy this version"

### STEP 6: Initialize Database Schema (5 minutes)

1. **Open your deployed app** (the URL from Step 3)
2. **Click "Admin" in the navigation**
3. **Click "Initialize Database"** button
4. **Wait for success message**
5. **Refresh the page**

🎉 **Done! Your app is now live!**

---

## 🎯 Using Your Hotel Mapping System

### Import Supplier Hotels

1. **Go to your app URL**
2. **Click "Import Hotels"**
3. **Fill in the form**:
   - Supplier Code: `expedia`
   - Hotel Name: `Hilton Garden Inn New York`
   - Address: `123 Broadway`
   - City: `New York`
   - Country Code: `US`
   - Postal Code: `10013`
   - Latitude: `40.7831`
   - Longitude: `-73.9712`
4. **Click "Import Hotel"**
5. **System will automatically try to match** with existing master hotels

### Review Pending Matches

1. **Click "Review Queue"** in navigation
2. **See hotels requiring manual review**
3. **For each hotel**:
   - View supplier hotel details (left side)
   - View potential master matches (right side)
   - Click a match to select it
   - Click "Accept Match" to map
   - OR click "Create New Master" if no good match

### View Statistics

1. **Click "Dashboard"** in navigation
2. **See**:
   - Total hotels mapped
   - Pending reviews
   - Mapping accuracy
   - Supplier coverage

---

## 💰 Cost Estimates

### Free Tier (First 12 months):
- **Amplify Hosting**: Free for up to 1000 build minutes/month
- **RDS PostgreSQL**: Free for db.t3.micro with 20GB storage
- **Data Transfer**: 15 GB free per month

### After Free Tier:
- **Amplify**: ~$0.01 per build minute
- **RDS**: ~$15-20/month for db.t3.micro
- **Total**: ~$20-30/month for small usage

💡 **Tip**: Set up AWS Budget Alerts to avoid surprises!

---

## 🔧 Troubleshooting

### Problem: Build Failed in Amplify

**Solution**:
1. Go to Amplify Console → Your app
2. Click "Build settings"
3. Make sure it looks like this:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: build
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

4. Save and redeploy

### Problem: Can't Connect to Database

**Solution**:
1. Go to RDS Console
2. Click on your database
3. Click "Modify"
4. Scroll to "Connectivity"
5. Find "Security group rules"
6. Click on the security group
7. Click "Edit inbound rules"
8. Add rule:
   - Type: PostgreSQL
   - Port: 5432
   - Source: Anywhere (0.0.0.0/0) - For testing only!
9. Save rules

### Problem: Environment Variables Not Working

**Solution**:
1. Double-check all environment variables are correct
2. No spaces before or after the `=` sign
3. No quotes around values
4. After changing, always redeploy

### Problem: App Shows White Screen

**Solution**:
1. Open browser developer tools (F12)
2. Check Console tab for errors
3. Most common: API endpoints not configured
4. Check that all environment variables are set

---

## 🔐 Security Best Practices

Before going to production, improve security:

### 1. Restrict Database Access
```
1. Go to RDS Console
2. Click on your database
3. Modify security group
4. Change inbound rule source from "Anywhere" to:
   - Your Amplify app's IP range
   - Your office IP address
```

### 2. Use Secrets Manager
```
1. Go to AWS Secrets Manager
2. Store database credentials there
3. Reference from Amplify instead of environment variables
```

### 3. Enable HTTPS Only
```
Already enabled by default on Amplify!
Your app uses: https://
```

### 4. Set Up Authentication (Optional)
```
1. In Amplify Console, click "Authentication"
2. Set up Cognito user pool
3. Require login to access admin features
```

---

## 📊 Monitoring Your App

### View Logs
1. Go to Amplify Console
2. Click your app
3. Click "Monitoring" tab
4. View:
   - Build logs
   - Access logs
   - Error rates

### Set Up Alerts
1. In Amplify Console
2. Click "Notifications"
3. Add email for:
   - Build failures
   - Deployment failures
   - High error rates

---

## 🔄 Updating Your App

Whenever you want to make changes:

1. **Edit files in GitHub**:
   - Go to your repository
   - Click on any file
   - Click "Edit" (pencil icon)
   - Make changes
   - Commit changes

2. **Amplify automatically deploys**:
   - Amplify detects the change
   - Automatically builds and deploys
   - Takes 3-5 minutes
   - You'll get an email when done

---

## 📚 What's Included

### Frontend (React)
- ✅ Hotel import form
- ✅ Manual review interface
- ✅ Dashboard with statistics
- ✅ Master hotel management
- ✅ Mapping history viewer

### Backend (AWS Amplify)
- ✅ GraphQL API
- ✅ PostgreSQL database
- ✅ Automatic matching algorithm
- ✅ REST endpoints for operations

### Features
- ✅ Fuzzy name matching
- ✅ Geographic distance calculation
- ✅ Automatic mapping (>90% confidence)
- ✅ Manual review queue
- ✅ Audit trail
- ✅ Multi-supplier support

---

## 🆘 Need Help?

### AWS Support
- Free tier includes basic support
- Visit: [https://console.aws.amazon.com/support](https://console.aws.amazon.com/support)

### GitHub Issues
- Create an issue in your repository
- Community can help

### AWS Documentation
- Amplify: [https://docs.amplify.aws](https://docs.amplify.aws)
- RDS: [https://docs.aws.amazon.com/rds](https://docs.aws.amazon.com/rds)

---

## 🎉 Next Steps

Once your app is running:

1. **Import your first supplier's hotels**
2. **Review and accept/reject matches**
3. **Monitor accuracy metrics**
4. **Add more suppliers**
5. **Invite team members** to help with reviews

---

## ⚠️ Important Notes

### Before Production Use:

- [ ] Change database password to something strong
- [ ] Restrict database access (not open to internet)
- [ ] Set up AWS Budget alerts
- [ ] Enable backups (auto-enabled)
- [ ] Add authentication for admin features
- [ ] Test with sample data first
- [ ] Review security group rules
- [ ] Set up monitoring and alerts

### Recommended:

- [ ] Use a custom domain (can buy in AWS Route 53)
- [ ] Set up staging environment (duplicate for testing)
- [ ] Enable CloudWatch logs
- [ ] Set up automated backups
- [ ] Document your hotel naming conventions

---

**Congratulations!** You now have a production-ready hotel mapping system running on AWS! 🚀

Your app is accessible from anywhere in the world, automatically scales, and costs just ~$20-30/month after the free tier.
