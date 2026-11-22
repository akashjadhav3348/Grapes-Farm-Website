import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3200,
  timerProgressBar: true,
  customClass: { popup: 'dashboard-toast-popup' },
});

export function showDashboardToast(icon, title) {
  return toast.fire({ icon, title });
}
