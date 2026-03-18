# Admin Dashboard Guide

## 🎯 **Purpose**
Essential for project presentation/demo - shows system analytics and health metrics.

## 🔐 **Access Requirements**
- **Email must contain**: "admin" or "test" (for demo purposes)
- **Example emails**: `admin@vayojanamitra.com`, `test@example.com`
- **Route**: `http://localhost:5173/admin`

## 📊 **Dashboard Features**

### **1. Key Metrics Cards**
- **Total Users**: Number of registered users
- **Total Schemes**: Number of government schemes in database
- **Eligibility Checks**: Total AI-powered eligibility checks performed
- **Active Users**: Users active in last 30 days

### **2. User Activity Charts**
- **Line Chart**: New user registrations over time (30 days)
- **Bar Chart**: Chat sessions per day (30 days)
- **Real-time Data**: Updates automatically

### **3. Most Searched Schemes**
- **Top Queries**: Shows most searched scheme queries
- **Search Count**: Number of times each query was made
- **User Insights**: Helps understand user needs

### **4. Scraper Status Monitor**
- **URL Health**: Shows which government URLs are working/failing
- **Success Rate**: Working vs failing URLs count
- **Last Scrape**: When each URL was last checked
- **Schemes Found**: Number of schemes extracted from each URL

## 🎨 **Visual Design**
- **Clean Layout**: Card-based design with clear sections
- **Color Coding**: Green for success, red for failures
- **Responsive**: Works on desktop and mobile
- **Recharts Integration**: Professional data visualization

## 🔄 **Real-time Updates**
- **Auto-refresh**: Data updates when page loads
- **Live Status**: Current scraper performance
- **Recent Activity**: Latest user interactions

## 📈 **Presentation Benefits**
- **Demo Ready**: Perfect for showcasing system capabilities
- **Data-Driven**: Shows real usage statistics
- **Professional**: Clean, modern interface
- **Comprehensive**: All key metrics in one view

## 🛠 **Technical Features**
- **FastAPI Backend**: Efficient data aggregation
- **MongoDB Aggregation**: Optimized database queries
- **React Frontend**: Responsive, interactive charts
- **Protected Routes**: Admin-only access control

---

**Perfect for**: Project demos, stakeholder presentations, system monitoring
