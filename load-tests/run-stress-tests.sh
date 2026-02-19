#!/bin/bash

# COMPREHENSIVE STRESS TEST RUNNER for Chinese Vocab App
# CHN-8-7: Load Testing - Stress testing, performance benchmarks, scalability validation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="${SCRIPT_DIR}/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SUMMARY_DIR="${REPORTS_DIR}/stress_test_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create summary directory
mkdir -p "${SUMMARY_DIR}"

echo -e "${PURPLE}🚨 COMPREHENSIVE STRESS TESTING - Chinese Vocab App${NC}"
echo -e "${BLUE}================================================================${NC}"
echo "🕐 Start Time: $(date)"
echo "📁 Reports Directory: ${SUMMARY_DIR}"
echo "🎯 Mission: Find breaking points and validate scalability"
echo -e "${BLUE}================================================================${NC}"
echo

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed. Please install k6 first:${NC}"
    echo "   brew install k6"
    echo "   OR visit: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

echo -e "${YELLOW}🔍 k6 version: $(k6 version)${NC}"
echo

# Check if the app is running
echo -e "${YELLOW}📡 Checking if Chinese Vocab App is running on localhost:3000...${NC}"
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ App is running and responsive${NC}"
else
    echo -e "${RED}❌ App is not running. Please start it first:${NC}"
    echo "   cd projects/chinese-vocab && npm run dev"
    exit 1
fi
echo

# Function to run a stress test with comprehensive reporting
run_stress_test() {
    local test_name="$1"
    local test_file="$2"
    local description="$3"
    local expected_duration="$4"
    
    echo -e "\n${CYAN}🧪 STRESS TEST: ${test_name}${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Description: ${description}${NC}"
    echo -e "${YELLOW}Expected Duration: ${expected_duration}${NC}"
    echo -e "${YELLOW}Start Time: $(date)${NC}"
    echo
    
    local report_file="${SUMMARY_DIR}/${test_name}_detailed.json"
    local summary_file="${SUMMARY_DIR}/${test_name}_summary.txt"
    local error_log="${SUMMARY_DIR}/${test_name}_errors.log"
    
    # Run the test with comprehensive output
    if k6 run \
        --out json="${report_file}" \
        --summary-export="${summary_file}" \
        --console-output="${error_log}" \
        "${test_file}" 2>&1 | tee "${SUMMARY_DIR}/${test_name}_console.log"; then
        
        echo -e "\n${GREEN}✅ ${test_name} completed successfully${NC}"
        echo -e "${GREEN}📊 Report saved to: $(basename "${report_file}")${NC}"
    else
        echo -e "\n${RED}❌ ${test_name} encountered errors or failures${NC}"
        echo -e "${RED}🔍 Check error log: $(basename "${error_log}")${NC}"
    fi
    
    echo -e "${YELLOW}End Time: $(date)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    
    # Cool down between tests
    echo -e "${CYAN}😴 Cooling down for 30 seconds...${NC}"
    sleep 30
}

# STRESS TEST EXECUTION PLAN
echo -e "${PURPLE}📋 STRESS TEST EXECUTION PLAN:${NC}"
echo "1. 🔥 Breaking Points Test (20 min) - Find when system fails"  
echo "2. 💾 Database Stress Test (15 min) - Concurrent DB operations"
echo "3. 📁 Upload Stress Test (12 min) - File operations stress"
echo "4. 📈 Scalability Validation (25 min) - Systematic load increase"
echo
echo -e "${YELLOW}⏱️  Total estimated time: ~75 minutes${NC}"
echo -e "${YELLOW}⚠️  System will be pushed to failure - monitor resources!${NC}"
echo
read -p "Continue with stress testing? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Stress testing cancelled."
    exit 0
fi

