// SIRAS – Skill-Based Intelligent Resource Allocation System
// Frontend demo – Pure HTML/CSS/JS

let mockData = null;
let currentEmployee = null;
let radarChart = null;
let skillsList = []; // dynamically loaded from mockData

// Matrix sorting state
let matrixSkillNames = []; // will be populated from mockData.skills_master

let matrixSort = { key: "department", dir: "desc" };
// FullCalendar instance
let fullCalendar = null;
const views = {
    dashboard: document.getElementById("view-dashboard"),
    "resource-pool": document.getElementById("view-resource-pool"),
    "skill-matrix": document.getElementById("view-skill-matrix"),
    "project-list": document.getElementById("view-project-list"),
    "ai-recommendation": document.getElementById("view-ai-recommendation"),
    "workload-overview": document.getElementById("view-workload-overview"),
    "notification-center": document.getElementById("view-notification-center"),
    reports: document.getElementById("view-reports"),
    "employee-detail": document.getElementById("view-employee-detail"),
};

const navButtons = Array.from(document.querySelectorAll(".nav-item"));
const departmentFilter = document.getElementById("department-filter");
const exportExcelBtn = document.getElementById("export-excel-btn");
const skillMatrixBody = document.getElementById("skill-matrix-body");
const backToMatrixBtn = document.getElementById("back-to-matrix-btn");

// Employee detail DOM
const employeeStatusPill = document.getElementById("employee-status-pill");
const employeeExperiencePill = document.getElementById(
    "employee-experience-pill"
);
const employeeAvatar = document.getElementById("employee-avatar");
const employeeNameMain = document.getElementById("employee-name-main");
const employeeRoleMain = document.getElementById("employee-role-main");
const employeeDepartmentMeta = document.getElementById(
    "employee-department-meta"
);
const employeeExperienceMeta = document.getElementById(
    "employee-experience-meta"
);
const employeeAiSummary = document.getElementById("employee-ai-summary");

const heatmapToggle = document.getElementById("heatmap-toggle");
const heatmapToggleIcon = document.getElementById("heatmap-toggle-icon");
const heatmapBody = document.getElementById("heatmap-body");
const heatmapList = document.getElementById("skill-heatmap-list");

const aiGrowthList = document.getElementById("ai-growth-list");
const aiDecayList = document.getElementById("ai-decay-list");
const aiRecommendationText = document.getElementById("ai-recommendation-text");

const courseTabs = document.getElementById("course-tabs");
const currentCoursesList = document.getElementById("current-courses-list");
const recommendedCoursesList = document.getElementById(
    "recommended-courses-list"
);
const historyCoursesList = document.getElementById("history-courses-list");

const courseCalendar = document.getElementById("course-calendar");
const projectHistoryTimeline = document.getElementById(
    "project-history-timeline"
);
const calendarViewBtns = document.querySelectorAll(".calendar-view-btn");

let calendarViewMode = "month";

const radarCanvas = document.getElementById("skill-radar-chart");

// Utilities

// sidebar

document.addEventListener("DOMContentLoaded", () => {
    const appShell = document.querySelector(".app-shell");
    const toggleBtn = document.getElementById("sidebar-toggle");
    const overlay = document.getElementById("sidebar-overlay");
    const navItems = document.querySelectorAll(".sidebar .nav-item");

    // Toggle sidebar
    toggleBtn.addEventListener("click", () => {
        appShell.classList.toggle("sidebar-open");
    });

    // Click overlay → đóng
    overlay.addEventListener("click", () => {
        appShell.classList.remove("sidebar-open");
    });

    // 👉 Click menu item → đóng sidebar (mobile)
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            if (window.innerWidth <= 1024) {
                appShell.classList.remove("sidebar-open");
            }
        });
    });

    // Resize lên desktop → reset
    window.addEventListener("resize", () => {
        if (window.innerWidth >= 1024) {
            appShell.classList.remove("sidebar-open");
        }
    });

    // Matrix header controls: search, import, department filter, export
    const matrixSearchEl = document.getElementById("matrix-search");
    const importBtn = document.getElementById("import-btn");
    const importFileInput = document.getElementById("import-file");
    if (matrixSearchEl) matrixSearchEl.addEventListener("input", renderSkillMatrix);
    if (departmentFilter) departmentFilter.addEventListener("change", renderSkillMatrix);
    if (exportExcelBtn) exportExcelBtn.addEventListener("click", exportMatrixToCsv);
    if (importBtn) {
        importBtn.addEventListener("click", () => {
            alert("Currently only mock, not yet attached to actual data processing.");
        });
    }
});


// donglt

function populateDepartmentFilter() {
    if (!mockData || !mockData.employees) return;

    const groups = new Set(
        mockData.employees.map((emp) => emp.group).filter(Boolean)
    );

    if (departmentFilter && groups.size > 0) {
        departmentFilter.innerHTML = '<option value="all">All Teams</option>';
        Array.from(groups)
            .sort()
            .forEach((dept) => {
                const option = document.createElement("option");
                option.value = dept;
                option.textContent = dept;
                departmentFilter.appendChild(option);
            });
    }
}

function showView(key) {
    Object.entries(views).forEach(([name, el]) => {
        if (!el) return;
        el.hidden = name !== key;
    });
}

function setActiveNav(viewKey) {
    navButtons.forEach((btn) => {
        const key = btn.getAttribute("data-view");
        btn.classList.toggle("nav-item--active", key === viewKey);
    });
}

function mapSkillLevelToLabel(level) {
    // Map numeric levels to symbol labels for display
    // 1,2 -> △ ; 3,4 -> ◯ ; 5 -> ◉
    if (level === 1 || level === 2) return '△';
    if (level === 3 || level === 4) return '◯';
    if (level === 5) return '◉';
    return '';
}

function mapSkillLevelToClass(level) {
    return `skill-badge--level-${level}`;
}

