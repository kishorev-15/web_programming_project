/* ==========================================================================
   Campus Lost & Found Portal - Centralized JavaScript Application Layer
   Course: ISWE407P | UI/UX Design Project
   Developed by Sangavi R (23MIS0248), Preethikshabala V (23MIS0085), Prethika D (23MIS0301)
   ========================================================================== */

// Initial Seed Items: Empty by default so all counts start at 0 for real-time testing!
const SEED_ITEMS = [];

// Pre-configured Verified Demo Accounts for Presentation
const DEMO_USERS = {
  student: {
    id: "usr-1",
    name: "Rahul Sharma",
    email: "rahul.sharma@vitstudent.ac.in",
    role: "Student",
    idNumber: "23MIS0248",
    department: "Software Engineering",
    year: "3rd Year",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80"
  },
  faculty: {
    id: "usr-2",
    name: "Dr. Anand K",
    email: "dr.anand@vit.ac.in",
    role: "Faculty",
    idNumber: "EMP-10822",
    department: "School of Computing",
    year: "Faculty / Professor",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80"
  },
  security: {
    id: "usr-3",
    name: "Officer Deshmukh",
    email: "campus.security@vit.ac.in",
    role: "Security Staff",
    idNumber: "SEC-409",
    department: "Campus Safety & Surveillance",
    year: "Security Staff",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
  },
  admin: {
    id: "usr-4",
    name: "Chief Administrator",
    email: "admin.lostfound@vit.ac.in",
    role: "Administrator",
    idNumber: "ADM-001",
    department: "Student Affairs",
    year: "Admin",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80"
  }
};

const CATEGORY_IMAGES = {
  "Wallet": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500",
  "ID Card": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500",
  "Electronics": "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=500",
  "Books": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500",
  "Keys": "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=500",
  "Water Bottle": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500",
  "Documents": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500",
  "Others": "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=500"
};

const API_BASE = "http://localhost:5000/api";
let currentActiveItemId = null;
let selectedCategoryFilter = "all";
let detailsModalInstance = null;

/* --------------------------------------------------------------------------
   COLLEGE EMAIL VALIDATOR & AUTH GUARDS
   -------------------------------------------------------------------------- */

/**
 * Enforces strict VIT institutional email format
 * Strictly permitted: @vitstudent.ac.in and @vit.ac.in
 */
function isVitEmail(email) {
  if (!email || typeof email !== "string") return false;
  const e = email.toLowerCase().trim();
  return e.endsWith("@vitstudent.ac.in") || e.endsWith("@vit.ac.in");
}

// Backward-compatibility alias
function isCollegeEmail(email) {
  return isVitEmail(email);
}

/**
 * Validates password complexity:
 * - At least 8 characters
 * - Uppercase letter (A-Z)
 * - Lowercase letter (a-z)
 * - Number (0-9)
 * - Special character (!@#$%^&* etc.)
 */
function validatePasswordComplexity(password) {
  if (!password || typeof password !== "string") {
    return {
      isValid: false,
      score: 0,
      rules: { length: false, upper: false, lower: false, number: false, special: false },
      message: "Password is required."
    };
  }

  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)
  };

  const score = Object.values(rules).filter(Boolean).length;
  const isValid = rules.length && rules.upper && rules.lower && rules.number && rules.special;

  let message = "";
  if (!rules.length) message = "Password must be at least 8 characters long.";
  else if (!rules.upper) message = "Password must include at least one uppercase letter (A-Z).";
  else if (!rules.lower) message = "Password must include at least one lowercase letter (a-z).";
  else if (!rules.number) message = "Password must include at least one number (0-9).";
  else if (!rules.special) message = "Password must include at least one special symbol (!@#$%^&*).";

  return { isValid, score, rules, message };
}

/**
 * Extracts 2-letter uppercase initials for user profile badge
 */
function getUserInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Route protection: redirects unauthenticated users to login.html
 */
function requireAuth() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const publicPages = ["index.html", "login.html", "register.html", ""];

  if (!publicPages.includes(currentPath)) {
    const user = getCurrentUser();
    if (!user || !user.email) {
      sessionStorage.setItem(
        "flash_toast",
        JSON.stringify({
          message: "Access Restricted: Please sign in with your official VIT email (@vitstudent.ac.in or @vit.ac.in) to access this page.",
          type: "warning"
        })
      );
      window.location.href = `login.html?redirect=${encodeURIComponent(currentPath)}`;
      return false;
    }
  }
  return true;
}

const APP_VERSION = "2.0_realtime";

/* --------------------------------------------------------------------------
   LOCAL & REMOTE DATA STORE
   -------------------------------------------------------------------------- */

function initDataStore() {
  // Automatic migration: purge previous dummy items so counts start at 0
  if (localStorage.getItem("campus_lf_version") !== APP_VERSION) {
    localStorage.setItem("campus_lf_version", APP_VERSION);
    localStorage.setItem("campus_lf_items", JSON.stringify([]));
    localStorage.removeItem("campus_lf_current_user"); // require login with college email
  }

  if (!localStorage.getItem("campus_lf_items")) {
    localStorage.setItem("campus_lf_items", JSON.stringify(SEED_ITEMS));
  }
  // Initialize registered accounts pool if empty
  if (!localStorage.getItem("campus_lf_registered_users")) {
    localStorage.setItem("campus_lf_registered_users", JSON.stringify(Object.values(DEMO_USERS)));
  }
}

