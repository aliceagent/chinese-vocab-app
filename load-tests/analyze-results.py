#!/usr/bin/env python3
"""
Performance Load Test Analysis Script
CHN-8-11: Chinese Vocab App Load Testing Results
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

def analyze_k6_results(json_file):
    """Analyze k6 JSON results and extract key metrics"""
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
        
        # Extract metrics data
        metrics = data.get('metrics', {})
        
        # Key performance indicators
        analysis = {
            'test_file': json_file,
            'timestamp': data.get('timestamp', 'unknown'),
            'duration': None,
            'request_metrics': {},
            'error_metrics': {},
            'performance_summary': {}
        }
        
        # HTTP request duration metrics
        if 'http_req_duration' in metrics:
            duration_data = metrics['http_req_duration']
            analysis['request_metrics'] = {
                'avg_response_time': duration_data.get('avg', 0),
                'median_response_time': duration_data.get('med', 0),
                'p95_response_time': duration_data.get('p(95)', 0),
                'p99_response_time': duration_data.get('p(99)', 0),
                'max_response_time': duration_data.get('max', 0),
                'min_response_time': duration_data.get('min', 0)
            }
        
        # Request rate and throughput
        if 'http_reqs' in metrics:
            reqs_data = metrics['http_reqs']
            analysis['request_metrics']['total_requests'] = reqs_data.get('count', 0)
            analysis['request_metrics']['requests_per_sec'] = reqs_data.get('rate', 0)
        
        # Error rates
        if 'http_req_failed' in metrics:
            failed_data = metrics['http_req_failed']
            analysis['error_metrics']['failure_rate'] = failed_data.get('rate', 0)
            analysis['error_metrics']['failed_requests'] = failed_data.get('fails', 0)
        
        # Check pass/fail rates
        if 'checks' in metrics:
            checks_data = metrics['checks']
            analysis['error_metrics']['check_success_rate'] = checks_data.get('rate', 0)
            analysis['error_metrics']['total_checks'] = checks_data.get('passes', 0) + checks_data.get('fails', 0)
        
        # VU and iteration data
        if 'iterations' in metrics:
            iter_data = metrics['iterations']
            analysis['request_metrics']['total_iterations'] = iter_data.get('count', 0)
            analysis['request_metrics']['iterations_per_sec'] = iter_data.get('rate', 0)
        
        if 'vus' in metrics:
            vus_data = metrics['vus']
            analysis['request_metrics']['avg_concurrent_users'] = vus_data.get('value', 0)
        
        # Performance assessment
        avg_response = analysis['request_metrics'].get('avg_response_time', 0)
        p95_response = analysis['request_metrics'].get('p95_response_time', 0)
        failure_rate = analysis['error_metrics'].get('failure_rate', 0)
        
        analysis['performance_summary'] = {
            'avg_response_acceptable': avg_response < 1000,  # < 1s average
            'p95_response_acceptable': p95_response < 2000,  # < 2s for 95th percentile
            'low_error_rate': failure_rate < 0.05,  # < 5% failure rate
            'overall_rating': 'GOOD' if (avg_response < 1000 and p95_response < 2000 and failure_rate < 0.05) else 
                             'FAIR' if (avg_response < 2000 and p95_response < 3000 and failure_rate < 0.1) else 'POOR'
        }
        
        return analysis
    
    except Exception as e:
        print(f"Error analyzing {json_file}: {e}")
        return None

def generate_performance_report(reports_dir):
    """Generate comprehensive performance report from all test results"""
    
    reports_path = Path(reports_dir)
    json_files = list(reports_path.glob("*.json"))
    
    if not json_files:
        print("No JSON result files found in reports directory")
        return
    
    all_results = []
    for json_file in sorted(json_files):
        result = analyze_k6_results(json_file)
        if result:
            all_results.append(result)
    
    # Generate report
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    report_file = reports_path / f"performance_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    
    with open(report_file, 'w') as f:
        f.write(f"""# Chinese Vocab App - Performance Load Test Report

**Generated:** {timestamp}  
**Test Framework:** k6  
**Total Test Scenarios:** {len(all_results)}

## Executive Summary

