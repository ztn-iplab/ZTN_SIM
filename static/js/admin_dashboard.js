console.log("Admin Dashboard JS loaded");

// ---------------------------
// Inactivity Timeout Logic
// ---------------------------
const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes in milliseconds
let lastActivityTime = Date.now();
["mousemove", "keydown", "click", "scroll"].forEach((evt) =>
  document.addEventListener(evt, () => {
    lastActivityTime = Date.now();
  })
);
setInterval(() => {
  if (Date.now() - lastActivityTime > INACTIVITY_LIMIT) {
    alert("You've been inactive. Logging out.");
    fetch("/api/auth/logout", { method: "POST" }).then(() => {
      window.location.href = "/api/auth/login_form";
    });
  }
}, 60000);

// ---------------------------
// Admin Section Toggle
// ---------------------------
document.addEventListener("DOMContentLoaded", function () {
  const sectionMap = {
    "show-user-management": "user-management",
    "show-flagged-transactions": "flagged-transactions-section",
    "show-real-time-logs": "real-time-logs",
    "show-user-auth-logs": "user-auth-logs",
    "show-fund-agent": "fund-agent-section",
    "show-all-transactions": "all-transactions-section",
  };

  Object.entries(sectionMap).forEach(([menuId, sectionId]) => {
    document.getElementById(menuId)?.addEventListener("click", () => {
      document
        .querySelectorAll(".admin-section")
        .forEach((s) => (s.style.display = "none"));
      document.getElementById(sectionId).style.display = "block";

      if (sectionId === "fund-agent-section") {
        fetchHqBalance();
        fetchFloatHistory();
        bindFundAgentForm();
      }

      if (sectionId === "flagged-transactions-section") {
        loadFlaggedTransactions();
      }

      if (sectionId === "real-time-logs") {
        loadRealTimeLogs();
      }

      if (sectionId === "user-auth-logs") {
        loadUserAuthLogs();
      }
    });
  });

  document
    .querySelectorAll(".admin-section")
    .forEach((s) => (s.style.display = "none"));
  document.getElementById("admin-welcome").style.display = "block";

  // ---------------------------
  // Admin Metrics Section
  // ---------------------------
  // ---------------------------
  // Admin Metrics Section
  // ---------------------------
  (async () => {
    const loginChart = document.getElementById("login-method-chart");
    const authFailuresChart = document.getElementById("auth-failures-chart");
    const transactionTypeChart = document.getElementById("transaction-type-chart");
    const flaggedChart = document.getElementById("flagged-transactions-chart");
    const heatmapContainer = document.getElementById("heatmap-container");

    let loginChartInstance, authFailuresInstance, transactionTypeInstance, flaggedInstance;

    const dateControls = document.createElement("div");
    dateControls.className = "d-flex gap-2 align-items-center mt-2 mb-3";
    dateControls.innerHTML = `
      <input type="text" id="daterange" class="form-control form-control-sm" style="max-width: 250px;" placeholder="Select date range">
      <button id="filter-date" class="btn btn-sm btn-outline-primary">🔍 Apply Filter</button>
    `;
    document.querySelector("#dashboard-metrics")?.prepend(dateControls);

    setTimeout(() => {
      if (window.flatpickr && document.getElementById("daterange")) {
        flatpickr("#daterange", {
          mode: "range",
          dateFormat: "Y-m-d",
          onClose: function (selectedDates, dateStr) {
            const range = dateStr.split(" to ");
            const from = range[0]?.trim() || null;
            const to = range[1]?.trim() || null;
            loadMetrics(from, to);
          }
        });
      }
    }, 100);

    const kpiContainer = document.createElement("div");
    kpiContainer.className = "row mb-4";
    document.querySelector("#dashboard-metrics")?.prepend(kpiContainer);

    function updateKPIs(data) {
      kpiContainer.innerHTML = `
        <div class="col-md-3">
          <div class="card text-white bg-primary mb-3 text-center">
            <div class="card-body">
              <h5 class="card-title">Total Logins</h5>
              <p class="card-text fs-4">${
                data.login_methods.password +
                data.login_methods.totp +
                data.login_methods.webauthn
              }</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-white bg-danger mb-3 text-center">
            <div class="card-body">
              <h5 class="card-title">Failed Logins (7d)</h5>
              <p class="card-text fs-4">${data.auth_failures.counts.reduce((a, b) => a + b, 0)}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-white bg-warning mb-3 text-center">
            <div class="card-body">
              <h5 class="card-title">Flagged Txns</h5>
              <p class="card-text fs-4">${data.flagged.flagged}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-white bg-success mb-3 text-center">
            <div class="card-body">
              <h5 class="card-title">Clean Txns</h5>
              <p class="card-text fs-4">${data.flagged.clean}</p>
            </div>
          </div>
        </div>
      `;
    }

    await loadMetrics(
      new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().slice(0, 10),
      new Date().toISOString().slice(0, 10)
    );

    function renderHeatmap(data) {
      if (!heatmapContainer) return;
  
      const locationCounts = {};
      for (const log of data.logs || []) {
        const loc = log.location || "Unknown";
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      }
  
      const entries = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
      heatmapContainer.innerHTML = `
        <h5 class="text-center">🌍 Location Heatmap</h5>
        <ul class="list-group mt-2">
          ${entries
            .map(
              ([loc, count]) => `<li class="list-group-item d-flex justify-content-between align-items-center">
                ${loc}
                <span class="badge bg-danger rounded-pill">${count}</span>
              </li>`
            )
            .join("")}
        </ul>
      `;
    }
  
    function downloadCSV(metrics) {
      const rows = [
        ["Metric", "Value"],
        ["Password Logins", metrics.login_methods.password],
        ["TOTP Logins", metrics.login_methods.totp],
        ["WebAuthn Logins", metrics.login_methods.webauthn],
        ["Total Logins", metrics.login_methods.password + metrics.login_methods.totp + metrics.login_methods.webauthn],
        ["Failed Logins (7d)", metrics.auth_failures.counts.reduce((a, b) => a + b, 0)],
        ["Clean Transactions", metrics.flagged.clean],
        ["Flagged Transactions", metrics.flagged.flagged]
      ];
      const csv = rows.map(row => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin_dashboard_metrics_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  
    async function loadMetrics(from = null, to = null) {
      try {
        const params = new URLSearchParams();
        if (from) params.append("from", from);
        if (to) params.append("to", to);
  
        const res = await fetch(`/api/admin/metrics?${params.toString()}`, {
          method: "GET",
          credentials: "include"
        });
        const data = await res.json();
  
        updateKPIs(data);
        renderHeatmap(data);
  
        [loginChartInstance, authFailuresInstance, transactionTypeInstance, flaggedInstance].forEach(chart => {
          if (chart) chart.destroy();
        });
  
        authFailuresInstance = new Chart(authFailuresChart, {
          type: "line",
          data: {
            labels: data.auth_failures.dates,
            datasets: [{
              label: "Auth Failures",
              data: data.auth_failures.counts,
              fill: false,
              borderColor: "#dc3545",
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                ticks: {
                  autoSkip: true,
                  maxTicksLimit: 10
                }
              }
            }
          }
        });
        
        loginChartInstance = new Chart(loginChart, {
          type: "doughnut",
          data: {
            labels: ["Password", "TOTP", "WebAuthn"],
            datasets: [{
              label: "Login Methods",
              data: [
                data.login_methods.password,
                data.login_methods.totp,
                data.login_methods.webauthn
              ]
            }]
          }
        });
        
        transactionTypeInstance = new Chart(transactionTypeChart, {
          type: "bar",
          data: {
            labels: ["User", "Agent", "Admin"],
            datasets: [{
              label: "Transactions by Actor",
              data: data.transaction_sources,
              backgroundColor: ["#007bff", "#28a745", "#ffc107"]
            }]
          }
        });
        
        flaggedInstance = new Chart(flaggedChart, {
          type: "pie",
          data: {
            labels: ["Clean", "Flagged"],
            datasets: [{
              data: [data.flagged.clean, data.flagged.flagged],
              backgroundColor: ["#6c757d", "#dc3545"]
            }]
          }
        });
        
        if (data.auth_failures.counts.every(count => count === 0)) {
          Toastify({
            text: "No failed logins found in selected date range.",
            duration: 3000,
            backgroundColor: "#6c757d"
          }).showToast();
        }
        
        if (data.login_methods.password + data.login_methods.totp + data.login_methods.webauthn === 0) {
          Toastify({
            text: "No successful logins found in selected date range.",
            duration: 3000,
            backgroundColor: "#6c757d"
          }).showToast();
        }
        
        if (data.transaction_sources.every(v => v === 0)) {
          Toastify({
            text: "No transactions found in selected date range.",
            duration: 3000,
            backgroundColor: "#6c757d"
          }).showToast();
        }
        
        if ((data.flagged.clean + data.flagged.flagged) === 0) {
          Toastify({
            text: "No transactions flagged or clean in selected range.",
            duration: 3000,
            backgroundColor: "#6c757d"
          }).showToast();
        }
        
        exportButton.onclick = () => downloadCSV(data);
      } catch (err) {
        console.error("Failed to load admin metrics:", err);
      }
    }
  
    await loadMetrics();
  
    let autoRefresh = true;
    let refreshInterval = 60000;
  
    const toggleButton = document.createElement("button");
    toggleButton.textContent = "⏸ Pause Auto-Refresh";
    toggleButton.className = "btn btn-sm btn-outline-secondary mt-3 me-2";
    toggleButton.onclick = () => {
      autoRefresh = !autoRefresh;
      toggleButton.textContent = autoRefresh ? "⏸ Pause Auto-Refresh" : "▶️ Resume Auto-Refresh";
    };
  
    const exportButton = document.createElement("button");
    exportButton.textContent = "⬇️ Export Metrics";
    exportButton.className = "btn btn-sm btn-outline-success mt-3 me-2";
  
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "d-flex gap-2";
    controlsDiv.appendChild(toggleButton);
    controlsDiv.appendChild(exportButton);
  
    document.querySelector("#dashboard-metrics")?.prepend(controlsDiv);
  
    setInterval(() => {
      if (autoRefresh) {
        const range = document.getElementById("daterange").value.split(" to ");
        const from = range[0]?.trim() || null;
        const to = range[1]?.trim() || null;
        loadMetrics(from, to);
      }
    }, refreshInterval);
  
    document.getElementById("filter-date").addEventListener("click", () => {
      const range = document.getElementById("daterange").value.split(" to ");
      const from = range[0]?.trim() || null;
      const to = range[1]?.trim() || null;
      loadMetrics(from, to);
    });
  
  })(); 
});

  
function fetchHqBalance() {
  fetch("/admin/hq-balance", { credentials: "include" })
    .then((res) => res.json())
    .then((data) => {
      document.getElementById("hq-balance").innerText =
        data.balance?.toLocaleString() || "0";
    });
}

function fetchFloatHistory() {
  fetch("/admin/float-history", { credentials: "include" })
    .then((res) => res.json())
    .then((data) => {
      const tbody = document.getElementById("float-transfer-history");
      tbody.innerHTML = "";
      if (data.transfers?.length) {
        data.transfers.forEach((tx) => {
          const row = `<tr>
            <td>${new Date(tx.timestamp).toLocaleString()}</td>
            <td>${tx.agent_name}</td>
            <td>${tx.agent_mobile}</td>
            <td>${parseFloat(tx.amount).toLocaleString()} RWF</td>
          </tr>`;
          tbody.innerHTML += row;
        });
      } else {
        tbody.innerHTML =
          '<tr><td colspan="4" class="text-center">No transfers yet.</td></tr>';
      }
    });
}

function bindFundAgentForm() {
  const fundForm = document.getElementById("fund-agent-form");
  if (fundForm && !fundForm.dataset.bound) {
    fundForm.dataset.bound = "true";

    fundForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const mobile = document.getElementById("agent-mobile").value.trim();
      const amount = parseFloat(document.getElementById("float-amount").value);
      const device_info = getDeviceInfo();
      const location = await getLocation();

      if (!mobile || isNaN(amount) || amount <= 0) {
        document.getElementById("fund-result").innerHTML =
          '<p class="text-danger">❌ Invalid input.</p>';
        return;
      }

      fetch("/admin/fund-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agent_mobile: mobile,
          amount,
          device_info,
          location,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`Server error: ${text}`);
          }
          return res.json();
        })
        .then((data) => {
          document.getElementById("fund-result").innerHTML = data.message
            ? `<p class='text-success'>${data.message}</p>`
            : `<p class='text-danger'>${data.error || "Funding failed."}</p>`;
          setTimeout(() => window.location.reload(), 2500);
        })
        .catch((err) => {
          console.error(err);
          document.getElementById(
            "fund-result"
          ).innerHTML = `<p class="text-danger">❌ ${err.message}</p>`;
        });
    });
  }
}

