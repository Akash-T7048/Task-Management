// Copyright (c) 2025, HKM Ahmedabad and contributors
// For license information, please see license.txt

let td_timer_interval = null;

function formatHMS(totalSeconds) {
  totalSeconds = Math.max(0, Math.floor(totalSeconds));
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function has_open_timer(frm) {
  const rows = frm.doc.timesheet_table || [];
  return rows.some(r => r.from_time && !r.to_time);
}

function stopLocalTimer(frm) {
  if (td_timer_interval) clearInterval(td_timer_interval);
  td_timer_interval = null;
  frm.dashboard.clear_headline();
}

function startLocalTimerFromZero(frm) {
  stopLocalTimer(frm);

  let seconds = 0;
  td_timer_interval = setInterval(() => {
    seconds += 1;
    const el = frm.dashboard.wrapper.find(".td-timer");
    if (el && el.length) el.text(formatHMS(seconds));
  }, 1000);
}

frappe.ui.form.on("Tasks", {
  refresh(frm) {
    if (frm.is_new()) return;

    frm.clear_custom_buttons();

    if (has_open_timer(frm)) {
      startLocalTimerFromZero(frm);

      frm.add_custom_button("End Timer", async () => {
        const r = await frappe.call({
          method: "tasks.tasks.doctype.tasks.tasks.stop_timer",
          args: { task: frm.doc.name }
        });

        frappe.show_alert({
          message: `Timer stopped. Hours: ${r.message?.hours || 0}`,
          indicator: "blue"
        });

        stopLocalTimer(frm);
        frm.reload_doc();
      });

    } else {
      stopLocalTimer(frm);

      frm.add_custom_button("Start Timer", () => {
        const d = new frappe.ui.Dialog({
          title: "Start Timer",
          fields: [
            {
              fieldname: "activity_type",
              label: "Activity Type",
              fieldtype: "Data",
              reqd: 1
            }
          ],
          primary_action_label: "Start",
          primary_action: async (v) => {
            await frappe.call({
              method:  "tasks.tasks.doctype.tasks.tasks.start_timer",
              args: { task: frm.doc.name, activity_type: v.activity_type }
            });

            d.hide();

            frappe.show_alert({ message: "Timer started", indicator: "green" });

            startLocalTimerFromZero(frm);
            frm.reload_doc();
          }
        });

        d.show();
      });
    }
  }
});
