
// Role Mapping
// ---------------------------
const roleMapping = {
  "1": "Admin",
  "2": "Agent",
  "3": "User"
};


console.log("Admin Dashboard JS loaded");

// ---------------------------
// Inactivity Timeout Logic
// ---------------------------
const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes in milliseconds
let lastActivityTime = Date.now();
["mousemove", "keydown", "click", "scroll"].forEach(evt =>
  document.addEventListener(evt, () => { lastActivityTime = Date.now(); })
);
setInterval(() => {
  if (Date.now() - lastActivityTime > INACTIVITY_LIMIT) {
    alert("You've been inactive. Logging out.");
    fetch("/api/auth/logout", { method: "POST" })
      .then(() => {
        window.location.href = '/api/auth/login_form';
          });
    }
}, 60000);


// ✅ Fetch Users & Bind Actions with Dropdown
// ✅ Function to fetch and display users in Admin Dashboard
function fetchUsersForAdmin() {
  const userList = document.querySelector("#admin-user-list tbody");
  userList.innerHTML = "<tr><td colspan='6' class='text-center'>Loading users...</td></tr>";
  
  fetch("/admin/users", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
  })
  .then(res => res.json())
  .then(users => {
      userList.innerHTML = ""; // ✅ Clear only tbody, not thead

      if (!users || users.length === 0) {
          userList.innerHTML = "<tr><td colspan='6' class='text-center'>No users available.</td></tr>";
          return;
      }

      users.forEach(user => {
          const row = document.createElement("tr");
          row.innerHTML = `
              <td>${user.id}</td>
              <td>${user.name || "N/A"}</td>
              <td>${user.mobile_number || "N/A"}</td>
              <td>${user.email || "N/A"}</td>
              <td>${user.role || "N/A"}</td>
              <td class="action-buttons">
                  <div class="dropdown">
                      <button class="btn btn-sm dropdown-toggle" onclick="toggleDropdown(this)">
                          Actions ▼
                      </button>
                      <div class="dropdown-menu">
                          <button class="btn btn-sm view-user" onclick="viewUser('${user.id}')">
                              <i class="fas fa-eye"></i> View
                          </button>
                          <button class="btn btn-sm assign-role" onclick="assignRole('${user.id}')">
                              <i class="fas fa-user-tag"></i> Assign Role
                          </button>
                          ${user.is_verified ? "" : `<button class="btn btn-sm verify-user" onclick="verifyUser('${user.id}')">
                              <i class="fas fa-check-circle"></i> Verify
                          </button>`}
                          ${user.is_suspended ? `<button class="btn btn-sm unsuspend-user" onclick="unsuspendUser('${user.id}')">
                              <i class="fas fa-user-check"></i> Unsuspend
                          </button>` : `<button class="btn btn-sm suspend-user" onclick="suspendUser('${user.id}')">
                              <i class="fas fa-user-slash"></i> Suspend
                          </button>`}
                          <button class="btn btn-sm delete-user" onclick="deleteUser('${user.id}')">
                              <i class="fas fa-trash-alt"></i> Delete
                          </button>
                          <button class="btn btn-sm edit-user" onclick="editUser('${user.id}')">
                              <i class="fas fa-edit"></i> Edit
                          </button>
                      </div>
                  </div>
              </td>
          `;
          userList.appendChild(row);
      });
  })
  .catch(error => {
      console.error("❌ Error fetching users:", error);
      userList.innerHTML = "<tr><td colspan='6' class='text-center text-danger'>Error loading users</td></tr>";
  });
}

// ✅ Fix Dropdown Functionality
window.toggleDropdown = function(button) {
  const dropdownMenu = button.nextElementSibling;
  if (!dropdownMenu) return;

  // ✅ Close other open dropdowns
  document.querySelectorAll(".dropdown-menu").forEach(menu => {
      if (menu !== dropdownMenu) {
          menu.classList.remove("show");
          menu.style.display = "none";
      }
  });

  // ✅ Toggle the clicked dropdown
  dropdownMenu.classList.toggle("show");
  dropdownMenu.style.display = dropdownMenu.classList.contains("show") ? "block" : "none";
};

