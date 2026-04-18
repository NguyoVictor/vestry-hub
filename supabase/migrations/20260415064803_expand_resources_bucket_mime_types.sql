UPDATE storage.buckets SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/zip',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'image/webp'
], file_size_limit = 104857600
WHERE id = 'resources';;
