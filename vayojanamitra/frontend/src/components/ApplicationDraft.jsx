import React, { useState } from 'react';
import { Download, FileText, AlertTriangle, CheckCircle, Building, MessageCircle } from 'lucide-react';

const ApplicationDraft = ({ 
  draft_text, 
  fields_to_fill, 
  submit_to, 
  important_notes, 
  onDownloadPDF 
}) => {
  const [checkedFields, setCheckedFields] = useState({});

  const toggleField = (field) => {
    setCheckedFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const highlightFields = (text) => {
    let highlightedText = text;
    
    fields_to_fill?.forEach(field => {
      const regex = new RegExp(`\\[${field}\\]`, 'gi');
      highlightedText = highlightedText.replace(
        regex, 
        `<span class="bg-yellow-200 px-1 rounded">[${field}]</span>`
      );
      
      // Also handle variations without brackets
      const fieldRegex = new RegExp(field, 'gi');
      if (!highlightedText.includes('bg-yellow-200')) {
        highlightedText = highlightedText.replace(
          fieldRegex,
          `<span class="bg-yellow-200 px-1 rounded">${field}</span>`
        );
      }
    });
    
    return highlightedText;
  };

  const checkedCount = Object.values(checkedFields).filter(Boolean).length;
  const totalFields = fields_to_fill?.length || 0;
  const allChecked = checkedCount === totalFields && totalFields > 0;

  return (
    <div className="space-y-6">
      {/* Application Letter */}
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="border-2 border-gray-300 rounded-lg p-6 bg-white">
          <div className="text-center mb-6">
            <h3 className="text-lg font-serif text-gray-900">Application Draft</h3>
            <p className="text-sm text-gray-600">This is a draft. Complete the highlighted fields before submission.</p>
          </div>
          
          <div 
            className="prose max-w-none font-serif text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightFields(draft_text) }}
          />
        </div>
      </div>

      {/* Fields to Complete */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Fields to Complete Before Visiting Office
        </h3>
        
        <div className="space-y-3">
          {fields_to_fill?.map((field, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <button
                  onClick={() => toggleField(field)}
                  className="mr-3"
                >
                  {checkedFields[field] ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                  )}
                </button>
                <span className="font-medium text-gray-900">{field}</span>
              </div>
              <span className="text-sm text-gray-600">
                {checkedFields[field] ? 'Completed' : 'To be filled'}
              </span>
            </div>
          ))}
        </div>
        
        {allChecked && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              All fields completed! You're ready to submit.
            </p>
          </div>
        )}
      </div>

      {/* Submit To Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Building className="h-5 w-5 mr-2" />
          Submit To
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">{submit_to}</p>
          <p className="text-sm text-blue-600 mt-1">
            Visit during office hours (10:00 AM - 5:00 PM, Monday to Friday)
          </p>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Important Notes
        </h3>
        
        <div className="space-y-3">
          {important_notes?.map((note, index) => (
            <div key={index} className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">{note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onDownloadPDF}
          className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Download as PDF
        </button>
        
        <button className="flex-1 flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <MessageCircle className="h-4 w-4 mr-2" />
          Ask Mitra to Explain
        </button>
      </div>

      {/* Disclaimer */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 text-center">
          <strong>Note:</strong> This is a computer-generated draft. Please review carefully and make any necessary changes before submission. 
          Visit the official office for the latest application form and requirements.
        </p>
      </div>
    </div>
  );
};

export default ApplicationDraft;
