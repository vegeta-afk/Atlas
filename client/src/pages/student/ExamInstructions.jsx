import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AlertCircle, ClipboardList } from "lucide-react";

const instructions = [
  {
    en: 'The examination will begin only after you click the "Start Exam" button.',
    hi: '"Start Exam" बटन पर क्लिक करने के बाद ही परीक्षा प्रारंभ होगी।'
  },
  {
    en: "The exam timer will start immediately and cannot be paused or restarted.",
    hi: "परीक्षा का टाइमर तुरंत शुरू हो जाएगा तथा इसे रोका या दोबारा शुरू नहीं किया जा सकता।"
  },
  {
    en: "Read each question carefully before selecting your answer.",
    hi: "प्रत्येक प्रश्न को ध्यानपूर्वक पढ़कर ही उत्तर चुनें।"
  },
  {
    en: "You may change your answer at any time before submitting the exam.",
    hi: "परीक्षा जमा करने से पहले आप अपना उत्तर कभी भी बदल सकते हैं।"
  },
  {
    en: "Ensure you have a stable internet connection throughout the examination.",
    hi: "परीक्षा के दौरान आपका इंटरनेट कनेक्शन स्थिर होना चाहिए।"
  },
  {
    en: "Do not refresh, close, or navigate away from the examination page, as it may interrupt your exam.",
    hi: "परीक्षा के दौरान पेज को रिफ्रेश, बंद या किसी अन्य पेज पर न जाएँ, अन्यथा परीक्षा बाधित हो सकती है।"
  },
  {
    en: "Once the allotted time is over, the examination will be submitted automatically.",
    hi: "निर्धारित समय समाप्त होने पर परीक्षा स्वतः जमा हो जाएगी।"
  },
  {
    en: "Use of unfair means, unauthorized materials, or assistance from others is strictly prohibited.",
    hi: "किसी भी प्रकार की अनुचित सहायता, अनधिकृत सामग्री या अन्य व्यक्ति की मदद लेना पूर्णतः प्रतिबंधित है।"
  },
  {
    en: "Keep your login credentials confidential. Do not share them with anyone.",
    hi: "अपने लॉगिन विवरण गोपनीय रखें। इन्हें किसी के साथ साझा न करें।"
  },
  {
    en: "In case of any technical issue, contact the examination administrator immediately.",
    hi: "किसी भी तकनीकी समस्या की स्थिति में तुरंत परीक्षा प्रशासक से संपर्क करें।"
  }
];

const ExamInstructions = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [agreed, setAgreed] = useState(false);

  // Optional: exam name/details passed via navigate state from MyExams
  const examName = location.state?.testName;

  const handleStartExam = () => {
    if (!agreed) return;
    // Go to the actual exam page — this is where startExam() actually fires
    navigate(`/student/exam/${testId}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

          {/* Header */}
          <div className="bg-slate-800 px-6 py-5 flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <ClipboardList size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                Examination Instructions / परीक्षा निर्देश
              </h1>
              {examName && (
                <p className="text-slate-300 text-sm">{examName}</p>
              )}
            </div>
          </div>

          <div className="p-6">
            <p className="text-gray-700 font-medium mb-1">
              Please read all the instructions carefully before starting the examination.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              परीक्षा प्रारंभ करने से पहले कृपया सभी निर्देश ध्यानपूर्वक पढ़ें।
            </p>

            {/* Instructions list */}
            <ol className="space-y-4 mb-6">
              {instructions.map((item, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-gray-800 text-sm">{item.en}</p>
                    <p className="text-gray-500 text-sm">{item.hi}</p>
                  </div>
                </li>
              ))}
            </ol>

            {/* Declaration */}
            <div className="border-t pt-5 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Declaration / घोषणा
              </h3>
              <p className="text-gray-700 text-sm mb-1">
                I have read and understood all the instructions. I agree to follow the
                examination rules and understand that any violation may result in the
                cancellation of my examination.
              </p>
              <p className="text-gray-500 text-sm">
                मैंने सभी निर्देश पढ़ लिए हैं और उन्हें समझ लिया है। मैं परीक्षा के सभी नियमों
                का पालन करने के लिए सहमत हूँ तथा समझता/समझती हूँ कि किसी भी नियम का उल्लंघन
                होने पर मेरी परीक्षा रद्द की जा सकती है।
              </p>
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-5 w-5 mt-0.5 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-800">
                I have read and agree to the above instructions / मैंने उपरोक्त सभी निर्देश
                पढ़ लिए हैं और उनसे सहमत हूँ।
              </span>
            </label>

            {!agreed && (
              <div className="flex items-center gap-2 text-amber-600 text-sm mb-4">
                <AlertCircle size={16} />
                Please check the box above to enable the exam start button.
              </div>
            )}

            {/* Start button - only enabled after agreeing */}
            <button
              onClick={handleStartExam}
              disabled={!agreed}
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                agreed
                  ? "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              I Agree &amp; Start Exam
            </button>

            <button
              onClick={() => navigate("/student/exams")}
              className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel and go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamInstructions;