#!/bin/bash

# Load Testing Runner Script for ComplyEUR
# This script runs k6 load tests with proper configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}ComplyEUR Load Testing Suite${NC}"
echo "=================================="
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo ""
    echo "Install k6:"
    echo "  macOS:   brew install k6"
    echo "  Linux:   sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 && echo \"deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main\" | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt-get update && sudo apt-get install k6"
    echo "  Windows: choco install k6"
    echo ""
    echo "Or visit: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Load environment variables from .env.local if it exists
if [ -f .env.local ]; then
    echo -e "${GREEN}Loading environment from .env.local${NC}"
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}Error: NEXT_PUBLIC_SUPABASE_URL not set${NC}"
    echo "Set it in .env.local or export it manually"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}Error: NEXT_PUBLIC_SUPABASE_ANON_KEY not set${NC}"
    echo "Set it in .env.local or export it manually"
    exit 1
fi

# Set default BASE_URL if not provided
BASE_URL=${BASE_URL:-"http://localhost:3000"}

echo -e "${YELLOW}Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Test type selection
echo "Select test type:"
echo "  1) Smoke test (1 user, quick validation)"
echo "  2) Light load (10 users, 2 minutes)"
echo "  3) Medium load (50 users, 5 minutes)"
echo "  4) Heavy load (100+ users, 10 minutes)"
echo "  5) Stress test (ramp to breaking point)"
echo ""
read -p "Enter choice [1-5]: " test_type

case $test_type in
    1)
        TEST_NAME="smoke"
        SCRIPT="scripts/complyeur-load-test.js"
        OPTIONS="--vus 1 --duration 30s"
        ;;
    2)
        TEST_NAME="light"
        SCRIPT="scripts/complyeur-load-test.js"
        OPTIONS="--vus 10 --duration 2m"
        ;;
    3)
        TEST_NAME="medium"
        SCRIPT="scripts/complyeur-load-test.js"
        OPTIONS="--vus 50 --duration 5m"
        ;;
    4)
        TEST_NAME="heavy"
        SCRIPT="scripts/complyeur-load-test.js"
        # Uses staged config from the script
        OPTIONS=""
        ;;
    5)
        TEST_NAME="stress"
        SCRIPT="scripts/complyeur-load-test.js"
        OPTIONS="--vus 200 --duration 10m"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Running $TEST_NAME test...${NC}"
echo ""

# Create results directory
mkdir -p load-test-results

# Run the test
k6 run $OPTIONS \
    --out json=load-test-results/${TEST_NAME}-$(date +%Y%m%d-%H%M%S).json \
    -e BASE_URL="$BASE_URL" \
    -e SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
    -e SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    $SCRIPT

echo ""
echo -e "${GREEN}Test complete!${NC}"
echo "Results saved to load-test-results/"
echo ""
echo "Analyze results with:"
echo "  k6 inspect load-test-results/${TEST_NAME}-*.json"
