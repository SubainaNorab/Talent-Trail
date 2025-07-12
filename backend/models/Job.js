const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [200, 'Job title cannot exceed 200 characters']
  },
  company: {  
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  jobType: {
    type: String,
    required: [true, 'Job type is required'],
    enum: ['Full-time', 'Part-time', 'Internship', 'Remote']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
    maxlength: [5000, 'Job description cannot exceed 5000 characters']
  },
  salary: {
    type: Number,
    min: [0, 'Salary cannot be negative'],
    default: null
  },
  deadline: {
    type: Date,
    required: [true, 'Application deadline is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Application deadline must be in the future'
    }
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applications: [{
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'accepted', 'rejected'],
      default: 'pending'
    }
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
jobSchema.index({ postedBy: 1, createdAt: -1 });
jobSchema.index({ jobType: 1, isActive: 1 });
jobSchema.index({ deadline: 1, isActive: 1 });
jobSchema.index({ createdAt: -1, isActive: 1 });

// Virtual for expired jobs
jobSchema.virtual('isExpired').get(function() {
  return this.deadline < new Date();
});

module.exports = mongoose.model('Job', jobSchema);