function getItems() {
  initDataStore();
  try {
    return JSON.parse(localStorage.getItem("campus_lf_items")) || [];
  } catch (e) {
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem("campus_lf_items", JSON.stringify(items));
}

function getCurrentUser() {
  try {
    const stored = localStorage.getItem("campus_lf_current_user");
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem("campus_lf_current_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("campus_lf_current_user");
  }
  updateUserInterface();
}

function getRegisteredUsers() {
  initDataStore();
  try {
    return JSON.parse(localStorage.getItem("campus_lf_registered_users")) || Object.values(DEMO_USERS);
  } catch (e) {
    return Object.values(DEMO_USERS);
  }
}

function saveRegisteredUsers(users) {
  localStorage.setItem("campus_lf_registered_users", JSON.stringify(users));
}

/* --------------------------------------------------------------------------
   UI SYNCHRONIZATION & NAVBAR
   -------------------------------------------------------------------------- */

function updateUserInterface() {
  const user = getCurrentUser();
  const nameEl = document.getElementById("nav-user-name");
  const roleEl = document.getElementById("nav-user-role");
  const avatarEl = document.getElementById("nav-user-avatar");
  const dashNameEl = document.getElementById("dash-user-name");
  const authContainer = document.getElementById("nav-auth-container");

  if (user && user.email) {
    // User is logged in
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role;
    if (avatarEl && user.avatar) avatarEl.src = user.avatar;
    if (dashNameEl) dashNameEl.textContent = user.name.split(" ")[0];

    if (authContainer) {
      const initials = getUserInitials(user.name);
      authContainer.innerHTML = `
        <div class="dropdown">
          <button class="user-menu-btn dropdown-toggle border-0" type="button" id="userMenuDropdown" data-bs-toggle="dropdown" aria-expanded="false">
            <div class="user-initials-badge">${initials}</div>
            <div class="d-none d-md-block text-start lh-1 me-1">
              <span id="nav-user-name" class="fw-bold d-block text-dark" style="font-size: 13px;">${escapeHtml(user.name)}</span>
              <span id="nav-user-role" class="badge bg-primary-subtle text-primary" style="font-size: 10.5px;">${escapeHtml(user.role)}</span>
            </div>
          </button>
          <ul class="dropdown-menu dropdown-menu-end user-dropdown-menu" aria-labelledby="userMenuDropdown">
            <li class="user-dropdown-header">
              <div class="fw-bold text-dark small">${escapeHtml(user.name)}</div>
              <div class="text-muted" style="font-size: 11.5px;"><i class="bi bi-envelope me-1"></i>${escapeHtml(user.email)}</div>
            </li>
            <li>
              <a class="dropdown-item user-dropdown-item" href="profile.html">
                <i class="bi bi-person-badge text-primary"></i> My Profile & Activity
              </a>
            </li>
            <li>
              <a class="dropdown-item user-dropdown-item" href="notifications.html">
                <i class="bi bi-bell text-warning"></i> Claims & Approvals
              </a>
            </li>
            <li><hr class="dropdown-divider my-1"></li>
            <li>
              <button class="dropdown-item user-dropdown-item danger text-danger" onclick="handleLogout()">
                <i class="bi bi-box-arrow-right"></i> Sign Out
              </button>
            </li>
          </ul>
        </div>
      `;
    }

    // Notifications Badge Count
    const allItems = getItems();
    let pendingRequestsForMe = 0;
    allItems.forEach(i => {
      if (i.reportedBy?.email?.toLowerCase() === user.email?.toLowerCase()) {
        pendingRequestsForMe += (i.contactRequests || []).filter(r => r.status === "pending").length;
      }
    });

    const notifBadge = document.getElementById("notif-badge");
    if (notifBadge) {
      if (pendingRequestsForMe > 0) {
        notifBadge.style.display = "inline-block";
        notifBadge.textContent = pendingRequestsForMe;
      } else {
        notifBadge.style.display = "none";
      }
    }
  } else {
    // User is logged out
    if (authContainer) {
      authContainer.innerHTML = `
        <a href="login.html" class="btn btn-primary-custom btn-sm rounded-pill px-3">
          <i class="bi bi-box-arrow-in-right me-1"></i> Sign In
        </a>
        <a href="register.html" class="btn btn-outline-secondary btn-sm rounded-pill px-3">
          Register
        </a>
      `;
    }
    const notifBadge = document.getElementById("notif-badge");
    if (notifBadge) notifBadge.style.display = "none";
  }
}

/* Update Real-Time Metrics Counters */
function updateCounts() {
  const items = getItems();
  const lost = items.filter(i => i.type === "lost" && i.status !== "returned").length;
  const found = items.filter(i => i.type === "found" && i.status !== "returned").length;
  const returned = items.filter(i => i.status === "returned").length;
  let requests = 0;
  items.forEach(i => requests += (i.contactRequests || []).length);

  setText("landing-stat-lost", lost);
  setText("landing-stat-found", found);
  setText("landing-stat-requests", requests);
  setText("landing-stat-returned", returned);

  setText("dash-stat-lost", lost);
  setText("dash-stat-found", found);
  setText("dash-stat-requests", requests);
  setText("dash-stat-returned", returned);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* --------------------------------------------------------------------------
   ITEM CARD & CATALOG RENDERING
   -------------------------------------------------------------------------- */

function createItemCardHTML(item) {
  const badgeClass = item.status === "lost" ? "badge-lost" :
                     item.status === "found" ? "badge-found" :
                     item.status === "requested" ? "badge-requested" : "badge-returned";
  const statusLabel = item.status === "requested" ? "Claim Requested" :
                      item.status === "returned" ? "Recovered" : item.type.toUpperCase();
  const imgUrl = item.image || CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES["Others"];

  return `
    <div class="col-md-6 col-lg-4">
      <div class="item-card">
        <div class="item-card-img-wrap">
          <img src="${imgUrl}" alt="${escapeHtml(item.name)}" class="item-card-img" onerror="this.src='https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=500'" />
          <span class="item-badge-status ${badgeClass}">${statusLabel}</span>
          <span class="item-category-tag"><i class="bi bi-tag-fill me-1"></i>${escapeHtml(item.category)}</span>
        </div>
        <div class="item-card-body">
          <h5 class="item-title">${escapeHtml(item.name)}</h5>
          <p class="item-desc">${escapeHtml(item.description)}</p>
          <div class="item-meta">
            <div class="item-meta-item"><i class="bi bi-geo-alt text-danger"></i><span>${escapeHtml(item.location)}</span></div>
            <div class="item-meta-item"><i class="bi bi-calendar3 text-muted"></i><span>${item.date}</span></div>
            ${item.storage ? `<div class="item-meta-item"><i class="bi bi-building text-primary"></i><span>Custody: ${escapeHtml(item.storage)}</span></div>` : ''}
          </div>
          <button class="btn btn-primary-custom w-100 mt-auto" onclick="openItemDetails('${item.id}')">
            <i class="bi bi-eye"></i> View Details
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderRecentItems(containerId, count) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const items = getItems().slice(0, count);
  if (!items.length) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="stat-icon-wrapper icon-blue mx-auto mb-3" style="width:64px; height:64px; font-size:28px;">
          <i class="bi bi-clipboard-check"></i>
        </div>
        <h5 class="fw-bold">No active reports yet</h5>
        <p class="text-muted small mb-3">All records currently at zero. Be the first to file a lost or found report!</p>
        <div class="d-flex justify-content-center gap-2">
          <a href="report-lost.html" class="btn btn-sm btn-primary-custom"><i class="bi bi-plus-circle me-1"></i> Report Lost Item</a>
          <a href="report-found.html" class="btn btn-sm btn-success-custom"><i class="bi bi-box-seam me-1"></i> Report Found Item</a>
        </div>
      </div>
    `;
    return;
  }
  container.innerHTML = items.map(createItemCardHTML).join("");
}

function filterCatalog() {
  const query = (document.getElementById("catalog-search-input")?.value || "").toLowerCase().trim();
  const location = document.getElementById("catalog-filter-location")?.value || "all";
  const status = document.getElementById("catalog-filter-status")?.value || "all";
  const type = document.getElementById("catalog-filter-type")?.value || "all";

  const allItems = getItems();
  const filtered = allItems.filter(item => {
    const matchQuery = !query ||
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query);
    const matchCat = selectedCategoryFilter === "all" || item.category.toLowerCase() === selectedCategoryFilter.toLowerCase();
    const matchLoc = location === "all" || item.location === location;
    const matchStatus = status === "all" || item.status === status;
    const matchType = type === "all" || item.type === type;
    return matchQuery && matchCat && matchLoc && matchStatus && matchType;
  });

  const countEl = document.getElementById("search-results-count");
  if (countEl) countEl.textContent = filtered.length;

  const grid = document.getElementById("catalog-items-grid");
  if (grid) {
    if (!allItems.length) {
      grid.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="stat-icon-wrapper icon-blue mx-auto mb-3" style="width:70px; height:70px; font-size:32px;">
            <i class="bi bi-inbox"></i>
          </div>
          <h4>The Campus Lost & Found Catalog is Empty</h4>
          <p class="text-muted small mb-4">No items have been filed yet. Add an item below to test real-time searching!</p>
          <div class="d-flex justify-content-center gap-3">
            <a href="report-lost.html" class="btn-primary-custom"><i class="bi bi-box-arrow-in-up"></i> Report Lost Item</a>
            <a href="report-found.html" class="btn-success-custom"><i class="bi bi-box-arrow-in-down"></i> Report Found Item</a>
          </div>
        </div>`;
    } else if (!filtered.length) {
      grid.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="stat-icon-wrapper icon-amber mx-auto mb-3" style="width:60px; height:60px; font-size:28px;"><i class="bi bi-search"></i></div>
          <h4>No matching campus records found</h4>
          <p class="text-muted small">Try adjusting your keywords or clearing the category filter.</p>
        </div>`;
    } else {
      grid.innerHTML = filtered.map(createItemCardHTML).join("");
    }
  }
}

function selectCategoryPill(el, cat) {
  selectedCategoryFilter = cat;
  document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
  el.classList.add("active");
  filterCatalog();
}

/* --------------------------------------------------------------------------
   ITEM DETAILS & PRIVACY CLAIM MODAL
   -------------------------------------------------------------------------- */

function ensureDetailsModalExists() {
  if (document.getElementById("itemDetailsModal")) return;

  const modalHtml = `
  <div class="modal fade" id="itemDetailsModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content modal-content-custom">
        <div class="modal-header modal-header-custom d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-2">
            <span id="modal-item-badge" class="item-badge-status position-static">LOST</span>
            <h4 class="modal-title mb-0" id="modal-item-title">Item Details</h4>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body modal-body-custom">
          <div class="row g-4">
            <div class="col-md-5">
              <img id="modal-item-img" src="" alt="Item" class="w-100 rounded-3 border shadow-sm" style="max-height: 280px; object-fit: cover;" />
              <div class="mt-3 p-3 bg-light rounded-3 small">
                <div class="mb-1"><i class="bi bi-tag-fill text-primary me-2"></i><strong>Category:</strong> <span id="modal-item-category">-</span></div>
                <div class="mb-1"><i class="bi bi-geo-alt-fill text-danger me-2"></i><strong>Location:</strong> <span id="modal-item-location">-</span></div>
                <div class="mb-1"><i class="bi bi-calendar3 text-info me-2"></i><strong>Date & Time:</strong> <span id="modal-item-datetime">-</span></div>
                <div id="modal-storage-row" class="mb-1"><i class="bi bi-building-fill text-warning me-2"></i><strong>Custody:</strong> <span id="modal-item-storage">-</span></div>
              </div>
            </div>
            <div class="col-md-7">
              <h5 class="fw-bold mb-2">Item Description</h5>
              <p id="modal-item-desc" class="text-muted small mb-4" style="line-height: 1.7;">-</p>
              <div class="card p-3 mb-3 border-0 bg-light">
                <div class="d-flex align-items-center gap-3">
                  <div class="stat-icon-wrapper icon-blue" style="width:40px; height:40px; font-size:18px;"><i class="bi bi-person-fill"></i></div>
                  <div>
                    <div class="fw-semibold" id="modal-reporter-name">Reported by Campus User</div>
                    <div class="text-muted small" id="modal-reporter-role">Role: Student</div>
                  </div>
                </div>
              </div>

              <!-- Contact Request Section -->
              <div id="modal-contact-section">
                <div id="modal-contact-approved-box" style="display:none;" class="p-3 mb-3 rounded-3 bg-success-subtle border border-success">
                  <div class="fw-bold text-success mb-1"><i class="bi bi-check-circle-fill me-1"></i> Contact Approved!</div>
                  <div class="small text-dark mb-2">The finder has verified ownership and authorized sharing their official college email:</div>
                  <a id="modal-finder-email-link" href="#" class="btn btn-sm btn-success fw-semibold"><i class="bi bi-envelope-paper-fill me-1"></i> Send Official Email</a>
                </div>

                <div id="modal-contact-request-box">
                  <div class="privacy-shield mb-3">
                    <i class="bi bi-shield-check"></i>
                    <div><strong>Privacy Protected:</strong> The reporter's email will be securely disclosed once they verify and approve your request.</div>
                  </div>
                  <div class="mb-2">
                    <label class="form-label-custom small">Verification Message / Identifying Proof</label>
                    <textarea id="modal-request-note" class="form-control form-control-custom" rows="2" placeholder="Describe specific contents, serial number, or markings to prove ownership..."></textarea>
                  </div>
                  <button type="button" class="btn-primary-custom w-100" onclick="submitContactRequestFromModal()">
                    <i class="bi bi-send-fill"></i> Request Contact
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function openItemDetails(itemId) {
  ensureDetailsModalExists();
  currentActiveItemId = itemId;
  const items = getItems();
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  const currentUser = getCurrentUser();
  document.getElementById("modal-item-title").textContent = item.name;
  document.getElementById("modal-item-desc").textContent = item.description;
  document.getElementById("modal-item-category").textContent = item.category;
  document.getElementById("modal-item-location").textContent = item.location;
  document.getElementById("modal-item-datetime").textContent = `${item.date} ${item.time || ''}`;

  const storageRow = document.getElementById("modal-storage-row");
  if (item.storage) {
    storageRow.style.display = "block";
    document.getElementById("modal-item-storage").textContent = item.storage;
  } else {
    storageRow.style.display = "none";
  }

  document.getElementById("modal-item-img").src = item.image || CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES["Others"];
  const badgeEl = document.getElementById("modal-item-badge");
  badgeEl.className = `item-badge-status position-static ${item.status === 'lost' ? 'badge-lost' : item.status === 'found' ? 'badge-found' : item.status === 'returned' ? 'badge-returned' : 'badge-requested'}`;
  badgeEl.textContent = item.status === "returned" ? "RETURNED" : item.status.toUpperCase();

  document.getElementById("modal-reporter-name").textContent = `Reported by ${item.reportedBy?.name || 'Campus User'}`;
  document.getElementById("modal-reporter-role").textContent = `Role: ${item.reportedBy?.role || 'Campus User'} (${item.reportedBy?.department || 'VIT Campus'})`;

  const requestBox = document.getElementById("modal-contact-request-box");
  const approvedBox = document.getElementById("modal-contact-approved-box");
  const emailLink = document.getElementById("modal-finder-email-link");

  const isReporter = currentUser && item.reportedBy?.email?.toLowerCase() === currentUser.email?.toLowerCase();
  const myApproved = (item.contactRequests || []).find(r => r.requesterEmail?.toLowerCase() === currentUser?.email?.toLowerCase() && r.status === "approved");

  if (myApproved || isReporter || item.status === "approved") {
    requestBox.style.display = "none";
    approvedBox.style.display = "block";
    const email = isReporter ? (item.claimedBy || "Authorized Contact") : item.reportedBy?.email;
    emailLink.href = `mailto:${email}?subject=Regarding Lost & Found Item: ${encodeURIComponent(item.name)}`;
    emailLink.innerHTML = `<i class="bi bi-envelope-paper-fill me-1"></i> Mail: ${email}`;
  } else {
    approvedBox.style.display = "none";
    requestBox.style.display = "block";
  }

  const modalEl = document.getElementById("itemDetailsModal");
  detailsModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
  detailsModalInstance.show();
}

function submitContactRequestFromModal() {
  if (!currentActiveItemId) return;
  const items = getItems();
  const item = items.find(i => i.id === currentActiveItemId);
  if (!item) return;

  const user = getCurrentUser();
  if (!user || !user.email) {
    showToast("Please sign in with your college email to request contact.", "warning");
    window.location.href = "login.html";
    return;
  }

  if (item.reportedBy?.email?.toLowerCase() === user.email?.toLowerCase()) {
    showToast("You reported this item!", "warning");
    return;
  }

  const noteInput = document.getElementById("modal-request-note");
  const note = noteInput ? noteInput.value.trim() : "";
  if (!note) {
    alert("Please enter a note or proof of ownership.");
    return;
  }

  if (!item.contactRequests) item.contactRequests = [];
  const exists = item.contactRequests.find(r => r.requesterEmail?.toLowerCase() === user.email?.toLowerCase());
  if (exists) {
    showToast("You have already sent a request for this item.", "warning");
    if (detailsModalInstance) detailsModalInstance.hide();
    return;
  }

  item.contactRequests.push({
    requestId: "req-" + Date.now(),
    requesterEmail: user.email,
    requesterName: user.name,
    message: note,
    timestamp: "Just now",
    status: "pending"
  });
  if (item.status !== "returned") item.status = "requested";
  saveItems(items);

  // Sync with backend API if available
  fetch(`${API_BASE}/items/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: item.id, requesterEmail: user.email, requesterName: user.name, message: note })
  }).catch(() => {});

  showToast("Contact request sent! The reporter will review your message.", "success");
  if (detailsModalInstance) detailsModalInstance.hide();
  if (noteInput) noteInput.value = "";
  updateUserInterface();
  if (window.location.pathname.includes("search.html")) filterCatalog();
}

