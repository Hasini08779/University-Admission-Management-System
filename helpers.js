// ===== SHARED UTILITIES & HELPERS =====

const API_URL = "http://localhost:5001";
const COURSES = [
  { name: "AI & Machine Learning", desc: "Learn AI/ML algorithms and deep learning concepts.", icon: "🤖" },
  { name: "Cyber Security", desc: "Protect networks and data from threats.", icon: "🔐" },
  { name: "Electronics & Communication (ECE)", desc: "Signals, circuits, and communication systems.", icon: "⚡" },
  { name: "Information Technology (IT)", desc: "Software, networks, and IT systems.", icon: "💻" },
  { name: "Computer Science (CSE)", desc: "Programming, algorithms, and systems design.", icon: "🖥️" },
  { name: "Data Science", desc: "Analyze and interpret big data.", icon: "📊" },
  { name: "Blockchain Technology", desc: "Learn decentralized and secure systems.", icon: "⛓️" },
  { name: "Robotics", desc: "Build and program advanced robots.", icon: "🤖" }
];

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = "info", duration = 3000) {
  const notification = document.createElement("div");
  notification.className = `notification alert-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; min-width: 300px;
    padding: 15px 20px; border-radius: 8px; color: white; z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2); animation: slideIn 0.3s ease;
  `;

  const style = document.createElement("style");
  if (!document.querySelector("style[data-notification]")) {
    style.setAttribute("data-notification", "true");
    style.textContent = `
      @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      .alert-success { background: #28a745; }
      .alert-error { background: #dc3545; }
      .alert-warning { background: #ffc107; color: #333; }
      .alert-info { background: #17a2b8; }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), duration);
}

// ===== FORM VALIDATION =====
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  const hasLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*]/.test(password);
  
  return {
    valid: hasLength && hasUppercase && hasNumber && hasSymbol,
    hasLength,
    hasUppercase,
    hasNumber,
    hasSymbol
  };
}

function validatePhone(phone) {
  return /^[0-9]{10}$/.test(phone.replace(/\D/g, ""));
}

// ===== API CALLS =====
async function apiCall(endpoint, method = "GET", data = null) {
  try {
    const token = localStorage.getItem('token');
    const options = {
      method,
      headers: { "Content-Type": "application/json" }
    };
    
    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }
    
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(API_URL + endpoint, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "API Error");
    }
    return result;
  } catch (error) {
    throw error;
  }
}

async function registerUser(userData) {
  const response = await apiCall("/auth/register", "POST", userData);
  return response;
}

async function loginUser(email, password) {
  const response = await apiCall("/auth/login", "POST", { email, password });
  if (response.token) {
    localStorage.setItem('token', response.token);
    localStorage.setItem('currentUser', JSON.stringify(response.user));
  }
  return response;
}

async function logoutUser() {
  try {
    await apiCall("/auth/logout", "POST");
  } catch (error) {
    console.error('Logout API error:', error);
  }
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('currentAdmin');
}

async function getCurrentUserProfile() {
  return apiCall("/auth/profile", "GET");
}

async function updateUserCourse(courseId) {
  return apiCall("/students/course", "PUT", { courseId });
}

async function updateUserRegistration(data) {
  return apiCall("/students/registration", "PUT", data);
}

async function getAllUsers() {
  return apiCall("/students", "GET");
}

async function getCourses() {
  return apiCall("/courses", "GET");
}

async function getStats() {
  return apiCall("/admin/analytics", "GET");
}

// ===== LOCAL STORAGE HELPERS =====
function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function getCurrentUser() {
  const user = localStorage.getItem("currentUser");
  return user ? JSON.parse(user) : null;
}

function setCurrentAdmin(admin) {
  localStorage.setItem("currentAdmin", JSON.stringify(admin));
}

function getCurrentAdmin() {
  const admin = localStorage.getItem("currentAdmin");
  return admin ? JSON.parse(admin) : null;
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem("currentUser");
  localStorage.removeItem("currentAdmin");
}

// ===== DOCUMENT UPLOAD HANDLER =====
function handleFileUpload(fileInputId, maxSize = 5 * 1024 * 1024) {
  const fileInput = document.getElementById(fileInputId);
  const file = fileInput.files[0];

  if (!file) {
    showNotification("Please select a file", "warning");
    return null;
  }

  if (file.size > maxSize) {
    showNotification("File size exceeds " + (maxSize / (1024 * 1024)) + "MB", "error");
    return null;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data: e.target.result
      });
    };
    reader.readAsDataURL(file);
  });
}

// ===== PASSWORD STRENGTH METER =====
function createPasswordStrengthMeter(inputId, meterId) {
  const input = document.getElementById(inputId);
  const meter = document.getElementById(meterId);

  if (!input || !meter) return;

  input.addEventListener("input", function() {
    const validation = validatePassword(this.value);
    let strength = 0;

    if (validation.hasLength) strength += 25;
    if (validation.hasUppercase) strength += 25;
    if (validation.hasNumber) strength += 25;
    if (validation.hasSymbol) strength += 25;

    meter.style.width = strength + "%";
    meter.className = 
      strength < 25 ? "strength-weak" :
      strength < 50 ? "strength-fair" :
      strength < 75 ? "strength-good" :
      "strength-strong";
  });
}

// ===== LOADING STATE =====
function setLoading(buttonId, isLoading) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = "⏳ Loading...";
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || "Submit";
  }
}

// ===== TABLE GENERATION =====
function generateTable(data, columns) {
  if (!data || data.length === 0) {
    return "<p style='text-align:center; color:#999;'>No data available</p>";
  }

  let 
  
  html = "<table><thead><tr>";
  columns.forEach(col => html += `<th>${col}</th>`);
  html += "</tr></thead><tbody>";

  data.forEach(row => {
    html += "<tr>";
    columns.forEach(col => {
      const value = col.includes(".") ? 
        col.split(".").reduce((a, b) => a[b], row) : 
        row[col];
      html += `<td>${value || "-"}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  return html;
}

// ===== EXPORT DATA =====
function exportToCSV(data, filename = "export.csv") {
  if (!data || data.length === 0) {
    showNotification("No data to export", "warning");
    return;
  }

  const headers = Object.keys(data[0]);
  let csv = headers.join(",") + "\n";

  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === "string" && value.includes(",") ? 
        `"${value}"` : 
        value;
    });
    csv += values.join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

