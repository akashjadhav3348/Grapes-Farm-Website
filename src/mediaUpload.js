export const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const videoTypes = ['video/mp4', 'video/webm'];

export function readMedia(file, allowVideo = false) {
  const video = videoTypes.includes(file.type);
  const allowed = imageTypes.includes(file.type) || (allowVideo && video);
  const limit = (video ? 40 : 8) * 1024 * 1024;
  if (!allowed) return Promise.reject(new Error(allowVideo
    ? 'Choose JPG, PNG, WebP, AVIF, MP4 or WebM.'
    : 'Choose JPG, PNG, WebP or AVIF.'));
  if (!file.size || file.size > limit) return Promise.reject(new Error(video
    ? 'Choose a non-empty video up to 40 MB.'
    : 'Choose a non-empty photo up to 8 MB.'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The selected file could not be read.'));
    reader.readAsDataURL(file);
  });
}