/* --------------------------------------------------------------------------
   FORM HANDLERS (REPORT LOST & REPORT FOUND)
   -------------------------------------------------------------------------- */

function handleReportLost(e) {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user || !user.email) {
    showToast("Please log in with your college email first.", "warning");
    window.location.href = "login.html";
    return;
  }

  const name = document.getElementById("lost-item-name").value.trim();
  const category = document.getElementById("lost-item-category").value;
  const desc = document.getElementById("lost-item-desc").value.trim();
  const date = document.getElementById("lost-item-date").value;
  const location = document.getElementById("lost-item-location").value;
  const previewImg = document.getElementById("lost-image-preview")?.src || "";

  const newItem = {
    id: "item-" + Date.now(),
    name,
    type: "lost",
    category,
    description: desc,
    date,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    location,
    storage: "With Me",
    status: "lost",
    image: previewImg && !previewImg.endsWith(window.location.host) && previewImg !== window.location.href ? previewImg : CATEGORY_IMAGES[category] || CATEGORY_IMAGES["Others"],
    reportedBy: { name: user.name, email: user.email, role: user.role, regNo: user.idNumber, department: user.department },
    contactRequests: []
  };

  const items = getItems();
  items.unshift(newItem);
  saveItems(items);

  // Sync with backend API if available
  fetch(`${API_BASE}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newItem)
  }).catch(() => {});

  sessionStorage.setItem("flash_toast", JSON.stringify({ message: "Lost item report submitted successfully!", type: "success" }));
  window.location.href = "search.html";
}

function handleReportFound(e) {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user || !user.email) {
    showToast("Please log in with your college email first.", "warning");
    window.location.href = "login.html";
    return;
  }

  const name = document.getElementById("found-item-name").value.trim();
  const category = document.getElementById("found-item-category").value;
  const desc = document.getElementById("found-item-desc").value.trim();
  const date = document.getElementById("found-item-date").value;
  const location = document.getElementById("found-item-location").value;
  const storage = document.querySelector("input[name='storage-location']:checked")?.value || "Security Office";
  const previewImg = document.getElementById("found-image-preview")?.src || "";

  const newItem = {
    id: "item-" + Date.now(),
    name,
    type: "found",
    category,
    description: desc,
    date,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    location,
    storage,
    status: "found",
    image: previewImg && !previewImg.endsWith(window.location.host) && previewImg !== window.location.href ? previewImg : CATEGORY_IMAGES[category] || CATEGORY_IMAGES["Others"],
    reportedBy: { name: user.name, email: user.email, role: user.role, regNo: user.idNumber, department: user.department },
    contactRequests: []
  };

  const items = getItems();
  items.unshift(newItem);
  saveItems(items);

  // Sync with backend API if available
  fetch(`${API_BASE}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newItem)
  }).catch(() => {});

  sessionStorage.setItem("flash_toast", JSON.stringify({ message: "Found item successfully registered!", type: "success" }));
  window.location.href = "search.html";
}

