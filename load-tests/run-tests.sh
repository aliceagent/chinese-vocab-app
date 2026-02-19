#!/bin/bash

# Load Test Runner for Chinese Vocab App
# CHN-8-11: Performance Load Tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="${SCRIPT_DIR}/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Chinese Vocab App Load Tests${NC}"
echo "Timestamp: ${TIMESTAMP}"
echo "Reports will be saved to: ${REPORTS_DIR}"
echo

# Create reports directory
mkdir -p "${REPORTS_DIR}"

# Check if the app is running
echo -e "${YELLOW}📡 Checking if app is running on localhost:3000...${NC}"
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ App is running${NC}"
else
    echo -e "${RED}❌ App is not running. Please start it with 'npm run dev'${NC}"
    exit 1
fi

# Function to run a test scenario
run_test() {
    local test_name="$1"
    local test_file="$2"
    local description="$3"
    
    echo -e "\n${BLUE}🧪 Running: ${test_name}${NC}"
    echo -e "${YELLOW}Description: ${description}${NC}"
    
    local report_file="${REPORTS_DIR}/${test_name}_${TIMESTAMP}.json"
    local html_report="${REPORTS_DIR}/${test_name}_${TIMESTAMP}.html"
    
    if k6 run --out json="${report_file}" "${test_file}"; then
        echo -e "${GREEN}✅ ${test_name} completed successfully${NC}"
        
        # Generate HTML report summary
        echo "<h2>${test_name} - ${TIMESTAMP}</h2>" >> "${html_report}"
        echo "<p><strong>Description:</strong> ${description}</p>" >> "${html_report}"
        echo "<p><strong>Report:</strong> <a href=\"$(basename "${report_file}")\">JSON Report</a></p>" >> "${html_report}"
    else
        echo -e "${RED}❌ ${test_name} failed${NC}"
    fi
    
    sleep 5 # Cool down between tests
}

# 1. Smoke Test (Quick validation)
run_test "smoke-test" \
         "${SCRIPT_DIR}/scenarios/smoke-test.js" \
         "Quick validation test with 5 concurrent users"

# 2. Main User Flow - Light Load (10 users)
sed -i '' 's/LOAD_STAGES\.medium/LOAD_STAGES.light/g' "${SCRIPT_DIR}/scenarios/main-user-flow.js"
run_test "main-flow-light" \
         "${SCRIPT_DIR}/scenarios/main-user-flow.js" \
         "Main user flow with 10 concurrent users (light load)"

# 3. Main User Flow - Medium Load (50 users)
sed -i '' 's/LOAD_STAGES\.light/LOAD_STAGES.medium/g' "${SCRIPT_DIR}/scenarios/main-user-flow.js"
run_test "main-flow-medium" \
         "${SCRIPT_DIR}/scenarios/main-user-flow.js" \
         "Main user flow with 50 concurrent users (medium load)"

# 4. Main User Flow - Heavy Load (100 users)
sed -i '' 's/LOAD_STAGES\.medium/LOAD_STAGES.heavy/g' "${SCRIPT_DIR}/scenarios/main-user-flow.js"
run_test "main-flow-heavy" \
         "${SCRIPT_DIR}/scenarios/main-user-flow.js" \
         "Main user flow with 100 concurrent users (heavy load)"

# Reset to medium load
sed -i '' 's/LOAD_STAGES\.heavy/LOAD_STAGES.medium/g' "${SCRIPT_DIR}/scenarios/main-user-flow.js"

# 5. API Endpoints Test
run_test "api-endpoints" \
         "${SCRIPT_DIR}/scenarios/api-endpoints.js" \
         "API endpoint stress test with 100 concurrent users"

echo -e "\n${GREEN}🎉 All load tests completed!${NC}"
echo -e "${BLUE}📊 Reports saved to: ${REPORTS_DIR}${NC}"

# Generate summary report
SUMMARY_FILE="${REPORTS_DIR}/test-summary_${TIMESTAMP}.md"
cat > "${SUMMARY_FILE}" << EOF
# Load Test Summary - ${TIMESTAMP}

## Test Environment
- **App URL**: http://localhost:3000
- **Test Tool**: k6 v$(k6 version | head -1)
- **Date**: $(date)

## Tests Executed

1. **Smoke Test**: Quick validation (5 users)
2. **Main Flow - Light**: Core user flows (10 users)
3. **Main Flow - Medium**: Core user flows (50 users)  
4. **Main Flow - Heavy**: Core user flows (100 users)
5. **API Endpoints**: API stress test (100 users)

## Key Metrics Tracked
- Response times (95th percentile < 2s)
- Error rates (< 5%)
- Request throughput (> 10 req/s)

## Files Generated
$(ls -la "${REPORTS_DIR}" | grep "${TIMESTAMP}")

## Next Steps
1. Review JSON reports for detailed metrics
2. Identify performance bottlenecks
3. Optimize slow endpoints
4. Re-run tests after improvements
EOF

echo -e "${YELLOW}📋 Summary report: ${SUMMARY_FILE}${NC}"
echo -e "\n${BLUE}🔍 To analyze results:${NC}"
echo "1. Review JSON files for detailed metrics"
echo "2. Look for high response times and error rates"
echo "3. Check which endpoints need optimization"