function formatDate(dateStr) {
    if (!dateStr) return "Not used recently";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function getInitials(name) {
    return name
        .split(" ")
        .map((part) => part[0])
        .filter(Boolean)
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function createElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
}

// Skill matrix rendering

function getSkillLevel(employee, skillName) {
    const found = employee.skills.find(
        (s) => s.name.toLowerCase() === skillName.toLowerCase()
    );
    return found || null;
}

function renderSkillCell(td, employee, skillName, category = "") {
    const skill = getSkillLevel(employee, skillName);

    // Determine input type based on category
    const isPGLanguage = category === "PG Language";
    const useNumericInput = isPGLanguage;

    if (!skill || !skill.level) {
        if (useNumericInput) {
            // Render number input for years of experience
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.step = '0.5';
            input.className = 'skill-number-input';
            input.title = `${skillName}: years of experience`;
            input.dataset.skillName = skillName;
            input.addEventListener('change', (e) => {
                e.stopPropagation();
                const val = e.target.value ? Number(e.target.value) : null;
                let s = employee.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
                if (!s) {
                    s = { name: skillName, level: val };
                    employee.skills.push(s);
                } else {
                    s.level = val;
                }
            });
            td.appendChild(input);
            return;
        }

        // render an editable select with empty/default value
        const sel = document.createElement('select');
        sel.className = 'skill-select';
        sel.title = `${skillName}: no recent activity`;
        sel.dataset.skillName = skillName;

        const isLanguage = category === "Language";

        // Order: -, △, ◯, ◉ (Language excludes ◉)
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '';
        sel.appendChild(emptyOpt);

        const triangleOpt = document.createElement('option');
        // represent △ with numeric value 2 (maps from levels 1-2)
        triangleOpt.value = '2';
        triangleOpt.textContent = '△';
        sel.appendChild(triangleOpt);

        const circleOpt = document.createElement('option');
        // represent ◯ with numeric value 3 (maps from levels 3-4)
        circleOpt.value = '3';
        circleOpt.textContent = '◯';
        sel.appendChild(circleOpt);

        // Add ◉ (filled circle) for non-Language categories only
        if (!isLanguage && !isPGLanguage) {
            const filledCircleOpt = document.createElement('option');
            // represent ◉ with numeric value 5 (maps from level 5)
            filledCircleOpt.value = '5';
            filledCircleOpt.textContent = '◉';
            sel.appendChild(filledCircleOpt);
        }
        sel.addEventListener('click', (e) => e.stopPropagation());
        sel.addEventListener('change', (e) => {
            e.stopPropagation();
            // ignore change events triggered by preview unless user committed
            if (sel.__previewing && !sel.__committed) return;
            const val = e.target.value ? Number(e.target.value) : null;
            // update employee data model
            let s = employee.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
            if (!s) {
                s = { name: skillName, level: val };
                employee.skills.push(s);
            } else {
                s.level = val;
            }
            sel.__committed = false;
            sel.__previewing = false;
        });
        td.appendChild(sel);
        return;
    }
    const level = skill.level;

    if (useNumericInput) {
        // Render number input with current value
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '0.5';
        input.value = level || '';
        input.className = 'skill-number-input';
        input.title = `${skillName}: years of experience`;
        input.dataset.skillName = skillName;
        input.addEventListener('change', (e) => {
            e.stopPropagation();
            const val = e.target.value ? Number(e.target.value) : null;
            const s = employee.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
            if (s) s.level = val;
        });
        td.appendChild(input);
        return;
    }

    // render select with current level selected, no color styling
    const sel = document.createElement('select');
    sel.className = 'skill-select';
    sel.title = `${skillName}`;
    sel.dataset.skillName = skillName;

    const isLanguage = category === "Language";

    // Order: -, △, ◯, ◉ (Language excludes ◉)
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '';
    if (!level) emptyOpt.selected = true;
    sel.appendChild(emptyOpt);

    const triangleOpt = document.createElement('option');
    triangleOpt.value = '2';
    triangleOpt.textContent = '△';
    // select △ for level 1 or 2
    if (level === 1 || level === 2) triangleOpt.selected = true;
    sel.appendChild(triangleOpt);

    const circleOpt = document.createElement('option');
    circleOpt.value = '3';
    circleOpt.textContent = '◯';
    // select ◯ for level 3 or 4; Language level 5 also maps to ◯
    if (level === 3 || level === 4 || (isLanguage && level === 5)) circleOpt.selected = true;
    sel.appendChild(circleOpt);

    // Add ◉ (filled circle) for non-Language categories only
    if (!isLanguage && !isPGLanguage) {
        const filledCircleOpt = document.createElement('option');
        // represent ◉ with numeric value 5 (maps from level 5)
        filledCircleOpt.value = '5';
        filledCircleOpt.textContent = '◉';
        if (level === 5) filledCircleOpt.selected = true;
        sel.appendChild(filledCircleOpt);
    }
    sel.addEventListener('click', (e) => e.stopPropagation());
    sel.addEventListener('change', (e) => {
        e.stopPropagation();
        if (sel.__previewing && !sel.__committed) return;
        const val = e.target.value ? Number(e.target.value) : null;
        const s = employee.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
        if (s) s.level = val;
        sel.__committed = false;
        sel.__previewing = false;
    });
    td.appendChild(sel);
}

function initMatrixSorting() {
    // Setup sorting controls for skill matrix
    // This function initializes event listeners for sorting if needed
    // Currently matrixSort is set to { key: "department", dir: "desc" }
}

function renderSkillMatrix() {
    if (!mockData) {
        console.warn("renderSkillMatrix: mockData is null");
        return;
    }

    console.log("renderSkillMatrix: START, mockData.employees =", mockData.employees?.length);

    const selectedDept = departmentFilter ? departmentFilter.value : "all";
    const searchTerm = (document.getElementById("matrix-search") ? document.getElementById("matrix-search").value.trim().toLowerCase() : "");
    const employees = mockData.employees || [];
    const thead = document.querySelector(".skill-matrix thead");
    const skillMatrixBody = document.getElementById("skill-matrix-body");

    console.log("renderSkillMatrix: employees =", employees.length, "thead =", thead ? "found" : "NOT FOUND", "body =", skillMatrixBody ? "found" : "NOT FOUND");

    if (!thead || !skillMatrixBody) {
        console.warn("renderSkillMatrix: DOM elements not found!");
        return;
    }

    // Filter employees
    const filtered = employees.filter((emp) => {
        if (selectedDept && selectedDept !== "all") {
            const deptVal = emp.department || emp.group || emp.group_name || emp.department_name || "";
            if (deptVal !== selectedDept) return false;
        }
        if (searchTerm) {
            const hay = ((emp.name || emp.full_name || emp.email || emp.id || "") + "").toLowerCase();
            if (!hay.includes(searchTerm)) return false;
        }
        return true;
    });

    // Sort by department then name
    filtered.sort((a, b) => {
        const deptA = (a.department || a.group || "").toLowerCase();
        const deptB = (b.department || b.group || "").toLowerCase();
        if (deptA !== deptB) return deptA.localeCompare(deptB);
        const nameA = (a.name || a.full_name || "").toLowerCase();
        const nameB = (b.name || b.full_name || "").toLowerCase();
        return nameA.localeCompare(nameB);
    });

    // Build columns for skills; header will be 3 rows: Category, Sub-Category, Skill
    skillMatrixBody.innerHTML = "";
    const categories = mockData.skill_categories || [];
    const skillsMaster = mockData.skills_master || [];

    // Build mapping: category -> subcategory -> skills
    const catMap = {};
    // Ensure using canonical keys from categories list
    const topCategories = categories.filter(c => c.level === 1);
    // helper to push skill under category/subcategory
    const pushSkill = (catName, subName, sk) => {
        if (!catMap[catName]) catMap[catName] = {};
        const subKey = subName || '';
        if (!catMap[catName][subKey]) catMap[catName][subKey] = [];
        catMap[catName][subKey].push(sk);
    };

    if (topCategories.length > 0) {
        topCategories.forEach(top => {
            const subs = categories.filter(c => c.parent_id === top.id);
            if (subs.length > 0) {
                subs.forEach(s => {
                    skillsMaster.filter(sk => sk.cat_id === s.id).forEach(sk => pushSkill(top.cat_name, s.cat_name, sk));
                });
            } else {
                skillsMaster.filter(sk => sk.cat_id === top.id).forEach(sk => pushSkill(top.cat_name, '', sk));
            }
        });
    } else {
        // fallback: no category metadata, group all skills under 'Skills'
        skillsMaster.forEach(sk => pushSkill('Skills', '', sk));
    }

    // Flatten ordered lists for header generation
    const headerCategories = Object.keys(catMap);
    // total skill columns count
    let totalSkillCols = 0;
    headerCategories.forEach(cat => {
        Object.keys(catMap[cat]).forEach(sub => {
            totalSkillCols += catMap[cat][sub].length;
        });
    });

    // Build THEAD with 3 rows
    // First row: Employee, Team (rowspan=3) + Category headers with colspan
    let theadHtml = '<tr>';
    theadHtml += '<th class="employee-col" rowspan="3">Employee</th>';
    theadHtml += '<th class="team-col-header" rowspan="3">Team</th>';
    headerCategories.forEach(cat => {
        let catSpan = 0;
        Object.keys(catMap[cat]).forEach(sub => { catSpan += catMap[cat][sub].length; });
        theadHtml += `<th class="cat-header" colspan="${catSpan}">${cat}</th>`;
    });
    theadHtml += '</tr>';

    // Second row: Sub-categories
    theadHtml += '<tr>';
    headerCategories.forEach(cat => {
        Object.keys(catMap[cat]).forEach(sub => {
            const span = catMap[cat][sub].length;
            theadHtml += `<th class="subcat-header" colspan="${span}">${sub || ''}</th>`;
        });
    });
    theadHtml += '</tr>';

    // Third row: Skill labels
    theadHtml += '<tr>';
    headerCategories.forEach(cat => {
        Object.keys(catMap[cat]).forEach(sub => {
            catMap[cat][sub].forEach(sk => {
                const name = sk.skill_name || sk.name || sk.skillName || '';
                theadHtml += `<th class="skill-header" data-skill-name="${name}">${name}</th>`;
            });
        });
    });
    theadHtml += '</tr>';

    thead.innerHTML = theadHtml;

    // Now render one row per employee
    const skillOrder = [];
    headerCategories.forEach(cat => Object.keys(catMap[cat]).forEach(sub => catMap[cat][sub].forEach(sk => skillOrder.push({ skill: sk, category: cat, subcategory: sub }))));


    filtered.forEach(emp => {
        const tr = document.createElement('tr');
        tr.className = 'employee-row';
        tr.dataset.employeeId = emp.id;

        const nameTd = document.createElement('td');
        nameTd.className = 'employee-name-col';
        nameTd.textContent = emp.name || emp.full_name || 'Unknown';
        nameTd.title = emp.email || '';
        tr.appendChild(nameTd);

        const teamTd = document.createElement('td');
        teamTd.className = 'team-col';
        teamTd.textContent = emp.department || emp.group || '';
        tr.appendChild(teamTd);

        // skill cells
        skillOrder.forEach(item => {
            const td = document.createElement('td');
            const skillName = item.skill.skill_name || item.skill.name || item.skill.skillName || '';
            renderSkillCell(td, emp, skillName, item.category);
            tr.appendChild(td);
        });

        // row click open detail
        tr.addEventListener('click', () => openEmployeeDetail(emp.id));

        skillMatrixBody.appendChild(tr);
    });
}

function openEmployeeDetail(employeeId) {
    if (!mockData) return;
    const employee = mockData.employees.find((e) => e.id === employeeId);
    if (!employee) return;
    currentEmployee = employee;

    initCourseTabs();
    initTimelineSchedule(employee);
    populateEmployeeOverview(employee);
    populateRadarChart(employee);
    populateHeatmap(employee);
    populateAiAnalysis(employee);
    populateCourses(employee);
    populateProjectHistory(employee);

    setActiveNav(null); // clear nav active; detail is context view
    showView("employee-detail");
    updateEmployeeAvatar(employee);

    // Populate calendar AFTER the view is visible to avoid FullCalendar height collapse
    // (rendering while hidden can cause a collapsed height until a browser repaint)
    setTimeout(() => {
        populateCalendar(employee);
        if (fullCalendar) {
            // ensure FullCalendar recalculates sizes now that container is visible
            try {
                fullCalendar.updateSize();
            } catch (e) {
                // ignore
            }
        }
    }, 30);
}

function populateEmployeeOverview(emp) {
    employeeStatusPill.textContent = emp.availabilityStatus;
    employeeExperiencePill.textContent = `${emp.experienceYears} years`;

    employeeAvatar.textContent = getInitials(emp.name);
    employeeNameMain.textContent = emp.name;
    employeeRoleMain.textContent = emp.role;
    employeeDepartmentMeta.textContent = emp.department;
    employeeExperienceMeta.textContent = `${emp.experienceYears} years experience`;

    employeeAiSummary.textContent =
        emp.aiSummary ||
        "Employee shows balanced capability profile with clear opportunities for targeted training and project assignments.";
}

// Skill guide modal behavior
(function () {
    const guideBtn = document.getElementById('skill-guide-btn');
    const guideModal = document.getElementById('skill-guide-modal');
    const guideClose = document.getElementById('skill-guide-close');
    const guideOverlay = guideModal ? guideModal.querySelector('[data-role="overlay"]') : null;
    let lastFocusedBeforeGuide = null;

    function onKeyDown(e) {
        if (e.key === 'Escape') hideGuide();
    }

    function showGuide() {
        if (!guideModal) return;
        lastFocusedBeforeGuide = document.activeElement;
        guideModal.setAttribute('aria-hidden', 'false');
        guideModal.classList.add('open');
        if (guideClose && typeof guideClose.focus === 'function') guideClose.focus();
        document.addEventListener('keydown', onKeyDown);
    }

    function hideGuide() {
        if (!guideModal) return;
        guideModal.setAttribute('aria-hidden', 'true');
        guideModal.classList.remove('open');
        if (lastFocusedBeforeGuide && typeof lastFocusedBeforeGuide.focus === 'function') lastFocusedBeforeGuide.focus();
        document.removeEventListener('keydown', onKeyDown);
    }

    if (guideBtn) guideBtn.addEventListener('click', function (e) { e.preventDefault(); showGuide(); });
    if (guideClose) guideClose.addEventListener('click', function (e) { e.preventDefault(); hideGuide(); });
    if (guideOverlay) guideOverlay.addEventListener('click', function () { hideGuide(); });
})();

function buildRadarTripleScore(emp, categories, skillsMaster) {
    const parents = categories.filter(c => c.level === 1);

    // map skill_id -> employee skill object
    const empSkillMap = Object.fromEntries(
        (emp.skills || []).map(s => [s.skill_id, s])
    );

    const labels = [];
    const levelData = [];
    const startLevelData = [];
    const goalLevelData = [];

    parents.forEach(parent => {
        const childCats = categories.filter(c => c.parent_id === parent.id);

        let levelSum = 0;
        let startSum = 0;
        let goalSum = 0;

        childCats.forEach(cat => {
            skillsMaster
                .filter(skill => skill.cat_id === cat.id)
                .forEach(skill => {
                    const empSkill = empSkillMap[skill.id];
                    if (!empSkill) return;

                    levelSum += empSkill.level || 0;
                    startSum += empSkill.startLevel || 0;
                    goalSum += empSkill.goalLevel || skill.goalLevel || 0;
                });
        });

        labels.push(parent.cat_name);
        levelData.push(levelSum);
        startLevelData.push(startSum);
        goalLevelData.push(goalSum);
    });

    return {
        labels,
        datasets: {
            levelData,
            startLevelData,
            goalLevelData
        }
    };
}

function populateRadarChart(emp) {
    if (!radarCanvas) return;

    const { labels, datasets } = buildRadarTripleScore(
        emp,
        mockData.skill_categories,
        mockData.skills_master
    );

    const radarDatasets = [
        {
            label: "Current Level",
            data: datasets.levelData,
            backgroundColor: "rgba(37, 99, 235, 0.2)",
            borderColor: "rgba(37, 99, 235, 1)",
            borderWidth: 2,
            pointRadius: 3,
        },
        {
            label: "Start Level",
            data: datasets.startLevelData,
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            borderColor: "rgba(16, 185, 129, 1)",
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 2,
        },
        {
            label: "Goal Level",
            data: datasets.goalLevelData,
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            borderColor: "rgba(239, 68, 68, 1)",
            borderWidth: 2,
            pointRadius: 2,
        }
    ];

    if (radarChart) {
        radarChart.data.labels = labels;
        radarChart.data.datasets = radarDatasets;
        radarChart.update();
        return;
    }

    radarChart = new Chart(radarCanvas, {
        type: "radar",
        data: {
            labels,
            datasets: radarDatasets,
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    suggestedMin: 0,
                    suggestedMax: 20, // vì là tổng nhiều skill
                    ticks: { display: false },
                },
            },
            plugins: {
                legend: {
                    position: "top",
                },
            },
        },
    });
}