function handleImagePreview(event, previewImgId) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById(previewImgId);
      if (preview) preview.src = e.target.result;
      const container = document.getElementById(`${previewImgId}-container`);
      if (container) container.style.display = "block";
    };
    reader.readAsDataURL(file);
  }
}

function clearImagePreview(inputId, containerId) {
  const input = document.getElementById(inputId);
  if (input) input.value = "";
  const container = document.getElementById(containerId);
  if (container) container.style.display = "none";
}

/* --------------------------------------------------------------------------
   APPROVALS & NOTIFICATIONS HUB
   -------------------------------------------------------------------------- */

function renderNotificationsScreen() {
  const user = getCurrentUser();
  const container = document.getElementById("incoming-requests-list");
  const general = document.getElementById("general-notifications-list");
  if (!container) return;

  if (!user || !user.email) {
    container.innerHTML = '<div class="text-center py-4 text-muted">Please log in to view your notifications.</div>';
    return;
  }

  const items = getItems();
  const myItems = items.filter(i => i.reportedBy?.email?.toLowerCase() === user.email?.toLowerCase() && i.contactRequests?.length > 0);

  let html = "";
  let count = 0;

  myItems.forEach(item => {
    (item.contactRequests || []).forEach(req => {
      count++;
      const isApproved = req.status === "approved";
      const isRejected = req.status === "rejected";

      html += `
        <div class="notification-card p-3 mb-3 border rounded-3 ${isApproved ? 'border-success bg-light' : 'bg-white'}">
          <div class="d-flex justify-content-between align-items-start w-100 flex-wrap gap-2">
            <div>
              <div class="d-flex align-items-center gap-2 mb-1">
                <span class="badge ${item.type === 'lost' ? 'bg-warning text-dark' : 'bg-primary'}">${item.type.toUpperCase()}</span>
                <strong>${escapeHtml(item.name)}</strong>
              </div>
              <div class="small text-muted mb-2">
                <i class="bi bi-person-circle text-primary me-1"></i> <strong>${escapeHtml(req.requesterName)}</strong> (${escapeHtml(req.requesterEmail)}) &bull; ${req.timestamp}
              </div>
              <p class="small bg-light p-2 rounded-2 mb-2 border"><em>"${escapeHtml(req.message)}"</em></p>
              ${isApproved ? `<div class="text-success small fw-semibold"><i class="bi bi-check-circle-fill me-1"></i> Contact Approved! Coordinate return with verified college email: <strong>${escapeHtml(req.requesterEmail)}</strong></div>` : ''}
              ${isRejected ? `<div class="text-danger small fw-semibold"><i class="bi bi-x-circle-fill me-1"></i> Request declined.</div>` : ''}
            </div>
            <div class="d-flex align-items-center gap-2">
              ${!isApproved && !isRejected ? `
                <button class="btn btn-sm btn-success rounded-pill px-3" onclick="handleApproveRequest('${item.id}', '${req.requestId}')"><i class="bi bi-check-lg"></i> Approve</button>
                <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="handleRejectRequest('${item.id}', '${req.requestId}')"><i class="bi bi-x-lg"></i> Reject</button>
              ` : isApproved && item.status !== "returned" ? `
                <button class="btn btn-sm btn-primary rounded-pill px-3" onclick="handleMarkReturned('${item.id}')"><i class="bi bi-patch-check"></i> Mark as Returned</button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    });
  });

  container.innerHTML = count ? html : '<div class="text-center py-4 text-muted small"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No contact requests pending for your items.</div>';

  if (general) {
    general.innerHTML = `
      <div class="notification-card">
        <div class="stat-icon-wrapper icon-blue" style="width:38px; height:38px; font-size:16px;"><i class="bi bi-shield-check"></i></div>
        <div class="flex-grow-1">
          <h6 class="mb-1 fw-bold">Verified Institutional Network</h6>
          <p class="small text-muted mb-0">All contact requests are protected. Requesters must hold verified @vitstudent.ac.in or @vit.ac.in credentials.</p>
        </div>
      </div>
    `;
  }
}

