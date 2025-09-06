# 🎨 AI Photo Enhancement Platform

A modern web application that uses AI to enhance, restore, and colorize photos. Built with Vue.js frontend and Strapi CMS backend, powered by Google Gemini AI and Stripe payments.

## ✨ Features

- **AI-Powered Photo Enhancement**: Restore, enhance, colorize, and upscale photos using Google Gemini AI
- **User Authentication**: Secure registration and login system
- **Credit-Based System**: Purchase credits to enhance photos
- **Stripe Integration**: Secure payment processing
- **Real-time Processing**: Track photo enhancement progress
- **Mobile-First Design**: Responsive UI optimized for all devices
- **GraphQL API**: Efficient data fetching

## 🛠 Tech Stack

### Frontend
- **Vue.js 3** with Composition API
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Pinia** for state management
- **Vue Router** for navigation
- **Heroicons** for icons

### Backend
- **Strapi v5** headless CMS
- **SQLite** database
- **GraphQL** API layer
- **Google Gemini AI** for photo processing
- **Stripe** for payments
- **TypeScript** support

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Google Gemini API key
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EEF-Photo-Enhancement
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   
   # Copy environment file and configure
   cp .env.example .env
   # Edit .env with your API keys
   
   # Start the backend
   npm run develop
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   
   # Copy environment file and configure
   cp .env.example .env
   # Edit .env with your configuration
   
   # Start the frontend
   npm run dev
   ```

### Environment Configuration

#### Backend (.env)
```env
# Server Configuration
HOST=0.0.0.0
PORT=1337

# Strapi Secrets (generate secure values)
APP_KEYS="your-app-keys"
API_TOKEN_SALT=your-api-token-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret
TRANSFER_TOKEN_SALT=your-transfer-token-salt
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:1337/api
VITE_GRAPHQL_URL=http://localhost:1337/graphql
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

## 📱 Usage

1. **Register/Login**: Create an account or sign in
2. **Purchase Credits**: Buy credit packages to enhance photos
3. **Upload Photos**: Drag and drop or select photos to upload
4. **Choose Enhancement**: Select from restore, enhance, colorize, or upscale
5. **Process**: AI enhances your photo automatically
6. **Download**: Get your enhanced photos

## 💳 Credit Packages

- **Starter Pack**: 20 credits for $9.99
- **Popular Pack**: 100 credits for $39.99
- **Professional Pack**: 500 credits for $149.99

## 🎯 Enhancement Types

- **Restore**: Fix old and damaged photos
- **Enhance**: Improve overall quality and clarity
- **Colorize**: Add color to black and white photos
- **Upscale**: Increase resolution while preserving quality

## 🔧 Development

### Project Structure
```
EEF-Photo-Enhancement/
├── backend/                 # Strapi backend
│   ├── src/
│   │   ├── api/            # API endpoints
│   │   ├── extensions/     # Strapi extensions
│   │   └── index.ts        # Main entry point
│   └── package.json
├── frontend/               # Vue.js frontend
│   ├── src/
│   │   ├── components/     # Vue components
│   │   ├── views/          # Page components
│   │   ├── stores/         # Pinia stores
│   │   ├── services/       # API services
│   │   └── main.ts         # Main entry point
│   └── package.json
└── README.md
```

### Key Components

- **PaymentModal.vue**: Stripe payment integration
- **UploadView.vue**: Photo upload interface
- **PhotosView.vue**: Photo gallery and management
- **DashboardView.vue**: User dashboard with stats

### API Endpoints

- `POST /api/photos` - Upload photo
- `POST /api/photos/:id/enhance` - Start enhancement
- `POST /api/purchase-credits` - Purchase credits
- `GET /api/credit-packages` - Get available packages

## 🔒 Security

- JWT authentication
- Secure payment processing with Stripe
- Input validation and sanitization
- CORS configuration
- Environment variable protection

## 🚀 Deployment

### Backend (Strapi)
- Deploy to platforms like Railway, Heroku, or DigitalOcean
- Configure production database (PostgreSQL recommended)
- Set production environment variables

### Frontend (Vue.js)
- Deploy to Vercel, Netlify, or similar platforms
- Build with `npm run build`
- Configure production API URLs

## 🌟 Features

- **AI-Powered Photo Enhancement**: Transform faded, damaged, or low-quality photos into vibrant memories
- **Real-Time Preview**: See before and after comparisons instantly
- **Drag & Drop Upload**: Easy file upload with validation
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Accessibility Optimized**: Built with accessibility best practices
- **Performance Optimized**: Lazy loading, image optimization, and efficient code