// ✅ Device Info Function
function getDeviceInfo() {
  return {
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
  };
}

// ✅ Location Info Function
async function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      return resolve("Location not supported");
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve("Location denied")
    );
  });
}

// ---------------------------
// Funcction to load all transactions
// ---------------------------
// 
function loadAllTransactions() {
  fetch("/admin/all-transactions", {
    method: "GET",
    credentials: "include"
  })
    .then(res => res.json())
    .then((data) => {
      const tbody = document.getElementById("all-transactions-body");
      tbody.innerHTML = "";

      if (!data.transactions.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No transactions found.</td></tr>`;
        return;
      }

      data.transactions.forEach(tx => {
        const canReverse = tx.transaction_type === "transfer" && tx.status === "completed";

        const reverseBtn = canReverse
          ? `<button class="btn btn-sm btn-danger" onclick="reverseTransfer(${tx.id})">
               <i class="fas fa-undo"></i> Reverse
             </button>`
          : "";

        const row = `
          <tr>
            <td>${tx.id}</td>
            <td>${tx.user_name}</td>
            <td>${tx.transaction_type}</td>
            <td>${tx.amount}</td>
            <td>${tx.status}</td>
            <td>${tx.timestamp}</td>
            <td>${reverseBtn}</td>
          </tr>
        `;
        tbody.innerHTML += row;
      });
    })
    .catch(err => {
      console.error("❌ Failed to load transactions:", err);
      alert("Could not load all transactions.");
    });
}
// Binding All transactions function
document.getElementById("show-all-transactions").addEventListener("click", () => {
  document.querySelectorAll(".admin-section").forEach(s => s.style.display = "none");
  document.getElementById("all-transactions-section").style.display = "block";
  loadAllTransactions();
});

// ---------------------------
// Function to reverse transfers
// ---------------------------
function reverseTransfer(transactionId) {
  if (!confirm("⚠️ Are you sure you want to reverse this transfer?")) return;

  fetch(`/admin/reverse-transfer/${transactionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  })
    .then(res => res.json())
    .then(data => {
      if (data.message) {
        alert(data.message);
        loadAllTransactions();
        loadRealTimeLogs?.();
      } else {
        alert(data.error || "Failed to reverse transfer.");
      }
    })
    .catch(err => {
      console.error("❌ Error reversing transfer:", err);
      alert("❌ Something went wrong while reversing the transfer.");
    });
}

// ✅ Expose globally
window.reverseTransfer = reverseTransfer;


// ✅ Function to fetch and display users in Admin Dashboard
function fetchUsersForAdmin() {
  const userList = document.querySelector("#admin-user-list tbody");
  userList.innerHTML =
    "<tr><td colspan='6' class='text-center'>Loading users...</td></tr>";

  fetch("/admin/users", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("✅ Admin Users Fetched:", data);

      // ✅ Validate that the response is an array
      if (!Array.isArray(data)) {
        userList.innerHTML = `
          <tr><td colspan="6" class="text-center text-danger">
            Failed to load users (unexpected response)
          </td></tr>`;
        console.error("❌ Expected array but got:", data);
        return;
      }

      const users = data;
      userList.innerHTML = ""; // Clear previous content

      if (users.length === 0) {
        userList.innerHTML =
          "<tr><td colspan='6' class='text-center'>No users available.</td></tr>";
        return;
      }

      users.forEach((user) => {
        const row = document.createElement("tr");

        const rowClass = user.is_locked ? "locked-user-row" : "";
        const lockedUntil = user.locked_until
          ? new Date(user.locked_until).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null;

        const lockBadge = user.is_locked
          ? `<div>
               <span class="badge bg-danger">🔒 Locked</span><br>
               <small class="text-danger">Until ${lockedUntil}</small>
             </div>`
          : "";

        const unlockButton = user.is_locked
          ? `<button class="btn btn-sm unlock-btn" onclick="unlockUser('${user.id}')">
               <i class="fas fa-unlock-alt"></i> Unlock
             </button>`
          : "";

        row.className = rowClass;

        row.innerHTML = `
          <td>${user.id}</td>
          <td>${user.name || "N/A"} ${lockBadge}</td>
          <td>${user.mobile_number || "N/A"}</td>
          <td>${user.email || "N/A"}</td>
          <td>${user.role || "N/A"}</td>
          <td class="action-buttons">
              <div class="dropdown dropup">
                  <button class="btn btn-sm dropdown-toggle" onclick="toggleDropdown(this)" style="background-color: var(--brand-blue); color: white;">
                      Actions ▼
                  </button>
                  <div class="dropdown-menu">
                      <button class="btn btn-sm view-btn" onclick="viewUser('${
                        user.id
                      }')">
                          <i class="fas fa-eye"></i> View
                      </button>
                      <button class="btn btn-sm activate-btn" onclick="assignUserRole('${
                        user.id
                      }', 'Admin')">
                          <i class="fas fa-user-tag"></i> Assign Role
                      </button>
                      <button class="btn btn-sm verify-btn" onclick="verifyUser('${
                        user.id
                      }')">
                          <i class="fas fa-check-circle"></i> Verify
                      </button>
                      <button class="btn btn-sm suspend-btn" onclick="suspendUser('${
                        user.id
                      }')">
                          <i class="fas fa-user-slash"></i> Suspend
                      </button>
                      <button class="btn btn-sm delete-btn" onclick="deleteUser('${
                        user.id
                      }')">
                          <i class="fas fa-trash-alt"></i> Delete
                      </button>
                      <button class="btn btn-sm edit-btn" onclick="editUser('${
                        user.id
                      }')">
                          <i class="fas fa-edit"></i> Edit
                      </button>
                      ${unlockButton}
                  </div>
              </div>
          </td>
        `;
        userList.appendChild(row);
      });
    })
    .catch((error) => {
      console.error("❌ Error fetching users:", error);
      userList.innerHTML =
        "<tr><td colspan='6' class='text-center text-danger'>Error loading users</td></tr>";
    });
}

// ✅ Function to toggle dropdown and adjust position
window.toggleDropdown = function (triggerButton) {
  console.log("✅ Dropdown Clicked!");

  const dropdown = triggerButton.nextElementSibling;

  if (!dropdown) {
    console.error("❌ Dropdown menu not found!");
    return;
  }

  // ✅ Close all other dropdowns before opening the clicked one
  document.querySelectorAll(".dropdown-menu").forEach((menu) => {
    if (menu !== dropdown) {
      menu.style.display = "none";
    }
  });

  // ✅ Toggle the visibility of the clicked dropdown
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";

  // ✅ Adjust positioning dynamically (drop up/down based on space)
  const rect = triggerButton.getBoundingClientRect();
  const dropdownHeight = dropdown.scrollHeight;
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;

  if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
    dropdown.style.bottom = "100%";
    dropdown.style.top = "auto";
  } else {
    dropdown.style.top = "100%";
    dropdown.style.bottom = "auto";
  }
};