function handleApproveRequest(itemId, reqId) {
  const items = getItems();
  const item = items.find(i => i.id === itemId);
  if (!item) return;
  const req = (item.contactRequests || []).find(r => r.requestId === reqId);
  if (req) {
    req.status = "approved";
    item.status = "approved";
    item.claimedBy = req.requesterEmail;
    saveItems(items);

    fetch(`${API_BASE}/items/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, requestId: reqId })
    }).catch(() => {});

    showToast("Contact request approved! The requester has received your verified email.", "success");
    renderNotificationsScreen();
    updateCounts();
    updateUserInterface();
  }
}

function handleRejectRequest(itemId, reqId) {
  const items = getItems();
  const item = items.find(i => i.id === itemId);
  if (!item) return;
  const req = (item.contactRequests || []).find(r => r.requestId === reqId);
  if (req) {
    req.status = "rejected";
    saveItems(items);

    fetch(`${API_BASE}/items/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, requestId: reqId })
    }).catch(() => {});

    showToast("Contact request declined.", "info");
    renderNotificationsScreen();
    updateCounts();
  }
}

function handleMarkReturned(itemId) {
  const items = getItems();
  const item = items.find(i => i.id === itemId);
  if (item) {
    item.status = "returned";
    saveItems(items);

    fetch(`${API_BASE}/items/returned`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId })
    }).catch(() => {});

    showToast("Item successfully marked as Returned and Recovered!", "success");
    renderNotificationsScreen();
    updateCounts();
  }
}

