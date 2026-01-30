-- Increase video-clips bucket file size limit from 50MB to 100MB
UPDATE storage.buckets 
SET file_size_limit = 104857600 -- 100MB in bytes
WHERE id = 'video-clips';