## 🚀 Deployment on Vercel

This site is configured for deployment as a subdomain of empowerelders.org on Vercel.

### Prerequisites

- Vercel account
- Access to empowerelders.org domain settings
- Git repository with this code

### Deployment Steps

1. **Connect Repository to Vercel**
   ```bash
   # Install Vercel CLI (optional)
   npm i -g vercel
   
   # Deploy from command line
   vercel
   ```

2. **Configure Custom Domain**
   - In Vercel dashboard, go to Project Settings > Domains
   - Add custom domain: `photos.empowerelders.org`
   - Configure DNS settings in your domain provider:
     ```
     Type: CNAME
     Name: photos
     Value: cname.vercel-dns.com
     ```

3. **Environment Variables** (if needed)
   - No environment variables required for current version
   - Future AI integration may require API keys

### Vercel Configuration

The project includes a `vercel.json` file with optimized settings:
- Static file serving
- Security headers
- Image caching
- Performance optimizations

## 📁 Project Structure

```
EEF-Photo-Enhancement/
├── index.html              # Main application file
├── vercel.json            # Vercel deployment configuration
├── README.md              # This file
├── logos/
│   └── elder-empowerment-logo-white-noback.gif
└── photos/                # Before/after example images
    ├── 9861A413-BB96-45F8-9E38-F5B5F76B0CB2.jpg
    ├── B3D9FF31-7DA9-46F2-B108-D693B79AC0AC (1).jpg
    ├── C4850A32-8ACE-4A05-9E85-ADF77F571539.jpg
    ├── Gemini_Generated_Image_gk82d6gk82d6gk82.png
    ├── Gemini_Generated_Image_kqkqt0kqkqt0kqkq.png
    ├── Gemini_Generated_Image_rnr9qzrnr9qzrnr9.png
    └── IMG_0310.jpg
```

## 🎨 Design System

### Color Palette
- **Primary Green**: `#8BC34A` - Main brand color
- **Dark Green**: `#689F38` - Hover states and accents
- **Light Green**: `#C5E1A5` - Backgrounds and subtle elements
- **Text Dark**: `#2C3E50` - Primary text
- **Text Light**: `#5D6D7E` - Secondary text
- **Background**: `#F8F9FA` - Page background

### Typography
- **Font Family**: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto)
- **Responsive scaling**: Fluid typography that adapts to screen size

## 🔧 Technical Features

### Performance Optimizations
- Lazy loading for images
- Intersection Observer for efficient loading
- Optimized CSS with CSS custom properties
- Minimal JavaScript footprint

### Accessibility
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- High contrast color ratios
- Screen reader friendly

### SEO Optimization
- Comprehensive meta tags
- Open Graph and Twitter Card support
- Structured data ready
- Canonical URLs
- Optimized page titles and descriptions

## 🛠️ Development

### Local Development

1. Clone the repository
2. Open `index.html` in a web browser
3. For live reloading, use a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

### Making Changes

1. Edit `index.html` for content and styling changes
2. Test locally before deploying
3. Commit changes to Git
4. Vercel will automatically deploy on push to main branch

## 🔮 Future Enhancements

### Planned Features
- **Real AI Integration**: Connect to actual photo enhancement APIs
- **User Accounts**: Save and manage photo restoration history
- **Batch Processing**: Upload and process multiple photos at once
- **Advanced Controls**: Fine-tune enhancement parameters
- **Payment Integration**: Stripe/PayPal for premium features
- **Cloud Storage**: Save enhanced photos to cloud storage

### Technical Improvements
- Progressive Web App (PWA) capabilities
- Offline functionality
- Advanced image processing
- Real-time collaboration features

## 📊 Analytics & Monitoring

### Recommended Tools
- **Google Analytics**: Track user engagement
- **Vercel Analytics**: Monitor performance and usage
- **Sentry**: Error tracking and monitoring
- **Lighthouse**: Performance auditing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is owned by the Elder Empowerment Foundation. All proceeds and usage support elder care initiatives.

## 📞 Support

For technical support or questions:
- Email: tech@empowerelders.org
- Website: https://empowerelders.org
- Phone: [Contact information]

## 🙏 Acknowledgments

- Elder Empowerment Foundation team
- AI technology partners
- Community contributors
- Families who shared their photos for examples

---

**Built with ❤️ for preserving precious memories and supporting elder care.**