/* --------------------------------------------------------------------------
   USER PROFILE & TABBED TRACKER
   -------------------------------------------------------------------------- */

function renderProfileScreen() {
  const user = getCurrentUser();
  if (!user || !user.email) return;

  const nameEl = document.getElementById("profile-name");
  const roleBadgeEl = document.getElementById("profile-role-badge");
  const emailEl = document.getElementById("profile-email");
  const idEl = document.getElementById("profile-id");
  const deptEl = document.getElementById("profile-dept");
  const yearEl = document.getElementById("profile-year");
  const avatarEl = document.getElementById("profile-avatar");

  if (nameEl) nameEl.textContent = user.name;
  if (roleBadgeEl) roleBadgeEl.textContent = user.role;
  if (emailEl) emailEl.innerHTML = `<i class="bi bi-envelope me-1"></i> ${user.email}`;
  if (idEl) idEl.textContent = user.idNumber || "-";
  if (deptEl) deptEl.textContent = user.department || "-";
  if (yearEl) yearEl.textContent = user.year || "-";
  if (avatarEl && user.avatar) avatarEl.src = user.avatar;

  switchProfileTab("my-lost");
}

function switchProfileTab(tab, eventObj) {
  const user = getCurrentUser();
  const container = document.getElementById("profile-tab-content");
  if (!container || !user) return;

  document.querySelectorAll("#profile-tabs .nav-link").forEach(b => b.classList.remove("active"));
  if (eventObj && eventObj.target) {
    eventObj.target.classList.add("active");
  } else {
    const defaultBtn = document.querySelector(`#profile-tabs button[data-tab='${tab}']`);
    if (defaultBtn) defaultBtn.classList.add("active");
  }

  const items = getItems();
  if (tab === "my-lost") {
    const lost = items.filter(i => i.type === "lost" && i.reportedBy?.email?.toLowerCase() === user.email?.toLowerCase());
    container.innerHTML = lost.length ? `<div class="row g-3">${lost.map(createItemCardHTML).join("")}</div>` : '<div class="text-center py-4 text-muted small">No lost items reported by you yet.</div>';
  } else if (tab === "my-found") {
    const found = items.filter(i => i.type === "found" && i.reportedBy?.email?.toLowerCase() === user.email?.toLowerCase());
    container.innerHTML = found.length ? `<div class="row g-3">${found.map(createItemCardHTML).join("")}</div>` : '<div class="text-center py-4 text-muted small">No found items registered by you yet.</div>';
  } else if (tab === "my-requests") {
    const requested = [];
    items.forEach(i => {
      const r = (i.contactRequests || []).find(req => req.requesterEmail?.toLowerCase() === user.email?.toLowerCase());
      if (r) requested.push({ item: i, req: r });
    });
    container.innerHTML = requested.length ? requested.map(({ item, req }) => `
      <div class="card-custom p-3 mb-3 border">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <div class="small text-muted">Finder: ${escapeHtml(item.reportedBy?.name)} &bull; Status: <span class="badge ${req.status === 'approved' ? 'bg-success' : 'bg-warning text-dark'}">${req.status.toUpperCase()}</span></div>
            <div class="small bg-light p-2 rounded mt-1"><em>"${escapeHtml(req.message)}"</em></div>
          </div>
          <div>
            ${req.status === 'approved' ? `<a href="mailto:${item.reportedBy?.email}" class="btn btn-sm btn-success rounded-pill px-3"><i class="bi bi-envelope-fill me-1"></i> Mail: ${item.reportedBy?.email}</a>` : '<span class="text-muted small"><i class="bi bi-hourglass-split me-1"></i> Awaiting Finder Approval</span>'}
          </div>
        </div>
      </div>
    `).join("") : '<div class="text-center py-4 text-muted small">You have not submitted contact requests on any items.</div>';
  }
}

