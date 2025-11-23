# Hotel Mapping System - Complete Deployment Guide

## 🏨 Overview

This is an advanced Hotel Mapping System designed to map multiple hotel suppliers to a master database of 2.9 million hotels. The system uses intelligent matching algorithms that consider:

- **Hotel name similarity** (with fuzzy matching)
- **Address matching** (with abbreviation handling)
- **Geographic distance** (using coordinates)
- **Country and city-based filtering** for efficient processing

## 🚀 Key Features

### Matching Capabilities
- **Multi-tier matching algorithm** with confidence scoring
- **Address abbreviation handling** (street→st, road→rd, building→bldg, etc.)
- **Country/city filtering** for efficient matching
- **Distance-based matching** using Haversine formula
- **Fuzzy text matching** using PostgreSQL trigram similarity
- **Token-based name matching** for better accuracy

### System Features
- **Bulk CSV import** for master and supplier hotels
- **Real-time matching dashboard** with statistics
- **Manual review interface** for unmapped hotels
- **Export functionality** for matched mappings
- **Multi-supplier support** with automatic detection
- **Comprehensive audit trail** and history tracking

## 📋 Prerequisites

Before deployment, ensure you have:

1. **AWS Account** with appropriate permissions
2. **Node.js 18+** and **npm** installed locally
3. **Git** installed
4. **AWS CLI** configured with your credentials
5. **PostgreSQL database** (RDS recommended)

## 🛠️ Step-by-Step Deployment Guide

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/hotel-mapping-app.git
cd hotel-mapping-app

# Install dependencies
npm install
```

### Step 2: Set Up AWS RDS PostgreSQL Database

1. **Go to AWS RDS Console**
2. **Create Database**:
   - Engine: PostgreSQL 15+
   - DB Instance Class: db.t3.medium (minimum)
   - Storage: 100 GB (for 2.9M hotels)
   - Enable automated backups
   - Set master username and password
   
3. **Configure Security Group**:
   - Allow inbound PostgreSQL (port 5432) from your Lambda functions
   - Allow inbound from your IP for initial setup

4. **Initialize Database**:
```bash
# Connect to your RDS instance
psql -h your-rds-endpoint.amazonaws.com -U postgres -d postgres

# Create the database
CREATE DATABASE hotelmapping;

# Connect to the new database
\c hotelmapping

# Run the schema script
\i database-schema.sql
```

### Step 3: Set Up S3 Bucket

1. **Create S3 Bucket**:
```bash
aws s3 mb s3://hotel-mapping-uploads-YOUR-UNIQUE-ID
```

2. **Configure Bucket Policy** for Lambda access:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::hotel-mapping-uploads-YOUR-UNIQUE-ID/*"
    }
  ]
}
```

### Step 4: Deploy Lambda Function

1. **Package the Lambda function**:
```bash
cd amplify/backend/function/hotelMappingLambda/src
npm install
zip -r ../lambda-deployment.zip .
```

2. **Create Lambda function in AWS Console**:
   - Runtime: Node.js 18.x
   - Handler: index.handler
   - Memory: 3008 MB
   - Timeout: 15 minutes
   - Environment Variables:
     ```
     DB_HOST=your-rds-endpoint.amazonaws.com
     DB_NAME=hotelmapping
     DB_USER=postgres
     DB_PASSWORD=your-password
     DB_PORT=5432
     DB_SSL=true
     S3_BUCKET=hotel-mapping-uploads-YOUR-UNIQUE-ID
     CORS_ORIGIN=https://your-amplify-domain.amplifyapp.com
     ```

3. **Add Lambda Layers** (if needed):
   - Create a layer for pg and csv-parser modules

4. **Configure Lambda Triggers**:
   - Add S3 trigger for your bucket
   - Event type: ObjectCreated
   - Prefix: supplier-hotels/ and master-hotels/

### Step 5: Set Up API Gateway

1. **Create REST API**:
```bash
# Use AWS Console or CLI
aws apigateway create-rest-api \
  --name "HotelMappingAPI" \
  --description "Hotel Mapping System API"
```

2. **Create Resources and Methods**:
   - `/dashboard` - GET
   - `/presigned-url` - POST
   - `/unmatched-hotels` - POST
   - `/confirm-match` - POST
   - `/export-mappings` - POST

3. **Connect to Lambda**:
   - Set Lambda as integration for each endpoint
   - Enable CORS
   - Deploy to stage (prod)

### Step 6: Deploy with AWS Amplify