// ✅ Close dropdowns when clicking outside
document.addEventListener("click", function (event) {
  if (!event.target.closest(".dropdown")) {
    document.querySelectorAll(".dropdown-menu").forEach((dropdown) => {
      dropdown.style.display = "none";
    });
  }
});

// ✅ Ensure dropdowns start hidden on page load
document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ Ensuring dropdowns start hidden.");
  document.querySelectorAll(".dropdown-menu").forEach((menu) => {
    menu.style.display = "none";
  });
});

// ✅ Make Modal Draggable
function makeModalDraggable() {
  const modal = document.getElementById("adminDetailsModal");
  const header = document.querySelector("#adminDetailsModal .modal-header");
  let offsetX,
    offsetY,
    isDragging = false;

  if (!header) return;

  header.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - modal.getBoundingClientRect().left;
    offsetY = e.clientY - modal.getBoundingClientRect().top;
    modal.style.position = "absolute"; // ✅ Ensure absolute positioning
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    modal.style.left = `${e.clientX - offsetX}px`;
    modal.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
}

// ✅ Load users when the page is ready
document.addEventListener("DOMContentLoaded", fetchUsersForAdmin);

// ✅ View User Info function
function viewUser(userId) {
  fetch(`/admin/view_user/${userId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert(`❌ Error: ${data.error}`);
        return;
      }

      // ✅ Remove existing content before adding new content
      const modalContent = document.querySelector(
        "#userDetailsModal .modal-content"
      );
      modalContent.innerHTML = "";

      // ✅ Add formatted data WITHOUT extra space
      modalContent.innerHTML = `
          <div class="modal-header">
              <h2 style="color: #4CAF50; margin-bottom: 5px;">User Details</h2>
              <span id="closeUserDetails" class="close">&times;</span>
          </div>
          <div class="modal-body">
              <p><strong>ID:</strong> ${data.id}</p>
              <p><strong>Full Name:</strong> ${data.name}</p>
              <p><strong>Mobile Number:</strong> ${data.mobile_number}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Role:</strong> ${data.role}</p>
              <p><strong>Registration Date:</strong> ${data.registration_date}</p>
          </div>
      `;

      // ✅ Show the modal
      const modal = document.getElementById("userDetailsModal");
      modal.style.display = "block";

      // ✅ Attach the close event again (since we replaced modal content)
      document
        .getElementById("closeUserDetails")
        .addEventListener("click", function () {
          modal.style.display = "none";
        });

      // ✅ Ensure modal resizes properly
      modal.style.height = "auto";
      modal.style.minHeight = "auto";

      // ✅ Make the modal draggable
      makeModalDraggable();
    })
    .catch((error) => console.error("❌ Error fetching user details:", error));
}

// ---------------------------
// Admin User Actions
// ---------------------------
// ✅ Update User Role Function (Now Displays Assigned Mobile Number)

function assignUserRole(userId) {
  let newRole = prompt("Enter new role (admin, agent, user):");

  if (!newRole) {
    alert("❌ Role assignment cancelled.");
    return;
  }

  // ✅ Convert role name to role ID
  const roleMapping = {
    admin: 1,
    agent: 2,
    user: 3,
  };

  const roleId = roleMapping[newRole.toLowerCase()];

  if (!roleId) {
    alert("❌ Invalid role. Please enter 'admin', 'agent', or 'user'.");
    return;
  }

  fetch("/admin/assign_role", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ user_id: userId, role_id: roleId }), // ✅ Send role ID, not string
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert("❌ Error: " + data.error);
      } else {
        alert(`✅ Role updated to ${newRole} successfully!`);
        fetchUsersForAdmin(); // Refresh the list
      }
    })
    .catch((error) => console.error("❌ Error updating role:", error));
}

// ✅ Ensure Assign Role button triggers the prompt-based role change
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".assign-role").forEach((button) => {
    button.addEventListener("click", function () {
      assignUserRole(this.dataset.userId);
    });
  });
});

// -------------------------
// Suspend the user
//--------------------------

function suspendUser(userId) {
  if (
    !confirm(
      "Are you sure you want to suspend this user? Their account will be disabled and marked for deletion."
    )
  ) {
    return;
  }

  fetch(`/admin/suspend_user/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Ensure cookies are included for authentication
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert("Error: " + data.error);
      } else {
        alert(data.message); // Correctly display the returned message
        fetchUsersForAdmin(); // Refresh the user list
      }
    })
    .catch((error) => console.error("Error suspending user:", error));
}

