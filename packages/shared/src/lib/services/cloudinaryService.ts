/**
 * cloudinaryService.ts — Service to upload files directly to Cloudinary using Unsigned Uploads.
 */

export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'banglarbazar';
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

  console.log(`[Cloudinary] Starting upload for file: ${file.name} to cloud: ${cloudName} (preset: ${uploadPreset})...`);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || 'Cloudinary upload failed';
    console.error(`[Cloudinary] Upload failed:`, errorMessage);
    throw new Error(errorMessage);
  }

  const data = await res.json();
  console.log(`[Cloudinary] Upload successful! URL:`, data.secure_url);
  return data.secure_url;
}
