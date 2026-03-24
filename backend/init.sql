-- ChainBridge Database Initialization
-- This script runs on first container startup

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create initial schema (optional - can be managed by Alembic)
-- This is a placeholder for any manual schema setup needed

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE chainbridge TO chainbridge;
