import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import axios from 'axios';

const DeadlineWidget = () => {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingDeadlines();
  }, []);

  const fetchUpcomingDeadlines = async () => {
    try {
      const response = await axios.get('/api/deadline-calendar/schemes');
      // Show only next 5 deadlines
      setDeadlines(response.data.schemes.slice(0, 5));
    } catch (error) {
      console.error('Error fetching deadlines:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'urgent': return 'text-red-600';
      case 'soon': return 'text-yellow-600';
      case 'plenty': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'urgent': return <AlertTriangle className="w-4 h-4" />;
      case 'soon': return <Clock className="w-4 h-4" />;
      case 'plenty': return <Calendar className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const formatDaysRemaining = (days) => {
    if (days < 0) return `Expired ${Math.abs(days)}d ago`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days}d left`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">📅 Upcoming Deadlines</h3>
        <Calendar className="w-5 h-5 text-blue-600" />
      </div>
      
      {deadlines.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No upcoming deadlines</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deadlines.map((deadline) => (
            <div key={deadline.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center flex-1">
                <div className={`mr-3 ${getStatusColor(deadline.status)}`}>
                  {getStatusIcon(deadline.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{deadline.title}</p>
                  <p className="text-sm text-gray-600">{deadline.category}</p>
                </div>
              </div>
              <div className="flex items-center ml-4">
                <span className={`text-sm font-medium ${getStatusColor(deadline.status)}`}>
                  {formatDaysRemaining(deadline.days_remaining)}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 ml-2" />
              </div>
            </div>
          ))}
          
          {deadlines.length > 0 && (
            <button className="w-full mt-4 text-center text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
              View All Deadlines →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DeadlineWidget;
