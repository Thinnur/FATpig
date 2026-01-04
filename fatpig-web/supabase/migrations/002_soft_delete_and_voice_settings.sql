-- Migration: Add soft delete for accounts and voice language settings
-- Created: 2025-12-29

-- Add soft delete columns to multi_rekening table
ALTER TABLE multi_rekening 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_multi_rekening_is_deleted 
ON multi_rekening(user_id, is_deleted) 
WHERE is_deleted = FALSE;

-- Add voice language setting to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bahasa_suara TEXT DEFAULT 'id-ID';

-- Add comment for documentation
COMMENT ON COLUMN multi_rekening.is_deleted IS 'Soft delete flag - TRUE if account is deleted but preserved for transaction history';
COMMENT ON COLUMN multi_rekening.deleted_at IS 'Timestamp when account was soft deleted';
COMMENT ON COLUMN profiles.bahasa_suara IS 'Voice recognition language code (e.g., id-ID, en-US)';

-- Update existing records to ensure they are not marked as deleted
UPDATE multi_rekening SET is_deleted = FALSE WHERE is_deleted IS NULL;