// verify the user

function verifyUser(userId) {
  if (!confirm("Are you sure you want to verify this user?")) {
    return;
  }

  fetch(`/admin/verify_user/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Ensures authentication cookies are sent
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert("Error: " + data.error);
      } else {
        alert("User has been verified and activated.");
        fetchUsersForAdmin(); // Refresh the user list
      }
    })
    .catch((error) => console.error("Error verifying user:", error));
}

// -------------------------
// permanently Delete the user
//--------------------------

function deleteUser(userId) {
  if (
    !confirm(
      "Are you sure you want to permanently delete this user? This action CANNOT be undone!"
    )
  ) {
    return;
  }

  fetch(`/admin/delete_user/${userId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Include authentication cookies
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert("Error: " + data.error);
      } else {
        alert("User permanently deleted.");
        fetchUsersForAdmin(); // Refresh the user list
      }
    })
    .catch((error) => console.error("Error deleting user:", error));
}

// -------------------------
// Edit the user
//--------------------------

function editUser(userId) {
  let firstName = prompt(
    "Enter new first name (leave blank to keep unchanged):"
  );
  let lastName = prompt("Enter new last name (leave blank to keep unchanged):");
  let email = prompt("Enter new email (leave blank to keep unchanged):");
  let mobileNumber = prompt(
    "Enter new mobile number (leave blank to keep unchanged):"
  );

  const payload = {};
  if (firstName) payload.first_name = firstName;
  if (lastName) payload.last_name = lastName;
  if (email) payload.email = email;
  if (mobileNumber) payload.mobile_number = mobileNumber;

  if (Object.keys(payload).length === 0) {
    alert("No changes provided.");
    return;
  }

  fetch(`/admin/edit_user/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Ensure cookies are included
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert("Error updating user: " + data.error);
      } else {
        alert(data.message || "User updated successfully!");
        fetchUsersForAdmin(); // Refresh the list
      }
    })
    .catch((error) => console.error("Error editing user:", error));
}

// ------------------------------
// Unlock user account
// ------------------------------
function unlockUser(userId) {
  if (!confirm("Are you sure you want to unlock this user?")) return;

  fetch(`/admin/unlock-user/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message || "User unlocked.");
      // Optionally refresh user list
    })
    .catch((err) => {
      alert("Error unlocking user.");
      console.error(err);
    });
}

