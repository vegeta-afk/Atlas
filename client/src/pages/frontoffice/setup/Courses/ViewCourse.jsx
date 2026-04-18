// pages/admin/courses/ViewCourse.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  BookOpen,
  DollarSign,
  Calendar,
  Users,
  Award,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  GraduationCap,
  Briefcase,
  ClipboardList,
  Info,
  Tag,
} from "lucide-react";
import { courseAPI } from "../../../../services/api";
import toast from "react-hot-toast";

// ─── Small reusable components ────────────────────────────────────────────────

const InfoRow = ({ label, value, className = "" }) => (
  <div className={`flex flex-col gap-0.5 ${className}`}>
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
      {label}
    </span>
    <span className="text-sm text-gray-800 font-medium">
      {value || <span className="text-gray-400 italic">Not set</span>}
    </span>
  </div>
);

const SectionHeader = ({ icon: Icon, title, iconBg, iconColor }) => (
  <div className="flex items-center gap-3 mb-5 pb-4 border-b">
    <div className={`p-2 ${iconBg} rounded-lg`}>
      <Icon className={iconColor} size={20} />
    </div>
    <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
  </div>
);

const Badge = ({ children, variant = "default" }) => {
  const styles = {
    default: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-800",
    inactive: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const ViewCourse = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const basePath = "/" + location.pathname.split("/")[1]; // "/admin" or "/faculty"

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState([]);
  const [expandedSemesters, setExpandedSemesters] = useState({});
  const [expandedTopics, setExpandedTopics] = useState({});

  // ─── Fetch course ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const response = await courseAPI.getCourseById(id);

        if (response.data.success) {
          const data = response.data.data;
          setCourse(data);

          // Syllabus is a native array from MongoDB — no JSON.parse needed
          const rawSyllabus = data.syllabus || data.syllabusData;
          let syllabusArray = [];

          if (Array.isArray(rawSyllabus) && rawSyllabus.length > 0) {
            syllabusArray = rawSyllabus;
          } else if (typeof rawSyllabus === "string" && rawSyllabus.trim() !== "") {
            try { syllabusArray = JSON.parse(rawSyllabus); } catch (e) {}
          }

          if (syllabusArray.length > 0) {
            setSemesters(syllabusArray);
            // Expand all semesters and topics by default
            const semExp = {};
            const topicExp = {};
            syllabusArray.forEach((sem, sIdx) => {
              semExp[sIdx] = true;
              (sem.topics || []).forEach((_, tIdx) => {
                topicExp[`${sIdx}-${tIdx}`] = true;
              });
            });
            setExpandedSemesters(semExp);
            setExpandedTopics(topicExp);
          }
        } else {
          toast.error("Failed to load course");
          navigate(-1);
        }
      } catch (error) {
        console.error("Fetch course error:", error);
        toast.error("Failed to load course details");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCourse();
  }, [id]);

  // ─── Toggle helpers ────────────────────────────────────────────────────────
  const toggleSemester = (idx) =>
    setExpandedSemesters((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const toggleTopic = (semIdx, topicIdx) => {
    const key = `${semIdx}-${topicIdx}`;
    setExpandedTopics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ─── Formatting helpers ────────────────────────────────────────────────────
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);

  const formatExamMonths = (examMonths) => {
    if (!examMonths) return "Not set";
    return examMonths
      .split(",")
      .map((m) => `Month ${m.trim()}`)
      .join("  •  ");
  };

  const getSeatPercentage = (filled, total) => {
    if (!total || total === 0) return 0;
    return Math.round((filled / total) * 100);
  };

  const getCourseTypeLabel = (type) => {
    const map = {
      diploma: "Diploma",
      certificate: "Certificate",
      scholarship_based: "Scholarship Based",
    };
    return map[type] || type || "Not set";
  };

  const getCourseTypeBadgeVariant = (type) => {
    if (type === "scholarship_based") return "purple";
    if (type === "diploma") return "blue";
    if (type === "certificate") return "orange";
    return "default";
  };

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-gray-600 font-medium">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const seatPct = getSeatPercentage(
    course.seatsFilled || 0,
    course.seatsAvailable || 0
  );

  return (
    <div className="p-6">
      {/* ── Header ── */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`${basePath}/setup/courses`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Courses
        </button>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="text-blue-600" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-800">
                  {course.courseFullName}
                </h1>
                <Badge variant={course.isActive ? "active" : "inactive"}>
                  {course.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-gray-500 font-medium">
                  {course.courseShortName}
                </span>
                {course.courseCode && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600">
                      {course.courseCode}
                    </span>
                  </>
                )}
                {course.courseType && (
                  <Badge
                    variant={getCourseTypeBadgeVariant(course.courseType)}
                  >
                    {getCourseTypeLabel(course.courseType)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Link
            to={`${basePath}/setup/courses/edit/${course._id}`}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Edit size={18} />
            Edit Course
          </Link>
        </div>
      </div>

      {/* ── Quick stats strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Calendar className="text-blue-600" size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Duration</p>
            <p className="text-sm font-semibold text-gray-800">
              {course.duration || "—"} months
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <GraduationCap className="text-purple-600" size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Semesters</p>
            <p className="text-sm font-semibold text-gray-800">
              {course.totalSemesters || 0}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <DollarSign className="text-green-600" size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Net Fee</p>
            <p className="text-sm font-semibold text-gray-800">
              {formatCurrency(course.netFee)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Users className="text-orange-600" size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Seats</p>
            <p className="text-sm font-semibold text-gray-800">
              {course.seatsFilled || 0} / {course.seatsAvailable || 0}
            </p>
          </div>
        </div>
      </div>

      {/* ── Row 1: Basic Info + Fee Structure ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <SectionHeader
            icon={Info}
            title="Basic Information"
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <InfoRow label="Course Full Name" value={course.courseFullName} />
            <InfoRow label="Short Name" value={course.courseShortName} />
            <InfoRow label="Course Code" value={course.courseCode} />
            <InfoRow
              label="Course Type"
              value={getCourseTypeLabel(course.courseType)}
            />
            <InfoRow
              label="Duration"
              value={course.duration ? `${course.duration} months` : null}
            />
            <InfoRow
              label="Total Semesters"
              value={course.totalSemesters}
            />
          </div>

          {course.courseType === "scholarship_based" && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Award className="text-blue-600" size={16} />
              <p className="text-xs text-blue-700">
                Students can apply scholarships to this course
              </p>
            </div>
          )}

          {/* Active status */}
          <div className="mt-5 pt-4 border-t flex items-center gap-2">
            {course.isActive ? (
              <CheckCircle className="text-green-600" size={18} />
            ) : (
              <XCircle className="text-red-500" size={18} />
            )}
            <span className="text-sm text-gray-700">
              Course is{" "}
              <strong>
                {course.isActive ? "Active" : "Inactive"}
              </strong>{" "}
              — {course.isActive ? "accepting new admissions" : "not accepting admissions"}
            </span>
          </div>
        </div>

        {/* Fee Structure */}
        <div className="bg-white rounded-lg shadow p-6">
          <SectionHeader
            icon={DollarSign}
            title="Fee Structure"
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />

          {/* Fee highlight boxes */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-xs text-green-700 mb-1 font-medium">
                Total Fee
              </p>
              <p className="text-xl font-bold text-green-800">
                {formatCurrency(course.totalFee)}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-700 mb-1 font-medium">Net Fee</p>
              <p className="text-xl font-bold text-blue-800">
                {formatCurrency(course.netFee)}
              </p>
              {course.discount > 0 && (
                <p className="text-xs text-blue-600 mt-0.5">
                  {course.discount}% discount applied
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <InfoRow
              label="Monthly Fee"
              value={formatCurrency(course.monthlyFee)}
            />
            <InfoRow
              label="Discount"
              value={course.discount ? `${course.discount}%` : "No discount"}
            />
            <InfoRow
              label="Admission Fee"
              value={formatCurrency(course.admissionFee)}
            />
            <InfoRow
              label="Exam Fee"
              value={formatCurrency(course.examFee)}
            />
            <InfoRow
              label="Other Charges"
              value={formatCurrency(course.otherCharges)}
            />
          </div>
        </div>
      </div>

      {/* ── Row 2: Exams + Seats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Exam Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <SectionHeader
            icon={ClipboardList}
            title="Exam Information"
            iconBg="bg-orange-50"
            iconColor="text-orange-600"
          />
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg">
              <Calendar className="text-orange-600" size={28} />
              <div>
                <p className="text-xs text-orange-700 font-medium">
                  Number of Exams
                </p>
                <p className="text-2xl font-bold text-orange-800">
                  {course.numberOfExams || 0}
                </p>
              </div>
            </div>
            <InfoRow
              label="Exam Months"
              value={formatExamMonths(course.examMonths)}
            />
          </div>
        </div>

        {/* Seat Availability */}
        <div className="bg-white rounded-lg shadow p-6">
          <SectionHeader
            icon={Users}
            title="Seat Availability"
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-700 font-medium">
              <span>
                {course.seatsFilled || 0} filled
              </span>
              <span>{course.seatsAvailable || 0} total</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-4 rounded-full transition-all ${
                  seatPct >= 90
                    ? "bg-red-500"
                    : seatPct >= 70
                    ? "bg-orange-500"
                    : "bg-blue-600"
                }`}
                style={{ width: `${seatPct}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                <strong>{seatPct}%</strong> seats filled
              </span>
              <span className="text-sm text-gray-600">
                <strong>{(course.seatsAvailable || 0) - (course.seatsFilled || 0)}</strong>{" "}
                seats remaining
              </span>
            </div>

            {course.availableBatches && course.availableBatches.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-xs text-gray-500 font-medium uppercase mb-2">
                  Available Batches
                </p>
                <div className="flex flex-wrap gap-2">
                  {course.availableBatches.map((batch) => (
                    <span
                      key={batch}
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full font-medium capitalize"
                    >
                      {batch}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Course Description + Eligibility + Career Opportunities ── */}
      {(course.description ||
        course.eligibilityCriteria ||
        course.careerOpportunities) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {course.description && (
            <div className="bg-white rounded-lg shadow p-6">
              <SectionHeader
                icon={BookOpen}
                title="Description"
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
              />
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {course.description}
              </p>
            </div>
          )}
          {course.eligibilityCriteria && (
            <div className="bg-white rounded-lg shadow p-6">
              <SectionHeader
                icon={Tag}
                title="Eligibility Criteria"
                iconBg="bg-yellow-50"
                iconColor="text-yellow-600"
              />
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {course.eligibilityCriteria}
              </p>
            </div>
          )}
          {course.careerOpportunities && (
            <div className="bg-white rounded-lg shadow p-6">
              <SectionHeader
                icon={Briefcase}
                title="Career Opportunities"
                iconBg="bg-teal-50"
                iconColor="text-teal-600"
              />
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {course.careerOpportunities}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Syllabus (Semester → Topics → Subtopics) ── */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <SectionHeader
          icon={GraduationCap}
          title="Course Syllabus"
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />

        {semesters.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
            <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500">No syllabus added for this course</p>
          </div>
        ) : (
          <div className="space-y-4">
            {semesters.map((semester, semIdx) => (
              <div
                key={semIdx}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Semester Header */}
                <button
                  type="button"
                  onClick={() => toggleSemester(semIdx)}
                  className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {semIdx + 1}
                    </span>
                    <span className="font-semibold text-indigo-900">
                      {semester.name || `Semester ${semIdx + 1}`}
                    </span>
                    <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                      {(semester.topics || []).length} topic
                      {(semester.topics || []).length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {expandedSemesters[semIdx] ? (
                    <ChevronUp className="text-indigo-600" size={18} />
                  ) : (
                    <ChevronDown className="text-indigo-600" size={18} />
                  )}
                </button>

                {/* Semester Topics */}
                {expandedSemesters[semIdx] && (
                  <div className="p-4 space-y-3">
                    {!semester.topics || semester.topics.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4 italic">
                        No topics in this semester
                      </p>
                    ) : (
                      semester.topics.map((topic, topicIdx) => (
                        <div
                          key={topicIdx}
                          className="border border-gray-200 rounded-lg overflow-hidden"
                        >
                          {/* Topic Header */}
                          <button
                            type="button"
                            onClick={() => toggleTopic(semIdx, topicIdx)}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {topicIdx + 1}
                              </span>
                              <span className="font-medium text-gray-800 text-sm">
                                {topic.name || `Topic ${topicIdx + 1}`}
                              </span>
                              {topic.subtopics &&
                                topic.subtopics.length > 0 && (
                                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                                    {topic.subtopics.length} subtopic
                                    {topic.subtopics.length !== 1 ? "s" : ""}
                                  </span>
                                )}
                            </div>
                            {expandedTopics[`${semIdx}-${topicIdx}`] ? (
                              <ChevronUp className="text-gray-500" size={16} />
                            ) : (
                              <ChevronDown
                                className="text-gray-500"
                                size={16}
                              />
                            )}
                          </button>

                          {/* Subtopics */}
                          {expandedTopics[`${semIdx}-${topicIdx}`] && (
                            <div className="px-4 py-3">
                              {!topic.subtopics ||
                              topic.subtopics.length === 0 ? (
                                <p className="text-sm text-gray-400 italic text-center py-2">
                                  No subtopics
                                </p>
                              ) : (
                                <ul className="space-y-2 pl-4">
                                  {topic.subtopics.map((subtopic, subIdx) => (
                                    <li
                                      key={subIdx}
                                      className="flex items-start gap-2 text-sm text-gray-700"
                                    >
                                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                      <span>
                                        {subtopic.name ||
                                          `Subtopic ${subIdx + 1}`}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer actions ── */}
      <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
        <button
          onClick={() => navigate(`${basePath}/setup/courses`)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft size={18} />
          Back to List
        </button>
        <Link
          to={`${basePath}/setup/courses/edit/${course._id}`}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Edit size={18} />
          Edit This Course
        </Link>
      </div>
    </div>
  );
};

export default ViewCourse;