/* --------------------------------------------------------------------------
   COLLEGE AUTHENTICATION & LOGIN/REGISTER FORMS
   -------------------------------------------------------------------------- */

function setFormAlert(alertId, message, type = "danger") {
  const alertEl = document.getElementById(alertId);
  if (alertEl) {
    alertEl.className = `form-inline-alert alert-${type}`;
    alertEl.innerHTML = `<i class="bi ${type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'} me-2"></i><span>${escapeHtml(message)}</span>`;
    alertEl.style.display = "flex";
  } else {
    showToast(message, type);
  }
}

function handleLoginForm(e) {
  e.preventDefault();
  const emailInput = document.getElementById("login-email");
  const passInput = document.getElementById("login-password");
  const email = emailInput ? emailInput.value.trim() : "";
  const password = passInput ? passInput.value : "";

  if (!email || !password) {
    setFormAlert("login-alert", "Please enter both your official VIT email and password.");
    return;
  }

  // Enforce institutional VIT email (@vitstudent.ac.in or @vit.ac.in)
  if (!isVitEmail(email)) {
    setFormAlert("login-alert", "Access Restricted: Only official VIT email addresses (@vitstudent.ac.in or @vit.ac.in) are permitted.");
    return;
  }

  // Disallow trivial/weak passwords like '123'
  if (password.length < 8) {
    setFormAlert("login-alert", "Security Requirement: Password must be at least 8 characters long with uppercase, lowercase, numbers, and symbols.");
    return;
  }

  // Check registered users or demo users pool
  const registeredUsers = getRegisteredUsers();
  let user = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    // Automatically infer user role & name from email
    let inferredRole = "Student";
    const lower = email.toLowerCase();
    if (lower.includes("security")) inferredRole = "Security Staff";
    else if (lower.includes("admin")) inferredRole = "Administrator";
    else if (lower.includes("dr.") || (lower.endsWith(".ac.in") && !lower.includes("student"))) inferredRole = "Faculty";

    // Format a clean name from the email
    const rawName = email.split("@")[0].replace(/[\._\-]/g, " ");
    const formattedName = rawName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

    user = {
      id: "usr-" + Date.now(),
      name: formattedName || "Campus Member",
      email: email,
      role: inferredRole,
      idNumber: inferredRole === "Student" ? "23MIS" + Math.floor(1000 + Math.random() * 9000) : "EMP-" + Math.floor(10000 + Math.random() * 90000),
      department: inferredRole === "Student" ? "Software Engineering" : "School of Computing",
      year: inferredRole === "Student" ? "3rd Year" : "Faculty / Staff",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80"
    };

    registeredUsers.push(user);
    saveRegisteredUsers(registeredUsers);
  }

  setCurrentUser(user);

  // Sync login with backend API if running
  fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  }).catch(() => {});

  sessionStorage.setItem("flash_toast", JSON.stringify({ message: `Welcome back, ${user.name}!`, type: "success" }));

  // Check redirect URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const redirectPage = urlParams.get("redirect") || "dashboard.html";
  window.location.href = redirectPage;
}

