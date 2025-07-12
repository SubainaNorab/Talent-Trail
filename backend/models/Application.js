const mongoose = require('mongoose');

const simpleApplicationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be between 2 and 100 characters'],
    maxlength: [100, 'Full name must be between 2 and 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true,
    minlength: [2, 'Position must be between 2 and 200 characters'],
    maxlength: [200, 'Position must be between 2 and 200 characters']
  },
  coverLetter: {
    type: String,
    required: [true, 'Cover letter is required'],
    trim: true,
    minlength: [10, 'Cover letter must be between 10 and 2000 characters'],
    maxlength: [2000, 'Cover letter must be between 10 and 2000 characters']
  },
  resume: {
    type: String,
    required: [true, 'Resume file is required']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SimpleApplication', simpleApplicationSchema);