// ===== REDIRECT HELPERS =====
function redirectToLogin() {
  window.location.href = "login.html";
}

function redirectToAdminLogin() {
  window.location.href = "admin-login.html";
}

function redirectToDashboard() {
  window.location.href = "dashboard.html";
}

function redirectToAdminPanel() {
  window.location.href = "admin.html";
}

// ===== AUTHENTICATION CHECK =====
function checkUserAuth() {
  if (!getCurrentUser()) {
    showNotification("Please login first", "warning");
    setTimeout(redirectToLogin, 1500);
    return false;
  }
  return true;
}

function checkAdminAuth() {
  if (!getCurrentAdmin()) {
    showNotification("Admin access required", "error");
    setTimeout(redirectToAdminLogin, 1500);
    return false;
  }
  return true;
}

// ===== DATE FORMATTER =====
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "short", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ===== STATUS BADGE =====
function getStatusBadge(status) {
  const statusMap = {
    "Pending": { emoji: "⏳", color: "#ffc107", bg: "#fff3cd" },
    "Approved": { emoji: "✅", color: "#28a745", bg: "#d4edda" },
    "Rejected": { emoji: "❌", color: "#dc3545", bg: "#f8d7da" }
  };
  
  const info = statusMap[status] || statusMap["Pending"];
  return `<span style="background:${info.bg}; color:${info.color}; padding:5px 10px; border-radius:5px; font-weight:bold;">${info.emoji} ${status}</span>`;
}

// ===== SETTINGS FUNCTIONS =====
function saveUserSettings() {
  if (typeof user === 'undefined') return;
  localStorage.setItem("currentUser", JSON.stringify(user));
  showNotification("Settings updated successfully ✅", "success");
}

function toggleDarkMode() {
  const checkbox = document.getElementById('darkMode');
  if (!checkbox) return;
  user.settings.appearance.darkMode = checkbox.checked;
  document.body.classList.toggle('dark-mode', user.settings.appearance.darkMode);
  saveUserSettings();
}

function changeThemeColor() {
  const select = document.getElementById('themeColor');
  if (!select) return;
  user.settings.appearance.themeColor = select.value;
  document.body.className = document.body.className.replace(/theme-\w+/, '') + ' theme-' + select.value;
  saveUserSettings();
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function openContactModal() { openModal('contactModal'); }
function openReportIssueModal() { openModal('reportIssueModal'); }
function openVersionModal() { openModal('versionModal'); }
function openTermsModal() { openModal('termsModal'); }

