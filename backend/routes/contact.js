const express = require('express');
const Contact = require('../models/Contact');
const { validateContact } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Submit contact form
router.post('/', validateContact, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    // Get client IP address
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    const contact = new Contact({
      name,
      email,
      message,
      ipAddress
    });

    await contact.save();

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon!',
      data: {
        id: contact._id,
        submittedAt: contact.createdAt
      }
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all contact messages (admin only - for future use)
router.get('/', authenticateToken, requireRole(['employer']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    
    const query = {};
    if (status && ['new', 'read', 'replied'].includes(status)) {
      query.status = status;
    }

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Contact.countDocuments(query);

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact messages',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update contact message status (admin only - for future use)
router.patch('/:id/status', authenticateToken, requireRole(['employer']), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['new', 'read', 'replied'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact status updated successfully',
      data: { contact }
    });
  } catch (error) {
    console.error('Update contact status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;