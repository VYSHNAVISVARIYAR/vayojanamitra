import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Check, CheckCircle, AlertCircle, Calendar, X } from 'lucide-react';
import AlertBadge from '../components/AlertBadge';
import { useAuth } from '../context/AuthContext';

const Alerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAlerts();
    
    // Set up polling for new alerts
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        'http://localhost:8000/alerts/',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setAlerts(response.data);
      
      // Count unread alerts
      const unread = response.data.filter(alert => !alert.is_read).length;
      setUnreadCount(unread);
      
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `http://localhost:8000/alerts/${alertId}/read`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Update local state
      setAlerts(alerts.map(alert => 
        alert._id === alertId ? { ...alert, is_read: true } : alert
      ));
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        'http://localhost:8000/alerts/read-all',
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Update local state
      setAlerts(alerts.map(alert => ({ ...alert, is_read: true })));
      setUnreadCount(0);
      
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `http://localhost:8000/alerts/${alertId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Update local state
      const deletedAlert = alerts.find(alert => alert._id === alertId);
      setAlerts(alerts.filter(alert => alert._id !== alertId));
      
      if (!deletedAlert.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const getAlertIcon = (alertType) => {
    switch (alertType) {
      case 'benefit_change':
        return '🔔';
      case 'eligibility_change':
        return '⚠️';
      case 'deadline':
        return '📅';
      case 'reopened':
        return '✅';
      case 'new_scheme':
        return '🆕';
      default:
        return '📢';
    }
  };

  const getAlertColor = (alertType) => {
    switch (alertType) {
      case 'benefit_change':
        return 'bg-blue-50 border-blue-200';
      case 'eligibility_change':
        return 'bg-yellow-50 border-yellow-200';
      case 'deadline':
        return 'bg-red-50 border-red-200';
      case 'reopened':
        return 'bg-green-50 border-green-200';
      case 'new_scheme':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Your Alerts</h1>
              {unreadCount > 0 && (
                <span className="ml-3 px-2 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark all as read
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Alert List */}
        {alerts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">You're all caught up! 🎉</h3>
              <p className="text-gray-500">No new alerts at the moment.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert._id}
                className={`rounded-lg border p-4 transition-all ${
                  !alert.is_read 
                    ? `${getAlertColor(alert.alert_type)} border-l-4` 
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <span className="text-2xl mr-3">{getAlertIcon(alert.alert_type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <h3 className="font-medium text-gray-900 mr-2">
                          {alert.scheme_title}
                        </h3>
                        {!alert.is_read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-2">{alert.message}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatTimeAgo(alert.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {!alert.is_read && (
                      <button
                        onClick={() => markAsRead(alert._id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4 text-gray-500" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteAlert(alert._id)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Delete alert"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Alerts;