function getLevelBadge(level) {
    const lvl = Math.max(1, Math.min(5, level || 1)); // đảm bảo 1-5
    return `<span class="skill-badge skill-badge--level-${lvl}">${lvl}</span>`;
}

function populateHeatmap(emp) {
    heatmapList.innerHTML = "";

    if (!emp || !emp.skills || emp.skills.length === 0) {
        heatmapList.innerHTML = '<div class="empty-state"><p>No skill</p></div>';
        return;
    }

    const table = document.createElement("table");
    table.className = "skill-table";

    table.innerHTML = `
        <thead>
            <tr>
                <th>Skill Name</th>
                <th>Start Level</th>
                <th>Current Level</th>
                <th>Goal Level</th>
                <th>Trend</th>
                <th>Comment</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    const skills = [...emp.skills].sort(
        (a, b) => (b.level || 0) - (a.level || 0)
    );

    skills.forEach((skill, index) => {
        const comment = getSkillComment(skill);
        const trendHtml = renderTrend(skill);

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${skill.name}</td>
            <td>${getLevelBadge(skill.startLevel)}</td>
            <td>${getLevelBadge(skill.level)}</td>
            <td>
                <span class="goal-badge" data-index="${index}">${getLevelBadge(skill.goalLevel)}</span>
            </td>
            <td>${trendHtml}</td>
            <td>${comment}</td>
        `;

        tbody.appendChild(tr);
    });

    // Thêm sự kiện click cho badge để edit
    tbody.querySelectorAll(".goal-badge").forEach(span => {
        span.addEventListener("click", (e) => {
            const idx = parseInt(span.dataset.index);
            const skill = emp.skills[idx];

            // Tạo input thay thế badge
            const input = document.createElement("input");
            input.type = "number";
            input.min = 1;
            input.max = 5;
            input.value = skill.goalLevel || 0;
            input.className = "goal-input";

            // Khi input mất focus hoặc nhấn Enter, cập nhật và quay về badge
            const save = () => {
                let val = parseInt(input.value);
                if (isNaN(val)) val = 0;
                skill.goalLevel = val;

                // Cập nhật badge mới
                span.innerHTML = getLevelBadge(val);
                span.style.display = "";
                input.remove();
                populateRadarChart(emp);
            };

            input.addEventListener("blur", save);
            input.addEventListener("keydown", (ev) => {
                if (ev.key === "Enter") {
                    input.blur();
                }
            });
            input.className = "goal-input"; 

            // Thay badge bằng input
            span.style.display = "none";
            span.parentElement.appendChild(input);
            input.focus();
        });
    });

    heatmapList.appendChild(table);
}


