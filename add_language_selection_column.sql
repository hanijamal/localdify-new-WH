-- Check if the column exists and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'allow_language_selection'
    ) THEN
        ALTER TABLE businesses 
        ADD COLUMN allow_language_selection BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Column allow_language_selection added successfully';
    ELSE
        RAISE NOTICE 'Column allow_language_selection already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND column_name = 'allow_language_selection';