# Store initial system state
echo -e "${CYAN}📊 Recording initial system state...${NC}"
echo "Initial System State - $(date)" > "${SUMMARY_DIR}/system_state.log"
echo "=================================" >> "${SUMMARY_DIR}/system_state.log"
curl -s -w "@-" http://localhost:3000 <<< 'Initial Response Time: %{time_total}s\nHTTP Status: %{http_code}\n' >> "${SUMMARY_DIR}/system_state.log" 2>/dev/null || echo "Failed to get initial state" >> "${SUMMARY_DIR}/system_state.log"
echo >> "${SUMMARY_DIR}/system_state.log"

# 1. BREAKING POINTS TEST - Find system limits
run_stress_test "breaking-points" \
                "${SCRIPT_DIR}/scenarios/stress-breaking-points.js" \
                "Aggressive load increase to find breaking points (50→1000 users)" \
                "~20 minutes"

# 2. DATABASE STRESS TEST - Concurrent database operations
run_stress_test "database-stress" \
                "${SCRIPT_DIR}/scenarios/database-stress.js" \
                "Heavy concurrent database operations and queries" \
                "~15 minutes"

# 3. UPLOAD STRESS TEST - File operations and storage
run_stress_test "upload-stress" \
                "${SCRIPT_DIR}/scenarios/upload-stress.js" \
                "File upload system stress and storage operations" \
                "~12 minutes"

# 4. SCALABILITY VALIDATION - Systematic load testing
run_stress_test "scalability-validation" \
                "${SCRIPT_DIR}/scenarios/scalability-validation.js" \
                "Systematic load increase with performance tracking" \
                "~25 minutes"

# Generate comprehensive summary report
echo -e "\n${PURPLE}📊 GENERATING COMPREHENSIVE STRESS TEST REPORT...${NC}"
FINAL_REPORT="${SUMMARY_DIR}/STRESS_TEST_REPORT.md"

cat > "${FINAL_REPORT}" << EOF
# STRESS TEST REPORT - Chinese Vocab App
**Test Suite:** CHN-8-7 Load Testing & Scalability Validation  
**Date:** $(date)  
**Duration:** Started $(date -r "${SUMMARY_DIR}" +"%Y-%m-%d %H:%M:%S")  
**Test Environment:** localhost:3000  

## 🎯 TESTING OBJECTIVES
1. **Find Breaking Points** - Identify when the system fails
2. **Database Scalability** - Test concurrent DB operations limits  
3. **Upload System Limits** - File handling under stress
4. **Performance Characteristics** - How system scales with load

## 📈 TEST SCENARIOS EXECUTED

### 1. Breaking Points Test
- **Load Pattern:** 50 → 200 → 500 → 1000 concurrent users
- **Duration:** ~20 minutes
- **Purpose:** Find absolute system limits
- **Report:** breaking-points_detailed.json

### 2. Database Stress Test  
- **Load Pattern:** Sustained concurrent DB operations (100-400 users)
- **Duration:** ~15 minutes
- **Purpose:** Test database connection pools and query performance
- **Report:** database-stress_detailed.json

### 3. Upload Stress Test
- **Load Pattern:** Heavy file operation simulation (50-200 users) 
- **Duration:** ~12 minutes
- **Purpose:** Test file handling and storage systems
- **Report:** upload-stress_detailed.json

### 4. Scalability Validation
- **Load Pattern:** Systematic increase (25 → 75 → 150 → 250 → 400 users)
- **Duration:** ~25 minutes  
- **Purpose:** Measure performance degradation patterns
- **Report:** scalability-validation_detailed.json

## 🔍 KEY METRICS TO ANALYZE

### Response Time Metrics
- **p(95) Response Time** - 95th percentile response times
- **p(99) Response Time** - 99th percentile (worst case)  
- **Mean Response Time** - Average performance

### Error Rate Metrics
- **HTTP Error Rate** - Failed requests percentage
- **Database Errors** - DB connection/query failures
- **Timeout Errors** - Request timeouts

