frappe.pages["tasks-dashboard"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Tasks Dashboard",
    single_column: true,
  });

  page.main.html(`<div id="tasks-app"></div>`);

  frappe.require("/assets/tasks/css/tasks_dashboard.css");
  frappe.require("/assets/tasks/js/tasks_ui.js");
};
