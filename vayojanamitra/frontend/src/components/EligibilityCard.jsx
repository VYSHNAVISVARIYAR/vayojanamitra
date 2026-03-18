import React from 'react';

const EligibilityCard = ({ result }) => {
  const { result: eligibility, confidence, reason, matching_criteria, missing_criteria, next_steps } = result;
  
  const getCardColor = () => {
    switch (eligibility) {
      case 'Eligible':
        return 'border-green-200 bg-green-50';
      case 'Possibly Eligible':
        return 'border-yellow-200 bg-yellow-50';
      case 'Not Eligible':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getBadgeColor = () => {
    switch (eligibility) {
      case 'Eligible':
        return 'bg-green-100 text-green-800';
      case 'Possibly Eligible':
        return 'bg-yellow-100 text-yellow-800';
      case 'Not Eligible':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = () => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`border rounded-lg p-4 ${getCardColor()}`}>
      {/* Result Badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getBadgeColor()}`}>
          {eligibility}
        </span>
        <div className="text-xs text-gray-500">
          Confidence: {confidence}%
        </div>
      </div>

      {/* Confidence Meter */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getConfidenceColor()}`}
            style={{ width: `${confidence}%` }}
          ></div>
        </div>
      </div>

      {/* Reason */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Explanation:</h4>
        <p className="text-sm text-gray-700">{reason}</p>
      </div>

      {/* Criteria Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-green-800 mb-2">✅ You Meet:</h4>
          <ul className="text-sm text-green-700 space-y-1">
            {matching_criteria && matching_criteria.length > 0 ? (
              matching_criteria.map((criteria, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1">•</span>
                  <span>{criteria}</span>
                </li>
              ))
            ) : (
              <li className="text-gray-500">No specific criteria mentioned</li>
            )}
          </ul>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-red-800 mb-2">❌ Missing:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {missing_criteria && missing_criteria.length > 0 ? (
              missing_criteria.map((criteria, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1">•</span>
                  <span>{criteria}</span>
                </li>
              ))
            ) : (
              <li className="text-gray-500">No missing criteria</li>
            )}
          </ul>
        </div>
      </div>

      {/* Next Steps */}
      {next_steps && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">Next Steps:</h4>
          <p className="text-sm text-blue-800">{next_steps}</p>
        </div>
      )}

    </div>
  );
};

export default EligibilityCard;
