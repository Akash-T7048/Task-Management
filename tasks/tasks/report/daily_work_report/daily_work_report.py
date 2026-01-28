# Copyright (c) 2026, HKM Ahemdabad and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    filters = filters or {}

    conditions = ""

    if filters.get("from_date") and filters.get("to_date"):
        conditions += """
            AND DATE(tt.from_time) BETWEEN %(from_date)s AND %(to_date)s
        """

    columns = [
        {"label": "Task Name", "fieldname": "task", "fieldtype": "Data", "width": 240},
        {"label": "Activity Type", "fieldname": "activity_type", "fieldtype": "Data", "width": 160},
        {"label": "Priority", "fieldname": "priority", "fieldtype": "Data", "width": 120},
        {"label": "Hours", "fieldname": "hours", "fieldtype": "Data", "width": 90},
        {"label": "User", "fieldname": "assigned_to", "fieldtype": "Data", "width": 120},
        {"label": "Status", "fieldname": "task_status", "fieldtype": "Data", "width": 120},
        {"label": "Start Date", "fieldname": "from_time", "fieldtype": "Datetime", "width": 160},
        {"label": "End Date", "fieldname": "to_time", "fieldtype": "Datetime", "width": 160},
    ]

    data = frappe.db.sql(
        f"""
        SELECT
            t.title_tasks AS task,
            tt.activity_type,
            t.priority,
            TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM FORMAT(tt.hours, 2))) AS hours,
            COALESCE(u.full_name, tt.user) AS assigned_to,
            t.task_status,
            tt.from_time,
            tt.to_time
        FROM `tabTimesheet Table` tt
        INNER JOIN `tabTasks` t ON t.name = tt.parent
        LEFT JOIN `tabUser` u ON u.name = tt.user
        WHERE tt.parenttype = 'Tasks'
        {conditions}
        ORDER BY tt.modified DESC
        """,
        filters,
        as_dict=True
    )

    return columns, data


# import frappe

# def execute(filters=None):
#     filters = filters or {}

#     report_type = filters.get("report_type", "Daily")
#     assigned_to = filters.get("assigned_to")

#     conditions = []
#     values = {}

#     # 🔥 TIMEZONE-SAFE DATE FILTER
#     if report_type == "Daily":
#         conditions.append(
#             "DATE(CONVERT_TZ(t.modified, '+00:00', '+05:30')) = CURDATE()"
#         )

#     elif report_type == "Weekly":
#         conditions.append(
#             "YEARWEEK(CONVERT_TZ(t.modified, '+00:00', '+05:30'), 1) = YEARWEEK(CURDATE(), 1)"
#         )

#     elif report_type == "Monthly":
#         conditions.append(
#             "MONTH(CONVERT_TZ(t.modified, '+00:00', '+05:30')) = MONTH(CURDATE()) "
#             "AND YEAR(CONVERT_TZ(t.modified, '+00:00', '+05:30')) = YEAR(CURDATE())"
#         )

#     # 🔹 Assigned To (optional)
#     if assigned_to:
#         conditions.append("""
#             EXISTS (
#                 SELECT 1 FROM `tabToDo` td
#                 WHERE td.reference_name = t.name
#                 AND td.reference_type = 'Task'
#                 AND td.allocated_to = %(assigned_to)s
#             )
#         """)
#         values["assigned_to"] = assigned_to

#     where_clause = " AND ".join(conditions)

#     query = f"""
#         SELECT
#             t.name AS `ID`,
#             t.subject AS `Task`,
#             t.project AS `Space`,
#             t.status AS `Status`,
#             t.priority AS `Priority`,
#             t.modified AS `Last Updated`  
#         FROM `tabTask` t
#         WHERE {where_clause}
#         ORDER BY t.modified DESC
#     """

#     columns = [
#         {"label": "ID", "fieldname": "ID", "fieldtype": "Link", "options": "Task", "width": 120},
#         {"label": "Task", "fieldname": "Task", "fieldtype": "Data", "width": 250},
#         {"label": "Space", "fieldname": "Space", "fieldtype": "Link", "options": "Project", "width": 150},
#         {"label": "Status", "fieldname": "task_status", "fieldtype": "Data", "width": 120},
#         {"label": "Priority", "fieldname": "Priority", "fieldtype": "Data", "width": 90},
#         {"label": "Last Updated", "fieldname": "Last Updated", "fieldtype": "Datetime", "width": 160},
#     ]

#     data = frappe.db.sql(query, values, as_dict=True)
#     return columns, data

