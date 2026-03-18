# How the Alerts System Works

## 📋 Overview
The alerts system is a comprehensive notification system that proactively informs users about relevant government schemes, deadlines, and updates. It operates autonomously in the background and provides real-time notifications.

## 🔄 System Architecture

### 1. **Alert Generation (Backend)**

#### Proactive Agents (Autonomous)
- **ProactiveAgent**: Runs every 24 hours
  - Checks for new eligible schemes based on user profile
  - Monitors approaching deadlines on bookmarked schemes
  - Sends personalized recommendations
  
- **DeadlineAgent**: Monitors scheme deadlines
  - Alerts users 30 days before deadlines
  - Sends reminders 7 days before deadlines
  - Notifies about missed deadlines

#### Manual Alert Creation
- Admin can create custom alerts
- System-generated alerts for user actions
- Real-time notifications for important events

### 2. **Alert Storage**
```python
# Alert Structure in MongoDB
{
    "_id": ObjectId,
    "user_id": "user_email@example.com",
    "scheme_id": "scheme_id",
    "scheme_title": "Scheme Name",
    "alert_type": "new_scheme|deadline|recommendation|custom",
    "message": "Alert message content",
    "is_read": False,
    "created_at": datetime,
    "priority": "high|medium|low"
}
```

### 3. **API Endpoints**

#### GET `/alerts/`
- Fetches all alerts for current user
- Sorted by creation date (newest first)
- Returns array of alert objects

#### GET `/alerts/unread`
- Fetches only unread alerts
- Used for notification badge count
- Real-time polling every 5 minutes

#### PUT `/alerts/{alert_id}/read`
- Marks individual alert as read
- Updates `is_read` field to `True`

#### PUT `/alerts/read-all`
- Marks all user alerts as read
- Bulk operation for convenience

#### DELETE `/alerts/{alert_id}`
- Removes alert from system
- Permanent deletion

### 4. **Frontend Components**

#### AlertBadge Component
```jsx
// Shows notification count in navbar
<AlertBadge />
// Features:
- Real-time count updates
- Animated badge with pulse effect
- Shows "9+" for counts > 9
- Updates every 5 minutes
```

#### Alerts Page Component
```jsx
// Full alerts management interface
<Alerts />
// Features:
- List of all alerts
- Mark as read/unread
- Delete alerts
- Mark all as read
- Categorized by type
- Search and filter
```

## 🔄 Data Flow

### 1. **Alert Creation Flow**
```
ProactiveAgent (Daily) → Check User Profile → Find New Schemes → Create Alert → Store in MongoDB
```

### 2. **Alert Display Flow**
```
MongoDB → API Endpoint → Frontend Component → User Interface
```

### 3. **Real-time Updates**
```
Frontend → Poll API every 5 min → Update Badge Count → Refresh List
```

## 🎯 Alert Types

### 1. **New Scheme Alerts**
```
Trigger: User becomes eligible for new scheme
Message: "New scheme found for you: 'Scheme Name' — you may be eligible based on your profile."
Priority: Medium
```

### 2. **Deadline Alerts**
```
Trigger: 30 days before scheme deadline
Message: "Deadline approaching for 'Scheme Name' - apply by Date"
Priority: High
```

### 3. **Recommendation Alerts**
```
Trigger: AI-based recommendation
Message: "Based on your profile, you might be interested in 'Scheme Name'"
Priority: Low
```

### 4. **Custom Alerts**
```
Trigger: Admin action
Message: Custom message from administrator
Priority: Variable
```

## 📱 User Experience

### 1. **Notification Badge**
- Red circle with count on bell icon
- Animated pulse effect for new alerts
- Shows in navbar when logged in

### 2. **Alerts Page**
- Clean, organized list
- Color-coded by priority
- Action buttons (read/unread/delete)
- Search and filter options

### 3. **Real-time Updates**
- Automatic refresh every 5 minutes
- Immediate UI updates for user actions
- Smooth animations and transitions

## 🔧 Technical Implementation

### 1. **Backend (FastAPI)**
```python
# Key files:
- backend/routers/alerts.py (API endpoints)
- backend/agents/proactive_agent.py (Alert generation)
- backend/agents/deadline_agent.py (Deadline monitoring)
```

### 2. **Frontend (React)**
```jsx
// Key files:
- frontend/src/pages/Alerts.jsx (Main alerts page)
- frontend/src/components/AlertBadge.jsx (Notification badge)
- frontend/src/components/Navbar.jsx (Integration point)
```

### 3. **Database (MongoDB)**
```javascript
// Collection: alerts
// Indexes: user_id, created_at, is_read
// TTL: Optional cleanup after 1 year
```

## ⚡ Performance Features

### 1. **Efficient Polling**
- Only polls when user is active
- 5-minute intervals balance freshness and performance
- Caching reduces database load

### 2. **Database Optimization**
- Indexed queries for fast retrieval
- Pagination for large alert lists
- Background cleanup of old alerts

### 3. **Frontend Optimizations**
- Local state management
- Optimistic updates
- Smooth animations

## 🛡️ Security & Privacy

### 1. **User Isolation**
- Alerts scoped to user email
- No cross-user data access
- Token-based authentication

### 2. **Data Validation**
- Input sanitization
- SQL injection prevention
- XSS protection

### 3. **Access Control**
- Only authenticated users can access alerts
- Admin-only alert creation
- Rate limiting on API calls

## 🔄 Maintenance

### 1. **Automated Cleanup**
- Remove alerts older than 1 year
- Clean up read alerts after 6 months
- Database optimization

### 2. **Monitoring**
- Track alert creation rates
- Monitor user engagement
- System performance metrics

### 3. **Analytics**
- Alert open rates
- User response times
- Popular alert types

This system ensures users never miss important scheme deadlines and discover new opportunities automatically, making government welfare schemes more accessible and user-friendly.
