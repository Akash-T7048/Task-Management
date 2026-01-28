import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime, get_datetime


class Tasks(Document):
    pass


def _get_open_row(doc):
    for r in reversed(doc.get("timesheet_table") or []):
        if r.get("from_time") and not r.get("to_time"):
            return r
    return None


@frappe.whitelist()
def start_timer(task, activity_type):
    doc = frappe.get_doc("Tasks", task)

    if _get_open_row(doc):
        frappe.throw("Timer is already running. Please end it first.")

    doc.append("timesheet_table", {
        "activity_type": activity_type,
        "from_time": now_datetime(),
        "to_time": None,
        "hours": 0,
        "user": frappe.session.user
    })

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return True

@frappe.whitelist()
def stop_timer(task):
    doc = frappe.get_doc("Tasks", task)

    # find open row
    row = None
    for r in reversed(doc.get("timesheet_table") or []):
        if r.get("from_time") and not r.get("to_time"):
            row = r
            break

    if not row:
        frappe.throw("No running timer found.")

    started = get_datetime(row.from_time)
    ended = now_datetime()

    seconds = (ended - started).total_seconds()
    hrs = round(max(0.0, seconds / 3600.0), 2)

    row.to_time = ended
    row.hours = hrs
    row.user = row.user or frappe.session.user

    total = 0.0
    for rr in doc.get("timesheet_table") or []:
        total += float(rr.get("hours") or 0)

    # only if you created this parent field
    if hasattr(doc, "total_working_hours"):
        doc.total_working_hours = round(total, 2)

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"hours": hrs, "total_working_hours": round(total, 2)}
