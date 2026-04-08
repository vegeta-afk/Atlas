import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Edit2 } from 'lucide-react';

const EditTest = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <Link to="${basePath}/exam/manage-tests" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
          <ArrowLeft size={20} />
          Back to Manage Tests
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Edit2 className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Edit Test</h1>
            <p className="text-gray-600">Coming soon - Edit existing tests</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <Edit2 className="mx-auto text-gray-400 mb-3" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Edit Test Form</h3>
        <p className="text-gray-500">This feature will allow you to edit existing tests</p>
      </div>
    </div>
  );
};

export default EditTest;