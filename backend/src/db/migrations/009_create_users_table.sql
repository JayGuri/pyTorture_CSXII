-- Migration 009: Create Users Table
-- Simple users table for demo/test accounts (separate from Supabase Auth)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_demo BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_demo ON users(is_demo);

-- Add comment
COMMENT ON TABLE users IS 'Demo and test user accounts for development and testing';
COMMENT ON COLUMN users.is_demo IS 'Flag to identify demo accounts for testing';
