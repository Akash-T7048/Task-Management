// Copyright (c) 2026, HKM Ahemdabad and contributors
// For license information, please see license.txt

frappe.query_reports["Daily Work Report"] = {
  filters: [
    {
      fieldname: "period",
      label: __("Period"),
      fieldtype: "Select",
      options: ["Today", "Custom"],
      default: "Today",
      on_change: function () {
        const period = frappe.query_report.get_filter_value("period");
        set_dates(period);
      },
    },
    {
      fieldname: "from_date",
      label: __("Start Date"),
      fieldtype: "Date",
    },
    {
      fieldname: "to_date",
      label: __("End Date"),
      fieldtype: "Date",
    },
  ],

  onload: function () {
    set_dates("Today");
  },
};

function set_dates(period) {
  const today = frappe.datetime.get_today();

  if (period === "Today") {
    frappe.query_report.set_filter_value("from_date", today);
    frappe.query_report.set_filter_value("to_date", today);
  }

  if (period === "Custom") {
    // do nothing; user will pick dates
  }

  frappe.query_report.refresh();
}