document.querySelectorAll('.tabs-header .tab').forEach(btn => {
    btn.addEventListener('click', () => {
        const headerGroup = btn.closest('.tabs-header');
        headerGroup
            .querySelectorAll('.tab')
            .forEach(t => t.classList.remove('tab--active'));
        btn.classList.add('tab--active');

        const tabId = btn.dataset.tab;
        const panelsContainer = headerGroup.nextElementSibling; // chỉ panel chính
        panelsContainer
            .querySelectorAll('.tab-panel')
            .forEach(panel => {
                panel.hidden = panel.id !== `tab-${tabId}`;
            });
        console.log(tabId)
        if (tabId === "courses") {
            // App logic để render courses
            setTimeout(() => {
                if (currentEmployee) {
                    populateCourses(currentEmployee);
                }

                // ==== MAKE FIRST SUBTAB VISIBLE ====
                const courseTabsContainer = document.getElementById("course-tabs");
                if (courseTabsContainer) {
                    // remove active ở tất cả subtabs
                    const subBtns = courseTabsContainer.querySelectorAll(".tab");
                    subBtns.forEach((btn) => btn.classList.remove("tab--active"));

                    // chọn default là Current Courses
                    const defaultBtn = courseTabsContainer.querySelector("[data-tab='current']");
                    if (defaultBtn) defaultBtn.classList.add("tab--active");

                    // show chỉ panel current
                    const panelWrapper = courseTabsContainer.closest(".panel-body");
                    const nestedPanels = panelWrapper.querySelectorAll(".tab-panels > .tab-panel");
                    nestedPanels.forEach((panel) => {
                        panel.hidden = panel.id !== "tab-current";
                    });
                }
            }, 0);
        }
    });
});

function populateAiAnalysis(emp) {
    aiGrowthList.innerHTML = "";
    aiDecayList.innerHTML = "";

    const growth = (emp.aiGrowthList || []).slice();
    const decay = (emp.aiDecayList || []).slice();

    growth.forEach((item) => {
        const li = document.createElement("li");
        const tag = createElement("span", "tag", item);
        li.appendChild(tag);
        aiGrowthList.appendChild(li);
    });

    decay.forEach((item) => {
        const li = document.createElement("li");
        const tag = createElement("span", "tag tag--danger", item);
        li.appendChild(tag);
        aiDecayList.appendChild(li);
    });

    aiRecommendationText.textContent =
        emp.aiRecommendation ||
        "Prioritize cross-functional projects pairing this employee with strong frontend leads while continuing to deepen backend and cloud capabilities through scenario-based training.";
}

