(function () {
  window.__lsModuleReady = true;
  const fallbackDayLabels = {
    Isnin: "Monday",
    Selasa: "Tuesday",
    Rabu: "Wednesday",
    Khamis: "Thursday",
    Jumaat: "Friday",
    Sabtu: "Saturday",
    Ahad: "Sunday",
  };

  const fallbackTimeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00",
  ];

  const lsDayLabels = typeof dayLabels !== "undefined" ? dayLabels : fallbackDayLabels;
  const lsTimeSlots = typeof timeSlots !== "undefined" ? timeSlots : fallbackTimeSlots;
  let lsEditingId = null;

  function safeCreateIcons() {
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  function lsToMinutes(value) {
    const [h, m] = String(value || "").split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return 0;
    return (h * 60) + m;
  }

  function lsDurationInHours(startTime, endTime) {
    const diff = lsToMinutes(endTime) - lsToMinutes(startTime);
    if (diff <= 0) return 0;
    return diff / 60;
  }

  function lsFormatCredit(value) {
    if (Number.isInteger(value)) return String(value);
    return Number(value).toFixed(1).replace(/\.0$/, "");
  }

  function lsFormatTimeDisplay(value) {
    const [h, m] = String(value || "").split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return value || "-";
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return hour12 + ":" + String(m).padStart(2, "0") + " " + suffix;
  }

  function lsFormatTimeCompact(value) {
    const [h, m] = String(value || "").split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return value || "-";
    const suffix = h >= 12 ? "pm" : "am";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    if (m === 0) return hour12 + suffix;
    return hour12 + ":" + String(m).padStart(2, "0") + suffix;
  }

  function lsCodeTimePart(value) {
    const [h] = String(value || "").split(":").map(Number);
    if (Number.isNaN(h)) return "00";
    return String(h).padStart(2, "0");
  }

  function lsBuildDescription(scheduleRows) {
    return scheduleRows.flatMap(function (row) {
      return row.days.map(function (day) {
        return day + "(" + lsFormatTimeCompact(row.startTime) + "-" + lsFormatTimeCompact(row.endTime) + ")";
      });
    }).join(", ");
  }

  function lsComputeTotalCredit(record) {
    if (typeof record.totalCredit === "number") return record.totalCredit;
    if (!Array.isArray(record.scheduleRows)) return 0;
    return record.scheduleRows.reduce(function (sum, row) {
      return sum + (lsDurationInHours(row.startTime, row.endTime) * row.days.length);
    }, 0);
  }

  function lsComputeCategory(record) {
    if (typeof record.category === "number") return record.category;
    const source = record.courseCredit || record.credit || "0+0";
    return parseInt(String(source).split("+")[0], 10) || 0;
  }

  function generateScheduleCode(scheduleRows, idSeed) {
    const firstRow = scheduleRows[0] || { days: ["XX"], startTime: "08:00", endTime: "10:00" };
    const firstDay = (firstRow.days[0] || "XX").substring(0, 2).toUpperCase();
    const code = firstDay + lsCodeTimePart(firstRow.startTime) + "-" + lsCodeTimePart(firstRow.endTime);
    const exists = lectureScheduleData.some(function (item) {
      return item.code === code && item.id !== idSeed;
    });
    if (!exists) return code;
    return code + "-" + String(idSeed).padStart(2, "0");
  }

  function showLSNotificationSafe(message, type) {
    if (typeof showLSNotification === "function") {
      showLSNotification(message, type || "success");
      return;
    }
    const toast = document.createElement("div");
    toast.className = "fixed bottom-4 right-4 px-4 py-3 rounded-lg text-sm text-white z-50 fade-in";
    toast.style.backgroundColor = type === "error" ? "#ef4444" : "#10b981";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 3000);
  }

  function addScheduleRowOverride(prefill, insertAfterRow) {
    const defaults = prefill || {};
    const container = document.getElementById("ls-schedule-rows-container");
    if (!container) return;

    const dayOptions = Object.keys(lsDayLabels).map(function (day) {
      const checked = Array.isArray(defaults.days) && defaults.days.includes(day) ? "checked" : "";
      return "<label class=\"flex items-center gap-2 cursor-pointer\">" +
        "<input type=\"checkbox\" class=\"ls-day-checkbox\" value=\"" + day + "\" " + checked + " style=\"width:16px;height:16px;accent-color:#3b82f6;\">" +
        "<span class=\"text-sm\" style=\"color:#475569;\">" + day + "</span>" +
        "</label>";
    }).join("");

    const startOptions = lsTimeSlots.map(function (slot) {
      const selected = defaults.startTime === slot ? "selected" : "";
      return "<option value=\"" + slot + "\" " + selected + ">" + lsFormatTimeDisplay(slot) + "</option>";
    }).join("");

    const endOptions = lsTimeSlots.map(function (slot) {
      const selected = defaults.endTime === slot ? "selected" : "";
      return "<option value=\"" + slot + "\" " + selected + ">" + lsFormatTimeDisplay(slot) + "</option>";
    }).join("");

    const row = document.createElement("div");
    row.className = "ls-schedule-row p-4 border rounded-lg";
    row.style.borderColor = "#cbd5e1";
    row.style.backgroundColor = "#f8fafc";
    row.innerHTML =
      "<div class=\"space-y-3\">" +
      "  <label class=\"block text-sm font-medium\" style=\"color:#475569;\">Days <span style=\"color:#dc2626;\">*</span></label>" +
      "  <div class=\"grid grid-cols-2 md:grid-cols-4 gap-2\">" + dayOptions + "</div>" +
      "  <div class=\"grid grid-cols-1 md:grid-cols-2 gap-3\">" +
      "    <div>" +
      "      <label class=\"block text-sm font-medium mb-1\" style=\"color:#475569;\">Start Time <span style=\"color:#dc2626;\">*</span></label>" +
      "      <select class=\"ls-start-time w-full px-4 py-2.5 text-sm border rounded-lg\" style=\"border-color:#cbd5e1;background-color:#ffffff;color:#1e293b;\">" +
      "        <option value=\"\">Select...</option>" + startOptions +
      "      </select>" +
      "    </div>" +
      "    <div>" +
      "      <label class=\"block text-sm font-medium mb-1\" style=\"color:#475569;\">End Time <span style=\"color:#dc2626;\">*</span></label>" +
      "      <select class=\"ls-end-time w-full px-4 py-2.5 text-sm border rounded-lg\" style=\"border-color:#cbd5e1;background-color:#ffffff;color:#1e293b;\">" +
      "        <option value=\"\">Select...</option>" + endOptions +
      "      </select>" +
      "    </div>" +
      "  </div>" +
      "  <div class=\"flex justify-end pt-2\">" +
      "    <button type=\"button\" class=\"ls-remove-row-inline inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md\" style=\"color:#ef4444;background-color:#fee2e2;border:1px solid #fecaca;\">" +
      "      <i data-lucide=\"trash-2\" style=\"width:13px;height:13px;\"></i>Remove" +
      "    </button>" +
      "  </div>" +
      "</div>";

    if (insertAfterRow && insertAfterRow.parentNode === container) {
      insertAfterRow.insertAdjacentElement("afterend", row);
    } else {
      container.appendChild(row);
    }

    safeCreateIcons();
  }

  function resetLectureScheduleFormOverride() {
    const form = document.getElementById("lecture-schedule-form");
    const rowsContainer = document.getElementById("ls-schedule-rows-container");
    if (!form || !rowsContainer) return;
    form.reset();
    rowsContainer.innerHTML = "";
    lsEditingId = null;
    addScheduleRowOverride();
    const submitBtn = document.getElementById("ls-save-btn") || form.querySelector("button[type=\"submit\"]");
    if (submitBtn) submitBtn.innerHTML = "<i data-lucide=\"save\" style=\"width:14px;height:14px;\"></i>Save Schedule";
    safeCreateIcons();
  }

  function submitLectureScheduleFormOverride(e) {
    e.preventDefault();

    const credit = document.getElementById("ls-credit").value;
    const technique = document.getElementById("ls-technique").value;
    const rows = Array.from(document.querySelectorAll("#ls-schedule-rows-container .ls-schedule-row"));

    if (!credit || !technique) {
      showLSNotificationSafe("Please select Course Credit and Teaching Technique", "error");
      return;
    }

    if (rows.length === 0) {
      showLSNotificationSafe("Please add at least one schedule row", "error");
      return;
    }

    const scheduleRows = [];
    for (const row of rows) {
      const days = Array.from(row.querySelectorAll(".ls-day-checkbox:checked")).map(function (cb) { return cb.value; });
      const startTime = row.querySelector(".ls-start-time").value;
      const endTime = row.querySelector(".ls-end-time").value;

      if (days.length === 0 || !startTime || !endTime) {
        showLSNotificationSafe("All schedule rows must include days, start time and end time", "error");
        return;
      }
      if (lsToMinutes(endTime) <= lsToMinutes(startTime)) {
        showLSNotificationSafe("End time must be later than start time", "error");
        return;
      }
      scheduleRows.push({ days: days, startTime: startTime, endTime: endTime });
    }

    const nextId = Math.max(0, ...lectureScheduleData.map(function (r) { return r.id; })) + 1;
    const id = lsEditingId || nextId;
    const record = {
      id: id,
      code: generateScheduleCode(scheduleRows, id),
      description: lsBuildDescription(scheduleRows),
      courseCredit: credit,
      totalCredit: scheduleRows.reduce(function (sum, row) {
        return sum + (lsDurationInHours(row.startTime, row.endTime) * row.days.length);
      }, 0),
      technique: technique,
      category: parseInt(credit.split("+")[0], 10) || 0,
      scheduleRows: scheduleRows,
    };

    if (lsEditingId) {
      const index = lectureScheduleData.findIndex(function (item) { return item.id === lsEditingId; });
      if (index >= 0) lectureScheduleData[index] = record;
      else lectureScheduleData.unshift(record);
    } else {
      lectureScheduleData.unshift(record);
    }

    lsCurrentPage = 1;
    renderLectureScheduleTableOverride();
    const updated = !!lsEditingId;
    resetLectureScheduleFormOverride();
    showLSNotificationSafe(updated ? "Schedule updated successfully!" : "Schedule saved successfully!");
  }

  function renderLectureScheduleTableOverride() {
    const tbody = document.getElementById("ls-table-body");
    const emptyState = document.getElementById("ls-empty-state");
    const totalPagesEl = document.getElementById("ls-total-pages");
    const currentPageEl = document.getElementById("ls-current-page");
    const prevBtn = document.getElementById("ls-prev-btn");
    const nextBtn = document.getElementById("ls-next-btn");
    if (!tbody || !emptyState || !totalPagesEl || !currentPageEl || !prevBtn || !nextBtn) return;

    tbody.innerHTML = "";
    if (!lectureScheduleData.length) {
      emptyState.classList.remove("hidden");
      totalPagesEl.textContent = "1";
      currentPageEl.textContent = "1";
      prevBtn.style.opacity = "0.5";
      nextBtn.style.opacity = "0.5";
      prevBtn.style.pointerEvents = "none";
      nextBtn.style.pointerEvents = "none";
      return;
    }

    emptyState.classList.add("hidden");
    const totalPages = Math.max(1, Math.ceil(lectureScheduleData.length / lsPageSize));
    if (lsCurrentPage > totalPages) lsCurrentPage = totalPages;
    const start = (lsCurrentPage - 1) * lsPageSize;
    const pageRows = lectureScheduleData.slice(start, start + lsPageSize);

    pageRows.forEach(function (item, index) {
      const summary = document.createElement("tr");
      summary.className = "border-t hover:bg-blue-50 transition-colors cursor-pointer";
      summary.style.borderColor = "#e2e8f0";
      summary.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f8fafc";
      summary.innerHTML =
        "<td class=\"text-left px-6 py-3 text-sm font-semibold\" style=\"color:#1e293b;\">" + item.code + "</td>" +
        "<td class=\"text-left px-6 py-3 text-sm\" style=\"color:#475569;\">" + (item.description || lsBuildDescription(item.scheduleRows || [])) + "</td>" +
        "<td class=\"text-center px-6 py-3 text-sm font-medium\" style=\"color:#1e293b;\">" + lsFormatCredit(lsComputeTotalCredit(item)) + "</td>" +
        "<td class=\"text-center px-6 py-3 text-sm\" style=\"color:#475569;\">" + (item.technique || "-") + "</td>" +
        "<td class=\"text-center px-6 py-3 text-sm font-medium\" style=\"color:#1e293b;\">" + lsComputeCategory(item) + "</td>" +
        "<td class=\"text-center px-6 py-3\"><div class=\"flex gap-2 justify-center\">" +
        "<button onclick=\"toggleLSDetail(this, " + item.id + ")\" class=\"px-2 py-1 text-xs border rounded\" style=\"border-color:#e2e8f0;color:#3b82f6;background-color:#eff6ff;\">Hide</button>" +
        "<button onclick=\"editLSSchedule(" + item.id + ")\" class=\"w-7 h-7 rounded flex items-center justify-center hover:bg-amber-100\" title=\"Edit\"><i data-lucide=\"pencil\" style=\"width:12px;height:12px;color:#f59e0b;\"></i></button>" +
        "<button onclick=\"deleteLSSchedule(" + item.id + ")\" class=\"w-7 h-7 rounded flex items-center justify-center hover:bg-red-100\" title=\"Delete\"><i data-lucide=\"trash-2\" style=\"width:12px;height:12px;color:#ef4444;\"></i></button>" +
        "</div></td>";
      tbody.appendChild(summary);

      const details = (item.scheduleRows || []).map(function (row) {
        const perDayCredit = lsFormatCredit(lsDurationInHours(row.startTime, row.endTime));
        return row.days.map(function (day) {
          return "<tr>" +
            "<td class=\"text-left px-4 py-2 text-xs\" style=\"color:#1e293b;\">" + day + "</td>" +
            "<td class=\"text-left px-4 py-2 text-xs\" style=\"color:#475569;\">" + (lsDayLabels[day] || "-") + "</td>" +
            "<td class=\"text-center px-4 py-2 text-xs font-medium\" style=\"color:#1e293b;\">" + lsFormatTimeDisplay(row.startTime) + "</td>" +
            "<td class=\"text-center px-4 py-2 text-xs font-medium\" style=\"color:#1e293b;\">" + lsFormatTimeDisplay(row.endTime) + "</td>" +
            "<td class=\"text-center px-4 py-2 text-xs font-medium\" style=\"color:#3b82f6;\">" + perDayCredit + "</td>" +
            "</tr>";
        }).join("");
      }).join("");

      const detailRow = document.createElement("tr");
      detailRow.id = "detail-" + item.id;
      detailRow.className = "ls-detail-row";
      detailRow.innerHTML = "<td colspan=\"6\" class=\"px-6 py-4\"><div class=\"ml-4 rounded-lg overflow-hidden\" style=\"background-color:#ffffff;border:1px solid #e2e8f0;\"><table class=\"w-full text-sm\"><thead><tr style=\"background-color:#f0f4f8;\"><th class=\"text-left px-4 py-2 text-[10px] font-semibold uppercase\" style=\"color:#475569;\">Day (Malay)</th><th class=\"text-left px-4 py-2 text-[10px] font-semibold uppercase\" style=\"color:#475569;\">Day (Eng)</th><th class=\"text-center px-4 py-2 text-[10px] font-semibold uppercase\" style=\"color:#475569;\">Time Start</th><th class=\"text-center px-4 py-2 text-[10px] font-semibold uppercase\" style=\"color:#475569;\">Time End</th><th class=\"text-center px-4 py-2 text-[10px] font-semibold uppercase\" style=\"color:#475569;\">Credit</th></tr></thead><tbody>" + details + "</tbody></table></div></td>";
      tbody.appendChild(detailRow);
      summary.addEventListener("click", function (evt) {
        if (!evt.target.closest("button")) toggleLSDetailRow("detail-" + item.id);
      });
    });

    totalPagesEl.textContent = String(totalPages);
    currentPageEl.textContent = String(lsCurrentPage);
    prevBtn.style.opacity = lsCurrentPage === 1 ? "0.5" : "1";
    nextBtn.style.opacity = lsCurrentPage === totalPages ? "0.5" : "1";
    prevBtn.style.pointerEvents = lsCurrentPage === 1 ? "none" : "auto";
    nextBtn.style.pointerEvents = lsCurrentPage === totalPages ? "none" : "auto";
    safeCreateIcons();
  }

  function editLSScheduleOverride(id) {
    const form = document.getElementById("lecture-schedule-form");
    const container = document.getElementById("ls-schedule-rows-container");
    const item = lectureScheduleData.find(function (row) { return row.id === id; });
    if (!form || !container || !item) return;

    document.getElementById("ls-credit").value = item.courseCredit || item.credit || "";
    document.getElementById("ls-technique").value = item.technique || "";
    container.innerHTML = "";
    (item.scheduleRows || []).forEach(function (row) { addScheduleRowOverride(row); });
    if (!container.children.length) addScheduleRowOverride();

    lsEditingId = id;
    const submitBtn = document.getElementById("ls-save-btn") || form.querySelector("button[type=\"submit\"]");
    if (submitBtn) submitBtn.innerHTML = "<i data-lucide=\"save\" style=\"width:14px;height:14px;\"></i>Update Schedule";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    safeCreateIcons();
  }

  function deleteLSScheduleOverride(id) {
    if (!confirm("Delete this schedule combination? This action cannot be undone.")) return;
    lectureScheduleData = lectureScheduleData.filter(function (row) { return row.id !== id; });
    const maxPage = Math.max(1, Math.ceil(lectureScheduleData.length / lsPageSize));
    if (lsCurrentPage > maxPage) lsCurrentPage = maxPage;
    renderLectureScheduleTableOverride();
    showLSNotificationSafe("Schedule deleted successfully!");
  }

  function exportLectureScheduleDataOverride() {
    if (!lectureScheduleData.length) {
      showLSNotificationSafe("No data to export", "error");
      return;
    }

    let csv = "Code,Description,Credit,Teach_Tech,Course_cat\n";
    lectureScheduleData.forEach(function (item) {
      const credit = lsFormatCredit(lsComputeTotalCredit(item));
      const category = lsComputeCategory(item);
      const description = item.description || lsBuildDescription(item.scheduleRows || []);
      csv += "\"" + (item.code || "") + "\",\"" + description + "\",\"" + credit + "\",\"" + (item.technique || "") + "\",\"" + category + "\"\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lecture_schedule_combinations.csv";
    link.click();
    URL.revokeObjectURL(url);
    showLSNotificationSafe("Data exported successfully!");
  }

  function setupLectureScheduleEventListenersOverride() {
    const form = document.getElementById("lecture-schedule-form");
    const addRowBtn = document.getElementById("ls-add-row-btn");
    const cancelBtn = document.getElementById("ls-cancel-btn");
    const exportBtn = document.getElementById("ls-export-btn");
    const pageSize = document.getElementById("ls-page-size");
    const prevBtn = document.getElementById("ls-prev-btn");
    const nextBtn = document.getElementById("ls-next-btn");
    const rowsContainer = document.getElementById("ls-schedule-rows-container");
    if (!form || !addRowBtn || !cancelBtn || !exportBtn || !pageSize || !prevBtn || !nextBtn || !rowsContainer) return;
    if (form.dataset.lsBound === "1") return;
    form.dataset.lsBound = "1";

    form.addEventListener("submit", function (e) {
      if (e.__lsHandled) return;
      submitLectureScheduleFormOverride(e);
    });
    addRowBtn.addEventListener("click", function (e) {
      if (e.__lsHandled) return;
      e.preventDefault();
      addScheduleRowOverride();
    });
    cancelBtn.addEventListener("click", function (e) {
      if (e.__lsHandled) return;
      e.preventDefault();
      resetLectureScheduleFormOverride();
    });
    exportBtn.addEventListener("click", exportLectureScheduleDataOverride);

    rowsContainer.addEventListener("click", function (e) {
      const removeBtn = e.target.closest(".ls-remove-row-inline");
      const row = e.target.closest(".ls-schedule-row");
      if (!row) return;

      if (removeBtn) {
        e.preventDefault();
        if (rowsContainer.querySelectorAll(".ls-schedule-row").length <= 1) {
          showLSNotificationSafe("At least one schedule row is required", "error");
          return;
        }
        row.remove();
      }
    });

    pageSize.addEventListener("change", function (e) {
      lsPageSize = parseInt(e.target.value, 10) || 10;
      lsCurrentPage = 1;
      renderLectureScheduleTableOverride();
    });
    prevBtn.addEventListener("click", function () {
      if (lsCurrentPage > 1) {
        lsCurrentPage -= 1;
        renderLectureScheduleTableOverride();
      }
    });
    nextBtn.addEventListener("click", function () {
      const maxPage = Math.max(1, Math.ceil(lectureScheduleData.length / lsPageSize));
      if (lsCurrentPage < maxPage) {
        lsCurrentPage += 1;
        renderLectureScheduleTableOverride();
      }
    });
  }

  function initLectureScheduleModuleOverride() {
    if (!Array.isArray(lectureScheduleData)) lectureScheduleData = [];
    if (typeof lsCurrentPage !== "number" || lsCurrentPage < 1) lsCurrentPage = 1;
    if (typeof lsPageSize !== "number" || lsPageSize < 1) lsPageSize = 10;
    setupLectureScheduleEventListenersOverride();
    const container = document.getElementById("ls-schedule-rows-container");
    if (container && container.children.length === 0) addScheduleRowOverride();
    renderLectureScheduleTableOverride();
    safeCreateIcons();
  }

  window.addScheduleRow = addScheduleRowOverride;
  window.submitLectureScheduleForm = submitLectureScheduleFormOverride;
  window.resetLectureScheduleForm = resetLectureScheduleFormOverride;
  window.renderLectureScheduleTable = renderLectureScheduleTableOverride;
  window.editLSSchedule = editLSScheduleOverride;
  window.deleteLSSchedule = deleteLSScheduleOverride;
  window.exportLectureScheduleData = exportLectureScheduleDataOverride;
  window.setupLectureScheduleEventListeners = setupLectureScheduleEventListenersOverride;
  window.initLectureScheduleModule = initLectureScheduleModuleOverride;
  window.toggleLSDetailRow = function (detailId) {
    const row = document.getElementById(detailId);
    if (!row) return;
    row.classList.toggle("hidden");
  };
  window.toggleLSDetail = function (btn, scheduleId) {
    const row = document.getElementById("detail-" + scheduleId);
    if (!row) return;
    row.classList.toggle("hidden");
    btn.textContent = row.classList.contains("hidden") ? "View" : "Hide";
  };

  if (typeof submenuModuleMap !== "undefined") {
    if (submenuModuleMap["lecture-schedule"]) {
      submenuModuleMap["lecture-schedule"].init = window.initLectureScheduleModule;
    }
    if (submenuModuleMap["lecture-schedule-combination"]) {
      submenuModuleMap["lecture-schedule-combination"].init = window.initLectureScheduleModule;
    }
  }

  if (!window.__lsSubmitCaptureBound) {
    document.addEventListener("submit", function (event) {
      const target = event.target;
      if (!target || target.id !== "lecture-schedule-form") return;
      if (target.dataset.lsBound === "1") return;
      event.preventDefault();
      if (typeof window.submitLectureScheduleForm === "function") {
        window.submitLectureScheduleForm(event);
      }
    }, true);
    window.__lsSubmitCaptureBound = true;
  }

  const moduleEl = document.getElementById("lecture-schedule-combination-module");
  if (moduleEl && !moduleEl.classList.contains("hidden")) {
    window.initLectureScheduleModule();
  }
})();
