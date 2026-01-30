-- Configure video-clips bucket to only accept video MIME types and set file size limit
UPDATE storage.buckets 
SET 
  allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm', 'video/3gpp', 'video/x-m4v'],
  file_size_limit = 52428800 -- 50MB in bytes
WHERE id = 'video-clips';