function buildCourseCard(course) {
    const card = createElement("div", "course-card");
    const header = createElement("div", "course-header");

    const name = createElement("div", "course-name", course.name);
    const skill = createElement(
        "div",
        "course-skill",
        `Target skill: ${course.skillTarget}`
    );

    const status = createElement(
        "div",
        "course-status",
        course.status || "In Progress"
    );
    if (course.status === "Completed") {
        status.classList.add("course-status--completed");
    } else if (course.status === "Planned") {
        status.classList.add("course-status--planned");
    }

    const left = createElement("div");
    left.appendChild(name);
    left.appendChild(skill);

    header.appendChild(left);
    header.appendChild(status);
    card.appendChild(header);

    const progressBar = createElement("div", "course-progress-bar");
    const progressFill = createElement("div", "course-progress-fill");
    const pct = Math.max(0, Math.min(100, course.progress || 0));
    progressFill.style.width = `${pct}%`;
    progressBar.appendChild(progressFill);
    card.appendChild(progressBar);

    const meta = createElement(
        "div",
        "course-meta",
        course.meta || `${pct}% completion`
    );
    card.appendChild(meta);

    return card;
}

function populateCourses(emp) {
    const courses = emp.courses || {};
    currentCoursesList.innerHTML = "";
    recommendedCoursesList.innerHTML = "";
    historyCoursesList.innerHTML = "";

    const currentCourses = courses.current || [];
    if (currentCourses.length === 0) {
        currentCoursesList.innerHTML = '<div class="empty-state"><p>No current courses assigned</p></div>';
    } else {
        currentCourses.forEach((c) => {
            currentCoursesList.appendChild(buildCourseCard(c));
        });
    }

    const recommendedCourses = courses.recommended || [];
    if (recommendedCourses.length === 0) {
        recommendedCoursesList.innerHTML = '<div class="empty-state"><p>No recommended courses</p></div>';
    } else {
        recommendedCourses.forEach((c) => {
            recommendedCoursesList.appendChild(buildCourseCard(c));
        });
    }

    // After rendering course cards, make them draggable into the calendar
    makeCourseCardsDraggable();

    const historyCourses = courses.history || [];
    if (historyCourses.length === 0) {
        historyCoursesList.innerHTML = '<div class="empty-state"><p>No course history</p></div>';
    } else {
        historyCourses.forEach((c) => {
            historyCoursesList.appendChild(buildCourseCard(c));
        });
    }
}

function populateCalendar(emp) {
    // Use FullCalendar to render and enable drag/drop
    if (!window.FullCalendar) return;
    initFullCalendarIfNeeded();
    const events = (emp.courseCalendar || []).map((p) => ({
        title: p.courseName || "Course",
        start: p.startDate,
        end: p.endDate,
        allDay: true,
    }));
    // replace events
    // fullCalendar.removeAllEvents();
    fullCalendar.addEventSource(events);
}

function initFullCalendarIfNeeded() {
    if (fullCalendar) return;
    const el = document.getElementById("course-calendar");
    if (!el) return;

    fullCalendar = new FullCalendar.Calendar(el, {
        initialView: "dayGridMonth",
        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        },
        editable: true,
        selectable: true,
        droppable: true, // allow external elements to be dropped
        eventReceive: function (info) {
            // when an external course card is dropped onto calendar
            // you may persist change or remove the original element if desired
            console.log("event received:", info.event);
        },
        eventDrop: function (info) {
            console.log("event dropped:", info.event);
        },
        eventResize: function (info) {
            console.log("event resized:", info.event);
        },
    });

    fullCalendar.render();
}

// Import JSON (datamock.json shape or a simple { employees: [...] })
function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
        try {
            const text = evt.target.result;
            if (file.name.endsWith('.json')) {
                const parsed = JSON.parse(text);
                if (parsed.employees) {
                    mockData = parsed;
                } else if (parsed.users || parsed.employee_profiles) {
                    const users = parsed.users || [];
                    const groups = parsed.groups || [];
                    const employees = users.map(u => ({
                        id: u.id,
                        name: u.full_name || u.name,
                        email: u.email,
                        department: groups.find(g => g.id === u.group_id)?.group_name || u.group || '',
                        group: groups.find(g => g.id === u.group_id)?.group_name || u.group || '',
                        status: u.status || 'Active',
                        skills: []
                    }));
                    mockData = {
                        employees,
                        skills_master: parsed.skills_master || [],
                        skill_categories: parsed.skill_categories || []
                    };
                } else {
                    mockData = parsed;
                }

                populateDepartmentFilter();
                if (mockData.skills_master) matrixSkillNames = mockData.skills_master.map(s => s.skill_name || s.skillName || s.name);
                initMatrixSorting();
                renderSkillMatrix();
                alert('Import successful');
            } else if (file.name.endsWith('.csv')) {
                alert('CSV import not supported in this demo. Use JSON datamock format.');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to import file: ' + (err && err.message ? err.message : err));
        } finally {
            try { e.target.value = ''; } catch (e) { }
        }
    };
    reader.readAsText(file);
}

function makeCourseCardsDraggable() {
    // Make course cards draggable into FullCalendar
    if (!window.FullCalendar || !FullCalendar.Draggable) return;
    const containers = [
        document.getElementById("current-courses-list"),
        document.getElementById("recommended-courses-list"),
    ];

    containers.forEach((container) => {
        if (!container) return;
        // ensure each .course-card has the data needed
        new FullCalendar.Draggable(container, {
            itemSelector: ".course-card",
            eventData: function (el) {
                const titleEl = el.querySelector(".course-name");
                return {
                    title: titleEl ? titleEl.textContent.trim() : el.textContent.trim(),
                    allDay: true,
                };
            },
        });
    });
}

function renderCalendarByDay(periods) {
    courseCalendar.innerHTML = "";

    // Gerar 30 dias da data atual
    const currentDate = new Date(); // Data real de hoje
    const startDate = new Date(currentDate); // Começar do dia atual
    startDate.setDate(startDate.getDate() - 15); // Mostrar 15 dias atrás + 15 dias depois
    const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        return d;
    });

    days.forEach((dayDate) => {
        const cell = createElement("div", "calendar-cell calendar-cell--day");
        const dayNumber = dayDate.getDate();
        const dayName = dayDate.toLocaleString(undefined, { weekday: "short" });

        // Verificar se é o dia de hoje
        const isToday = dayDate.toDateString() === currentDate.toDateString();
        if (isToday) {
            cell.classList.add("calendar-cell--today");
        }

        const label = createElement("div", "calendar-day");
        label.innerHTML = `<div class="day-number">${dayNumber}</div><div class="day-name">${dayName}</div>`;
        cell.appendChild(label);

        // Verificar se algum curso tem data neste dia
        periods.forEach((p) => {
            const start = new Date(p.startDate);
            const end = new Date(p.endDate);
            if (Number.isNaN(start) || Number.isNaN(end)) return;

            const startDate = start.getDate();
            const endDate = end.getDate();
            const currentDay = dayDate.getDate();

            // Simplificado: mostrar se o dia está entre start e end
            if (currentDay >= startDate && currentDay <= endDate) {
                const bar = createElement("div", "calendar-period calendar-period--day");
                bar.dataset.label = `${p.courseName} • ${formatDate(p.startDate)} – ${formatDate(p.endDate)}`;
                bar.title = bar.dataset.label;
                cell.appendChild(bar);
            }
        });

        courseCalendar.appendChild(cell);
    });
}

