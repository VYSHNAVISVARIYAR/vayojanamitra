import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle, Bell, BellOff, ChevronRight } from 'lucide-react';
import axios from 'axios';

const DeadlineCalendar = () => {
  const [schemes, setSchemes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('calendar'); // calendar, alerts, reminders
  const [stats, setStats] = useState({
    total_count: 0,
    urgent_count: 0,
    soon_count: 0,
    plenty_count: 0,
    expired_count: 0
  });

  useEffect(() => {
    fetchDeadlineSchemes();
    fetchAlerts();
    fetchReminders();
  }, []);

  const fetchDeadlineSchemes = async () => {
    try {
      const response = await axios.get('/api/deadline-calendar/schemes');
      setSchemes(response.data.schemes);
      setStats({
        total_count: response.data.total_count,
        urgent_count: response.data.urgent_count,
        soon_count: response.data.soon_count,
        plenty_count: response.data.plenty_count,
        expired_count: response.data.expired_count
      });
    } catch (error) {
      console.error('Error fetching deadline schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get('/api/deadline-calendar/alerts');
      setAlerts(response.data.alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchReminders = async () => {
    try {
      const response = await axios.get('/api/deadline-calendar/my-reminders');
      setReminders(response.data.reminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const setReminder = async (schemeId, daysBefore = 7) => {
    try {
      await axios.post(`/api/deadline-calendar/remind/${schemeId}`, { days_before: daysBefore });
      fetchReminders();
      alert('Reminder set successfully!');
    } catch (error) {
      console.error('Error setting reminder:', error);
      alert('Failed to set reminder');
    }
  };

  const deleteReminder = async (reminderId) => {
    try {
      await axios.delete(`/api/deadline-calendar/reminder/${reminderId}`);
      fetchReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'soon': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'plenty': return 'text-green-600 bg-green-50 border-green-200';
      case 'expired': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'urgent': return <AlertTriangle className="w-4 h-4" />;
      case 'soon': return <Clock className="w-4 h-4" />;
      case 'plenty': return <CheckCircle className="w-4 h-4" />;
      case 'expired': return <Clock className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatDaysRemaining = (days) => {
    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days left`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📅 Scheme Deadline Calendar</h1>
        <p className="text-gray-600">Track important scheme deadlines and never miss an application date</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_count}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">🔴 Urgent</p>
              <p className="text-2xl font-bold text-red-600">{stats.urgent_count}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">🟡 Soon</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.soon_count}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">🟢 Plenty</p>
              <p className="text-2xl font-bold text-green-600">{stats.plenty_count}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-gray-600">{stats.expired_count}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setView('calendar')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            view === 'calendar' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          Calendar View
        </button>
        <button
          onClick={() => setView('alerts')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors relative ${
            view === 'alerts' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Bell className="w-4 h-4 inline mr-2" />
          System Alerts
          {alerts.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {alerts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setView('reminders')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            view === 'reminders' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Bell className="w-4 h-4 inline mr-2" />
          My Reminders
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        {view === 'calendar' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Scheme Deadlines</h2>
            {schemes.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No schemes with deadlines found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {schemes.map((scheme) => (
                  <div key={scheme.id} className={`border rounded-lg p-4 ${getStatusColor(scheme.status)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {getStatusIcon(scheme.status)}
                          <h3 className="font-semibold text-lg ml-2">{scheme.title}</h3>
                          <span className="ml-2 text-sm px-2 py-1 bg-white rounded-full">
                            {scheme.category}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-2">{scheme.description}</p>
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span className="font-medium mr-4">{formatDate(scheme.deadline)}</span>
                          <Clock className="w-4 h-4 mr-1" />
                          <span className="font-medium">{formatDaysRemaining(scheme.days_remaining)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => setReminder(scheme.id, 7)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                        >
                          Remind Me
                        </button>
                        <a
                          href={scheme.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors text-sm"
                        >
                          Apply Now
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'alerts' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">System Deadline Alerts</h2>
            {alerts.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active deadline alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <div key={index} className={`border-l-4 p-4 ${
                    alert.priority === 'high' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
                  }`}>
                    <div className="flex items-start">
                      <AlertTriangle className={`w-5 h-5 mr-3 mt-1 ${
                        alert.priority === 'high' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                      <div className="flex-1">
                        <p className="font-semibold">{alert.message}</p>
                        <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Deadline: {formatDate(alert.deadline)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'reminders' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">My Deadline Reminders</h2>
            {reminders.length === 0 ? (
              <div className="text-center py-12">
                <BellOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No reminders set</p>
                <p className="text-sm text-gray-500 mt-2">Set reminders for scheme deadlines to stay notified</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{reminder.scheme_title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Reminder: {reminder.days_before} days before deadline
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {reminder.reminder_date ? `Reminder on: ${formatDate(reminder.reminder_date)}` : 'No reminder date set'}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteReminder(reminder.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <BellOff className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeadlineCalendar;