// ✅ Close dropdown when clicking outside
document.addEventListener("click", function(event) {
  if (!event.target.closest(".dropdown")) {
      document.querySelectorAll(".dropdown-menu").forEach(menu => {
          menu.classList.remove("show");
          menu.style.display = "none";
      });
  }
});

// ✅ Make Modal Draggable
function makeModalDraggable() {
  const modal = document.getElementById("adminDetailsModal");
  const header = document.querySelector("#adminDetailsModal .modal-header");
  let offsetX, offsetY, isDragging = false;

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
      credentials: "include"
  })
  .then(response => response.json())
  .then(data => {
      if (data.error) {
          alert(`❌ Error: ${data.error}`);
          return;
      }

      // ✅ Remove existing content before adding new content
      const modalContent = document.querySelector("#userDetailsModal .modal-content");
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
      document.getElementById("closeUserDetails").addEventListener("click", function() {
          modal.style.display = "none";
      });

      // ✅ Ensure modal resizes properly
      modal.style.height = "auto";
      modal.style.minHeight = "auto";

      // ✅ Make the modal draggable
      makeModalDraggable();
  })
  .catch(error => console.error("❌ Error fetching user details:", error));
}

// ---------------------------
// Admin User Actions
// ---------------------------
function updateUserRole(userId, newRole) {
  fetch("/admin/assign_role", {
      method: "POST",
      headers: { 
          "Content-Type": "application/json"
      },
      credentials: "include", // Ensures cookies are sent with the request
      body: JSON.stringify({ user_id: userId, role_name: newRole }) // Ensure you're sending role_name
  })
  .then(response => response.json())
  .then(data => {
      if (data.error) {
          alert("Error: " + data.error);
      } else {
          alert("Role updated successfully!");
          fetchUsersForAdmin(); // Refresh the list to reflect changes
      }
  })
  .catch(error => console.error("Error updating role:", error));
}

// -------------------------
// Suspend the user
//--------------------------

function suspendUser(userId) {
  if (!confirm("Are you sure you want to suspend this user? Their account will be disabled and marked for deletion.")) {
    return;
  }

  fetch(`/admin/suspend_user/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include" // Ensure cookies are included for authentication
  })
  .then(response => response.json())
  .then(data => {
      if (data.error) {
          alert("Error: " + data.error);
      } else {
          alert(data.message); // Correctly display the returned message
          fetchUsersForAdmin(); // Refresh the user list
      }
  })
  .catch(error => console.error("Error suspending user:", error));
}



// verify the user

function verifyUser(userId) {
  if (!confirm("Are you sure you want to verify this user?")) {
    return;
  }

  fetch(`/admin/verify_user/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include" // Ensures authentication cookies are sent
  })
  .then(response => response.json())
  .then(data => {
      if (data.error) {
          alert("Error: " + data.error);
      } else {
          alert("User has been verified and activated.");
          fetchUsersForAdmin(); // Refresh the user list
      }
  })
  .catch(error => console.error("Error verifying user:", error));
}


// -------------------------
// permanently Delete the user
//--------------------------