""")
        
        # Overall performance summary
        good_tests = sum(1 for r in all_results if r['performance_summary']['overall_rating'] == 'GOOD')
        fair_tests = sum(1 for r in all_results if r['performance_summary']['overall_rating'] == 'FAIR')
        poor_tests = sum(1 for r in all_results if r['performance_summary']['overall_rating'] == 'POOR')
        
        f.write(f"""### Performance Overview
- **✅ Good Performance:** {good_tests} tests
- **⚠️ Fair Performance:** {fair_tests} tests  
- **❌ Poor Performance:** {poor_tests} tests

### Key Findings
""")
        
        # Identify bottlenecks
        slowest_avg = max(all_results, key=lambda x: x['request_metrics'].get('avg_response_time', 0))
        highest_error = max(all_results, key=lambda x: x['error_metrics'].get('failure_rate', 0))
        
        f.write(f"""- **Slowest Average Response:** {slowest_avg['request_metrics'].get('avg_response_time', 0):.2f}ms
- **Highest Error Rate:** {highest_error['error_metrics'].get('failure_rate', 0)*100:.2f}%
- **Peak Throughput:** {max(r['request_metrics'].get('requests_per_sec', 0) for r in all_results):.1f} req/s

## Detailed Test Results

""")
        
        # Detailed results for each test
        for result in all_results:
            test_name = Path(result['test_file']).stem.replace('_20260219_024658', '')
            rating = result['performance_summary']['overall_rating']
            rating_emoji = {'GOOD': '✅', 'FAIR': '⚠️', 'POOR': '❌'}.get(rating, '❓')
            
            f.write(f"""### {test_name} {rating_emoji} {rating}

| Metric | Value |
|--------|--------|
| **Average Response Time** | {result['request_metrics'].get('avg_response_time', 0):.2f}ms |
| **95th Percentile Response Time** | {result['request_metrics'].get('p95_response_time', 0):.2f}ms |
| **Requests per Second** | {result['request_metrics'].get('requests_per_sec', 0):.1f} |
| **Total Requests** | {result['request_metrics'].get('total_requests', 0):,} |
| **Error Rate** | {result['error_metrics'].get('failure_rate', 0)*100:.2f}% |
| **Average Concurrent Users** | {result['request_metrics'].get('avg_concurrent_users', 0):.0f} |

""")

        # Recommendations section
        f.write(f"""## Performance Recommendations

### Immediate Actions
1. **Response Time Optimization**
   - Target endpoints with >1s average response time
   - Implement database query optimization
   - Add response caching where appropriate

2. **Error Handling**
   - Investigate failed requests and implement proper error handling
   - Add request rate limiting to prevent overload
   - Implement graceful degradation for high load

3. **Scalability Improvements**
   - Consider implementing horizontal scaling
   - Add database connection pooling
   - Optimize static asset delivery (CDN)

### Load Testing Best Practices
- Run tests during different times to simulate real traffic patterns  
- Monitor server resources (CPU, memory, disk) during load tests
- Implement gradual ramp-up to identify breaking points
- Set up continuous performance monitoring

## Performance Baselines Established

Based on these tests, the Chinese Vocab App baseline performance metrics are:

| Load Level | Concurrent Users | Avg Response Time | 95th Percentile | Error Rate |
|------------|------------------|-------------------|------------------|------------|
""")
        
        # Performance baselines table
        test_levels = {'light': 10, 'medium': 50, 'heavy': 100}
        for test_level, users in test_levels.items():
            matching_tests = [r for r in all_results if test_level in r['test_file']]
            if matching_tests:
                test = matching_tests[0]  # Take first matching test
                f.write(f"| {test_level.title()} | {users} | {test['request_metrics'].get('avg_response_time', 0):.0f}ms | {test['request_metrics'].get('p95_response_time', 0):.0f}ms | {test['error_metrics'].get('failure_rate', 0)*100:.1f}% |\n")

        f.write(f"""
---
**Report generated by:** Worker-Alpha (CHN-8-11 Performance Load Tests)  
**Timestamp:** {timestamp}
""")
    
    print(f"📊 Performance analysis report generated: {report_file}")
    return report_file

if __name__ == "__main__":
    reports_dir = sys.argv[1] if len(sys.argv) > 1 else "./reports"
    generate_performance_report(reports_dir)