// ------------------------------
// Check for flagged Transactions
// ------------------------------
function loadFlaggedTransactions() {
  fetch("/admin/flagged-transactions")
    .then((res) => res.json())
    .then((data) => {
      const tbody = document.getElementById("flagged-transactions");
      tbody.innerHTML = "";
      if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No flagged transactions</td></tr>`;
        return;
      }
      data.forEach((tx) => {
        const row = `
          <tr>
            <td>${tx.user}</td>
            <td>${tx.amount}</td>
            <td>${tx.type}</td>
            <td>${tx.risk_score}</td>
            <td>${tx.status}</td>
            <td>
              <button class="btn btn-sm btn-outline-danger">Block</button>
              <button class="btn btn-sm btn-outline-success">Approve</button>
            </td>
          </tr>
        `;
        tbody.innerHTML += row;
      });
    });
}

// ------------------------------
// System Real time logs
// ------------------------------
function loadRealTimeLogs() {
  fetch("/admin/real-time-logs")
    .then((res) => res.json())
    .then((data) => {
      const container = document.getElementById("real-time-logs-container");
      container.innerHTML = "";
      if (!data.length) {
        container.innerHTML = `<p class="text-muted text-center">No alerts yet.</p>`;
        return;
      }
      data.forEach((log) => {
        const card = `
          <div class="alert alert-warning mb-2">
            <strong>${log.timestamp}</strong> - <b>${log.user}</b><br/>
            <code>${log.action}</code><br/>
            Location: ${log.location} | IP: ${log.ip} | Device: ${log.device}
          </div>
        `;
        container.innerHTML += card;
      });
    });
}
// ---------------------------
// User Authentication logs Function
// ---------------------------
function loadUserAuthLogs() {
  fetch("/admin/user-auth-logs")
    .then((res) => res.json())
    .then((data) => {
      const tbody = document.getElementById("user-auth-logs-container");
      tbody.innerHTML = "";
      if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No logs yet</td></tr>`;
        return;
      }

      data.forEach((log) => {
        const row = `
          <tr>
            <td>${log.user}</td>
            <td>${log.method}</td>
            <td>${log.status}</td>
            <td>${log.timestamp}</td>
            <td>${log.ip}</td>
            <td>${log.device}</td>
            <td>${log.location}</td>
            <td>${log.fails}</td>
          </tr>
        `;
        tbody.innerHTML += row;
      });
    });
}

