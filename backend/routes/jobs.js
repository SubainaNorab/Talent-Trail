const express = require('express');
const Job = require('../models/Job');
const { validateJob } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');
const mongoose = require('mongoose');

const router = express.Router();

// Get all jobs (public - for students to view)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const jobType = req.query.jobType;
    const location = req.query.location;
    const search = req.query.search;

    // Build query
    const query = { isActive: true, deadline: { $gt: new Date() } };
    if (jobType && ['Full-time', 'Part-time', 'Internship', 'Remote'].includes(jobType)) {
      query.jobType = jobType;
    }
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const jobs = await Job.find(query)
      .populate('postedBy', 'fullname email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get jobs posted by current employer
router.get('/my-jobs', authenticateToken, requireRole(['employer']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const jobs = await Job.find({ postedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Job.countDocuments({ postedBy: req.user._id });

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get my jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your jobs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get single job by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('postedBy', 'fullname email');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: { job }
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create new job (employers only)
router.post('/', authenticateToken, requireRole(['employer']), validateJob, async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      postedBy: req.user._id
    };

    console.log("Job creation hit");
    console.log("Incoming data:", req.body);
    console.log("User:", req.user);


    const job = new Job(jobData);
    await job.save();

    // Populate the postedBy field for response
    await job.populate('postedBy', 'fullname email');

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      data: { job }
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update job (employers only - own jobs)
router.put('/:id', authenticateToken, requireRole(['employer']), validateJob, async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, postedBy: req.user._id });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to edit this job'
      });
    }

    Object.assign(job, req.body);
    await job.save();

    await job.populate('postedBy', 'fullname email');

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: { job }
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete job (employers only - own jobs)
router.delete('/:id', authenticateToken, requireRole(['employer']), async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, postedBy: req.user._id });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to delete this job'
      });
    }

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete job',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Apply for job (students only)
router.post('/:id/apply', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job || !job.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or no longer active'
      });
    }

    if (job.deadline <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Application deadline has passed'
      });
    }

    // Check if already applied
    const existingApplication = job.applications.find(
      app => app.applicant.toString() === req.user._id.toString()
    );

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }

    // Add application
    job.applications.push({
      applicant: req.user._id,
      appliedAt: new Date()
    });

    await job.save();

    res.json({
      success: true,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Apply for job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;