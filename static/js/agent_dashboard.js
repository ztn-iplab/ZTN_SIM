console.log("Agent Dashboard JS Loaded");

document.addEventListener("DOMContentLoaded", function () {
  // Section Elements
  const overviewSection = document.getElementById("content-overview");
  const transactionsSection = document.getElementById("content-transactions");
  const simRegistrationSection = document.getElementById("content-sim-registration");
  const profileSection = document.getElementById("content-profile");
  let transactionChart;

  // ✅ Ensure the modal and close button exist before adding event listeners
  setTimeout(() => {
    const modal = document.getElementById("simDetailsModal");
    const closeButton = document.getElementById("closeSimDetails");

    if (modal && closeButton) {
        closeButton.addEventListener("click", function() {
            modal.style.display = "none";
        });
        console.log("✅ Close button event listener added.");
    } else {
        console.warn("⚠️ Warning: SIM Details modal or close button not found. The modal may not exist on this page.");
    }
}, 500); // ✅ Delay checking elements for 500ms to allow rendering

    // ✅ Assign functions to `window` to ensure they work globally
    window.viewSIM = viewSIM;
    window.activateSIM = activateSIM;
    window.suspendSIM = suspendSIM;
    window.transferSIM = transferSIM;
    window.deleteSIM = deleteSIM;

  // ✅ Function to Show Sections
  function showSection(section, callback = null) {
    document.querySelectorAll(".content-section").forEach(s => s.style.display = "none");
    section.style.display = "block";
    if (callback) callback();
  }

  // ✅ Fetch Agent Dashboard Data
  function fetchAgentDashboardData() {
    fetch("/agent/dashboard/data", { method: "GET", credentials: "include" })
    .then(response => response.json())
    .then(data => {
      console.log("Agent Dashboard Data:", data);
      document.getElementById("total-transactions").textContent = data.total_transactions || 0;
      document.getElementById("total-sims").textContent = data.total_sims || 0;
    })
    .catch(error => console.error("Error fetching agent dashboard data:", error));
  }

  // ✅ Fetch Wallet Info
  function fetchWalletInfo() {
    fetch("/agent/wallet", { method: "GET", credentials: "include" })
    .then(response => response.json())
    .then(data => {
      console.log("Wallet Info:", data);
      document.getElementById("wallet-balance").textContent = data.balance;
      document.getElementById("wallet-currency").textContent = data.currency;
    })
    .catch(error => console.error("Error fetching wallet info:", error));
  }

  // ✅ Fetch Transaction History and Render Chart
  function fetchTransactionHistory() {
    fetch("/agent/transactions", { method: "GET", credentials: "include" })
    .then(response => response.json())
    .then(data => {
      console.log("Transaction History:", data);
      const historyTable = document.getElementById("transaction-history").querySelector("tbody");
      historyTable.innerHTML = "";
      data.transactions.forEach(tx => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${new Date(tx.timestamp).toLocaleDateString()}</td>
          <td>${tx.transaction_type.toUpperCase()}</td>
          <td>${tx.amount}</td>
          <td>${tx.transaction_type === 'transfer' ? tx.recipient_mobile : 'Self'}</td>
        `;
        historyTable.appendChild(row);
      });

      // ✅ Render transaction chart
      renderTransactionChart(data.transactions);
    })
    .catch(error => console.error("Error fetching transactions:", error));
}

  // ✅ Function to Get User Location
  function getLocation() {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
          },
          (error) => {
            console.error("Geolocation error:", error);
            resolve("Location not available");
          },
          { timeout: 5000 }
        );
      } else {
        resolve("Geolocation not supported");
      }
    });
  }

  // ✅ Submit Transaction (Show Backend Validation Messages)
async function submitTransaction(event) {
  event.preventDefault();

  const amountInput = document.querySelector('[name="amount"]');
  const transactionTypeInput = document.querySelector('[name="transaction_type"]');
  const recipientMobileInput = document.querySelector('[name="recipient_mobile"]');

  const amount = parseFloat(amountInput.value);
  const transactionType = transactionTypeInput.value;
  const recipientMobile = recipientMobileInput && recipientMobileInput.value.trim() ? recipientMobileInput.value.trim() : null;

  if (isNaN(amount) || amount <= 0) {
    alert("❌ Error: Please enter a valid amount greater than zero.");
    return;
  }

  if (!transactionType) {
    alert("❌ Error: Please select a transaction type.");
    return;
  }

  // ✅ Ensure deposits require a recipient (Agents cannot deposit to themselves)
  if (transactionType === "deposit" && !recipientMobile) {
    alert("❌ Error: Deposits must have a recipient mobile number.");
    return;
  }

  // ✅ Ensure transfers have a recipient
  if (transactionType === "transfer" && !recipientMobile) {
    alert("❌ Error: Transfers require a recipient mobile number.");
    return;
  }

  const device_info = navigator.userAgent;
  const location = await getLocation();

  try {
    const response = await fetch("/agent/transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        amount,
        transaction_type: transactionType,
        recipient_mobile: recipientMobile,
        device_info,
        location
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Transaction failed");
    }

    alert(`✅ Success: ${data.message}`);
    fetchWalletInfo(); // ✅ Refresh wallet balance
    fetchTransactionHistory(); // ✅ Refresh transaction history
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
    console.error("Transaction error:", error);
  }
}

// ✅ Attach Event Listener for Transactions
document.addEventListener("DOMContentLoaded", function () {
  const transactionForm = document.getElementById("transaction-form");
  if (transactionForm) {
    transactionForm.addEventListener("submit", submitTransaction);
  }
});

// ✅ Render Transaction Chart
function renderTransactionChart(transactions) {
  const ctx = document.getElementById("transactionChart").getContext("2d");

  if (window.transactionChart) {
    window.transactionChart.destroy(); // ✅ Destroy previous chart before rendering new one
  }

  const labels = transactions.map(tx => tx.timestamp.slice(0, 10));
  const data = transactions.map(tx => tx.amount);

  window.transactionChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Transaction Amount",
        data: data,
        borderColor: "#2962ff",
        borderWidth: 2,
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: "Date" } },
        y: { title: { display: true, text: "Amount" } }
      }
    }
  });
}

// ✅ Show Mobile Input for Transfer & Deposit Transactions
document.getElementById("transaction-type").addEventListener("change", function () {
  const recipientMobileField = document.getElementById("recipient-mobile");
  
  if (this.value === "transfer" || this.value === "deposit") {
    recipientMobileField.style.display = "block"; // ✅ Show input field
    recipientMobileField.setAttribute("required", "true"); // ✅ Make it required
  } else {
    recipientMobileField.style.display = "none"; // ✅ Hide input field
    recipientMobileField.removeAttribute("required"); // ✅ Remove required for other transactions
  }
});

// ✅ New simcard generation
function generateNewSIM() {
  const networkProvider = document.getElementById("network-provider").value;

  if (!networkProvider || networkProvider === "") {
    alert("❌ Please select a network provider before generating a SIM.");
    return;
  }

  fetch("/agent/generate_sim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ network_provider: networkProvider })  // ✅ Send network provider
  })
  .then(response => response.json())
  .then(data => {
      if (!data.success) {
          alert(`❌ Error: ${data.error}`);
      } else {
          document.getElementById("generated-mobile").value = data.mobile_number;
          document.getElementById("generated-iccid").value = data.iccid;
          alert(`✅ Success: ${data.message}`);
      }
  })
  .catch(error => console.error("❌ Error generating new SIM:", error));
}

// ✅ Attach event listener to the button
document.getElementById("generate-mobile-btn").addEventListener("click", generateNewSIM);


// ✅ Function to Register SIM (Agent Registers SIMs)
function registerSIM(event) {
  event.preventDefault();

  const iccid = document.getElementById("generated-iccid").value.trim();
  const mobileNumber = document.getElementById("generated-mobile").value.trim();
  const networkProvider = document.getElementById("network-provider").value;

  // ✅ Validate all required fields
  if (!networkProvider || networkProvider === "") {
    alert("❌ Please select a network provider before registering a SIM.");
    return;
  }

  if (!iccid || iccid === "") {
    alert("❌ Error: SIM ICCID is missing. Get a new SIM first.");
    return;
  }

  if (!mobileNumber || mobileNumber === "") {
    alert("❌ Error: Mobile number is missing. Generate a SIM first.");
    return;
  }

  fetch("/agent/register_sim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ iccid, mobile_number: mobileNumber, network_provider: networkProvider })
  })
  .then(response => response.json())
  .then(data => {
      if (!data.success) {
          alert(`❌ Error: ${data.error}`);
      } else {
          alert(`✅ Success: ${data.message}`);

          // ✅ Clear the form after successful registration
          document.getElementById("generated-iccid").value = "";
          document.getElementById("generated-mobile").value = "";
          document.getElementById("network-provider").value = "";

          // ✅ Refresh the SIM registration history
          fetchSimRegistrationHistory();
      }
  })
  .catch(error => console.error("❌ Error registering SIM:", error));
}

// ✅ Attach event listener
document.getElementById("sim-registration-form").addEventListener("submit", registerSIM);

// ✅ Attach event listener
document.getElementById("sim-registration-form").addEventListener("submit", registerSIM);


// ✅ Ensure registerSIM is Loaded Before Event Listeners
document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ Agent Dashboard Loaded");

  const simRegistrationForm = document.getElementById("sim-registration-form");
  if (simRegistrationForm) {
      simRegistrationForm.addEventListener("submit", registerSIM);
      console.log("✅ SIM Registration Form Event Listener Attached.");
  } else {
      console.error("❌ SIM Registration Form Not Found!");
  }

  // ✅ Ensure "Get New SIM" Button Works
  const generateSimBtn = document.getElementById("generate-mobile-btn");
  if (generateSimBtn) {
      generateSimBtn.addEventListener("click", generateNewSIM);
      console.log("✅ 'Get New SIM' button is now active.");
  } else {
      console.error("❌ 'Get New SIM' button not found!");
  }
});


// ✅ Function to fetch and display the SIMs registered by the agent.
function fetchSimRegistrationHistory() {
  fetch("/agent/sim-registrations", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
  })
  .then(response => response.json())
  .then(data => {
      console.log("SIM Registration History:", data);
      const simTable = document.getElementById("sim-registration-history").querySelector("tbody");

      simTable.innerHTML = ""; // ✅ Clear table before adding new rows

      if (!data.sims || data.sims.length === 0) {
          simTable.innerHTML = `<tr><td colspan='6' class="text-center">No SIMs registered yet.</td></tr>`;
          return;
      }

      data.sims.forEach(sim => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${sim.iccid}</td>
            <td>${sim.mobile_number}</td>
            <td>${sim.network_provider}</td>
            <td>${sim.status}</td>
            <td>${new Date(sim.timestamp).toLocaleDateString()}</td>
            <td class="action-buttons">
                <div class="dropdown dropup">
                    <button class="btn btn-sm dropdown-toggle" onclick="toggleDropdown(this)" style="background-color: var(--brand-blue); color: white;">
                      Actions ▼
                    </button>
                    <div class="dropdown-menu">
                        <button class="btn btn-sm view-btn" onclick="viewSIM('${sim.iccid}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${sim.status === "unregistered" ? `<button class="btn btn-sm activate-btn" onclick="activateSIM('${sim.iccid}')">
                            <i class="fas fa-check-circle"></i> Activate
                        </button>` : ""}
                        ${sim.status === "active" ? `<button class="btn btn-sm suspend-btn" onclick="suspendSIM('${sim.iccid}')">
                            <i class="fas fa-exclamation-triangle"></i> Suspend
                        </button>` : ""}
                        ${sim.status === "unregistered" ? `<button class="btn btn-sm transfer-btn" onclick="transferSIM('${sim.iccid}')">
                            <i class="fas fa-random"></i> Transfer
                        </button>` : ""}
                        ${sim.status === "unregistered" ? `<button class="btn btn-sm delete-btn" onclick="deleteSIM('${sim.iccid}')">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>` : ""}
                    </div>
                </div>
            </td>
          `;
          simTable.appendChild(row);
      });
  })
  .catch(error => {
      console.error("❌ Error fetching SIM registrations:", error);
      alert("❌ Failed to load SIM registration history.");
  });
}

// ✅ Ensure function is globally accessible
window.toggleDropdown = function(button) {
  console.log("✅ Agent Table Dropdown Clicked!");

  // Get the dropdown menu related to the clicked button
  const dropdownMenu = button.nextElementSibling;

  if (!dropdownMenu) {
      console.error("❌ Dropdown menu not found!");
      return;
  }

  // ✅ Close all other dropdowns before opening this one
  document.querySelectorAll(".dropdown-menu").forEach(menu => {
      if (menu !== dropdownMenu) {
          menu.style.display = "none";
          menu.classList.remove("dropup", "dropdown-down");
      }
  });

  // ✅ Show the dropdown to calculate position properly
  dropdownMenu.style.display = "block";

  // ✅ Calculate available space above and below
  const rect = button.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const dropdownHeight = dropdownMenu.scrollHeight;
  const spaceAbove = rect.top;
  const spaceBelow = viewportHeight - rect.bottom;

  // ✅ Adjust dropdown position dynamically
  if (spaceBelow > dropdownHeight) {
      dropdownMenu.style.top = "100%";
      dropdownMenu.style.bottom = "auto";
      dropdownMenu.classList.add("dropdown-down");
      dropdownMenu.classList.remove("dropup");
  } else {
      dropdownMenu.style.bottom = "100%";
      dropdownMenu.style.top = "auto";
      dropdownMenu.classList.add("dropup");
      dropdownMenu.classList.remove("dropdown-down");
  }

  console.log(`Dropdown Position: ${dropdownMenu.classList.contains("dropup") ? "UP" : "DOWN"}`);
};

// ✅ Close dropdown when clicking outside
document.addEventListener("click", function(event) {
  if (!event.target.closest(".dropdown")) {
      document.querySelectorAll(".dropdown-menu").forEach(menu => {
          menu.style.display = "none";
          menu.classList.remove("dropup", "dropdown-down");
      });
  }
});


// ✅ Make Modal Draggable
function makeModalDraggable() {
  const modal = document.getElementById("simDetailsModal");
  const header = document.querySelector("#simDetailsModal .modal-header");
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

// ✅ View SIM Info function

function viewSIM(iccid) {
  fetch(`/agent/view_sim/${iccid}`, {
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
      const modalContent = document.querySelector("#simDetailsModal .modal-content");
      modalContent.innerHTML = ""; 

      // ✅ Add formatted data WITHOUT extra space
      modalContent.innerHTML = `
          <div class="modal-header">
              <h2 style="color: #4CAF50; margin-bottom: 5px;">SIM Details</h2>
              <span id="closeSimDetails" class="close">&times;</span>
          </div>
          <div class="modal-body">
              <p><strong>ICCID:</strong> ${data.iccid}</p>
              <p><strong>Mobile Number:</strong> ${data.mobile_number}</p>
              <p><strong>Network Provider:</strong> ${data.network_provider}</p>
              <p><strong>Status:</strong> ${data.status}</p>
              <p><strong>Registration Date:</strong> ${data.registration_date}</p>
          </div>
      `;

      // ✅ Show the modal
      const modal = document.getElementById("simDetailsModal");
      modal.style.display = "block";

      // ✅ Attach the close event again (since we replaced modal content)
      document.getElementById("closeSimDetails").addEventListener("click", function() {
          modal.style.display = "none";
      });

      // ✅ Ensure modal resizes properly
      modal.style.height = "auto";
      modal.style.minHeight = "auto";

      // ✅ Make the modal draggable
      makeModalDraggable();
  })
  .catch(error => console.error("❌ Error fetching SIM details:", error));
}


// ✅ Activate SIM Function
function activateSIM(iccid) {
  if (!confirm("Are you sure you want to activate this SIM?")) return;

  fetch("/agent/activate_sim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ iccid })
  })
  .then(response => response.json())
  .then(data => {
      if (data.error) {
          alert(`❌ Error: ${data.error}`);
      } else {
          alert(`✅ Success: ${data.message}`);
          fetchSimRegistrationHistory(); // ✅ Refresh the SIM list
      }
  })
  .catch(error => console.error("❌ Error activating SIM:", error));
}

// ✅ Suspend SIM Function
function suspendSIM(iccid) {
  if (!confirm("⚠️ Are you sure you want to suspend this SIM?")) return;

  fetch("/agent/suspend_sim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ iccid })
  })
  .then(response => response.json())
  .then(data => {
      if (data.error) {
          alert(`❌ Error: ${data.error}`);
      } else {
          alert(`⚠️ Success: ${data.message}`);
          fetchSimRegistrationHistory(); // ✅ Refresh the SIM list
      }
  })
  .catch(error => console.error("❌ Error suspending SIM:", error));
}

