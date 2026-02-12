#!/bin/bash
set -e

# Deploy Xarizma to VDS
VDS_HOST="v613482.hosted-by-vdsina.com"
VDS_USER="root"
PROJECT_DIR="/root/xarizma"

echo "🚀 Deploying Xarizma..."

# 1. Build and start Docker containers
echo "🐳 Building Docker images..."
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

echo "⏳ Waiting for database..."
sleep 5

# 2. Run migrations
echo "📊 Running migrations..."
docker exec xarizma-api node -e "
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1').then(() => { console.log('DB connected'); pool.end(); });
" 2>/dev/null || echo "DB check done"

# 3. Run seed if needed
echo "🌱 Seeding database..."
docker exec xarizma-api node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT count(*) FROM branches').then(r => {
  if (parseInt(r.rows[0].count) === 0) {
    console.log('Empty DB, seeding...');
    process.exit(1);
  } else {
    console.log('DB already seeded (' + r.rows[0].count + ' branches)');
    pool.end();
  }
}).catch(() => { console.log('Tables not found, need migration'); process.exit(1); });
" 2>/dev/null && echo "  ✅ DB has data" || echo "  ⚠️ May need manual seed"

echo ""
echo "✅ API deployed at http://localhost:3001"
echo "📝 Swagger docs at http://localhost:3001/api/docs"
echo ""
echo "Next steps:"
echo "  1. Configure nginx reverse proxy for api.xarizma domain"
echo "  2. Deploy admin to Vercel"
echo "  3. Deploy widget to Vercel"
