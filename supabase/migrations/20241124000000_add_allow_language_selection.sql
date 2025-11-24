-- Add allow_language_selection column to businesses table
-- This column controls whether customers can select their own language on the public booking page
-- Default is true (allow selection) for backward compatibility

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS allow_language_selection BOOLEAN DEFAULT true;

-- Add comment to explain the column
COMMENT ON COLUMN businesses.allow_language_selection IS 'Controls whether customers can select their language on the public booking page. If false, only the default language is shown.';
