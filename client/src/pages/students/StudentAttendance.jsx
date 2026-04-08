import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  BookOpen,
  ChevronRight,
  Home,
  Filter,
  ArrowLeft,
  Percent,
  BarChart3,
  AlertCircle,
  CheckSquare,
  Square,
  User,
  Bell,
  TrendingUp,
  Eye,
  GraduationCap,
  Search,
} from "lucide-react";

const StudentAttendance = () => {
  const { id } = useParams();
  const [view, setView] = useState("batches");
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [teacherStats, setTeacherStats] = useState({
    totalBatches: 0,
    totalStudents: 0,
    totalPresent: 0,
    totalAbsent: 0,
    attendanceRate: 0,
  });
  const [stats, setStats] = useState({
    totalStudents: 0,
    present: 0,
    absent: 0,
    onLeave: 0,
    late: 0,
    attendancePercentage: 0,
  });
  
  // Admin-specific states
  const [isAdmin, setIsAdmin] = useState(false);
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [adminView, setAdminView] = useState("faculty");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);


  const [showQRModal, setShowQRModal] = useState(false);
const [activeQR, setActiveQR] = useState(null); // { qrData, batchName, timing, expiresAt }
const [qrLoading, setQRLoading] = useState(false);

  // Helper function to get current user
  const getCurrentUser = () => {
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      const user = JSON.parse(userStr);
      return {
        id: user.id || user._id,
        role: user.role || 'faculty',
        facultyId: user.facultyId,
        name: user.name,
        email: user.email
      };
    } catch (error) {
      console.error('Error parsing user:', error);
      return null;
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    
    setCurrentUser(user);
    setIsAdmin(user.role === 'admin');
    
    if (user.role === 'admin') {
      fetchFacultyList();
    } else {
      fetchFacultyBatches(user.facultyId);
    }
  }, []);

  useEffect(() => {
    if (selectedBatch && view === "students") {
      fetchBatchStudents(selectedBatch._id);
    }
  }, [view, selectedDate]);

  // Fetch faculty list (for admin view)
  const fetchFacultyList = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch('/api/faculty/admin/with-batches', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setFacultyList(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch faculty');
      }
    } catch (error) {
      console.error("Error fetching faculty list:", error);
      alert('Error loading faculty list: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

 const fetchFacultyBatches = async (facultyId) => {
  setLoading(true);
  try {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    
    let apiUrl;
    if (isAdmin) {
      // Admin views any faculty
      apiUrl = `/api/faculty/${facultyId}/batches`;
    } else {
      // Faculty views their own batches via /me/batches endpoint
      apiUrl = `/api/faculty/me/batches`;
    }
    
    console.log(`📡 Fetching batches from: ${apiUrl}`);
    console.log(`🔑 Token exists: ${!!token}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // First, get the response as text to handle both success and error cases
    const responseText = await response.text();
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response text: ${responseText}`);
    
    if (!response.ok) {
      // Try to parse the error message from the response
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = `HTTP ${response.status}: ${errorData.message || errorData.error || 'Unknown error'}`;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${responseText || 'No error details provided'}`;
      }
      throw new Error(errorMessage);
    }
    
    // Parse the successful response
    const result = JSON.parse(responseText);
    
    if (result.success) {
      const batchesData = result.data.batches || [];
      setBatches(batchesData);
      
      if (!isAdmin) {
        calculateTeacherStats(batchesData);
      }
      
      if (isAdmin) {
        const faculty = result.data.faculty || {};
        setSelectedFaculty({
          ...faculty,
          batches: batchesData
        });
        setAdminView("faculty-batches");
      }
    } else {
      throw new Error(result.message || 'Failed to fetch batches');
    }
  } catch (error) {
    console.error("Error fetching faculty batches:", error);
    alert('Error loading batches: ' + error.message);
  } finally {
    setLoading(false);
  }
};

 // Fetch batch students (BOTH faculty and admin views use this)
// Fetch batch students (BOTH faculty and admin views use this)
const fetchBatchStudents = async (batchId) => {
  setLoading(true);
  try {
    let apiUrl;
    
    if (isAdmin && selectedFaculty?._id) {
      apiUrl = `/api/faculty/${selectedFaculty._id}/batches/${batchId}/students`;
    } else {
      apiUrl = `/api/faculty/me/batches/${batchId}/students`;
    }
    
    if (selectedDate) {
      apiUrl += `?date=${selectedDate}`;
    }
    
    console.log(`📡 Fetching students from: ${apiUrl}`);
    
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      const studentsData = result.data.students || [];
      const batchData = result.data.batch || {};
      const facultyData = result.data.faculty || {};
      
      setSelectedBatch(prev => ({
        ...prev,
        ...batchData  // Merge batch data instead of replacing
      }));
      setStudents(studentsData);
      
      if (isAdmin && !selectedFaculty) {
        setSelectedFaculty(facultyData);
      }
      
      // Initialize attendance status
      const initialAttendance = {};
      studentsData.forEach((student) => {
        initialAttendance[student._id] = student.todayStatus || 'present';
      });
      setAttendance(initialAttendance);
      updateStats(initialAttendance);
      
      // DON'T set view here - it's already set in handleBatchSelect
      // if (isAdmin) {
      //   setAdminView("batch-students");
      // } else {
      //   setView("students");
      // }
      
    } else {
      throw new Error(result.message || 'Failed to fetch students');
    }
  } catch (error) {
    console.error("Error fetching students:", error);
    alert('Error loading students: ' + error.message);
    setStudents([]);
  } finally {
    setLoading(false);
  }
};

  // Calculate teacher statistics
  const calculateTeacherStats = (batchesData) => {
    const totalBatches = batchesData.length;
    const totalStudents = batchesData.reduce((sum, batch) => sum + (batch.totalStudents || 0), 0);
    const totalPresent = batchesData.reduce((sum, batch) => sum + (batch.todayPresent || 0), 0);
    const totalAbsent = batchesData.reduce((sum, batch) => sum + (batch.todayAbsent || 0), 0);
    const attendanceRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

    setTeacherStats({
      totalBatches,
      totalStudents,
      totalPresent,
      totalAbsent,
      attendanceRate,
    });
  };

  // Handle faculty selection (admin view)
  const handleFacultySelect = (faculty) => {
    fetchFacultyBatches(faculty._id);
  };

  // Handle batch selection
  // Handle batch selection
const handleBatchSelect = (batch) => {
  setSelectedBatch(batch);
  setStudents([]);  // Clear previous students
  setAttendance({});  // Clear previous attendance
  
  if (isAdmin) {
    setAdminView("batch-students");
  } else {
    setView("students");
  }
  
  // Fetch students
  fetchBatchStudents(batch._id);
};

  // Handle back navigation
  const handleBack = () => {
    if (isAdmin) {
      if (adminView === "batch-students") {
        setAdminView("faculty-batches");
        setSelectedBatch(null);
        setStudents([]);
      } else if (adminView === "faculty-batches") {
        setAdminView("faculty");
        setSelectedFaculty(null);
        setBatches([]);
      }
    } else {
      if (view === "students") {
        setView("batches");
        setSelectedBatch(null);
        setStudents([]);
      }
    }
  };

  // Update attendance status
  const updateAttendance = (studentId, status) => {
    if (isAdmin) return; // Admin cannot mark attendance
    
    const newAttendance = {
      ...attendance,
      [studentId]: status,
    };
    setAttendance(newAttendance);
    updateStats(newAttendance);
  };

  const updateStats = (attendanceData) => {
    const statuses = Object.values(attendanceData);
    const presentCount = statuses.filter(s => s === "present").length;
    const totalCount = statuses.length;
    const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    
    setStats({
      totalStudents: totalCount,
      present: presentCount,
      absent: statuses.filter(s => s === "absent").length,
      onLeave: statuses.filter(s => s === "leave").length,
      late: statuses.filter(s => s === "late").length,
      attendancePercentage: attendancePercentage,
    });
  };

  const toggleSelectStudent = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s._id));
    }
  };

  const markSelected = (status) => {
    if (isAdmin) return; // Admin cannot mark attendance
    
    const newAttendance = { ...attendance };
    selectedStudents.forEach(studentId => {
      newAttendance[studentId] = status;
    });
    setAttendance(newAttendance);
    updateStats(newAttendance);
  };

  const saveAttendance = async () => {
    if (isAdmin) {
      alert("Admin cannot mark attendance. Please login as faculty.");
      return;
    }
    
    try {
      const attendanceData = {
        batchId: selectedBatch._id,
        date: selectedDate,
        attendance: Object.entries(attendance).map(([studentId, status]) => ({
          studentId,
          status,
          remarks: ""
        }))
      };

      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch('/api/attendance/teacher/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(attendanceData)
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        sessionStorage.setItem(`attendance_${selectedDate}_${selectedBatch._id}`, "marked");
      } else {
        alert('Error saving attendance: ' + result.message);
      }
    } catch (error) {
      alert("Error saving attendance: " + error.message);
      console.error(error);
    }
  };

  const markAll = (status) => {
    if (isAdmin) return; // Admin cannot mark attendance
    
    const newAttendance = {};
    students.forEach(student => {
      newAttendance[student._id] = status;
    });
    setAttendance(newAttendance);
    updateStats(newAttendance);
  };

  const isAttendanceMarked = () => {
    return sessionStorage.getItem(`attendance_${selectedDate}_${selectedBatch?._id}`) === "marked";
  };

  // Get batch color based on index
  const getBatchColor = (index) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-green-500",
      "bg-orange-500",
      "bg-red-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500"
    ];
    return colors[index % colors.length];
  };

  // Get batch icon based on index
  const getBatchIcon = (index) => {
    const icons = ["📚", "⚛️", "🧪", "💻", "📖", "🧬", "🔬", "📐"];
    return icons[index % icons.length];
  };

  const generateQR = async (batchId) => {
  setQRLoading(true);
  try {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const response = await fetch('/api/attendance/qr/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ batchId })
    });
    const result = await response.json();
    if (result.success) {
      setActiveQR(result.data);
      setShowQRModal(true);
    } else {
      alert('Failed to generate QR: ' + result.message);
    }
  } catch (error) {
    alert('Error generating QR: ' + error.message);
  } finally {
    setQRLoading(false);
  }
};

  // Render admin faculty list view
  const renderAdminFacultyList = () => (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <GraduationCap size={24} />
              Faculty Management (Admin View)
            </h2>
            <p className="text-gray-600">
              Browse all faculty members and their assigned batches
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search faculty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Faculty Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Faculty</p>
              <p className="text-2xl font-bold text-gray-900">{facultyList.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Faculty</p>
              <p className="text-2xl font-bold text-gray-900">
                {facultyList.filter(f => f.status === "active").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">On Leave</p>
              <p className="text-2xl font-bold text-gray-900">
                {facultyList.filter(f => f.status === "on-leave").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">
                {facultyList.reduce((sum, f) => sum + (f.totalStudents || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Faculty List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Faculty Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contact Information
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Assignment Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {facultyList
                .filter(faculty => 
                  faculty.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  faculty.facultyId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  faculty.email?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((faculty) => (
                <tr key={faculty._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center mr-4">
                        <span className="text-blue-600 font-bold text-lg">
                          {faculty.name?.charAt(0) || 'F'}
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{faculty.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{faculty.facultyId || 'N/A'}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {faculty.courseAssigned || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{faculty.email || 'N/A'}</div>
                    <div className="text-sm text-gray-600">{faculty.mobileNo || "N/A"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-4">
                      <div className="text-center">
                        <div className="text-blue-600 font-bold">{faculty.totalBatches || 0}</div>
                        <div className="text-xs text-gray-500">Batches</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-600 font-bold">{faculty.totalStudents || 0}</div>
                        <div className="text-xs text-gray-500">Students</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      faculty.status === "active"
                        ? "bg-green-100 text-green-800"
                        : faculty.status === "on-leave"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {faculty.status || 'inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleFacultySelect(faculty)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Eye size={16} />
                      View Batches
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render admin faculty batches view
  const renderAdminFacultyBatches = () => (
    <div className="space-y-6">
      {/* Faculty Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
              <User className="text-blue-600" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedFaculty?.name || 'Faculty'}</h2>
              <p className="text-gray-600">{selectedFaculty?.facultyId || 'N/A'} • {selectedFaculty?.email || 'N/A'}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-500">
                  <strong>Status:</strong> {selectedFaculty?.status || 'N/A'}
                </span>
                <span className="text-sm text-gray-500">
                  <strong>Courses:</strong> {selectedFaculty?.courseAssigned || 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{selectedFaculty?.totalBatches || 0}</div>
              <div className="text-sm text-gray-500">Total Batches</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{selectedFaculty?.totalStudents || 0}</div>
              <div className="text-sm text-gray-500">Total Students</div>
            </div>
          </div>
        </div>
      </div>

      {/* Batches Grid */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Assigned Batches</h3>
            <p className="text-gray-600">Click on a batch to view enrolled students</p>
          </div>
          <span className="text-sm text-gray-500">
            {batches.length} batches
          </span>
        </div>

        {batches.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Batches Assigned</h3>
            <p className="text-gray-600">This faculty has no assigned batches.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((batch, index) => (
              <div
                key={batch._id}
                onClick={() => handleBatchSelect(batch)}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-blue-400 hover:scale-[1.02] group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`${getBatchColor(index)} w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl`}>
                      {getBatchIcon(index)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600">
                        {batch.name || batch.displayName}
                      </h3>
                      <p className="text-sm text-gray-500">{batch.subject || 'General'}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    (batch.attendanceRate || 0) >= 90 ? "bg-green-100 text-green-800" :
                    (batch.attendanceRate || 0) >= 75 ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {(batch.attendanceRate || 0)}%
                  </div>
                </div>
                
                <div className="space-y-3 text-sm mb-4">
                  <div className="flex items-center text-gray-600">
                    <Clock size={16} className="mr-2 text-gray-400" />
                    <span className="font-medium">{batch.timing || `${batch.startTime} - ${batch.endTime}`}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Home size={16} className="mr-2 text-gray-400" />
                    <span>{batch.roomNumber || "N/A"}</span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <div className="text-green-600 font-bold text-lg">{batch.todayPresent || 0}</div>
                      <div className="text-xs text-gray-500">Present Today</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600 font-bold text-lg">{batch.todayAbsent || 0}</div>
                      <div className="text-xs text-gray-500">Absent Today</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-800 font-bold text-lg">{batch.totalStudents || 0}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <button className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                      View Students
                      <ChevronRight size={16} />
                    </button>
                    <span className="text-xs text-gray-500">
                      {batch.totalStudents || 0} students
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render header for both views
  const renderHeader = () => (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-3">
        {(view !== "batches" || (isAdmin && adminView !== "faculty")) && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdmin ? (
              adminView === "faculty" ? "Faculty Management" :
              adminView === "faculty-batches" ? `${selectedFaculty?.name}'s Batches` :
              `${selectedBatch?.displayName || selectedBatch?.name} Students`
            ) : (
              view === "batches" ? "Teacher Attendance Dashboard" :
              "Mark Attendance"
            )}
          </h1>
          <p className="text-gray-600">
            {isAdmin ? (
              adminView === "faculty" ? "Browse all faculty members and their assignments" :
              adminView === "faculty-batches" ? "View batches assigned to this faculty" :
              "View students enrolled in this batch"
            ) : (
              view === "batches" ? "Mark attendance for your assigned students" :
              "Mark attendance for your assigned students"
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="pl-10 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {!isAdmin && (
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download size={18} />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}
      </div>
    </div>
  );

  // Render teacher stats (for faculty view)
  const renderTeacherStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="text-blue-600" size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500">My Batches</p>
            <p className="text-2xl font-bold text-gray-900">{teacherStats.totalBatches}</p>
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <User className="text-green-600" size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Students</p>
            <p className="text-2xl font-bold text-gray-900">{teacherStats.totalStudents}</p>
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="text-green-600" size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Present Today</p>
            <p className="text-2xl font-bold text-gray-900">{teacherStats.totalPresent}</p>
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <XCircle className="text-red-600" size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Absent Today</p>
            <p className="text-2xl font-bold text-gray-900">{teacherStats.totalAbsent}</p>
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <TrendingUp className="text-purple-600" size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Attendance Rate</p>
            <p className="text-2xl font-bold text-gray-900">{teacherStats.attendanceRate}%</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render batches view (for faculty)
  const renderBatches = () => (
    <div className="space-y-6">
      {renderTeacherStats()}
      
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              My Teaching Schedule
            </h2>
            <p className="text-gray-600">
              Select a batch to mark attendance for your students
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <span className="text-sm text-gray-500">
              Sorted by: Time
            </span>
          </div>
        </div>

        {batches.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Batches Assigned</h3>
            <p className="text-gray-600">You have no assigned batches. Contact admin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((batch, index) => (
              <div
                key={batch._id}
                onClick={() => handleBatchSelect(batch)}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-blue-400 hover:scale-[1.02] group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`${getBatchColor(index)} w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl`}>
                      {getBatchIcon(index)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600">
                        {batch.name || batch.displayName}
                      </h3>
                      <p className="text-sm text-gray-500">{batch.subject || 'General'}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    (batch.attendanceRate || 0) >= 90 ? "bg-green-100 text-green-800" :
                    (batch.attendanceRate || 0) >= 75 ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {(batch.attendanceRate || 0)}%
                  </div>
                </div>
                
                <div className="space-y-3 text-sm mb-4">
                  <div className="flex items-center text-gray-600">
                    <Clock size={16} className="mr-2 text-gray-400" />
                    <span className="font-medium">{batch.timing || `${batch.startTime} - ${batch.endTime}`}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Home size={16} className="mr-2 text-gray-400" />
                    <span>{batch.roomNumber || "N/A"}</span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <div className="text-green-600 font-bold text-lg">{batch.todayPresent || 0}</div>
                      <div className="text-xs text-gray-500">Present</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600 font-bold text-lg">{batch.todayAbsent || 0}</div>
                      <div className="text-xs text-gray-500">Absent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-800 font-bold text-lg">{batch.totalStudents || 0}</div>
                      <div className="text-xs text-gray-500">Students</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <button className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                      Mark Attendance
                      <ChevronRight size={16} />
                    </button>
                    <span className="text-xs text-gray-500">
                      {batch.totalStudents || 0} students
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Bell size={18} />
              Today's Reminders
            </h3>
            <p className="text-gray-600 text-sm">
              Don't forget to mark attendance for all your batches. Attendance marked after 6:00 PM will be considered late.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50">
              View Schedule
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Request Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQRModal = () => {
  if (!showQRModal || !activeQR) return null;

  const expiryTime = new Date(activeQR.expiresAt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            📱 Scan to Mark Attendance
          </h2>
          <p className="text-gray-500 text-sm">Show this QR code to your students</p>
        </div>

        {/* Batch Info */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <p className="font-bold text-blue-900 text-lg">{activeQR.batchName}</p>
          <p className="text-blue-600 text-sm">{activeQR.timing}</p>
          <p className="text-blue-500 text-xs mt-1">Date: {activeQR.date}</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <div className="p-4 border-4 border-blue-200 rounded-2xl bg-white shadow-inner">
            <QRCodeSVG
              value={activeQR.qrData}
              size={240}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#1e3a8a"
            />
          </div>
        </div>

        {/* Expiry */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-6">
          <p className="text-yellow-800 text-sm font-medium">
            ⏱️ Valid until: {expiryTime} (2 hours)
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => generateQR(selectedBatch._id)}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh QR
          </button>
          <button
            onClick={() => { setShowQRModal(false); setActiveQR(null); }}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            ✕ Close
          </button>
        </div>
      </div>
    </div>
  );
};

  // Render attendance grid
  const renderAttendanceGrid = () => (
    <div className="space-y-6">
      {/* Batch Header Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`${getBatchColor(0)} w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg`}>
                {getBatchIcon(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedBatch?.displayName || selectedBatch?.name}
                </h2>
                <p className="text-gray-600">
                  {selectedBatch?.subject || 'General'} • {selectedBatch?.roomNumber || 'N/A'} • {selectedBatch?.timing || `${selectedBatch?.startTime} - ${selectedBatch?.endTime}`}
                </p>
                {isAdmin && selectedFaculty && (
                  <p className="text-sm text-gray-500 mt-1">
                    Faculty: {selectedFaculty.name}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
  {/* NEW: Show QR button for teacher */}
  {!isAdmin && (
    <button
      onClick={() => generateQR(selectedBatch._id)}
      disabled={qrLoading}
      className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm flex items-center gap-2 transition-colors"
    >
      {qrLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
      ) : (
        <span>📱</span>
      )}
      {qrLoading ? 'Generating...' : 'Show QR Code'}
    </button>
  )}

  {isAdmin ? (
    <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
      <Eye size={16} />
      View Only (Admin Mode)
    </div>
  ) : isAttendanceMarked() ? (
    <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
      <CheckCircle size={16} />
      Attendance Already Marked
    </div>
  ) : (
    <button
      onClick={saveAttendance}
      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm flex items-center gap-2"
    >
      <CheckSquare size={16} />
      Save Attendance
    </button>
  )}
</div>
        </div>
      </div>

      {/* Quick Stats and Actions - Only show for faculty */}
      {!isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 size={20} />
              Today's Attendance Summary
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">Present</span>
                </div>
                <div className="font-bold text-gray-900">{stats.present}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-gray-600">Absent</span>
                </div>
                <div className="font-bold text-gray-900">{stats.absent}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-gray-600">On Leave</span>
                </div>
                <div className="font-bold text-gray-900">{stats.onLeave}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">Late</span>
                </div>
                <div className="font-bold text-gray-900">{stats.late}</div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent size={20} className="text-blue-500" />
                    <span className="font-bold text-gray-900">Attendance Rate</span>
                  </div>
                  <div className={`text-2xl font-bold ${
                    stats.attendancePercentage >= 90 ? "text-green-600" :
                    stats.attendancePercentage >= 75 ? "text-yellow-600" : "text-red-600"
                  }`}>
                    {stats.attendancePercentage}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Card - Only for faculty */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle size={20} />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => markAll("present")}
                  className="flex-1 px-4 py-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 font-medium text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  Mark All Present
                </button>
                <button
                  onClick={() => markAll("absent")}
                  className="flex-1 px-4 py-3 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 font-medium text-sm flex items-center justify-center gap-2"
                >
                  <XCircle size={16} />
                  Mark All Absent
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => markSelected("present")}
                  disabled={selectedStudents.length === 0}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 ${
                    selectedStudents.length === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                  }`}
                >
                  <CheckSquare size={16} />
                  Mark Selected Present ({selectedStudents.length})
                </button>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                  >
                    {selectedStudents.length === students.length ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                    {selectedStudents.length === students.length ? "Deselect All" : "Select All"}
                  </button>
                  <span className="text-gray-500">
                    {selectedStudents.length} of {students.length} selected
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Legend Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-bold text-gray-900 mb-4">Status Legend</h3>
            <div className="space-y-3">
              {[
                { color: "bg-green-500", text: "Present - Student is in class", key: "P" },
                { color: "bg-red-500", text: "Absent - Student not present", key: "A" },
                { color: "bg-yellow-500", text: "Leave - Student on approved leave", key: "L" },
                { color: "bg-blue-500", text: "Late - Student arrived late", key: "Late" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <div className={`${item.color} w-3 h-3 rounded-full`}></div>
                  <div className="flex-1">
                    <span className="text-gray-700">{item.text}</span>
                  </div>
                  <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">
                    {item.key}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                <strong>Tip:</strong> Click on status buttons or use keyboard shortcuts (P, A, L) for quick marking.
              </p>
            </div>
          </div>
          {renderQRModal()}
        </div>
      )}

      {/* Attendance Table */}
      {/* Attendance Table */}
<div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {!isAdmin && (
            <th className="w-12 px-6 py-4">
              <input
                type="checkbox"
                checked={selectedStudents.length === students.length && students.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-gray-300"
              />
            </th>
          )}
          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Student ID
          </th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Student Details
          </th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Courses
          </th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Contact
          </th>
          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Today's Status
          </th>
          {!isAdmin && (
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Quick Actions
            </th>
          )}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100">
        {students.length === 0 ? (
          <tr>
            <td colSpan={isAdmin ? 7 : 8} className="px-6 py-12 text-center">
              <Users className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Students Found</h3>
              <p className="text-gray-600">There are no students assigned to this batch.</p>
            </td>
          </tr>
        ) : (
          students.map((student) => (
            <tr key={student._id} className="hover:bg-gray-50">
              {!isAdmin && (
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student._id)}
                    onChange={() => toggleSelectStudent(student._id)}
                    className="rounded border-gray-300"
                  />
                </td>
              )}
              <td className="px-6 py-4">
                <span className="font-mono text-sm font-semibold text-gray-800">
                  {student.studentId}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center mr-3 flex-shrink-0">
                    {student.photo ? (
                      <img
                        src={student.photo}
                        alt={student.fullName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-blue-600 font-bold">
                        {student.fullName?.charAt(0) || 'S'}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{student.fullName}</div>
                    {/* Father's Name - Only this line */}
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Father:</span> {student.fatherName || 'N/A'}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {(student.courses && student.courses.length > 0) ? (
                    student.courses.map((course, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {course}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs">No courses</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">{student.contact || student.mobileNumber || 'N/A'}</div>
                <div className="text-xs text-gray-500">{student.email || 'N/A'}</div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${
                      attendance[student._id] === "present"
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : attendance[student._id] === "absent"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : attendance[student._id] === "leave"
                        ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                        : attendance[student._id] === "late"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : "bg-gray-100 text-gray-800 border border-gray-200"
                    }`}
                  >
                    {attendance[student._id] || "Not Marked"}
                  </span>
                </div>
              </td>
              {!isAdmin && (
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {["present", "absent", "leave", "late"].map((status) => {
                      const icons = {
                        present: <CheckCircle size={14} />,
                        absent: <XCircle size={14} />,
                        leave: <Clock size={14} />,
                        late: <Clock size={14} />,
                      };
                      const colors = {
                        present: "bg-green-600",
                        absent: "bg-red-600",
                        leave: "bg-yellow-600",
                        late: "bg-blue-600",
                      };
                      const labels = {
                        present: "P",
                        absent: "A",
                        leave: "L",
                        late: "Late",
                      };
                      
                      return (
                        <button
                          key={status}
                          onClick={() => updateAttendance(student._id, status)}
                          className={`px-3 py-2 rounded-lg text-white font-medium text-xs flex items-center gap-1 transition-all hover:scale-105 ${
                            attendance[student._id] === status
                              ? colors[status]
                              : `${colors[status].replace('600', '100')} text-${colors[status].replace('bg-', '').replace('-600', '-800')} hover:${colors[status].replace('600', '200')}`
                          }`}
                        >
                          {icons[status]}
                          {labels[status]}
                        </button>
                      );
                    })}
                  </div>
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
  
  {/* Table Footer */}
  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="text-sm text-gray-600">
        Showing {students.length} students in {selectedBatch?.displayName || selectedBatch?.name}
      </div>
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download size={16} />
          Export to Excel
        </button>
        {!isAdmin && (
          <button
            onClick={saveAttendance}
            disabled={isAttendanceMarked()}
            className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
              isAttendanceMarked()
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            <CheckSquare size={16} />
            {isAttendanceMarked() ? "Attendance Saved" : "Save Attendance"}
          </button>
        )}
      </div>
    </div>
  </div>
</div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="mt-6 text-gray-600 text-lg">Loading attendance data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-screen-2xl mx-auto">
        {/* Header */}
        {renderHeader()}
        
        {/* Main Content */}
        <div className="mb-8">
          {/* Admin Views */}
          {isAdmin ? (
            adminView === "faculty" ? renderAdminFacultyList() :
            adminView === "faculty-batches" ? renderAdminFacultyBatches() :
            renderAttendanceGrid()
          ) : (
            /* Faculty Views */
            view === "batches" ? renderBatches() :
            renderAttendanceGrid()
          )}
        </div>

        {/* Help Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen size={18} />
                How it works:
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <span>
                    {isAdmin 
                      ? "Browse faculty or select a batch to view students" 
                      : "Select a batch from your teaching schedule"}
                  </span>
                </li>
                <li className="flex items-start gap-2 text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                  <span>
                    {isAdmin 
                      ? "View student attendance and statistics" 
                      : "Mark attendance for your assigned students"}
                  </span>
                </li>
                <li className="flex items-start gap-2 text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                  <span>
                    {isAdmin 
                      ? "Export reports for analysis" 
                      : "Save attendance before moving to next batch"}
                  </span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-3">Tips:</h4>
              <ul className="space-y-2">
                <li className="text-gray-600">
                  {isAdmin ? "• Use search to find specific faculty" : "• Use 'Mark All' buttons for quick updates"}
                </li>
                <li className="text-gray-600">
                  {isAdmin ? "• Click on faculty to view their assigned batches" : "• Attendance is saved per day per batch"}
                </li>
                <li className="text-gray-600">
                  {isAdmin ? "• Export reports for your records" : "• Export reports for your records"}
                </li>
                <li className="text-gray-600">
                  {isAdmin ? "• Monitor attendance trends across faculty" : "• Select multiple students for bulk actions"}
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-3">Need Help?</h4>
              <p className="text-gray-600 mb-4">
                {isAdmin
                  ? "Contact technical support for any system issues or data discrepancies."
                  : "Contact the admin office if you need to update your batch assignments or student lists."}
              </p>
              <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium">
                {isAdmin ? "View Admin Guide" : "View Teacher Guide"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;