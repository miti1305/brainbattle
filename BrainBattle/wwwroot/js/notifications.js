// F20 (Moontaha): Notification Center page (Views/Notifications/Index.cshtml).
// A new notification (hub event notification:new) reloads the list after the toast from site.js.
(function () {
  'use strict';
  BB.on('notification:new', () => setTimeout(() => window.location.reload(), 1500));
})();
