import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

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
  return toast.fire({ icon, title, ...(text ? { text } : {}) });
}