function deleteUser(userId) {
  if (!confirm("Are you sure you want to permanently delete this user? This action CANNOT be undone!")) {
    return;
  }

  fetch(`/admin/delete_user/${userId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include" // Include authentication cookies
  })
  .then(response => response.json())
  .then(data => {
      if (data.error) {
          alert("Error: " + data.error);
      } else {
          alert("User permanently deleted.");
          fetchUsersForAdmin(); // Refresh the user list
      }
  })
  .catch(error => console.error("Error deleting user:", error));
}


// -------------------------
// Edit the user
//--------------------------

function editUser(userId) {
  let firstName = prompt("Enter new first name (leave blank to keep unchanged):");
  let lastName = prompt("Enter new last name (leave blank to keep unchanged):");
  let email = prompt("Enter new email (leave blank to keep unchanged):");
  let mobileNumber = prompt("Enter new mobile number (leave blank to keep unchanged):");

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
      body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(data => {
      if (data.error) {
          alert("Error updating user: " + data.error);
      } else {
          alert(data.message || "User updated successfully!");
          fetchUsersForAdmin(); // Refresh the list
      }
  })
  .catch(error => console.error("Error editing user:", error));
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
  rows.forEach(row => {
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
document.addEventListener("DOMContentLoaded", function(){
  // Bind search events
  const searchBtn = document.getElementById("search-user-btn");
  const searchInput = document.getElementById("user-search");
  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", function(){
      const searchTerm = searchInput.value.trim();
      searchUsers(searchTerm);
    });
    searchInput.addEventListener("keypress", function(e){
      if(e.key === "Enter"){
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
    addUserBtn.addEventListener("click", function() {
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
    console.error("❌ Add User button (id 'add-user-btn') not found in the DOM.");
  }

  // ---------------------------
// 🎯 Handle Manual SIM Refresh
// ---------------------------
document.getElementById("generate-mobile-btn").addEventListener("click", function() {
  fetchGeneratedSIM(); // ✅ Call the function to get new SIM details
});

  // ---------------------------
// 🎯 Fetch Auto-Generated SIM Details & Update Input Fields
// ---------------------------
function fetchGeneratedSIM() {
  fetch("/admin/generate_sim", { method: "GET", credentials: "include" })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        alert("❌ Error fetching SIM details: " + data.error);
      } else {
        // ✅ Update the input fields with generated values
        document.getElementById("generated-mobile").value = data.mobile_number;
        document.getElementById("generated-iccid").value = data.iccid;

        // ✅ Store values globally for form submission
        window.generatedSIM = {
          mobile_number: data.mobile_number,
          iccid: data.iccid
        };

        console.log(`✅ SIM Updated: ICCID ${data.iccid}, Mobile ${data.mobile_number}`);
      }
    })
    .catch(error => {
      console.error("❌ Error generating SIM:", error);
      alert("❌ Unexpected error occurred while generating SIM.");
    });
}



  // ---------------------------
// Admin: Add New User Form Submission (Modal)
// ---------------------------
const addUserForm = document.getElementById("add-user-form");
if (addUserForm) {
  addUserForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    // ✅ Get values from the form fields (not from background storage)
    const firstName = document.getElementById("add-first-name").value.trim();
    const lastName = document.getElementById("add-last-name").value.trim();
    const email = document.getElementById("add-email").value.trim();
    const country = document.getElementById("add-country").value.trim();
    const password = document.getElementById("add-password").value.trim();
    const mobileNumber = document.getElementById("generated-mobile").value.trim(); // ✅ Use the visible input field
    const iccid = document.getElementById("generated-iccid").value.trim(); // ✅ Use the visible input field

    if (!firstName || !email || !country || !password || !mobileNumber || !iccid) {
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
      iccid: iccid  // ✅ Now using displayed input value
    };

    console.log("📡 Sending registration payload:", payload); // Debugging step

    // ✅ Step 3: Send registration request
    const registerResponse = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    const registerData = await registerResponse.json();
    console.log("✅ Server Response:", registerData);

    if (registerData.error) {
      alert("❌ Error registering user: " + registerData.error);
    } else {
      alert(`✅ User registered successfully with Mobile: ${registerData.mobile_number}, ICCID: ${registerData.iccid}`);
      fetchUsersForAdmin(); // ✅ Refresh user list

      // ✅ Hide the modal after successful registration
      const addUserModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("addUserModal"));
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
    logoutLink.addEventListener("click", function(e){
      e.preventDefault();
      fetch("/api/auth/logout", { method: "POST" })
          .then(() => {
              window.location.href = "/api/auth/login_form";
          });
    });
  }
});