function handleRegisterForm(e) {
  e.preventDefault();
  const name = document.getElementById("reg-name").value.trim();
  const role = document.getElementById("reg-role").value;
  const idNumber = document.getElementById("reg-id").value.trim();
  const department = document.getElementById("reg-dept").value.trim();
  const year = document.getElementById("reg-year") ? document.getElementById("reg-year").value : "Student";
  const email = document.getElementById("reg-email").value.trim();
  const pass = document.getElementById("reg-pass").value;
  const passConfirm = document.getElementById("reg-pass-confirm").value;

  // Enforce institutional VIT email
  if (!isVitEmail(email)) {
    setFormAlert("register-alert", "Access Restricted: Registration strictly requires an official VIT email address (@vitstudent.ac.in or @vit.ac.in).");
    return;
  }

  // Enforce password combination rules (uppercase, lowercase, number, symbol, 8+ chars)
  const pwdValidation = validatePasswordComplexity(pass);
  if (!pwdValidation.isValid) {
    setFormAlert("register-alert", pwdValidation.message);
    return;
  }

  if (pass !== passConfirm) {
    setFormAlert("register-alert", "Passwords do not match. Please verify.");
    return;
  }

  const newUser = {
    id: "usr-" + Date.now(),
    name,
    role,
    idNumber,
    department,
    year,
    email,
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80"
  };

  // Add to local registered users
  const users = getRegisteredUsers();
  users.push(newUser);
  saveRegisteredUsers(users);

  // Auto-login newly registered user
  setCurrentUser(newUser);

  // Sync registration with backend API if running
  fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, role, idNumber, department, year, email, password: pass })
  }).catch(() => {});

  sessionStorage.setItem("flash_toast", JSON.stringify({ message: `College account created! Signed in as ${name}.`, type: "success" }));
  window.location.href = "dashboard.html";
}

function handleLogout() {
  setCurrentUser(null);
  sessionStorage.setItem("flash_toast", JSON.stringify({ message: "You have successfully signed out.", type: "info" }));
  window.location.href = "login.html";
}

function handleResetData() {
  if (confirm("Reset real-time items to 0?")) {
    localStorage.setItem("campus_lf_items", JSON.stringify([]));
    fetch(`${API_BASE}/reset`, { method: "POST" }).catch(() => {});
    showToast("All items reset to 0.", "success");
    setTimeout(() => window.location.reload(), 300);
  }
}

/* --------------------------------------------------------------------------
   DASHBOARD SCREEN RENDERER
   -------------------------------------------------------------------------- */

function renderDashboardScreen() {
  const user = getCurrentUser();
  if (!user || !user.email) return;

  const nameEl = document.getElementById("dash-user-name");
  const dateEl = document.getElementById("dash-today-date");
  const myReportsEl = document.getElementById("dash-my-reports-count");
  const myPendingEl = document.getElementById("dash-my-pending-claims");

  if (nameEl) nameEl.textContent = user.name;
  if (dateEl) {
    const today = new Date();
    dateEl.textContent = today.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  const items = getItems();
  const myItems = items.filter(i => i.reportedBy?.email?.toLowerCase() === user.email?.toLowerCase());
  let pendingCount = 0;
  myItems.forEach(i => {
    pendingCount += (i.contactRequests || []).filter(r => r.status === "pending").length;
  });

  if (myReportsEl) myReportsEl.textContent = myItems.length;
  if (myPendingEl) myPendingEl.textContent = pendingCount;

  updateCounts();
  renderRecentItems("dashboard-recent-items", 6);
}

/* --------------------------------------------------------------------------
   TOAST NOTIFICATION SYSTEM
   -------------------------------------------------------------------------- */

function ensureToastExists() {
  if (document.getElementById("actionToast")) return;
  const toastHtml = `
  <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1100;">
    <div id="actionToast" class="toast align-items-center text-white bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body" id="toast-message">Action completed successfully!</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML("beforeend", toastHtml);
}

function showToast(message, type = "primary") {
  ensureToastExists();
  const toastEl = document.getElementById("actionToast");
  const bodyEl = document.getElementById("toast-message");
  if (!toastEl || !bodyEl) return;
  toastEl.className = `toast align-items-center text-white bg-${type === 'danger' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning text-dark' : type === 'info' ? 'info text-dark' : 'primary'} border-0`;
  bodyEl.textContent = message;
  const toastInstance = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 });
  toastInstance.show();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* --------------------------------------------------------------------------
   BOOTSTRAP & AUTO INITIALIZATION
   -------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  initDataStore();

  // Enforce College Email Auth Guard on protected pages
  if (!requireAuth()) return;

  updateUserInterface();
  ensureDetailsModalExists();
  ensureToastExists();

  // Highlight Active Navigation Link
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-link-custom").forEach(link => {
    const href = link.getAttribute("href");
    if (href && href.includes(currentPath) && currentPath !== "") {
      link.classList.add("active");
    } else if ((currentPath === "" || currentPath === "index.html") && href === "index.html") {
      link.classList.add("active");
    }
  });

  // Default dates for report forms
  const todayStr = new Date().toISOString().split("T")[0];
  const lostDate = document.getElementById("lost-item-date");
  const foundDate = document.getElementById("found-item-date");
  if (lostDate) lostDate.value = todayStr;
  if (foundDate) foundDate.value = todayStr;

  // Check Flash Toast from navigation redirects
  const flashToast = sessionStorage.getItem("flash_toast");
  if (flashToast) {
    try {
      const data = JSON.parse(flashToast);
      showToast(data.message, data.type);
    } catch (e) {}
    sessionStorage.removeItem("flash_toast");
  }

  // Page specific automatic boots
  if (document.getElementById("landing-recent-items")) {
    updateCounts();
    renderRecentItems("landing-recent-items", 6);
  }
  if (document.getElementById("dashboard-recent-items") || document.getElementById("dash-user-name")) {
    renderDashboardScreen();
  }
  if (document.getElementById("catalog-items-grid")) {
    filterCatalog();
  }
  if (document.getElementById("incoming-requests-list")) {
    renderNotificationsScreen();
  }
  if (document.getElementById("profile-tab-content")) {
    renderProfileScreen();
  }
});