function renderCalendarByMonth(periods) {
    courseCalendar.innerHTML = "";
    const today = new Date(); // Data real de hoje
    const currentMonth = today.getMonth(); // Mês atual (0-11)
    const months = Array.from({ length: 12 }, (_, i) =>
        new Date(2000, i, 1).toLocaleString(undefined, { month: "short" })
    );

    months.forEach((monthName, index) => {
        const cell = createElement("div", "calendar-cell");
        const label = createElement("div", "calendar-month", monthName);
        cell.appendChild(label);

        // Verificar se é o mês atual
        if (index === currentMonth) {
            cell.classList.add("calendar-cell--today");
        }

        const monthIndex = index;
        const hasPeriod = periods.some((p) => {
            const start = new Date(p.startDate);
            const end = new Date(p.endDate);
            if (Number.isNaN(start) || Number.isNaN(end)) return false;
            return start.getMonth() <= monthIndex && end.getMonth() >= monthIndex;
        });

        if (hasPeriod) {
            periods.forEach((p) => {
                const start = new Date(p.startDate);
                const end = new Date(p.endDate);
                if (Number.isNaN(start) || Number.isNaN(end)) return;
                if (start.getMonth() <= monthIndex && end.getMonth() >= monthIndex) {
                    const bar = createElement("div", "calendar-period");
                    bar.dataset.label = `${p.courseName} • ${formatDate(
                        p.startDate
                    )} – ${formatDate(p.endDate)}`;
                    bar.title = bar.dataset.label;
                    cell.appendChild(bar);
                }
            });
        }

        courseCalendar.appendChild(cell);
    });
}

function renderCalendarByYear(periods) {
    courseCalendar.innerHTML = "";
    const today = new Date(); // Data real de hoje
    const currentYear = today.getFullYear(); // Ano atual
    const cell = createElement("div", "calendar-cell calendar-cell--year");
    const label = createElement("div", "calendar-year", currentYear.toString());
    cell.appendChild(label);

    const courses = new Set();
    periods.forEach((p) => {
        courses.add(p.courseName);
    });

    if (courses.size > 0) {
        const bar = createElement("div", "calendar-period calendar-period--full");
        bar.dataset.label = `Year: ${Array.from(courses).join(", ")}`;
        bar.title = bar.dataset.label;
        cell.appendChild(bar);

        const list = createElement("div", "course-year-list");
        Array.from(courses).forEach((course) => {
            const item = createElement("div", "course-year-item", `• ${course}`);
            list.appendChild(item);
        });
        cell.appendChild(list);
    }

    courseCalendar.appendChild(cell);
}

function populateProjectHistory(emp) {
    projectHistoryTimeline.innerHTML = "";

    // Sort projects by start date in descending order (newest first)
    const sortedProjects = (emp.projectHistory || []).slice().sort((a, b) => {
        // Extract start date from duration string (format: "MM/DD/YYYY – MM/DD/YYYY" or "MM/DD/YYYY – Present")
        const getStartDate = (durationStr) => {
            if (!durationStr) return new Date(0);
            const parts = durationStr.split(' – ');
            if (parts.length > 0) {
                const dateStr = parts[0].trim();
                const parsed = new Date(dateStr);
                return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
            }
            return new Date(0);
        };

        const dateA = getStartDate(a.duration);
        const dateB = getStartDate(b.duration);
        return dateB - dateA; // descending (newest first)
    });

    if (sortedProjects.length === 0) {
        projectHistoryTimeline.innerHTML = '<div class="empty-state"><p>No project history</p></div>';
        return;
    }

    sortedProjects.forEach((p) => {
        const item = createElement("div", "timeline-item");
        const dot = createElement("div", "timeline-dot");
        item.appendChild(dot);

        const header = createElement("div", "timeline-header");
        const projectName = createElement("div", "timeline-project", p.projectName);
        const duration = createElement("div", "timeline-duration", p.duration);
        header.appendChild(projectName);
        header.appendChild(duration);

        const skills = createElement(
            "div",
            "timeline-skills",
            `Skills used: ${p.skillsUsed.join(", ")}`
        );

        const note = createElement(
            "div",
            "timeline-note",
            p.aiNote || "Skill improved during this project"
        );

        item.appendChild(header);
        item.appendChild(skills);
        item.appendChild(note);

        projectHistoryTimeline.appendChild(item);
    });
}

// Export to Excel (CSV)

