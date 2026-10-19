<!-- Wejdan local artifact · task=task_fc266748-f4ff-4050-9ac6-dfa40de67bd5 · trace=trace_638f1476-1dca-4974-a45b-468cc3ee5206 · role=INF-02 · provider=ollama-local · model=qwen3:8b -->

# Cloud/Infrastructure-as-Code Engineer — Synthetic specialist acceptance artifact

Role: INF-02 · Team: INF · Contract: role.INF-02.v1

## Role output

# Draft: Reviewed Infrastructure Change and Staging Validation

## Summary
This draft outlines the review and staging validation for an infrastructure change related to a fictional local-first personal planning product. The change involves provisioning a network, runtime environment, database, and policy as versioned code. The review includes validation of configuration drift and restrictions on ports and access.

## Evidence and Assumptions
- **Infrastructure as Code (IaC)**: The infrastructure is provisioned using versioned code, and the exact tool (e.g., Terraform, CloudFormation) is pending confirmation. The process is assumed to be consistent with standard IaC practices.
- **Network Configuration**: A new network is being created with specific subnets and security groups. Port access is restricted to only necessary ports (e.g., 80, 443, 22). Specific network details (e.g., CIDR blocks, subnet IDs) are pending confirmation.
- **Runtime Environment**: A runtime environment (e.g., a container or virtual machine) is being deployed with defined access controls and resource limits. The exact runtime environment and configuration are pending confirmation.
- **Database**: A database (e.g., PostgreSQL or MySQL) is being provisioned with appropriate access policies and encryption. The exact database type and configuration are pending confirmation.
- **Policy Enforcement**: Access policies are being enforced using tools like IAM roles, network ACLs, or firewalls. The exact method of policy enforcement is pending confirmation.
- **Staging Validation**: The infrastructure change is being validated in a staging environment before deployment to production. The exact validation process (e.g., automated testing, manual review) is pending confirmation, but it is assumed to include configuration drift detection and access control checks.

## Boundaries and Unknowns
- **Tool Specificity**: The exact IaC tool (e.g., Terraform, CloudFormation) is not specified, which limits the ability to provide detailed implementation steps.
- **Network Details**: Specific network configurations (e.g., CIDR blocks, subnet IDs) are not provided, so assumptions are made based on standard practices.
- **Runtime and Database Details**: The exact runtime environment (e.g., container, VM) and database type (e.g., PostgreSQL, MySQL) are not specified.
- **Policy Enforcement Mechanism**: The exact method of policy enforcement (e.g., IAM, network ACLs) is not specified.
- **Staging Validation Process**: The exact validation process (e.g., automated testing, manual review) is not specified.

## Status
- **Draft**: This is a preliminary review and validation plan. Further details and approvals are required before implementation.
- **Pending Verification**: The exact IaC tool, network configuration, runtime environment, database type, and policy enforcement mechanism must be verified by the infrastructure team and security team.

## Next Steps
- Finalize the IaC tool and configuration details.
- Confirm the network, runtime, and database specifications.
- Define the policy enforcement mechanism and access control rules.
- Validate the staging environment and configuration drift detection process.
- Obtain approval from the infrastructure and security teams before deployment.

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [
    "The draft acknowledges the lack of specific IaC tools and configurations, and clearly states that these are pending confirmation.",
    "Network, runtime, and database details are explicitly noted as pending confirmation, which aligns with the role's responsibility to validate config drift and restrict access.",
    "Policy enforcement and staging validation are described as pending confirmation, which is appropriate given the lack of evidence.",
    "The draft includes a clear 'Evidence and Assumptions' section and a 'Boundaries and Unknowns' section, as required."
  ],
  "missing_requirements": [],
  "evidence_limits": [
    "No tool-specific evidence provided",
    "No user or domain-specific facts provided",
    "No approval or verification status for infrastructure changes"
  ]
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: reviewed, infrastructure, change, staging, validation.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.