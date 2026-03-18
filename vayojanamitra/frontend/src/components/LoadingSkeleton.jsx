import React from 'react';

const LoadingSkeleton = ({ 
  type = 'grid', 
  count = 1, 
  className = '',
  shimmer = true,
  height = 'auto',
  width = '100%'
}) => {
  const shimmerClass = shimmer ? 'shimmer' : 'animate-pulse';
  
  const baseClasses = `bg-gray-200 ${shimmerClass} rounded`;
  
  if (type === 'card') {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`} style={{ height, width }}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className={`h-6 w-32 ${baseClasses}`}></div>
            <div className={`h-8 w-8 ${baseClasses}`}></div>
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <div className={`h-5 w-3/4 ${baseClasses}`}></div>
            <div className={`h-5 w-1/2 ${baseClasses}`}></div>
          </div>
          
          {/* Content */}
          <div className="space-y-3">
            <div className={`h-4 ${baseClasses}`}></div>
            <div className={`h-4 w-5/6 ${baseClasses}`}></div>
            <div className={`h-4 w-4/6 ${baseClasses}`}></div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-4">
            <div className={`h-4 w-24 ${baseClasses}`}></div>
            <div className={`h-8 w-20 ${baseClasses}`}></div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
            <div className="flex items-start space-x-4">
              {/* Avatar/Image */}
              <div className={`w-12 h-12 ${baseClasses}`}></div>
              
              {/* Content */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`h-5 w-1/3 ${baseClasses}`}></div>
                  <div className={`h-4 w-16 ${baseClasses}`}></div>
                </div>
                
                <div className="space-y-2">
                  <div className={`h-4 ${baseClasses}`}></div>
                  <div className={`h-4 w-5/6 ${baseClasses}`}></div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-2">
                <div className={`h-8 w-8 ${baseClasses}`}></div>
                <div className={`h-8 w-8 ${baseClasses}`}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses}`}
            style={{
              height: '1rem',
              width: Math.random() > 0.5 ? '100%' : `${60 + Math.random() * 40}%`
            }}
          ></div>
        ))}
      </div>
    );
  }

  if (type === 'avatar') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className={`w-10 h-10 ${baseClasses} rounded-full`}></div>
        <div className="space-y-1 flex-1">
          <div className={`h-4 w-24 ${baseClasses}`}></div>
          <div className={`h-3 w-16 ${baseClasses}`}></div>
        </div>
      </div>
    );
  }

  if (type === 'button') {
    return (
      <div className={`${baseClasses} h-10 w-24 ${className}`}></div>
    );
  }

  if (type === 'stats') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className={`h-4 w-20 ${baseClasses}`}></div>
                <div className={`w-8 h-8 ${baseClasses} rounded-full`}></div>
              </div>
              <div className={`h-8 w-16 ${baseClasses}`}></div>
              <div className={`h-3 w-32 ${baseClasses}`}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm p-6 min-h-[220px] flex flex-col">
          <div className="space-y-4 flex-grow">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className={`h-6 w-20 ${baseClasses} rounded-full`}></div>
              <div className={`w-8 h-8 ${baseClasses}`}></div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <div className={`h-5 w-3/4 ${baseClasses}`}></div>
              <div className={`h-5 w-1/2 ${baseClasses}`}></div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className={`h-4 ${baseClasses}`}></div>
              <div className={`h-4 w-5/6 ${baseClasses}`}></div>
              <div className={`h-4 w-4/6 ${baseClasses}`}></div>
            </div>

            {/* Benefits */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className={`h-4 w-2/3 ${baseClasses}`}></div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-3">
              <div className={`h-4 w-16 ${baseClasses}`}></div>
              <div className={`h-3 w-12 ${baseClasses}`}></div>
            </div>
            <div className={`h-8 w-20 ${baseClasses}`}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
