// API configuration and helper functions
const API_BASE_URL = 'http://localhost:5000/api';

// Get auth token from localStorage
const getAuthToken = () => {
  const user = JSON.parse(localStorage.getItem('talenttrailUser') || '{}');
  return user.token || null;
};

// API request helper
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;

  const config = {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(!isFormData && { 'Content-Type': 'application/json' }),  // Only add JSON header if not FormData
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // Create a more detailed error message
      let errorMessage = data.message || 'Request failed';

      // If there are validation errors, include them in the message
      if (data.errors && Array.isArray(data.errors)) {
        const validationErrors = data.errors.map(err => err.msg || err.message || err).join(', ');
        errorMessage = `Validation failed: ${validationErrors}`;
      }
      const error = new Error(errorMessage);
      // Add validation errors if they exist
      if (data.errors && Array.isArray(data.errors)) {
        error.errors = data.errors;
      }
      // Add success flag if it exists
      if (data.success !== undefined) {
        error.success = data.success;
      }
      // Add status code for debugging
      error.status = response.status;
      throw error;

    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);

    // If it's a network error, wrap it properly
    if (!error.message || error.name === 'TypeError') {
      const networkError = new Error('Network error or server unavailable');
      throw networkError;
    }
    
    throw error;
  }
};

// Auth API functions
const authAPI = {
  signup: (userData) => apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  
  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  
  getProfile: () => apiRequest('/auth/profile'),
  
  updateProfile: (profileData) => apiRequest('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData)
  }),

  logout: () => apiRequest('/auth/logout', { method: 'POST' })
};

// Contact API functions
const contactAPI = {
  submit: (contactData) => apiRequest('/contact', {
    method: 'POST',
    body: JSON.stringify(contactData)
  })
};

// Jobs API functions
const jobsAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/jobs${queryString ? `?${queryString}` : ''}`);
  },

  getMyJobs: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/jobs/my-jobs${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id) => apiRequest(`/jobs/${id}`),

  create: (jobData) => {
    // Clean and validate data before sending
    const cleanedData = {
      title: jobData.title?.trim(),
      company: jobData.company?.trim(),
      jobType: jobData.jobType,
      location: jobData.location?.trim(),
      description: jobData.description?.trim(),
      deadline: jobData.deadline,
      postedBy: jobData.postedBy
    };

    // Only include salary if it has a value
    if (jobData.salary && jobData.salary !== '' && !isNaN(jobData.salary)) {
      cleanedData.salary = Number(jobData.salary);
    }
    console.log('Sending cleaned job data:', cleanedData);
    return apiRequest('/jobs', {
      method: 'POST',
      body: JSON.stringify(cleanedData)
    });
  },
  update: (id, jobData) => {
    // Clean and validate data before sending
    const cleanedData = {
      title: jobData.title?.trim(),
      company: jobData.company?.trim(),
      jobType: jobData.jobType,
      location: jobData.location?.trim(),
      description: jobData.description?.trim(),
      deadline: jobData.deadline
    };
    // Only include salary if it has a value
    if (jobData.salary && jobData.salary !== '' && !isNaN(jobData.salary)) {
      cleanedData.salary = Number(jobData.salary);
    }
    return apiRequest(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanedData)
    });
  },

  delete: (id) => apiRequest(`/jobs/${id}`, {
    method: 'DELETE'
  }),

  apply: (id) => apiRequest(`/jobs/${id}/apply`, {
    method: 'POST'
  })
};

// Applications API functions
const applicationsAPI = {
  submit: (applicationData) => {
    return apiRequest('/applications', {
      method: 'POST',
      body: applicationData
    });
  },
  
  getMyApplications: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/applications/my-applications${queryString ? `?${queryString}` : ''}`);
  },
  
  getJobApplications: (jobId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/applications/job/${jobId}${queryString ? `?${queryString}` : ''}`);
  },
  
  updateStatus: (id, status) => apiRequest(`/applications/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  })
};

// Check if user is authenticated and has required role
const checkAuth = (requiredRole = null) => {
  const user = JSON.parse(localStorage.getItem('talenttrailUser') || '{}');
  
  if (!user.token) {
    return { authenticated: false, authorized: false };
  }
  
  const authorized = !requiredRole || user.role === requiredRole;
  
  return { 
    authenticated: true, 
    authorized, 
    user: { email: user.email, role: user.role }
  };
};

// Redirect if not authorized
const requireAuth = (requiredRole = null, redirectUrl = '/login.html') => {
  const { authenticated, authorized } = checkAuth(requiredRole);
  
  if (!authenticated) {
    window.location.href = redirectUrl;
    return false;
  }
  
  if (!authorized) {
    showUnauthorizedMessage();
    return false;
  }
  
  return true;
};

// Show unauthorized message
const showUnauthorizedMessage = () => {
  document.body.innerHTML = `
    <div class="min-h-screen bg-black text-white flex items-center justify-center">
      <div class="text-center">
        <h1 class="text-4xl font-bold text-red-500 mb-4">Access Denied</h1>
        <p class="text-gray-400 mb-6">You are not authorized to view this page.</p>
        <a href="/mainpage.html" class="bg-lime-400 text-black px-6 py-2 rounded hover:bg-lime-300 transition">
          Go to Home
        </a>
      </div>
    </div>
  `;
}

const validateJobData = (jobData) => {
  const errors = [];

  if (!jobData.title || jobData.title.trim().length === 0) {
    errors.push('Job title is required');
  }

  if (!jobData.company || jobData.company.trim().length === 0) {
    errors.push('Company name is required');
  }

  if (!jobData.jobType || !['Full-time', 'Part-time', 'Internship', 'Remote'].includes(jobData.jobType)) {
    errors.push('Valid job type is required');
  }

  if (!jobData.location || jobData.location.trim().length === 0) {
    errors.push('Location is required');
  }

  if (!jobData.description || jobData.description.trim().length === 0) {
    errors.push('Job description is required');
  }

  if (!jobData.deadline) {
    errors.push('Application deadline is required');
  } else {
    const deadlineDate = new Date(jobData.deadline);
    if (deadlineDate <= new Date()) {
      errors.push('Application deadline must be in the future');
    }
  }

  if (jobData.salary && (isNaN(jobData.salary) || Number(jobData.salary) < 0)) {
    errors.push('Salary must be a valid positive number');
  }

  return errors;
};


//window explicitly makes your objects globally available to all inline scripts in HTML
window.authAPI = authAPI;
window.jobsAPI = jobsAPI;
window.contactAPI = contactAPI;
window.applicationsAPI = applicationsAPI;
window.checkAuth = checkAuth;
window.requireAuth = requireAuth;
window.validateJobData = validateJobData;