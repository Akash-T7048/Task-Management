let viewMode = "list";
let lastData = null;
let activeSpace = null;

(async function () {
  const root = document.getElementById("tasks-app");
  if (!root) return;

  // ------------------------------
  // HTML
  // ------------------------------
  root.innerHTML = `
    <div class="td-wrap">
      <div class="td-left">
        <div class="td-left-head">
          <div class="td-title">Spaces</div>
          <button class="btn btn-xs btn-primary td-new-space-btn" title="Create New Space">+ New Space</button>

          <button class="btn btn-xs btn-default td-refresh">↻</button>
        </div>
        <div class="td-spaces">
        </div>
      </div>

      <div class="td-main">
        <div class="td-main-head">
          <div>
            <div class="td-h1">Select a space</div>
            <div class="td-sub"></div>
          </div>

          <div style="display:flex;gap:8px;align-items:center">
            <div class="btn-group">
              <button class="btn btn-sm btn-default td-view" data-view="list">List</button>
              <button class="btn btn-sm btn-default td-view" data-view="kanban">Kanban</button>
            </div>
            <button class="btn btn-sm btn-primary td-new">+ New Task</button>
          </div>
        </div>
        <div class="td-scroll">
            <div class="td-content"></div>
        </div>
      </div>
    </div>
  `;

  // ------------------------------
  // Elements
  // ------------------------------
  const elSpaces = root.querySelector(".td-spaces");
  const elH1 = root.querySelector(".td-h1");
  const elSub = root.querySelector(".td-sub");
  const elContent = root.querySelector(".td-content");

  // ------------------------------
  // RPC helper (correct format)
  // ------------------------------
  async function rpc(method, args = {}) {
    const r = await frappe.call({ method, args });
    return r.message;
  }

  async function fetchSpaces() {
    return await rpc("tasks.api.dashboard.get_spaces");
  }

  async function fetchBoard(spaceName) {
    return await rpc("tasks.api.dashboard.get_board", { space: spaceName });
  }

  // ------------------------------
  // Render: List
  // ------------------------------
  function renderTasksList(data) {
    const tasks = data.tasks || [];
    const statusMap = {};
    (data.statuses || []).forEach(s => (statusMap[s.name] = s.status_name));

    if (!tasks.length) {
      elContent.innerHTML = `<div class="text-muted" style="padding:12px;">No tasks in this space.</div>`;
      return;
    }

    elContent.innerHTML = tasks
      .map(t => `
        <div class="td-row">
          <div>
            <div class="name">${frappe.utils.escape_html(t.title_tasks || t.name)}</div>
            <div class="meta">${frappe.utils.escape_html(t.priority || "")}</div>
          </div>
          <div class="td-pill">${frappe.utils.escape_html(statusMap[t.task_status] || "No Status")}</div>
        </div>
      `)
      .join("");
  }

  // ------------------------------
  // Render: Kanban
  // ------------------------------
  function renderKanban(data) {
    const board = data.board || {};
    const statuses = data.statuses || [];

    if (!statuses.length) {
      elContent.innerHTML = `<div class="text-muted" style="padding:12px;">No statuses found for this department.</div>`;
      return;
    }

    elContent.innerHTML = `
      <div class="td-board">
        ${statuses
        .map(s => {
          const items = board[s.name] || [];
          return `
              <div class="td-col" data-status="${s.name}">
                <div class="td-col-head">
                  <div class="td-col-title">${frappe.utils.escape_html(s.status_name)}</div>
                  <div class="td-col-count">${items.length}</div>
                </div>
                <div class="td-col-body">
                  ${items
              .map(
                t => `
                        <div class="td-card" data-task="${t.name}">
                          <div class="t">${frappe.utils.escape_html(t.title_tasks || t.name)}</div>
                          <div class="m">${frappe.utils.escape_html(t.priority || "")}</div>
                        </div>
                      `
              )
              .join("")}
                </div>
              </div>
            `;
        })
        .join("")}
      </div>
    `;
  }

  // ------------------------------
  // Load a space
  // ------------------------------
  async function loadSpace(spaceDocName) {
    activeSpace = spaceDocName;

    // highlight active
    [...elSpaces.querySelectorAll(".td-space")].forEach(x => {
      x.classList.toggle("active", x.dataset.name === spaceDocName);
    });

    elContent.innerHTML = `<div class="text-muted" style="padding:12px;">Loading…</div>`;

    const data = await fetchBoard(spaceDocName);
    lastData = data;

    elH1.textContent = data.space.space_name;
    elSub.textContent = `Department: ${data.space.department} • ${(data.tasks || []).length} tasks`;

    if (viewMode === "kanban") renderKanban(data);
    else renderTasksList(data);
  }

  // ------------------------------
  // Render spaces list
  // ------------------------------

  const openedGroups = new Set(); 

  function getParentField(spaces) { // call parent field name from api response
    if (!spaces?.length) return null;
    const s = spaces[0];
    return (
      ("space_group" in s && "space_group") ||
      null
    );
  }

  function buildTreeSections(spaces) {
    const parentField = getParentField(spaces);
    const childMap = new Map(); //parent to child[]
    const byName = new Map(spaces.map(s => [s.name, s]));

    for (const s of spaces) {
      const parent = parentField ? (s[parentField] || null): null;
      if (!childMap.has(parent)) childMap.set(parent, []);
      childMap.get(parent).push(s);
    }

    const roots = childMap.get(null) || []; // main/root node

    const mains = roots.filter(r => !!r.is_group); // child/sub group node

    mains.sort((a, b) => (a.space_name || "").localeCompare(b.spaceName || ""));

    return mains.map(group => {
      const kids= (childMap.get(group.name) || []).filter(x => !x.is_group);
      kids.sort((a, b) => (a.space_name || "").localeCompare(b.space_name || ""));

      return{
        group,
        items:kids
      };
    });
  }

  async function renderSpaces() {
    const spaces = await fetchSpaces();

    if (!spaces || !spaces.length) {
      elSpaces.innerHTML = `<div class="text-muted">No active spaces found.</div>`;
      return;
    }

    const sections = buildTreeSections(spaces);

    if (!sections.length) {
      elSpaces.innerHTML = `<dic class="text-muted">No group spaces found.</div>`;
    }

    // render collapsible groups + child spaces
    elSpaces.innerHTML = sections.map(sec => {
      const g = sec.group;
      const isOpen = openedGroups.has(g.name);

    return `
      <div class="td-sec" data-group="${g.name}">
        <div class="td-sec-head" data-action="toggle" data-name="${g.name}">
          <span class="td-sec-title">${frappe.utils.escape_html(g.space_name || g.name)}</span>
          <span class="td-chev">${isOpen ? "▾" : "▸"}</span> 
        </div>

        <div class="td-sec-body" style="display:${isOpen ? "block" : "none"}">
          ${sec.items.map(ch => `
            <div class="td-space" data-name="${ch.name}">
              <div style="font-weight:600">${frappe.utils.escape_html(ch.space_name || ch.name)}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }).join("");

  // toggle group open/close
  elSpaces.querySelectorAll(".td-sec-head").forEach(head => {
    head.addEventListener("click", ()=>{
      const groupName = head.dataset.name;
      const sec = head.closest(".td-sec");
      const body = sec.querySelector(".td-sec-body");
      const chev = sec.querySelector(".td-chev");
      
      const isOpen = body.style.display !== "none";
      body.style.display = isOpen ? "none" : "block";
      chev.textContent = isOpen ? "▸" : "▾";

      if (isOpen) openedGroups.delete(groupName);
      else openedGroups.add(groupName);
    });
  });

  // child click -> loadSpace
  elSpaces.querySelectorAll(".td-space").forEach(btn =>{
    btn.addEventListener("click", (e) =>{
      e.stopPropagation();// don't toggle group when clicking child
      loadSpace(btn.dataset.name);
    });
  });

  await loadSpace(firstGroup.items[0].name);

    // elSpaces.innerHTML = spaces
    //   .map(
    //     s => `
    //       <div class="td-space" data-name="${s.name}">
    //         <div style="font-weight:600">${frappe.utils.escape_html(s.space_name)}</div>
    //       </div>
    //     `
    //   )
    //   .join("");

    // elSpaces.querySelectorAll(".td-space").forEach(btn => {
    //   btn.addEventListener("click", () => loadSpace(btn.dataset.name));
    // });

    // // auto open first
    // await loadSpace(spaces[0].name);
  }

  // ------------------------------
  // View toggle buttons
  // ------------------------------
  root.querySelectorAll(".td-view").forEach(btn => {
    btn.addEventListener("click", () => {
      viewMode = btn.dataset.view;

      root.querySelectorAll(".td-view").forEach(b => b.classList.remove("btn-primary"));
      btn.classList.add("btn-primary");

      if (!lastData) return;
      if (viewMode === "kanban") renderKanban(lastData);
      else renderTasksList(lastData);
    });
  });

  // default selected = list
  root.querySelector('.td-view[data-view="list"]').classList.add("btn-primary");

  // ------------------------------
  // New Task Dialog
  // ------------------------------
  root.querySelector(".td-new").addEventListener("click", async () => {
    if (!activeSpace) {
      frappe.msgprint("Please select a space first.");
      return;
    }

    // refresh board to get latest statuses
    const data = await fetchBoard(activeSpace);

    const d = new frappe.ui.Dialog({
      title: "New Task",
      fields: [
        { fieldtype: "Data", fieldname: "title_tasks", label: "Title", reqd: 1 },
        { fieldtype: "Text Editor", fieldname: "description", label: "Description" },
        { fieldtype: "Select", fieldname: "priority", label: "Priority", options: ["", "Low", "Medium", "High", "Urgent"].join("\n") },
        {
          fieldtype: "Select",
          fieldname: "task_status",
          label: "Status",
          options: ["", ...(data.statuses || []).map(s => s.status_name)].join("\n")
        },
        { fieldtype: "Link", fieldname: "assign_to", label: "Assign To", options: "User" }
      ],
      primary_action_label: "Create",
      primary_action: async (values) => {
        const st = (data.statuses || []).find(s => s.status_name === values.task_status);

        await rpc("tasks.api.dashboard.create_task", {
          space: activeSpace,
          title_tasks: values.title_tasks,
          description: values.description,
          priority: values.priority,
          task_status: st ? st.name : null,
          assign_to: values.assign_to
        });

        d.hide();
        await loadSpace(activeSpace);
        frappe.show_alert({ message: "Task Created", indicator: "green" });
      }
    });

    d.show();
  });

  // refresh button
  root.querySelector(".td-refresh").addEventListener("click", renderSpaces);

  // init
  renderSpaces();
})();