### Scalability Metrics
- **Throughput (RPS)** - Requests per second at different loads
- **Performance Degradation** - Response time increase with load
- **System Stability** - Error rate stability across load levels

### Breaking Point Indicators
- **Critical Load Level** - User count where errors spike
- **Resource Exhaustion** - Memory/connection pool limits
- **Recovery Capability** - System recovery after stress

## 📊 DETAILED RESULTS

### Files Generated:
$(ls -la "${SUMMARY_DIR}" | tail -n +2)

### Quick Analysis Commands:
\`\`\`bash
# View test summaries
cat ${SUMMARY_DIR}/*_summary.txt

# Check for error patterns  
grep -i "error" ${SUMMARY_DIR}/*_console.log

# Analyze response times
jq '.metrics.http_req_duration' ${SUMMARY_DIR}/*_detailed.json
\`\`\`

## 🚨 BREAKING POINTS IDENTIFIED

*(To be filled after analysis)*

### Load Levels:
- **Stable Performance:** X concurrent users
- **Performance Degradation:** X concurrent users  
- **Error Rate Spike:** X concurrent users
- **System Failure:** X concurrent users

### Bottlenecks Discovered:
- [ ] Database connection limits
- [ ] Memory exhaustion  
- [ ] File system I/O limits
- [ ] Network connection limits
- [ ] Application server limits

## 📋 RECOMMENDATIONS

### Immediate Actions:
1. **Performance Optimization:** Target bottlenecks identified
2. **Resource Scaling:** Increase limits for critical resources
3. **Monitoring:** Implement alerts at identified thresholds

### Architecture Improvements:
1. **Database Optimization:** Connection pooling, query optimization
2. **Caching Strategy:** Reduce database load  
3. **Load Balancing:** Distribute traffic across instances
4. **Resource Monitoring:** Real-time system monitoring

### Scaling Strategy:
1. **Horizontal Scaling:** Add application instances at X users
2. **Database Scaling:** Consider read replicas at X concurrent users
3. **CDN Integration:** Offload static assets
4. **Caching Layer:** Redis/Memcached for session/data caching

## 🔄 NEXT STEPS

1. **Analyze detailed JSON reports** for specific bottlenecks
2. **Implement performance optimizations** for identified issues
3. **Re-run stress tests** after optimizations
4. **Set up monitoring** at identified breaking point thresholds
5. **Document capacity planning** based on findings

---
**Generated by:** Stress Testing Suite CHN-8-7  
**Tool:** k6 Load Testing Framework  
**Report Location:** $(basename "${SUMMARY_DIR}")
EOF

# Final system state check
echo -e "${CYAN}📊 Recording final system state...${NC}"
echo >> "${SUMMARY_DIR}/system_state.log"
echo "Final System State - $(date)" >> "${SUMMARY_DIR}/system_state.log"  
echo "=================================" >> "${SUMMARY_DIR}/system_state.log"
curl -s -w "@-" http://localhost:3000 <<< 'Final Response Time: %{time_total}s\nHTTP Status: %{http_code}\n' >> "${SUMMARY_DIR}/system_state.log" 2>/dev/null || echo "System not responding" >> "${SUMMARY_DIR}/system_state.log"

echo -e "\n${GREEN}🎉 STRESS TESTING COMPLETED!${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}📊 Comprehensive report: $(basename "${FINAL_REPORT}")${NC}"
echo -e "${GREEN}📁 All files saved to: $(basename "${SUMMARY_DIR}")${NC}"  
echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "   1. Analyze detailed JSON reports for bottlenecks"
echo -e "   2. Review breaking points and performance degradation"  
echo -e "   3. Implement optimizations based on findings"
echo -e "   4. Document capacity planning recommendations"
echo -e "${BLUE}================================================================${NC}"

# Optional: Open the report directory
if command -v open &> /dev/null; then
    echo -e "${CYAN}📂 Opening reports directory...${NC}"
    open "${SUMMARY_DIR}"
fi