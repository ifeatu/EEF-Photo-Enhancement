#!/bin/bash

# Photo Enhancement App - Development Environment Setup Script
# This script sets up the complete development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running from project root
if [[ ! -f "package.json" ]] && [[ ! -d "frontend" ]] && [[ ! -d "backend" ]]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Setting up Photo Enhancement Application development environment..."

# Check prerequisites
print_status "Checking prerequisites..."

# Node.js version check
if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed. Please install Node.js 20.19.0 or later."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="20.19.0"

if ! npx semver -r ">=$REQUIRED_VERSION" "$NODE_VERSION" &> /dev/null; then
    print_error "Node.js version $NODE_VERSION is not supported. Please upgrade to $REQUIRED_VERSION or later."
    exit 1
fi

print_success "Node.js version $NODE_VERSION is compatible"

# Docker check
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed. Docker is recommended for development but not required."
    print_status "You can install Docker from https://docs.docker.com/get-docker/"
fi

# Google Cloud CLI check
if ! command -v gcloud &> /dev/null; then
    print_warning "Google Cloud CLI is not installed. It's required for deployment."
    print_status "You can install it from https://cloud.google.com/sdk/docs/install"
fi

# Setup environment files
print_status "Setting up environment configuration..."

# Backend environment
if [[ ! -f "backend/.env.local" ]]; then
    if [[ -f "backend/.env.example" ]]; then
        cp backend/.env.example backend/.env.local
        print_success "Created backend/.env.local from example"
        print_warning "Please edit backend/.env.local with your API keys and configuration"
    else
        print_error "backend/.env.example not found"
        exit 1
    fi
else
    print_status "backend/.env.local already exists"
fi

# Frontend environment
if [[ ! -f "frontend/.env.local" ]]; then
    if [[ -f "frontend/.env.example" ]]; then
        cp frontend/.env.example frontend/.env.local
        print_success "Created frontend/.env.local from example"
        print_warning "Please edit frontend/.env.local with your configuration"
    else
        print_error "frontend/.env.example not found"
        exit 1
    fi
else
    print_status "frontend/.env.local already exists"
fi

# Install dependencies
print_status "Installing dependencies..."

print_status "Installing backend dependencies..."
cd backend
if npm ci; then
    print_success "Backend dependencies installed successfully"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

print_status "Installing frontend dependencies..."
cd ../frontend
if npm ci; then
    print_success "Frontend dependencies installed successfully"
else
    print_error "Failed to install frontend dependencies" 
    exit 1
fi

cd ..

# Run initial tests to ensure setup is correct
print_status "Running initial tests..."

cd frontend
print_status "Running frontend tests..."
if npm run test:run; then
    print_success "Frontend tests passed"
else
    print_warning "Some frontend tests failed - this may be expected for initial setup"
fi

cd ../backend
print_status "Running backend tests..."
if npm test; then
    print_success "Backend tests passed"
else
    print_warning "Some backend tests failed - this may be expected for initial setup"
fi

cd ..

# Setup Git hooks (if using Husky)
if [[ -d "frontend/.husky" ]] || [[ -f "frontend/.huskyrc" ]]; then
    print_status "Setting up Git hooks..."
    cd frontend
    if npx husky install; then
        print_success "Git hooks installed"
    else
        print_warning "Failed to install Git hooks"
    fi
    cd ..
fi

# Setup database (if needed)
print_status "Setting up database..."
if [[ -f "backend/.tmp/data.db" ]]; then
    print_status "Database already exists"
else
    print_status "Database will be created on first backend start"
fi

# Create development script shortcuts
print_status "Creating development shortcuts..."

cat > start-dev.sh << 'EOF'
#!/bin/bash
# Start development servers
echo "Starting development servers..."
echo "Backend will be available at: http://localhost:5992"  
echo "Frontend will be available at: http://localhost:8240"
echo "Backend Admin will be available at: http://localhost:5992/admin"
echo ""
echo "Press Ctrl+C to stop all servers"

trap 'kill $(jobs -p)' EXIT

cd backend && npm run develop &
cd frontend && npm run dev &

wait
EOF

chmod +x start-dev.sh

cat > start-docker.sh << 'EOF'
#!/bin/bash
# Start development with Docker
echo "Starting development environment with Docker..."
echo "Backend will be available at: http://localhost:5992"
echo "Frontend will be available at: http://localhost:8240"
echo ""

docker-compose up -d

echo "Services started! Use 'docker-compose logs -f' to view logs"
echo "Use 'docker-compose down' to stop services"
EOF

chmod +x start-docker.sh

print_success "Created development shortcuts: start-dev.sh and start-docker.sh"

# Final setup instructions
print_success "Development environment setup complete!"
echo ""
print_status "Next steps:"
echo "1. Edit backend/.env.local with your API keys (Stripe, Google AI, etc.)"
echo "2. Edit frontend/.env.local with your configuration"  
echo "3. Start development servers:"
echo "   - Manual: ./start-dev.sh"
echo "   - Docker: ./start-docker.sh (requires Docker)"
echo ""
print_status "Useful commands:"
echo "• Backend only: cd backend && npm run develop"
echo "• Frontend only: cd frontend && npm run dev"
echo "• Run tests: npm run test (in backend/frontend directories)"
echo "• Build for production: npm run build (in respective directories)"
echo ""
print_status "Documentation:"
echo "• Development Workflow: DEVELOPMENT_WORKFLOW.md"
echo "• Testing Strategy: TESTING_STRATEGY.md" 
echo "• Deployment Guide: DEPLOYMENT_AUTOMATION.md"
echo "• Monitoring Guide: MONITORING_DEBUGGING.md"
echo ""
print_warning "Don't forget to:"
echo "• Set up your API keys in the .env.local files"
echo "• Create a Strapi admin user on first backend start"
echo "• Test photo upload functionality"
echo ""
print_success "Happy coding! 🚀"