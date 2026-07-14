import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, X, CheckSquare } from "lucide-react";

const TopicCompletionModal = ({ batchId, date, courseGroups, onClose, onSaved }) => {
  const [topicsByCourse, setTopicsByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completingKey, setCompletingKey] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState({});
  const [checkedTopics, setCheckedTopics] = useState({});
  // subStatus[id] = "not_started" | "in_progress" | "completed" — what the DROPDOWN currently shows
  const [subStatus, setSubStatus] = useState({});

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const groupsParam = encodeURIComponent(
        JSON.stringify(courseGroups.map(g => ({ courseId: g.courseId, studentIds: g.studentIds })))
      );
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/attendance/course-topics?groups=${groupsParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        const map = {};
        const initialStatus = {};
        result.data.forEach(c => {
          map[c.courseId] = c.topics;
          c.topics.forEach(topic => {
            topic.subtopics.forEach(sub => {
              const id = `${c.courseId}_${sub.key}`;
              // Default the dropdown to whatever the DB actually says today — fixes the "resets to blank" bug
              initialStatus[id] = sub.completed ? "completed" : (sub.inProgress ? "in_progress" : "not_started");
            });
          });
        });
        setTopicsByCourse(map);
        setSubStatus(initialStatus);
      }
    } catch (error) {
      console.error("Error fetching topics:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedTopics(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTopic = (courseId, topicKey) => {
    const id = `${courseId}_${topicKey}`;
    setCheckedTopics(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStatusChange = async (group, subKey, newStatus) => {
    const id = `${group.courseId}_${subKey}`;

    if (newStatus === "completed") {
      setCompletingKey(subKey);
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/api/attendance/topics/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            batchId,
            courseId: group.courseId,
            studentIds: group.studentIds,
            subtopicKey: subKey,
          })
        });
        const result = await response.json();
        if (result.success) {
          setSubStatus(prev => ({ ...prev, [id]: "completed" }));
        } else {
          alert('Error marking complete: ' + result.message);
        }
      } catch (error) {
        alert('Error marking complete: ' + error.message);
        console.error(error);
      } finally {
        setCompletingKey(null);
      }
      return;
    }

    // "in_progress" or "not_started" — just update local dropdown state,
    // actual "taught today" log happens on Save (same as before)
    setSubStatus(prev => ({ ...prev, [id]: newStatus }));
  };

  const hasAnySelection = () => {
    const anySubInProgress = Object.values(subStatus).some(s => s === "in_progress");
    return Object.values(checkedTopics).some(Boolean) || anySubInProgress;
  };

  const handleSave = async () => {
    if (!hasAnySelection()) return;
    setSaving(true);
    try {
      const payloadGroups = courseGroups.map(group => {
        const topics = topicsByCourse[group.courseId] || [];
        const completedTopicKeys = [];
        const completedSubtopicKeys = [];
        topics.forEach(topic => {
          if (checkedTopics[`${group.courseId}_${topic.key}`]) {
            completedTopicKeys.push(topic.key);
          }
          topic.subtopics.forEach(sub => {
            const id = `${group.courseId}_${sub.key}`;
            if (subStatus[id] === "in_progress") {
              completedSubtopicKeys.push(sub.key);
            }
          });
        });
        return {
          courseId: group.courseId,
          studentIds: group.studentIds,
          completedTopicKeys,
          completedSubtopicKeys
        };
      });

      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/attendance/topics/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ batchId, date, courseGroups: payloadGroups })
      });
      const result = await response.json();
      if (result.success) {
        onSaved();
      } else {
        alert('Error saving topics: ' + result.message);
      }
    } catch (error) {
      alert('Error saving topics: ' + error.message);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Mark Topics Covered</h2>
          <p className="text-sm text-gray-500">Select at least one topic taught today to continue</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            courseGroups.map((group) => {
              const topics = topicsByCourse[group.courseId] || [];
              return (
                <div key={group.courseId} className="mb-6">
                  <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg px-4 py-3 mb-3">
                    <div className="text-blue-700 font-bold text-base">{group.courseName}</div>
                    <div className="text-blue-500 text-xs mt-1">
                      {group.studentIds.length} students: {group.studentNames.join(', ')}
                    </div>
                  </div>

                  {topics.length === 0 ? (
                    <p className="text-sm text-gray-400 pl-2">No syllabus topics found for this course.</p>
                  ) : (
                    <div className="space-y-1">
                      {topics.map((topic) => {
                        const topicChecked = !!checkedTopics[`${group.courseId}_${topic.key}`];
                        const isExpanded = !!expandedTopics[`${group.courseId}_${topic.key}`];
                        return (
                          <div key={topic.key} className="border border-gray-100 rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={topicChecked}
                                  onChange={() => toggleTopic(group.courseId, topic.key)}
                                  className="w-5 h-5 rounded-full accent-blue-600"
                                />
                                <span className="text-sm font-medium text-gray-800">{topic.name}</span>
                                {topic.completed && (
                                  <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
                                    ✓ Completed
                                  </span>
                                )}
                                {topic.inProgress && (
                                  <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">
                                    In Progress
                                  </span>
                                )}
                              </label>
                              {topic.subtopics.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(`${group.courseId}_${topic.key}`)}
                                  className="text-gray-400 hover:text-gray-600 p-1"
                                >
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              )}
                            </div>

                            {isExpanded && topic.subtopics.length > 0 && (
                              <div className="mt-2 pl-7 space-y-2">
                                {topic.subtopics.map((sub) => {
                                  const id = `${group.courseId}_${sub.key}`;
                                  const status = subStatus[id] || "not_started";
                                  return (
                                    <div key={sub.key} className="flex items-center justify-between gap-2">
                                      <span className={`text-sm ${status === "completed" ? "text-gray-400" : "text-gray-700"}`}>
                                        {sub.name}
                                        {status === "in_progress" && sub.taughtDaysCount > 0 && (
                                          <span className="ml-2 text-[10px] text-amber-600">
                                            ({sub.taughtDaysCount} day{sub.taughtDaysCount !== 1 ? "s" : ""} so far)
                                          </span>
                                        )}
                                      </span>
                                      <select
                                        value={status === "not_started" ? "" : status}
                                        disabled={status === "completed" || completingKey === sub.key}
                                        onChange={(e) => handleStatusChange(group, sub.key, e.target.value)}
                                        className={`text-xs border rounded-md px-2 py-1 font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${
                                          status === "completed"
                                            ? "bg-green-50 text-green-700 border-green-200"
                                            : status === "in_progress"
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : "bg-gray-50 text-gray-500 border-gray-200"
                                        }`}
                                      >
                                        <option value="" disabled>Select status</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                      </select>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          {!hasAnySelection() && !loading && (
            <p className="text-xs text-orange-600">Select at least one topic to enable saving.</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading || !hasAnySelection()}
            className="ml-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckSquare size={16} />
            {saving ? 'Saving...' : 'Save Topics & Attendance'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopicCompletionModal;