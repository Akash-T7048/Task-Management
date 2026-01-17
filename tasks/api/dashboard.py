import frappe

def _resolve_space(space: str):
    if not space:
        frappe.throw("Space Is Required")

    try:
        return frappe.get_doc("Task Space", space)
    except Exception:
        pass

    # Try by route_key
    name = frappe.db.get_value("Tasks Space", {"route_key": space}, "name")
    if name:
        return frappe.get_doc("Tasks Space", name)
    
    # Try by space_name
    name = frappe.db.get_value("Tasks Space", {"space_name": space}, "name")
    if name:
        return frappe.get_doc("Tasks Space", name)
    
    sp = frappe.get_doc("Tasks Space", space)
    return sp
    
    # frappe.throw(f"Tasks Space Not Found:{space}")

@frappe.whitelist()
def get_spaces():
    return frappe.get_all(
        "Tasks Space",
        fields = ["name", "space_name","route_key","department", "is_group", "space_group"],
        filters ={"is_active": 1},
        order_by = "sort_order asc, space_name asc"
    )

@frappe.whitelist()
def get_board(space):
    # resolve space doc
    sp_name = frappe.db.get_value("Tasks Space", {"space_name": space}, "name") or space
    sp = frappe.get_doc("Tasks Space", sp_name)

    statuses = frappe.get_all(
        "Task Status",
        fields=["name", "status_name", "sort_order", "is_closed"],
        filters={"department": sp.department},
        order_by="sort_order asc, status_name asc",
    )

    # ✅ IMPORTANT: use get_all (NOT get_doc)
    tasks = frappe.get_all(
        "Tasks",
        fields=["name", "title_tasks", "task_status", "priority", "modified"],
        filters={"space": sp.name},
        order_by="modified desc",
    )

    board = {s["name"]: [] for s in statuses}
    for t in tasks:
        board.setdefault(t.get("task_status"), []).append(t)

    return {
        "space": {"name": sp.name, "space_name": sp.space_name, "department": sp.department},
        "statuses": statuses,
        "tasks": tasks,
        "board": board,
    }


@frappe.whitelist()
def move_task(task, status):
    doc = frappe.get_doc("Tasks", task)
    doc.task_status = status
    doc.save()
    return True

@frappe.whitelist()
def create_task(space, title_tasks, description=None, priority=None, task_status=None, assign_to=None):
    if not title_tasks:
        frappe.throw("Title / Task is required")

    sp = _resolve_space(space)

    doc = frappe.new_doc("Tasks")

    if not doc.task_status:
        first_status = frappe.db.get_value(
            "Task Status",
            {"department": sp.department},
            "name",
            order_by="sort_order asc"
        )
        
    if first_status:
        doc.task_status = first_status

    doc.title_tasks = title_tasks
    doc.description = description or ""
    doc.priority = priority or ""

    doc.space = sp.name
    doc.to_department = sp.department

    if task_status:
        doc.task_status = task_status

    if assign_to:
        doc.assign_to = assign_to

    doc.insert(ignore_permissions=True)
    return {"name": doc.name}

@frappe.whitelist()
def get_dashboard_html():
    return frappe.render_template("tasks/page/tasks_dashboard/tasks_dashboard.html", {})