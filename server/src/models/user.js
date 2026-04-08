const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Change 'name' to 'fullName' OR add both
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  fullName: {  // Add this field to match your database
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  mobileNumber: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin', 'faculty'], // Add 'faculty'
    default: 'student'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    index: true,
    set: (v) => {
      console.log(`🔄 Setting facultyId to: ${v}`);
      return v;
    }
  },
  // Change studentId to String to match your database
  studentId: {
    type: String,  // Changed from ObjectId to String
    unique: true,
    sparse: true,
    index: true,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    getters: true,
    transform: function(doc, ret) {
      // Ensure fullName is returned if name exists
      if (!ret.fullName && ret.name) {
        ret.fullName = ret.name;
      }
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    getters: true,
    transform: function(doc, ret) {
      if (!ret.fullName && ret.name) {
        ret.fullName = ret.name;
      }
      return ret;
    }
  }
});

// Pre-save middleware to handle name/fullName
userSchema.pre('save', function(next) {
  console.log(`🔍 PRE-SAVE - User: ${this.email}`);
  console.log(`   name: ${this.name}`);
  console.log(`   fullName: ${this.fullName}`);
  console.log(`   studentId: ${this.studentId}`);
  console.log(`   facultyId: ${this.facultyId}`);
  
  // If fullName is provided but name isn't, set name from fullName
  if (this.fullName && !this.name) {
    this.name = this.fullName;
  }
  
  // If name is provided but fullName isn't, set fullName from name
  if (this.name && !this.fullName) {
    this.fullName = this.name;
  }
  
  // Ensure studentId is a string
  if (this.studentId && typeof this.studentId !== 'string') {
    this.studentId = this.studentId.toString();
  }
  
  // Handle facultyId
  if (this.facultyId && typeof this.facultyId === 'string') {
    try {
      this.facultyId = new mongoose.Types.ObjectId(this.facultyId);
      console.log(`   Converted facultyId to ObjectId: ${this.facultyId}`);
    } catch (e) {
      console.error(`   Error converting facultyId: ${e.message}`);
    }
  }
  
  next();
});

// Post-save middleware
userSchema.post('save', function(doc) {
  console.log(`✅ POST-SAVE - User: ${doc.email}`);
  console.log(`   name: ${doc.name}`);
  console.log(`   fullName: ${doc.fullName}`);
  console.log(`   studentId: ${doc.studentId}`);
});

// Method to get display name
userSchema.methods.getDisplayName = function() {
  return this.fullName || this.name;
};

const User = mongoose.model('User', userSchema);
module.exports = User;