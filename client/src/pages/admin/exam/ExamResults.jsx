import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart } from 'lucide-react';

const ExamResults = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <Link to="/admin/exam/manage-tests" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
          <ArrowLeft size={20} />
          Back to Tests
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BarChart className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Exam Results</h1>
            <p className="text-gray-600">Coming soon - Test results and analytics</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <BarChart className="mx-auto text-gray-400 mb-3" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Results Dashboard</h3>
        <p className="text-gray-500">This feature will show detailed test results and analytics</p>
      </div>
    </div>
  );
};

export default ExamResults;