function exportMatrixToCsv() {
    if (!mockData) return;
    const selectedDept = departmentFilter.value;
    const employees = mockData.employees || [];

    const filtered = employees.filter((emp) => {
        if (selectedDept === "all") return true;
        return emp.department === selectedDept;
    });

    // Use dynamic skills
    const header = ["Employee Name", "Team", ...matrixSkillNames];

    const csvRows = [header.join(",")];

    filtered.forEach((emp) => {
        const cells = [emp.name, emp.department];

        // Use dynamic skills
        matrixSkillNames.forEach((skillName) => {
            const skill = getSkillLevel(emp, skillName);
            cells.push(skill && skill.level ? skill.level : "");
        });

        csvRows.push(
            cells
                .map((v) => {
                    // escape CSV
                    const str = String(v ?? "");
                    if (str.includes(",") || str.includes('"')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                })
                .join(",")
        );
    });

    const blob = new Blob([csvRows.join("\n")], {
        type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix =
        selectedDept === "all" ? "all-departments" : selectedDept.replace(/\s+/g, "-");
    a.download = `siras-skill-matrix-${suffix}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Event wiring

function initNavigation() {
    navButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-view");
            if (!key) return;
            if (key === "skill-matrix") {
                showView("skill-matrix");
                setActiveNav("skill-matrix");
            } else {
                // Placeholder views
                showView(key);
                setActiveNav(key);
            }
        });
    });
}

function initFilters() {
    if (departmentFilter) {
        departmentFilter.addEventListener("change", () => {
            renderSkillMatrix();
        });
    }

    if (exportExcelBtn) {
        exportExcelBtn.addEventListener("click", exportMatrixToCsv);
    }

    if (backToMatrixBtn) {
        backToMatrixBtn.addEventListener("click", () => {
            showView("skill-matrix");
            setActiveNav("skill-matrix");
        });
    }
}

function initHeatmapToggle() {
    if (!heatmapToggle) return;
    let expanded = true;
    heatmapToggle.addEventListener("click", () => {
        expanded = !expanded;
        heatmapBody.style.maxHeight = expanded ? "520px" : "0px";
        heatmapToggleIcon.textContent = expanded ? "▾" : "▸";
    });
}

function initCourseTabs() {
    const courseTabsContainer = document.getElementById("course-tabs");
    if (!courseTabsContainer) return;

    const coursePanels = courseTabsContainer
        .closest(".panel-body")
        .querySelectorAll(".tab-panel");

    courseTabsContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".tab");
        if (!btn) return;

        const tabName = btn.getAttribute("data-tab");
        if (!tabName) return;

        courseTabsContainer
            .querySelectorAll(".tab")
            .forEach((t) => t.classList.remove("tab--active"));
        btn.classList.add("tab--active");

        coursePanels.forEach((panel) => {
            panel.hidden = panel.id !== `tab-${tabName}`;
        });
    });
}

function initCalendarViewButtons() {
    if (!calendarViewBtns || calendarViewBtns.length === 0) return;

    calendarViewBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const view = btn.getAttribute("data-view");
            if (!view) return;

            // Update state
            calendarViewMode = view;

            // Update active button
            calendarViewBtns.forEach((b) => {
                b.classList.remove("calendar-view-btn--active");
            });
            btn.classList.add("calendar-view-btn--active");

            // Re-render calendar
            if (currentEmployee) {
                populateCalendar(currentEmployee);
            }
        });
    });
}

// Data transformation - convert new database schema to legacy employee format

function transformDatabaseToLegacyFormat(data) {
    const users = data.users || [];
    const profiles = data.employee_profiles || [];
    const groups = data.groups || [];
    const skillsMaster = data.skills_master || [];
    const skillCategories = data.skill_categories || [];
    const employeeSkills = data.employee_skills || [];
    const skillHistory = data.skill_history || [];
    const courses = data.courses || [];
    const enrollments = data.learning_enrollments || [];
    const projects = data.projects || [];
    const allocations = data.allocations || [];

    // Create lookup maps
    const groupMap = {};
    groups.forEach((d) => {
        groupMap[d.id] = d.group_name;
    });

    // Keep skill metadata (name + category) for mapping to categories
    const skillMap = {};
    skillsMaster.forEach((s) => {
        skillMap[s.id] = { name: s.skill_name, cat_id: s.cat_id, description: s.description };
    });

    const categoryMap = {};
    skillCategories.forEach((c) => {
        categoryMap[c.id] = c.cat_name;
    });

    // Transform users to employees
    const employees = users.map((user) => {
        const profile = profiles.find((p) => p.user_id === user.id) || {};
        const group = groupMap[user.group_id] || "Unknown";
        const experienceYears = profile.join_date
            ? new Date().getFullYear() - new Date(profile.join_date).getFullYear()
            : 0;

        // Get employee skills
        const empSkillRows = employeeSkills.filter((es) => es.user_id === user.id);
        const skills = empSkillRows.map((es) => {
            const skillName = (skillMap[es.skill_id] && skillMap[es.skill_id].name) || `Skill ${es.skill_id}`;
            // Determine trend from skill history
            const history = skillHistory.filter(
                (h) => h.user_id === user.id && h.skill_id === es.skill_id
            );
            let trend = "stable";
            if (history.length > 0) {
                const lastChange = history[history.length - 1];
                if (lastChange.new_level > lastChange.old_level) {
                    trend = "growing";
                } else if (lastChange.new_level < lastChange.old_level) {
                    trend = "decaying";
                }
            }

            return {
                skill_id: es.skill_id,
                startLevel: es.start_level_score,
                goalLevel: es.goal_level || skillsMaster.find(s => s.id === es.skill_id)?.goal_level || 4,
                name: skillName,
                level: es.level_score,
                lastUsedDate: es.last_verified || new Date().toISOString(),
                trend: trend,
            };
        });

        // Calculate radar skills by category (data-driven via skillCategories)
        const radarSkills = {};
        (skillCategories || []).forEach((c) => {
            radarSkills[c.cat_name] = 0;
        });

        empSkillRows.forEach((es) => {
            const info = skillMap[es.skill_id] || {};
            const catId = info.cat_id;
            const catNameLocal = categoryMap[catId] || "Other";
            const level = es.level_score || 0;
            radarSkills[catNameLocal] = Math.max(radarSkills[catNameLocal] || 0, level);
        });

        // Get learning enrollments
        const userEnrollments = enrollments.filter((e) => e.user_id === user.id);
        const currentCourses = [];
        const recommendedCourses = [];
        const historyCourses = [];

        userEnrollments.forEach((enrollment) => {
            const course = courses.find((c) => c.id === enrollment.course_id) || {};
            const courseObj = {
                name: course.course_name || "Unknown Course",
                skillTarget: course.target_skill_id ? (skillMap[course.target_skill_id] && skillMap[course.target_skill_id].name) : "General",
                status: enrollment.status || "In Progress",
                progress: enrollment.progress || 0,
                meta: `${enrollment.progress || 0}% completion`,
            };

            if (enrollment.status === "In-progress") {
                currentCourses.push(courseObj);
            } else if (enrollment.status === "Planned") {
                recommendedCourses.push(courseObj);
            } else if (enrollment.status === "Completed") {
                historyCourses.push(courseObj);
            }
        });

        // Get allocations for availability status
        const userAllocations = allocations.filter((a) => a.user_id === user.id);
        let availabilityStatus = "Available – Full capacity";
        if (userAllocations.length > 0) {
            const totalEffort = userAllocations.reduce((sum, a) => sum + (a.effort_rate || 0), 0) / userAllocations.length;
            availabilityStatus = `Allocated – ${totalEffort}% billable`;
        }

        return {
            id: `E-${String(user.id).padStart(3, "0")}`,
            name: user.full_name,
            avatar_url: user.avatar_url,
            role: user.role,
            department: group,
            experienceYears: experienceYears,
            availabilityStatus: availabilityStatus,
            aiSummary: `Employee in ${group} group with ${skills.length} tracked skills.`,
            skills: skills,
            radarSkills: radarSkills,
            aiGrowthList: [
                "Python – used frequently in recent projects",
                "Strong collaboration"
            ],
            aiDecayList: [
                "Java – not used in recent projects",
                "Limited hands-on exposure"
            ],
            aiRecommendation: "Continue current career trajectory while exploring new skill areas.",
            courses: {
                current: currentCourses,
                recommended: recommendedCourses,
                history: historyCourses,
            },
            courseCalendar: userEnrollments.map((e) => {
                const course = courses.find((c) => c.id === e.course_id) || {};

                return {
                    courseId: course.id,
                    courseName: course.course_name || "Course",
                    startDate: course.start_date || course.startDate || null,
                    endDate: course.end_date || course.endDate || null,
                    status: e.status || null,
                    progress: e.progress ?? null,
                    completedAt: e.completed_at || null
                };
            }),
            projectHistory: userAllocations.map((a) => {
                const project = projects.find((p) => p.id === a.project_id);
                return {
                    projectName: project?.name || "Unknown Project",
                    duration: `${new Date(a.start_date).toLocaleDateString()} – ${a.end_date_actual ? new Date(a.end_date_actual).toLocaleDateString() : "Present"}`,
                    skillsUsed: skills.slice(0, 3).map((s) => s.name),
                    aiNote: "Successful project contribution with skill reinforcement.",
                };
            }),
        };
    });

    return { employees };
}

function updateEmployeeAvatar(emp) {
    const avatarEl = document.getElementById("employee-avatar");

    // Xóa nội dung cũ
    avatarEl.innerHTML = "";

    const img = document.createElement("img");
    img.src = emp.avatar_url || 'https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3396.jpg';
    img.alt = `${emp.full_name}'s avatar`;
    img.className = "employee-avatar-img";
    avatarEl.appendChild(img);
}


function initTimelineSchedule(emp) {
    const container = document.getElementById("timelineSchedule");
    if (!container || !emp) return;
    container.innerHTML = "";

    // Convert courseCalendar to vis.js items
    const items = new vis.DataSet(
        (emp.courseCalendar || []).map((c, i) => ({
            id: i + 1,
            content: c.courseName,
            start: c.startDate,
            end: c.endDate,
            title: `
            <div class="tooltip-timeline" style="white-space: normal; font-size: 12px; line-height: 1.4;  border-radius: 10px !importnant;">
                <strong>${c.courseName}</strong><br>
                Status: ${c.status}<br>
                Progress: ${c.progress}%<br>
                Start: ${c.startDate}<br>
                End: ${c.endDate}
            </div>
        `,
            className: (() => {
                if (c.status === "In-progress") return "course-inprogress";
                if (c.status === "Planned") return "course-planned";
                if (c.status === "Completed") return "course-completed";
                return "";
            })()
        }))
    );

    // Ngày hiện tại
    const now = new Date();

    const startOfMonth = new Date(now.getFullYear(), 1, 1);

    const endOfMonth = new Date(now.getFullYear(), 12, 0);

    // Timeline options: auto zoom, show current time bar
    const options = {
        width: "100%",
        height: "350px",
        showCurrentTime: true,
        stack: true,
        zoomable: true,
        zoomKey: 'ctrlKey', // mac: cmdKey
        moveable: true,
        horizontalScroll: true,
        start: startOfMonth,
        end: endOfMonth
    };

    // Create the vis Timeline instance
    const timeline = new vis.Timeline(container, items, options);

    // ---- Carousel / window control ----

    // Determine slides by dividing timeline by months
    const mapDates = emp.courseCalendar.map(cc => ({
        start: new Date(cc.startDate),
        end: new Date(cc.endDate)
    }));

    // Sort by earliest start
    mapDates.sort((a, b) => a.start - b.start);

    // Build view ranges per month
    const viewRanges = [];
    if (mapDates.length) {
        let current = new Date(mapDates[0].start);
        let lastDate = new Date(mapDates[mapDates.length - 1].end);

        while (current <= lastDate) {
            const next = new Date(current);
            next.setMonth(next.getMonth() + 1);

            viewRanges.push({
                start: current.toISOString().split("T")[0],
                end: next.toISOString().split("T")[0]
            });

            current = next;
        }
    }

    let currentViewIndex = 0;

    function showView(index) {
        if (!viewRanges.length) {
            // If no ranges defined, fit all items
            timeline.fit();
            return;
        }
        const range = viewRanges[index];
        timeline.setWindow(range.start, range.end, { animation: true });
    }

    document.getElementById("prevSlide").addEventListener("click", () => {
        if (viewRanges.length === 0) return;
        currentViewIndex = Math.max(0, currentViewIndex - 1);
        showView(currentViewIndex);
    });

    document.getElementById("nextSlide").addEventListener("click", () => {
        if (viewRanges.length === 0) return;
        currentViewIndex = Math.min(viewRanges.length - 1, currentViewIndex + 1);
        showView(currentViewIndex);
    });

    // Initialize on first view (or fit if no ranges)
    showView(currentViewIndex);
}


function getSkillComment(skill) {
    const lastUsed = new Date(skill.lastUsedDate);
    const now = new Date();
    const diffMonths =
        (now.getFullYear() - lastUsed.getFullYear()) * 12 +
        (now.getMonth() - lastUsed.getMonth());

    if (skill.level > skill.startLevel) {
        return "Skill improved through recent project usage";
    }

    if (diffMonths > 12) {
        return "Skill may be decaying due to long inactivity";
    }

    if (diffMonths <= 6) {
        return "Skill actively used in recent projects";
    }

    return "Skill level remains stable";
}

function renderTrend(skill) {
    if (skill.trend === "growing") {
        return `<span class="trend trend--up">↑ Growing</span>`;
    }
    if (skill.trend === "decaying") {
        return `<span class="trend trend--down">↓ Decaying</span>`;
    }
    return `<span class="trend trend--stable">→ Stable</span>`;
}


// Data loading

async function loadData() {
    try {
        const res = await fetch("datamock.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rawData = await res.json();
        console.log("loadData: rawData loaded, employees:", rawData.users?.length);
        // Transform new database schema to legacy format
        mockData = transformDatabaseToLegacyFormat(rawData);
        console.log("loadData: mockData transformed, employees:", mockData.employees?.length);
        // Preserve skills_master from raw data for dynamic header generation
        if (rawData && rawData.skills_master) {
            mockData.skills_master = rawData.skills_master;
            console.log("loadData: skills_master added:", rawData.skills_master.length);
        }
        // Preserve skill_categories for radar axes
        if (rawData && rawData.skill_categories) {
            mockData.skill_categories = rawData.skill_categories;
            console.log("loadData: skill_categories added:", rawData.skill_categories.length);
        }
        console.log("loadData: complete, mockData =", mockData);
    } catch (err) {
        console.error("Failed to load datamock.json:", err);
        mockData = { employees: [] };
    }
}

async function init() {
    initNavigation();
    initFilters();
    initHeatmapToggle();
    initCourseTabs();
    // calendar controls removed (FullCalendar will use its own toolbar)

    await loadData();

    // Load skills from mockData
    if (mockData && mockData.skills_master) {
        skillsList = mockData.skills_master.map(s => s.skill_name);
        matrixSkillNames = skillsList.slice(); // copy to matrixSkillNames
    }

    populateDepartmentFilter();
    // Initialize column sorting then render matrix
    initMatrixSorting();
    renderSkillMatrix();

    // Open detail for first employee by default when user clicks any row
    if (mockData.employees && mockData.employees.length > 0) {
        // nothing else; detail opens on click
    }

    // Initial view
    showView("skill-matrix");
    setActiveNav("skill-matrix");
}

window.addEventListener("DOMContentLoaded", init);


