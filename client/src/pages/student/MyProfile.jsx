import React, { useState, useEffect } from "react";
import { 
  FaUser, FaEnvelope, FaPhone, FaCalendarAlt, FaMapMarkerAlt, 
  FaCity, FaFlag, FaCode, FaClock, FaChalkboardTeacher, FaIdCard,
  FaVenusMars, FaUserCheck, FaCalendarCheck, FaEdit, FaKey, FaDownload
} from "react-icons/fa";
import { MdFamilyRestroom } from "react-icons/md";

const MyProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getUser = () => {
    const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!userStr) return null;
    try { return JSON.parse(userStr); } catch { return null; }
  };

  const getToken = () =>
    sessionStorage.getItem("token") || localStorage.getItem("token");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const user = getUser();
      const token = getToken();

      if (!user || !user.studentId) {
        setError("No student data found. Please login again.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const matched = (data.data || []).find(s => s.studentId === user.studentId);

      if (matched) {
        setProfile(matched);
      } else {
        setError("Profile not found. Please contact administrator.");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Not provided";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric"
      });
    } catch { return "Invalid date"; }
  };

  const InfoCard = ({ icon: Icon, label, value, colSpan = "col-span-1" }) => (
    <div className={`${colSpan} bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-center space-x-3">
        <div className="text-blue-600">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
          <p className="text-gray-800 font-medium mt-1">{value || "Not provided"}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
        <p className="text-gray-600 mt-2">View your personal information</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
        
        {/* Profile Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <div className="relative">
              {profile.photo && profile.photo !== "/default-avatar.png" ? (
                <img
                  src={profile.photo}
                  alt={profile.fullName}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white">
                  <FaUser className="size-12 text-white" />
                </div>
              )}
            </div>

            {/* Name + Badges */}
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-white">{profile.fullName}</h2>
              <div className="flex flex-wrap gap-3 mt-2 justify-center md:justify-start">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
                  <FaIdCard className="mr-2 size-3" />
                  {profile.studentId}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  profile.status === "active"
                    ? "bg-green-500/20 text-green-100"
                    : "bg-red-500/20 text-red-100"
                }`}>
                  <FaUserCheck className="mr-2 size-3" />
                  {profile.status === "active" ? "Active Student" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard icon={FaUser}         label="Full Name"       value={profile.fullName} />
            <InfoCard icon={FaEnvelope}     label="Email Address"   value={profile.email} />
            <InfoCard icon={FaPhone}        label="Mobile Number"   value={profile.mobileNumber} />
            <InfoCard icon={FaVenusMars}    label="Gender"          value={profile.gender} />
            <InfoCard icon={FaCalendarAlt}  label="Date of Birth"   value={formatDate(profile.dateOfBirth)} />
            <InfoCard icon={FaCalendarCheck}label="Admission Date"  value={formatDate(profile.admissionDate)} />
          </div>
        </div>

        {/* Family Information */}
        <div className="p-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            <MdFamilyRestroom className="inline mr-2 mb-1" />
            Family Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard icon={FaUser} label="Father's Name" value={profile.fatherName} />
            <InfoCard icon={FaUser} label="Mother's Name" value={profile.motherName} />
          </div>
        </div>

        {/* Address Information */}
        <div className="p-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            <FaMapMarkerAlt className="inline mr-2 mb-1" />
            Address Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard icon={FaMapMarkerAlt} label="Address"  value={profile.address}  colSpan="md:col-span-2" />
            <InfoCard icon={FaCity}         label="City"     value={profile.city} />
            <InfoCard icon={FaFlag}         label="State"    value={profile.state} />
            <InfoCard icon={FaMapMarkerAlt} label="Pincode"  value={profile.pincode} />
          </div>
        </div>

        {/* Academic Information */}
        <div className="p-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            Academic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard icon={FaCode}              label="Course"           value={profile.course} />
            <InfoCard icon={FaClock}             label="Batch Time"       value={profile.batchTime} />
            <InfoCard icon={FaChalkboardTeacher} label="Faculty Allotted" value={profile.facultyAllot} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => alert("Edit profile feature coming soon!")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FaEdit size={16} />
              Edit Profile
            </button>
            <button
              onClick={() => alert("Change password feature coming soon!")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <FaKey size={16} />
              Change Password
            </button>
            <button
              onClick={() => alert("ID card download coming soon!")}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <FaDownload size={16} />
              Download ID Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;