function transferSIM(iccid) {
  const recipientMobile = prompt("Enter the recipient's mobile number:");

  if (!recipientMobile) {
      alert("❌ Transfer cancelled. No recipient mobile number provided.");
      return;
  }

  // ✅ Transfer SIM function
  fetch("/agent/transfer_sim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ iccid, recipient_mobile: recipientMobile })
  })
  .then(response => response.json())
  .then(data => {
      if (data.error) {
          alert(`❌ Error: ${data.error}`);
      } else {
          alert(`🔄 Success: ${data.message}`);
          fetchSimRegistrationHistory(); // ✅ Refresh the SIM list
      }
  })
  .catch(error => console.error("❌ Error transferring SIM:", error));
}

// ✅ Delete SIM function
function deleteSIM(iccid) {
  if (!confirm("🗑️ Are you sure you want to delete this SIM? This action cannot be undone.")) return;

  fetch("/agent/delete_sim", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ iccid })
  })
  .then(response => response.json())
  .then(data => {
      if (data.error) {
          alert(`❌ Error: ${data.error}`);
      } else {
          alert(`🗑️ Success: ${data.message}`);
          fetchSimRegistrationHistory(); // ✅ Refresh the SIM list
      }
  })
  .catch(error => console.error("❌ Error deleting SIM:", error));
}

 // ✅ Fetch Profile Information
 function fetchProfileInfo() {
  fetch("/agent/profile", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
  })
  .then(response => response.json())
  .then(data => {
      console.log("Profile Info:", data);

      if (data.error) {
          alert(`❌ Error: ${data.error}`);
          return;
      }

      document.getElementById("full-name").textContent = data.full_name || "N/A";
      document.getElementById("mobile-number").textContent = data.mobile_number || "N/A";
      document.getElementById("user-country").textContent = data.country || "N/A";
  })
  .catch(error => console.error("Error fetching profile info:", error));
}

// ✅ Ensure Sections Work
document.getElementById("transaction-form").addEventListener("submit", submitTransaction);
document.getElementById("show-overview").addEventListener("click", () => showSection(overviewSection, fetchAgentDashboardData));
document.getElementById("show-transactions").addEventListener("click", () => showSection(transactionsSection, fetchTransactionHistory));
document.getElementById("show-sim-registration").addEventListener("click", () => showSection(simRegistrationSection));
document.getElementById("show-profile").addEventListener("click", () => showSection(profileSection, fetchProfileInfo));
document.getElementById("sim-registration-form").addEventListener("submit", registerSIM);

// ✅ Logout Button
document.getElementById("logout-link").addEventListener("click", function (e) {
  e.preventDefault();
  fetch("/api/auth/logout", { method: "POST" }).then(() => window.location.href = "/api/auth/login_form");
});

// ✅ Show Overview on First Load
showSection(overviewSection);
fetchAgentDashboardData();
fetchWalletInfo();
fetchTransactionHistory();
fetchProfileInfo();
fetchSimRegistrationHistory();
});

