import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, X, CheckSquare } from "lucide-react";

// Same interaction pattern as TopicCompletionModal, but scoped to a single
// bridge batch's selectedTopics/selectedSubtopics instead of the full course syllabus.
const BridgeTopicCompletionModal = ({ bridgeBatchId, date, onClose, onSaved }) => {
  const [bridgeBatch, setBridgeBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState({});
  const [checkedTopics, setCheckedTopics] = useState({});
  const [checkedSubtopics, setCheckedSubtopics] = useState({});

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchBridgeBatch();
  }, []);

  const fetchBridgeBatch = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/bridge-batch/${bridgeBatchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setBridgeBatch(result.data);
      }
    } catch (error) {
      console.error("Error fetching bridge batch:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (topicKey) => {
    setExpandedTopics((prev) => ({ ...prev, [topicKey]: !prev[topicKey] }));
  };

  const toggleTopic = (topicKey) => {
    setCheckedTopics((prev) => ({ ...prev, [topicKey]: !prev[topicKey] }));
  };

  const toggleSubtopic = (subtopicKey) => {
    setCheckedSubtopics((prev) => ({ ...prev, [subtopicKey]: !prev[subtopicKey] }));
  };

  const hasAnySelection = () => {
    return Object.values(checkedTopics).some(Boolean) || Object.values(checkedSubtopics).some(Boolean);
  };

  // Group flat selectedTopics by which subtopics belong to them (matching on the
  // `sIdx_tIdx` prefix of each subtopicKey against the topic's own key)
  const getSubtopicsForTopic = (topicKey) => {
    if (!bridgeBatch?.selectedSubtopics) return [];
    return bridgeBatch.selectedSubtopics.filter((s) => s.subtopicKey.startsWith(`${topicKey}_`));
  };

  const handleSave = async () => {
    if (!hasAnySelection()) return;
    setSaving(true);
    try {
      const completedTopicKeys = Object.keys(checkedTopics).filter((k) => checkedTopics[k]);
      const completedSubtopicKeys = Object.keys(checkedSubtopics).filter((k) => checkedSubtopics[k]);

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/bridge-batch/topics/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bridgeBatchId,
          date,
          completedTopicKeys,
          completedSubtopicKeys,
        }),
      });
      const result = await response.json();
      if (result.success) {
        onSaved(result.data?.status);
      } else {
        alert("Error saving topics: " + result.message);
      }
    } catch (error) {
      alert("Error saving topics: " + error.message);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Mark Bridge Topics Covered</h2>
            <p className="text-sm text-gray-500">
              Select what you covered in today's bridge session{bridgeBatch?.courseName ? ` — ${bridgeBatch.courseName}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : !bridgeBatch || (bridgeBatch.selectedTopics || []).length === 0 ? (
            <p className="text-sm text-gray-400 pl-2">No topics were assigned to this bridge batch.</p>
          ) : (
            <div className="space-y-1">
              {bridgeBatch.selectedTopics.map((topic) => {
                const subtopics = getSubtopicsForTopic(topic.topicKey);
                const topicChecked = !!checkedTopics[topic.topicKey];
                const isExpanded = !!expandedTopics[topic.topicKey];
                const alreadyDone = topic.completed;

                return (
                  <div key={topic.topicKey} className="border border-gray-100 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <label className={`flex items-center gap-2 flex-1 ${alreadyDone ? "opacity-60" : "cursor-pointer"}`}>
                        <input
                          type="checkbox"
                          checked={alreadyDone || topicChecked}
                          disabled={alreadyDone}
                          onChange={() => toggleTopic(topic.topicKey)}
                          className="w-5 h-5 rounded-full accent-blue-600"
                        />
                        <span className="text-sm font-medium text-gray-800">{topic.topicName}</span>
                        {alreadyDone && (
                          <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
                            already covered
                          </span>
                        )}
                      </label>
                      {subtopics.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(topic.topicKey)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                    </div>

                    {isExpanded && subtopics.length > 0 && (
                      <div className="mt-2 pl-7 space-y-1">
                        {subtopics.map((sub) => {
                          const subChecked = !!checkedSubtopics[sub.subtopicKey];
                          const subDone = sub.completed;
                          return (
                            <label
                              key={sub.subtopicKey}
                              className={`flex items-center gap-2 ${subDone ? "opacity-60" : "cursor-pointer"}`}
                            >
                              <input
                                type="checkbox"
                                checked={subDone || subChecked}
                                disabled={subDone}
                                onChange={() => toggleSubtopic(sub.subtopicKey)}
                                className="w-4 h-4 rounded-full accent-blue-500"
                              />
                              <span className="text-sm text-gray-600">{sub.subtopicName}</span>
                              {subDone && (
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

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          {!hasAnySelection() && !loading && (
            <p className="text-xs text-orange-600">Select at least one topic or subtopic to enable saving.</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading || !hasAnySelection()}
            className="ml-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckSquare size={16} />
            {saving ? "Saving..." : "Save Bridge Topics"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BridgeTopicCompletionModal;