1. **Initialize Amplify**:
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Initialize project
amplify init
```

2. **Add Authentication**:
```bash
amplify add auth
# Choose default configuration with email
```

3. **Update Environment Variables**:
Create `.env.production` file:
```env
REACT_APP_API_ENDPOINT=https://your-api-gateway-url.execute-api.region.amazonaws.com/prod
REACT_APP_USER_POOL_ID=your-cognito-user-pool-id
REACT_APP_USER_POOL_CLIENT_ID=your-cognito-client-id
REACT_APP_IDENTITY_POOL_ID=your-cognito-identity-pool-id
REACT_APP_AWS_REGION=us-east-1
REACT_APP_S3_BUCKET=hotel-mapping-uploads-YOUR-UNIQUE-ID
```

4. **Build and Deploy**:
```bash
npm run build
amplify push
amplify publish
```

### Step 7: Connect to GitHub

1. **Initialize Git** (if not already done):
```bash
git init
git add .
git commit -m "Initial commit"
```

2. **Create GitHub Repository**:
   - Go to GitHub.com
   - Create new repository: `hotel-mapping-system`
   - Keep it private initially

3. **Push to GitHub**:
```bash
git remote add origin https://github.com/yourusername/hotel-mapping-system.git
git branch -M main
git push -u origin main
```

4. **Connect Amplify to GitHub**:
   - Go to AWS Amplify Console
   - Click "Connect app"
   - Choose GitHub
   - Select your repository
   - Configure build settings (use amplify.yml)
   - Deploy

### Step 8: Import Initial Data

1. **Prepare Master Hotel CSV**:
   - Format: Hotel ID, Hotel Name, Address, City, Country Code, Latitude, Longitude
   - Save as `master_hotels.csv`

2. **Upload via UI or S3**:
```bash
aws s3 cp master_hotels.csv s3://hotel-mapping-uploads-YOUR-UNIQUE-ID/master-hotels/
```

3. **Import Supplier Hotels**:
   - Name files with supplier code: `iolx_hotels.csv`, `hotelbeds_hotels.csv`
   - Upload to supplier-hotels/ folder

## 📊 Using the System

### 1. Dashboard
- View overall statistics
- Monitor matching rates by supplier
- Track recent import jobs

### 2. Bulk Import
- Upload CSV files for master or supplier hotels
- System auto-detects supplier from filename
- Automatic matching runs after import

### 3. Manual Review
- Review unmapped hotels
- See potential matches with confidence scores
- Manually confirm or reject matches
- Mark hotels as "no match available"

### 4. Export Mappings
- Export matched mappings by supplier
- Download as CSV for integration

## 🔧 Configuration

### Database Performance Tuning

Add these settings to PostgreSQL:
```sql
-- Increase work memory for sorting
ALTER SYSTEM SET work_mem = '256MB';

-- Optimize for similarity searches
ALTER SYSTEM SET pg_trgm.similarity_threshold = 0.3;

-- Increase shared buffers
ALTER SYSTEM SET shared_buffers = '2GB';

-- Apply changes
SELECT pg_reload_conf();
```

### Matching Algorithm Configuration

Adjust confidence thresholds in Lambda:
```javascript
// In index.mjs
const CONFIDENCE_THRESHOLD = 0.7; // Minimum confidence for auto-matching
const DISTANCE_THRESHOLD = 0.5; // Maximum distance in km for proximity matching
const NAME_SIMILARITY_THRESHOLD = 0.8; // Minimum name similarity score
```

## 🔍 Monitoring

### CloudWatch Dashboards

Create dashboards for:
- Lambda execution times
- Database connections
- S3 upload events
- API Gateway requests
- Matching success rates

### Alarms

Set up alarms for:
- Lambda errors > 1%
- Database CPU > 80%
- API Gateway 4xx/5xx errors
- Import job failures

## 🚨 Troubleshooting

### Common Issues and Solutions

1. **Import Fails**:
   - Check CSV format and encoding (UTF-8)
   - Verify column headers match expected names
   - Check Lambda timeout settings

2. **Low Matching Rate**:
   - Add more address abbreviations to database
   - Adjust confidence thresholds
   - Check data quality (coordinates, normalized names)

3. **Performance Issues**:
   - Add database indexes if missing
   - Increase Lambda memory
   - Use batch processing for large imports

4. **Connection Issues**:
   - Verify security groups
   - Check RDS subnet configuration
   - Ensure Lambda is in VPC if needed

## 📈 Scaling Considerations

### For Large Datasets (10M+ hotels)

1. **Database**:
   - Use RDS Proxy for connection pooling
   - Consider Aurora PostgreSQL
   - Implement read replicas

2. **Lambda**:
   - Use Step Functions for orchestration
   - Implement SQS for queue processing
   - Consider ECS/Fargate for long-running tasks

3. **Frontend**:
   - Implement pagination
   - Use virtual scrolling for large lists
   - Cache API responses

## 🔒 Security Best Practices

1. **Database**:
   - Use AWS Secrets Manager for credentials
   - Enable encryption at rest
   - Regular backups

2. **API**:
   - Implement API keys
   - Use WAF for protection
   - Rate limiting

3. **Frontend**:
   - Content Security Policy
   - HTTPS only
   - Regular dependency updates

## 📝 Maintenance

### Regular Tasks

- **Weekly**: Review matching accuracy
- **Monthly**: Update address abbreviations
- **Quarterly**: Database optimization
- **Yearly**: Security audit

## 🆘 Support

For issues or questions:
1. Check CloudWatch logs
2. Review this documentation
3. Contact your administrator

## 📄 License

This project is proprietary. All rights reserved.

---

**Version**: 2.0.0
**Last Updated**: November 2024
**Maintained By**: Hotel Mapping Team