// ---------------------------
// Search Users Function
// ---------------------------
function searchUsers(searchTerm) {
  if (!searchTerm) {
    alert("Please enter a search term.");
    return;
  }

  const rows = document.querySelectorAll("#admin-user-list tr");
  let found = false;
  rows.forEach((row) => {
    const rowText = row.textContent.toLowerCase();
    if (rowText.indexOf(searchTerm.toLowerCase()) !== -1) {
      row.style.display = "";
      found = true;
    } else {
      row.style.display = "none";
    }
  });

  if (!found) {
    alert("No user found with the provided search term.");
  }
}

/// ---------------------------
// Bind All Events on DOMContentLoaded
// ---------------------------
document.addEventListener("DOMContentLoaded", function () {
  // Bind search events
  const searchBtn = document.getElementById("search-user-btn");
  const searchInput = document.getElementById("user-search");
  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", function () {
      const searchTerm = searchInput.value.trim();
      searchUsers(searchTerm);
    });
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const searchTerm = searchInput.value.trim();
        searchUsers(searchTerm);
      }
    });
  }

  // ---------------------------
  // 🎯 Open Add User Modal
  // ---------------------------
  const addUserBtn = document.getElementById("add-user-btn");
  if (addUserBtn) {
    addUserBtn.addEventListener("click", function () {
      console.log("✅ Add User button clicked");

      const modalEl = document.getElementById("addUserModal");
      if (!modalEl) {
        console.error("❌ Modal element with id 'addUserModal' not found.");
        return;
      }

      // ✅ Bootstrap 5 API to show the modal
      const addUserModal = new bootstrap.Modal(modalEl);
      addUserModal.show();

      // ✅ Ensure fetchGeneratedSIM() only runs if function exists
      if (typeof fetchGeneratedSIM === "function") {
        fetchGeneratedSIM();
      } else {
        console.error("❌ fetchGeneratedSIM() function is not defined!");
      }
    });
  } else {
    console.error(
      "❌ Add User button (id 'add-user-btn') not found in the DOM."
    );
  }

  // ---------------------------
  // 🎯 Handle Manual SIM Refresh
  // ---------------------------
  const genBtn = document.getElementById("generate-mobile-btn");
  if (genBtn) {
    genBtn.addEventListener("click", function () {
      fetchGeneratedSIM();
    });
  }

  // ---------------------------
  // 🎯 Fetch Auto-Generated SIM Details & Update Input Fields
  // ---------------------------
  function fetchGeneratedSIM() {
    fetch("/admin/generate_sim", { method: "GET", credentials: "include" })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          alert("❌ Error fetching SIM details: " + data.error);
        } else {
          // ✅ Update the input fields with generated values
          document.getElementById("generated-mobile").value =
            data.mobile_number;
          document.getElementById("generated-iccid").value = data.iccid;

          // ✅ Store values globally for form submission
          window.generatedSIM = {
            mobile_number: data.mobile_number,
            iccid: data.iccid,
          };

          console.log(
            `✅ SIM Updated: ICCID ${data.iccid}, Mobile ${data.mobile_number}`
          );
        }
      })
      .catch((error) => {
        console.error("❌ Error generating SIM:", error);
        alert("❌ Unexpected error occurred while generating SIM.");
      });
  }

  // ---------------------------
  // Admin: Add New User Form Submission (Modal)
  // ---------------------------
  const addUserForm = document.getElementById("add-user-form");
  if (addUserForm) {
    addUserForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // ✅ Get values from the form fields (not from background storage)
      const firstName = document.getElementById("add-first-name").value.trim();
      const lastName = document.getElementById("add-last-name").value.trim();
      const email = document.getElementById("add-email").value.trim();
      const country = document.getElementById("add-country").value.trim();
      const password = document.getElementById("add-password").value.trim();
      const mobileNumber = document
        .getElementById("generated-mobile")
        .value.trim(); // ✅ Use the visible input field
      const iccid = document.getElementById("generated-iccid").value.trim(); // ✅ Use the visible input field

      if (
        !firstName ||
        !email ||
        !country ||
        !password ||
        !mobileNumber ||
        !iccid
      ) {
        alert("❌ Please fill in all required fields.");
        return;
      }

      // ✅ Build user payload with displayed values
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        password: password,
        country: country,
        mobile_number: mobileNumber, // ✅ Now using displayed input value
        iccid: iccid, // ✅ Now using displayed input value
      };

      // ✅ Step 3: Send registration request
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const registerData = await registerResponse.json();
      console.log("✅ Server Response:", registerData);

      if (registerData.error) {
        alert("❌ Error registering user: " + registerData.error);
      } else {
        alert(
          `✅ User registered successfully with Mobile: ${registerData.mobile_number}, ICCID: ${registerData.iccid}`
        );
        fetchUsersForAdmin(); // ✅ Refresh user list

        // ✅ Hide the modal after successful registration
        const addUserModal = bootstrap.Modal.getOrCreateInstance(
          document.getElementById("addUserModal")
        );
        addUserModal.hide();
        addUserForm.reset();
      }
    });
  }

  // ---------------------------
  // Logout Functionality
  // ---------------------------
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", function (e) {
      e.preventDefault();
      fetch("/api/auth/logout", { method: "POST" }).then(() => {
        window.location.href = "/api/auth/login_form";
      });
    });
  }
});
