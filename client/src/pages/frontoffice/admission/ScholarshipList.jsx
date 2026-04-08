// pages/admin/scholarships/ScholarshipList.jsx
const ScholarshipList = () => {
  return (
    <div>
      <h1>Scholarship Management</h1>
      <button>Add New Scholarship</button>
      
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Type</th>
            <th>Value</th>
            <th>Applicable On</th>
            <th>Students</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {scholarships.map(s => (
            <tr key={s._id}>
              <td>{s.scholarshipCode}</td>
              <td>{s.scholarshipName}</td>
              <td>{s.type}</td>
              <td>{s.value}{s.type === 'percentage' ? '%' : '₹'}</td>
              <td>{s.applicableOn}</td>
              <td>{s.currentStudents}/{s.maxStudents || '∞'}</td>
              <td>{s.isActive ? 'Active' : 'Inactive'}</td>
              <td>
                <button>Edit</button>
                <button>View Students</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};