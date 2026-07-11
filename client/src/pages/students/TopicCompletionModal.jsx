import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, X, CheckSquare } from "lucide-react";

const TopicCompletionModal = ({ batchId, date, courseGroups, onClose, onSaved }) => {
  const [topicsByCourse, setTopicsByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState({});
  const [checkedTopics, setCheckedTopics] = useState({});
  const [checkedSubtopics, setCheckedSubtopics] = useState({});

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
      result.data.forEach(c => { map[c.courseId] = c.topics; });
      setTopicsByCourse(map);
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

  const toggleSubtopic = (courseId, subKey) => {
    const id = `${courseId}_${subKey}`;
    setCheckedSubtopics(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const hasAnySelection = () => {
    return Object.values(checkedTopics).some(Boolean) || Object.values(checkedSubtopics).some(Boolean);
  };

  const handleSave = async () => {
    if (!hasAnySelection()) return; // guard, in case button is ever reachable while disabled
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
            if (checkedSubtopics[`${group.courseId}_${sub.key}`]) {
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      already covered
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
                              <div className="mt-2 pl-7 space-y-1">
                                {topic.subtopics.map((sub) => {
                                  const subChecked = !!checkedSubtopics[`${group.courseId}_${sub.key}`];
                                  return (
                                    <label key={sub.key} className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    checked={subChecked}
    onChange={() => toggleSubtopic(group.courseId, sub.key)}
    className="w-4 h-4 rounded-full accent-blue-500"
  />
  <span className="text-sm text-gray-600">{sub.name}</span>
  {sub.completed && (
    <span className="text-[9px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full">
      covered
    </span>
  )}
</label>
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