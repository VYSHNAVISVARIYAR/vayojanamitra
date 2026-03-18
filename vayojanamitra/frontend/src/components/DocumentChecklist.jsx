import React, { useState } from 'react';
import { CheckCircle, Circle, MapPin, AlertCircle, Clock } from 'lucide-react';

const DocumentChecklist = ({ documents, estimated_preparation_days, tips }) => {
  const [checkedDocuments, setCheckedDocuments] = useState({});

  const toggleDocument = (docName) => {
    setCheckedDocuments(prev => ({
      ...prev,
      [docName]: !prev[docName]
    }));
  };

  const checkedCount = Object.values(checkedDocuments).filter(Boolean).length;
  const totalCount = documents?.length || 0;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Document Readiness</h3>
          <span className="text-sm text-gray-600">{checkedCount} of {totalCount} ready</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        {estimated_preparation_days && (
          <p className="text-sm text-gray-600 mt-2 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Estimated preparation time: {estimated_preparation_days} days
          </p>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {documents?.map((doc, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <button
                  onClick={() => toggleDocument(doc.name)}
                  className="mt-1 flex-shrink-0"
                >
                  {checkedDocuments[doc.name] ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      doc.is_mandatory 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {doc.is_mandatory ? 'Mandatory' : 'Optional'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{doc.purpose}</p>
                  
                  {doc.how_to_get && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-800">{doc.how_to_get}</p>
                      </div>
                    </div>
                  )}
                  
                  {doc.alternatives && doc.alternatives.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500">Alternatives:</span>
                      {doc.alternatives.map((alt, altIndex) => (
                        <span 
                          key={altIndex}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {alt}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {doc.user_likely_has && (
                    <p className="text-xs text-green-600 mt-2 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      You likely already have this document
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tips Section */}
      {tips && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-2">Important Tips</h4>
              <p className="text-sm text-yellow-800">{tips}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {checkedCount === totalCount && totalCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h4 className="text-lg font-semibold text-green-900 mb-2">All Documents Ready!</h4>
            <p className="text-sm text-green-800 mb-4">
              You have all the required documents. You're ready to visit the office.
            </p>
            <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Find Nearby Office
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentChecklist;
