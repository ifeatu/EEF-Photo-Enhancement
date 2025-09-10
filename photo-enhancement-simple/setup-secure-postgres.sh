#!/bin/bash

# PostgreSQL Production Security Setup Script
# This script helps configure secure PostgreSQL credentials for production

set -e

echo "🔒 PostgreSQL Production Security Setup"
echo "======================================"
echo ""
echo "⚠️  CRITICAL: Your production database is currently using PLACEHOLDER credentials!"
echo "   Current config: postgresql://username:password@host:port/database"
echo "   This is a major security vulnerability that must be fixed immediately."
echo ""

# Generated secure password
SECURE_PASSWORD="f4xCcFD5Low26tXMRYkE60Udiq6fL9i/YMgHyDBU1bA="
DB_USERNAME="photo_enhance_prod"
DB_NAME="photo_enhancement_production"

echo "🔑 Generated Secure Credentials:"
echo "   Username: $DB_USERNAME"
echo "   Password: $SECURE_PASSWORD"
echo "   Database: $DB_NAME"
echo ""

echo "📋 Choose your PostgreSQL provider:"
echo "   1) Vercel Postgres (Recommended - integrated with Vercel)"
echo "   2) Supabase (Free tier available)"
echo "   3) Railway (Simple setup)"
echo "   4) I have my own PostgreSQL server"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🚀 Setting up Vercel Postgres..."
        echo ""
        echo "Run these commands:"
        echo "1. Create Vercel Postgres database:"
        echo "   vercel postgres create photo-enhancement-prod"
        echo ""
        echo "2. Get connection string from Vercel dashboard"
        echo "3. Update environment variables with the provided connection string"
        ;;
    2)
        echo "🚀 Setting up Supabase..."
        echo ""
        echo "1. Go to https://supabase.com and create a new project"
        echo "2. Use these database settings:"
        echo "   - Database name: $DB_NAME"
        echo "   - Username: $DB_USERNAME (or use default 'postgres')"
        echo "   - Password: $SECURE_PASSWORD"
        echo ""
        echo "3. Your connection string will be:"
        echo "   postgresql://postgres:$SECURE_PASSWORD@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
        ;;
    3)
        echo "🚀 Setting up Railway..."
        echo ""
        echo "1. Go to https://railway.app and create a new PostgreSQL database"
        echo "2. Railway will provide connection strings automatically"
        echo "3. Use the provided POSTGRES_URL for your configuration"
        ;;
    4)
        echo "🚀 Configuring custom PostgreSQL server..."
        echo ""
        echo "Run these SQL commands on your PostgreSQL server:"
        echo ""
        echo "-- Create dedicated user"
        echo "CREATE USER $DB_USERNAME WITH PASSWORD '$SECURE_PASSWORD';"
        echo ""
        echo "-- Create production database"
        echo "CREATE DATABASE $DB_NAME OWNER $DB_USERNAME;"
        echo ""
        echo "-- Grant permissions"
        echo "GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USERNAME;"
        echo "GRANT USAGE ON SCHEMA public TO $DB_USERNAME;"
        echo "GRANT CREATE ON SCHEMA public TO $DB_USERNAME;"
        echo ""
        echo "Your connection string format:"
        echo "postgresql://$DB_USERNAME:$SECURE_PASSWORD@YOUR_HOST:5432/$DB_NAME?sslmode=require"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🔧 Next Steps:"
echo "1. Set up your chosen PostgreSQL provider"
echo "2. Update Vercel environment variables:"
echo ""
echo "   # Remove insecure variables"
echo "   vercel env rm POSTGRES_PRISMA_URL production"
echo "   vercel env rm POSTGRES_URL_NON_POOLING production"
echo ""
echo "   # Add secure variables (replace with your actual connection strings)"
echo "   vercel env add POSTGRES_PRISMA_URL production"
echo "   vercel env add POSTGRES_URL_NON_POOLING production"
echo ""
echo "3. Test the connection:"
echo "   npm run db:migrate"
echo ""
echo "4. Deploy the updated configuration:"
echo "   vercel --prod"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "   - Never commit database credentials to version control"
echo "   - Always use SSL connections (sslmode=require)"
echo "   - Use strong, unique passwords for each environment"
echo "   - Regularly rotate database passwords"
echo "   - Monitor database access logs"
echo ""
echo "📖 For detailed instructions, see: postgres-security-config.md"
echo ""
echo "✅ Setup complete! Remember to test thoroughly before deploying to production."