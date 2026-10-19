<!-- Wejdan local artifact · task=task_1988f8b8-7913-4a48-a662-6cc9e577b2af · trace=trace_b2199c47-918c-414e-815d-45c299c266c9 · role=INF-04 · provider=ollama-local · model=qwen3:8b -->

# Site Reliability/Observability Engineer — Synthetic specialist acceptance artifact

Role: INF-04 · Team: INF · Contract: role.INF-04.v1

## Role output

# Operational Dashboard and Incident Readiness Check Draft  
**Role:** INF-04 – Site Reliability/Observability Engineer  
**Task ID:** task_1988f8b8-7913-4a48-a662-6cc9e577b2af  
**Trace ID:** trace_b2199c47-918c-414e-815d-45c299c266c9  

---

## 📊 Operational Dashboard Draft

### 1. **Service Metrics Overview**
| Metric Name | Description | Current Status | Alert Threshold | Alert Status |
|-------------|-------------|----------------|------------------|---------------|
| API Response Time | Average time to respond to API requests | Unknown | > 500ms | Pending |
| API Error Rate | Percentage of failed API requests | Unknown | > 1% | Pending |
| User Session Duration | Average time a user remains logged in | Unknown | > 10 minutes | Pending |
| Database Query Latency | Average time to execute database queries | Unknown | > 200ms | Pending |
| System Uptime | Percentage of time the service is operational | Unknown | < 99.9% | Pending |

### 2. **Tracing and Observability**
- **Tracing Tool:** Unknown (e.g., Jaeger, Zipkin, OpenTelemetry)
- **Trace Sampling Rate:** Unknown
- **Trace Retention Period:** Unknown
- **Span Attributes Collected:** Unknown
- **Trace Aggregation by Service:** Unknown

### 3. **Error Budgets and SLO Proposals**
| SLO Name | Target | Current Status | Alert Threshold | Alert Status |
|----------|--------|----------------|------------------|---------------|
| API Availability | 99.9% | Unknown | < 99.9% | Pending |
| API Latency | 95% of requests < 500ms | Unknown | > 500ms | Pending |
| User Session Success Rate | 99.5% | Unknown | < 99.5% | Pending |

### 4. **Alert Routing and Incident Timeline**
- **Alerting Tool:** Unknown (e.g., Prometheus, Grafana, PagerDuty)
- **Alert Escalation Policy:** Unknown
- **Incident Timeline Template:** Unknown
- **Incident Classification Criteria:** Unknown
- **On-Call Rotation Schedule:** Unknown

---

## 🛠️ Incident Readiness Check

| Check | Status | Notes |
|-------|--------|-------|
| Alert Noise Tuning | Unknown | Requires review of alert history and false positive rate |
| Incident Response Plan | Unknown | Needs to be drafted or reviewed |
| SLO Monitoring Setup | Unknown | Requires integration of metrics and alerting tools |
| Tracing Integration | Unknown | Needs to be configured and validated |
| Dashboard Accessibility | Unknown | Requires review of user roles and access controls |

---

## 📌 Evidence and Assumptions

- **Assumption 1:** The product team has a small, local-first planning application with a limited number of services and users.
- **Assumption 2:** The team has access to basic monitoring tools (e.g., Prometheus, Grafana, or similar).
- **Assumption 3:** The team has not yet implemented SLOs, error budgets, or tracing.
- **Assumption 4:** The team has not yet defined alerting thresholds or incident response procedures.
- **Assumption 5:** The team may have a limited number of users and services, which simplifies the observability setup.

---

## ⚠️ Boundaries and Unknowns

- **Unknown 1:** The exact number of users, services, and features in the product.
- **Unknown 2:** The current state of the monitoring and observability infrastructure.
- **Unknown 3:** The exact alerting thresholds and SLO targets.
- **Unknown 4:** The availability of tools or platforms for tracing and alerting.
- **Unknown 5:** The team's current capacity for incident response and on-call rotation.

---

## 📝 Notes

This draft is intended as a starting point for establishing observability and reliability practices. It is not a finalized plan and requires further input from the product team, especially regarding SLO targets, alert thresholds, and tool availability. All metrics, thresholds, and alerting rules must be validated and approved by the team before implementation.

---

**Label:** Draft – Not for production use or approval.  
**Next Steps:** Review with the product team to finalize SLOs, alert thresholds, and tool selection.

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [],
  "missing_requirements": [],
  "evidence_limits": [
    "All metrics, thresholds, and alerting rules are marked as 'Unknown' or 'Pending', which is consistent with the synthetic task's constraints of no real-world data or pre-existing infrastructure."
  ]
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: operational, dashboard, incident, readiness, check.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.