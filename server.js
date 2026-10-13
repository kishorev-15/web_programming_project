/**
 * Campus Lost & Found Portal - Backend REST API Server
 * Course: ISWE407P | UI/UX Design Project
 * Built with native Node.js (Zero-dependency - Runs directly with `node server.js`)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 5000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Database Structure (Zero initial dummy items for real-time testing)
const INITIAL_DATA = {
  users: [
    {
      id: "usr-1",
      name: "Rahul Sharma",
      email: "rahul.sharma@vitstudent.ac.in",
      role: "Student",
      idNumber: "23MIS0248",
      department: "Software Engineering",
      year: "3rd Year",
      password: "password123",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120"
    },
    {
      id: "usr-2",
      name: "Dr. Anand K",
      email: "dr.anand@vit.ac.in",
      role: "Faculty",
      idNumber: "EMP-10822",
      department: "School of Computing",
      year: "Faculty / Professor",
      password: "password123",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120"
    },
    {
      id: "usr-3",
      name: "Officer Deshmukh",
      email: "campus.security@vit.ac.in",
      role: "Security Staff",
      idNumber: "SEC-409",
      department: "Campus Safety & Surveillance",
      year: "Security Staff",
      password: "password123",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120"
    },
    {
      id: "usr-4",
      name: "Chief Administrator",
      email: "admin.lostfound@vit.ac.in",
      role: "Administrator",
      idNumber: "ADM-001",
      department: "Student Affairs",
      year: "Admin",
      password: "password123",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120"
    }
  ],
  items: [] // Zero items to allow real-time testing from clean state
};

// Read Database
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2));
      return INITIAL_DATA;
    }
    const content = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading database:', err);
    return INITIAL_DATA;
  }
}

// Save Database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing database:', err);
  }
}

// Validate Strict VIT Email Domain
function isValidCollegeEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const e = email.toLowerCase().trim();
  return e.endsWith('@vitstudent.ac.in') || e.endsWith('@vit.ac.in');
}

// Validate Password Complexity (Combination of 8+ chars, uppercase, lowercase, number, symbol)
function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  return hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
}

// Send JSON Response with CORS
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Parse Request Body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // --- API Routes ---

  // Health check
  if (pathname === '/api/health' && method === 'GET') {
    return sendJSON(res, 200, { status: 'online', time: new Date().toISOString() });
  }

  // Auth: Register
  if (pathname === '/api/auth/register' && method === 'POST') {
    try {
      const { name, role, idNumber, department, year, email, password } = await parseBody(req);
      if (!name || !email || !password) {
        return sendJSON(res, 400, { success: false, message: 'Name, email, and password are required.' });
      }

      if (!isValidCollegeEmail(email)) {
        return sendJSON(res, 400, {
          success: false,
          message: 'Access Restricted: Only official VIT email addresses (@vitstudent.ac.in or @vit.ac.in) are permitted.'
        });
      }

      if (!isValidPassword(password)) {
        return sendJSON(res, 400, {
          success: false,
          message: 'Password must be at least 8 characters long with uppercase, lowercase, numbers, and symbols.'
        });
      }

      const db = readDB();
      const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return sendJSON(res, 400, { success: false, message: 'An account with this college email already exists.' });
      }

      const newUser = {
        id: 'usr-' + Date.now(),
        name,
        email: email.toLowerCase().trim(),
        role: role || 'Student',
        idNumber: idNumber || '',
        department: department || '',
        year: year || '',
        password,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'
      };

      db.users.push(newUser);
      writeDB(db);

      const { password: _, ...userWithoutPass } = newUser;
      return sendJSON(res, 201, { success: true, user: userWithoutPass, message: 'Registration successful!' });
    } catch (e) {
      return sendJSON(res, 500, { success: false, message: 'Server error during registration.' });
    }
  }

  // Auth: Login
  if (pathname === '/api/auth/login' && method === 'POST') {
    try {
      const { email, password, role } = await parseBody(req);
      if (!email || !password) {
        return sendJSON(res, 400, { success: false, message: 'Email and password are required.' });
      }

      if (!isValidCollegeEmail(email)) {
        return sendJSON(res, 400, {
          success: false,
          message: 'Access Restricted: Only official VIT email addresses (@vitstudent.ac.in or @vit.ac.in) are permitted.'
        });
      }

      const db = readDB();
      const user = db.users.find(
        u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
      );

      if (!user) {
        return sendJSON(res, 401, { success: false, message: 'Invalid college credentials or password. Please verify your details.' });
      }

      const { password: _, ...userWithoutPass } = user;
      return sendJSON(res, 200, { success: true, user: userWithoutPass, message: 'Signed in successfully!' });
    } catch (e) {
      return sendJSON(res, 500, { success: false, message: 'Server error during login.' });
    }
  }

  // Items: Get All
  if (pathname === '/api/items' && method === 'GET') {
    const db = readDB();
    return sendJSON(res, 200, { success: true, items: db.items });
  }

  // Items: Create Report (Lost or Found)
  if (pathname === '/api/items' && method === 'POST') {
    try {
      const itemData = await parseBody(req);
      if (!itemData.name || !itemData.category || !itemData.type) {
        return sendJSON(res, 400, { success: false, message: 'Name, category, and type are required.' });
      }

      const db = readDB();
      const newItem = {
        id: 'item-' + Date.now(),
        name: itemData.name,
        type: itemData.type, // 'lost' or 'found'
        category: itemData.category,
        description: itemData.description || '',
        date: itemData.date || new Date().toISOString().split('T')[0],
        time: itemData.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        location: itemData.location || 'Campus',
        storage: itemData.storage || 'With Me',
        status: itemData.type === 'lost' ? 'lost' : 'found',
        image: itemData.image || '',
        reportedBy: itemData.reportedBy || { name: 'Campus Member', email: 'user@vitstudent.ac.in', role: 'Student' },
        contactRequests: []
      };

      db.items.unshift(newItem);
      writeDB(db);
      return sendJSON(res, 201, { success: true, item: newItem, message: `${newItem.type.toUpperCase()} item reported successfully!` });
    } catch (e) {
      return sendJSON(res, 500, { success: false, message: 'Server error submitting report.' });
    }
  }

  // Items: Submit Contact Request / Claim
  if (pathname === '/api/items/request' && method === 'POST') {
    try {
      const { itemId, requesterEmail, requesterName, message } = await parseBody(req);
      if (!itemId || !requesterEmail || !message) {
        return sendJSON(res, 400, { success: false, message: 'Item ID, requester email, and proof message are required.' });
      }

      const db = readDB();
      const item = db.items.find(i => i.id === itemId);
      if (!item) {
        return sendJSON(res, 404, { success: false, message: 'Item not found.' });
      }

      if (item.reportedBy?.email?.toLowerCase() === requesterEmail.toLowerCase()) {
        return sendJSON(res, 400, { success: false, message: 'You cannot request contact on an item you reported.' });
      }

      if (!item.contactRequests) item.contactRequests = [];
      const alreadyRequested = item.contactRequests.some(r => r.requesterEmail.toLowerCase() === requesterEmail.toLowerCase());
      if (alreadyRequested) {
        return sendJSON(res, 400, { success: false, message: 'You have already submitted a contact request for this item.' });
      }

      const requestObj = {
        requestId: 'req-' + Date.now(),
        requesterEmail,
        requesterName: requesterName || 'Campus Student',
        message,
        timestamp: 'Just now',
        status: 'pending'
      };

      item.contactRequests.push(requestObj);
      if (item.status !== 'returned') item.status = 'requested';
      writeDB(db);

      return sendJSON(res, 200, { success: true, message: 'Contact request submitted! The finder will review your claim.' });
    } catch (e) {
      return sendJSON(res, 500, { success: false, message: 'Error submitting contact request.' });
    }
  }

  // Items: Approve Request
  if (pathname === '/api/items/approve' && method === 'POST') {
    try {
      const { itemId, requestId } = await parseBody(req);
      const db = readDB();
      const item = db.items.find(i => i.id === itemId);
      if (!item) return sendJSON(res, 404, { success: false, message: 'Item not found.' });

      const reqObj = (item.contactRequests || []).find(r => r.requestId === requestId);
      if (reqObj) {
        reqObj.status = 'approved';
        item.status = 'approved';
        item.claimedBy = reqObj.requesterEmail;
        writeDB(db);
        return sendJSON(res, 200, { success: true, message: 'Contact approved! The owner has been notified.' });
      }
      return sendJSON(res, 404, { success: false, message: 'Request ID not found.' });
    } catch (e) {
      return sendJSON(res, 500, { success: false, message: 'Error approving request.' });
    }
  }

  // Items: Reject Request
  if (pathname === '/api/items/reject' && method === 'POST') {
    try {
      const { itemId, requestId } = await parseBody(req);
      const db = readDB();
      const item = db.items.find(i => i.id === itemId);
      if (!item) return sendJSON(res, 404, { success: false, message: 'Item not found.' });

      const reqObj = (item.contactRequests || []).find(r => r.requestId === requestId);
      if (reqObj) {
        reqObj.status = 'rejected';
        writeDB(db);
        return sendJSON(res, 200, { success: true, message: 'Claim request declined.' });
      }
      return sendJSON(res, 404, { success: false, message: 'Request ID not found.' });
    } catch (e) {
      return sendJSON(res, 500, { success: false, message: 'Error rejecting request.' });
    }
  }

  // Items: Mark as Returned / Recovered
  if (pathname === '/api/items/returned' && method === 'POST') {
    try {
      const { itemId } = await parseBody(req);
      const db = readDB();
      const item = db.items.find(i => i.id === itemId);
      if (!item) return sendJSON(res, 404, { success: false, message: 'Item not found.' });

      item.status = 'returned';
      writeDB(db);
      return sendJSON(res, 200, { success: true, message: 'Item marked as successfully returned!' });
    } catch (e) {
      return sendJSON(res, 500, { success: false, message: 'Error updating item status.' });
    }
  }

  // Stats: Summary Metrics
  if (pathname === '/api/stats' && method === 'GET') {
    const db = readDB();
    const lost = db.items.filter(i => i.type === 'lost' && i.status !== 'returned').length;
    const found = db.items.filter(i => i.type === 'found' && i.status !== 'returned').length;
    const returned = db.items.filter(i => i.status === 'returned').length;
    let requests = 0;
    db.items.forEach(i => requests += (i.contactRequests || []).length);

    return sendJSON(res, 200, { success: true, stats: { lost, found, requests, returned } });
  }

  // Reset to Zero items (for testing)
  if (pathname === '/api/reset' && method === 'POST') {
    const db = readDB();
    db.items = [];
    writeDB(db);
    return sendJSON(res, 200, { success: true, message: 'Items reset to 0.' });
  }

  // 404 for unknown endpoints
  return sendJSON(res, 404, { error: 'Endpoint not found' });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Campus Lost & Found Backend Server is running!`);
  console.log(`API URL: http://localhost:${PORT}`);
  console.log(`Initial items: 0 (Ready for real-time testing)`);
  console.log(`College Email Auth: ACTIVE (@vitstudent.ac.in / @vit.ac.in)`);
  console.log(`====================================================`);
});
