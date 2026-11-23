import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import './dashboard-alerts.css';

let alertCount = 0;
let previousInert = false;
function layerLifecycle() {
  let opened = false;
  return {
    didOpen() {
      const root = document.getElementById('root');
      if (alertCount === 0) previousInert = root?.inert ?? false;
      alertCount += 1;
      opened = true;
      if (root) root.inert = true;
      showLayer();
    },
    didDestroy() {
      if (!opened) return;
      opened = false;
      alertCount -= 1;
      const root = document.getElementById('root');
      if (root && alertCount === 0) root.inert = previousInert;
    },
  };
}

function showLayer() {
  const container = Swal.getContainer();
  container.classList.add('dashboard-swal-layer');
  if (typeof container.showPopover === 'function') {
    container.setAttribute('popover', 'manual');
    container.showPopover();
  }
}

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  customClass: { popup: 'dashboard-toast-popup' },
});

export function showDashboardToast(icon, title) {
  const text = icon === 'success'
    ? `Saved at ${new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    : undefined;
  return toast.fire({ icon, title, ...(text ? { text } : {}), ...layerLifecycle() });
}

export async function confirmDashboardAction(message) {
  const result = await Swal.fire({
    title: 'Confirm change', text: message, icon: 'warning',
    showCancelButton: true, confirmButtonText: 'Confirm', cancelButtonText: 'Cancel',
    confirmButtonColor: '#087f42', focusCancel: true,
    ...layerLifecycle(),
  });
  return result.isConfirmed;
}
