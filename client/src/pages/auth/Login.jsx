import { useState } from "react";
import { FaGoogle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import iitImage from "../../assets/iit.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // API URL - Make sure this matches your backend
  const API_URL = "http://localhost:5000/api";

 const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setSuccess("");
  setLoading(true);

  try {
    console.log("Attempting login with:", { email, password });

    // Make API call to backend
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });

    console.log("Login response:", response.data);

    if (response.data.success) {
      // Store token and user data
      const token = response.data.token;
      const userData = response.data.user;
      
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));

      setSuccess("Login successful!");
      console.log("Login successful, user role:", userData.role);
      console.log("User data:", userData);
      
      // Redirect based on user role
      setTimeout(() => {
  if (userData.role === 'admin') {
    navigate("/admin/dashboard");
  } else if (userData.role === 'faculty' || userData.role === 'instructor') {
    navigate("/faculty/dashboard");
  } else if (userData.role === 'student') {
    navigate("/student/dashboard");
  } else {
    navigate("/dashboard");
  }
}, 1000);
      
    } else {
      setError(response.data.message || "Login failed");
      setLoading(false);
    }
  } catch (err) {
    console.error("Login error:", err);

    if (err.response) {
      setError(err.response.data?.message || `Server error: ${err.response.status}`);
    } else if (err.request) {
      setError("No response from server. Check if backend is running.");
    } else {
      setError(err.message || "An unexpected error occurred");
    }
    setLoading(false);
  }
};

  

  const handleGoogleSignIn = () => {
    setError("Google sign-in will be implemented soon");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex overflow-hidden">
        {/* Left side - Welcome/Info section - more compact */}
        <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-blue-600 to-indigo-800 text-white p-8 w-2/5">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-1">IIT</h1>
            <p className="text-blue-100 text-sm">
              Intelligent Institute of Training
            </p>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold">Welcome to LMS!</h2>
            <p className="text-blue-200 text-sm">
              Your gateway to online learning
            </p>
          </div>
        </div>

        {/* Right side - Login Form - more compact */}
        <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col justify-center">
          {/* Success Message */}
          {success && (
            <div className="mb-3 p-2 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
              ✅ {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              ❌ {error}
            </div>
          )}

          <div className="md:hidden mb-6 text-center">
            <h1 className="text-2xl font-bold text-blue-600 mb-1">IIT</h1>
            <p className="text-gray-600 text-sm">Learning Management System</p>
          </div>

          <div className="text-center mb-5">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              Login to your account
            </h2>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors mb-5 disabled:opacity-50 text-sm"
          >
            <FaGoogle className="text-blue-500 size-4" />
            {loading ? "Processing..." : "Sign up with Google"}
          </button>

          <div className="flex items-center mb-5">
            <div className="grow border-t border-gray-300"></div>
            <span className="mx-3 text-gray-500 text-sm">or</span>
            <div className="grow border-t border-gray-300"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-1 font-medium text-sm">
                Enter email or mobile number
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                placeholder="test@example.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-gray-700 font-medium text-sm">
                  Password
                </label>
                <a
                  href="/forgot-password"
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
                >
                  Forgot your password?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                placeholder="password123"
                required
                disabled={loading}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="size-3.5 text-blue-600 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <label htmlFor="remember" className="ml-2 text-gray-700 text-sm">
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-colors shadow-md hover:shadow-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-4 w-4 mr-2 text-white"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{" "}
              <a
                href="/register"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Sign up here
              </a>
            </p>
          </div>

          {/* Test credentials reminder - more compact */}
          <div className="mt-4 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 text-center">
              <strong>Test Credentials:</strong>
              <br />
              Email: test@example.com
              <br />
              Password: password123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
