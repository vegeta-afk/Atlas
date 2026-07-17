import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, X, CheckSquare } from "lucide-react";

// Same dropdown interaction pattern as TopicCompletionModal, but scoped to a single
// bridge batch's selectedTopics/selectedSubtopics instead of the full course syllabus.
//
// NOTE ON "IN PROGRESS": BridgeBatch only tracks a boolean `completed` per subtopic —
// there's no separate daily "taught today" log like the regular TopicCompletion collection.
// So "In Progress" here is a LOCAL-ONLY marker (lets faculty flag "started, not done" before
// committing) — only "Completed" selections are ever sent to the backend on Save.
const BridgeTopicCompletionModal = ({ bridgeBatchId, date, onClose, onSaved }) => {
  const [bridgeBatch, setBridgeBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState({});
  const [checkedTopics, setCheckedTopics] = useState({}); // for topics with NO subtopics only
  // subStatus[subtopicKey] = "not_started" | "in_progress" | "completed" — what the DROPDOWN shows
  const [subStatus, setSubStatus] = useState({});

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
        // Default every dropdown to whatever the DB actually says right now
        const initialStatus = {};
        (result.data.selectedSubtopics || []).forEach((s) => {
          initialStatus[s.subtopicKey] = s.completed ? "completed" : "not_started";
        });
        setSubStatus(initialStatus);
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

  // Only used for topics that have zero subtopics — those still need a manual checkbox
  // since there's nothing underneath to derive completion from.
  const toggleTopic = (topicKey) => {
    setCheckedTopics((prev) => ({ ...prev, [topicKey]: !prev[topicKey] }));
  };

  const handleStatusChange = (subtopicKey, newStatus) => {
    // Both "in_progress" and "completed" just update local state —
    // actual persistence happens only when Save is clicked.
    setSubStatus((prev) => ({ ...prev, [subtopicKey]: newStatus }));
  };

  // Group flat selectedSubtopics by which topic they belong to (matching on the
  // `sIdx_tIdx` prefix of each subtopicKey against the topic's own key)
  const getSubtopicsForTopic = (topicKey) => {
    if (!bridgeBatch?.selectedSubtopics) return [];
    return bridgeBatch.selectedSubtopics.filter((s) => s.subtopicKey.startsWith(`${topicKey}_`));
  };

  const hasAnySelection = () => {
    const anySubInProgressOrCompleted = Object.values(subStatus).some(
      (s) => s === "in_progress" || s === "completed"
    );
    return Object.values(checkedTopics).some(Boolean) || anySubInProgressOrCompleted;
  };

  const handleSave = async () => {
    if (!hasAnySelection()) return;
    setSaving(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      // Only subtopics newly marked "Completed" this session actually get persisted —
      // "In Progress" stays local, since the schema has no separate progress log for bridge.
      const completedSubtopicKeys = (bridgeBatch?.selectedSubtopics || [])
        .filter((s) => !s.completed && subStatus[s.subtopicKey] === "completed")
        .map((s) => s.subtopicKey);

      // Topics with NO subtopics rely on the manual checkbox; topics WITH subtopics
      // are marked complete only once every one of their subtopics is completed
      // (already-saved OR completed this session).
      const completedTopicKeys = (bridgeBatch?.selectedTopics || [])
        .filter((topic) => !topic.completed)
        .filter((topic) => {
          const subs = getSubtopicsForTopic(topic.topicKey);
          if (subs.length === 0) {
            return !!checkedTopics[topic.topicKey];
          }
          return subs.every(
            (s) => s.completed || subStatus[s.subtopicKey] === "completed"
          );
        })
        .map((topic) => topic.topicKey);

      if (completedSubtopicKeys.length === 0 && completedTopicKeys.length === 0) {
        alert("Select at least one topic or subtopic as Completed to save.");
        setSaving(false);
        return;
      }

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
                const isExpanded = !!expandedTopics[topic.topicKey];
                const alreadyDone = topic.completed;
                const topicChecked = !!checkedTopics[topic.topicKey];

                // For topics WITH subtopics: derive whether every subtopic is done
                const allSubsDone =
                  subtopics.length > 0 &&
                  subtopics.every((s) => s.completed || subStatus[s.subtopicKey] === "completed");

                return (
                  <div key={topic.topicKey} className="border border-gray-100 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-2 flex-1 ${subtopics.length > 0 ? "" : "cursor-pointer"}`}>
                        {subtopics.length === 0 ? (
                          <label className={`flex items-center gap-2 flex-1 ${alreadyDone ? "opacity-60" : "cursor-pointer"}`}>
                            <input
                              type="checkbox"
                              checked={alreadyDone || topicChecked}
                              disabled={alreadyDone}
                              onChange={() => toggleTopic(topic.topicKey)}
                              className="w-5 h-5 rounded-full accent-blue-600"
                            />
                            <span className="text-sm font-medium text-gray-800">{topic.topicName}</span>
                          </label>
                        ) : (
                          <>
                            <input
                              type="checkbox"
                              checked={alreadyDone || allSubsDone}
                              disabled
                              className="w-5 h-5 rounded-full accent-blue-600 cursor-not-allowed"
                              title="Automatically completes once every subtopic below is covered"
                            />
                            <span className="text-sm font-medium text-gray-800">{topic.topicName}</span>
                          </>
                        )}
                        {alreadyDone && (
                          <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
                            ✓ Completed
                          </span>
                        )}
                        {!alreadyDone && allSubsDone && (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                            will complete on save
                          </span>
                        )}
                        {!alreadyDone && !allSubsDone && subtopics.length > 0 && (
                          <span className="text-[10px] text-gray-400">
                            ({subtopics.filter((s) => s.completed || subStatus[s.subtopicKey] === "completed").length}/{subtopics.length} subtopics covered)
                          </span>
                        )}
                      </div>
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
                      <div className="mt-2 pl-7 space-y-2">
                        {subtopics.map((sub) => {
                          const status = sub.completed ? "completed" : (subStatus[sub.subtopicKey] || "not_started");
                          return (
                            <div key={sub.subtopicKey} className="flex items-center justify-between gap-2">
                              <span className={`text-sm ${status === "completed" ? "text-gray-400" : "text-gray-700"}`}>
                                {sub.subtopicName}
                              </span>
                              <select
                                value={status === "not_started" ? "" : status}
                                disabled={sub.completed || saving}
                                onChange={(e) => handleStatusChange(sub.subtopicKey, e.target.value)}
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