<!-- Wejdan local artifact · task=task_0829c4a1-f95c-462e-bbf0-0b122383ca5b · trace=trace_7c7b90a1-6afd-43a2-b6ec-abc560715050 · role=BE-08 · provider=ollama-local · model=qwen3:8b -->

# Application Integration/n8n Engineer — Synthetic specialist acceptance artifact

Role: BE-08 · Team: BE · Contract: role.BE-08.v1

## Role output

# n8n Workflow Draft for Personal Planning Exercise (Revised)

## Overview
This revised draft outlines a versioned n8n workflow for a fictional local-first personal planning product. The workflow is designed to expose signed/authenticated webhooks and least-privilege service endpoints, with fixed sub-workflows, retries/error routes, and environment separation. This version includes more detailed node definitions, test cases, and deployment strategies.

## Workflow Specification (v1.0)

### 1. Webhook Endpoint
- **Endpoint**: `/api/webhook/v1`
- **Method**: `POST`
- **Authentication**: JWT token (signed with a secret key)
- **Signature**: SHA-256 hash of payload + secret key
- **Validation**: Check signature and JWT token against known secrets
- **Response**: 200 OK if valid, 401 Unauthorized if invalid
- **Node Types**:
  - `n8n-nodes-base.httpRequest` for receiving the webhook
  - `n8n-nodes-base.jsonParse` for parsing the payload
  - `n8n-nodes-base.jwtVerify` for JWT validation
  - `n8n-nodes-base.sha256` for signature validation
  - `n8n-nodes-base.httpRequest` for internal service calls

### 2. Sub-Workflows
- **Workflow A: Task Creation**
  - **Input**: Task name, due date, priority
  - **Output**: Task ID
  - **Retry**: 3 attempts with 5-second delay
  - **Error Route**: Log error and notify admin
  - **Node Types**:
    - `n8n-nodes-base.httpRequest` to call internal task creation API
    - `n8n-nodes-base.logger` for logging
    - `n8n-nodes-base.email` for admin notification

- **Workflow B: Task Update**
  - **Input**: Task ID, new status, notes
  - **Output**: Updated task status
  - **Retry**: 3 attempts with 5-second delay
  - **Error Route**: Log error and notify admin
  - **Node Types**:
    - `n8n-nodes-base.httpRequest` to call internal task update API
    - `n8n-nodes-base.logger` for logging
    - `n8n-nodes-base.email` for admin notification

- **Workflow C: Task Deletion**
  - **Input**: Task ID
  - **Output**: Confirmation of deletion
  - **Retry**: 3 attempts with 5-second delay
  - **Error Route**: Log error and notify admin
  - **Node Types**:
    - `n8n-nodes-base.httpRequest` to call internal task deletion API
    - `n8n-nodes-base.logger` for logging
    - `n8n-nodes-base.email` for admin notification

### 3. Environment Separation
- **Development**: `localhost:5678`
- **Staging**: `staging.example.com`
- **Production**: `production.example.com`
- **Secrets Management**: Use environment variables for secrets (JWT secret, API keys)
- **Deployment Strategy**:
  - Use separate n8n instances for each environment
  - Use environment variables to manage secrets
  - Use CI/CD pipelines for deployment and configuration

### 4. Error Handling
- **Retry Policy**: 3 retries with exponential backoff
- **Error Logging**: Log all errors to a centralized log system
- **Notification**: Admin email notification on critical errors
- **Node Types**:
  - `n8n-nodes-base.logger` for logging
  - `n8n-nodes-base.email` for admin notification

### 5. Testing
- **Unit Tests**: Validate webhook signature and JWT token
- **Integration Tests**: Simulate task creation, update, and deletion
- **Environment Tests**: Validate endpoints in development, staging, and production

## Integration Tests (Revised)

### Test 1: Webhook Signature Validation
- **Input**: Payload with invalid signature
- **Expected Output**: 401 Unauthorized
- **Payload Example**:
  ```json
  {
    "task": "Buy groceries",
    "due_date": "2023-10-20",
    "priority": "medium"
  }
  ```
- **Expected Response**:
  ```json
  {
    "error": "Invalid signature"
  }
  ```

### Test 2: Webhook JWT Token Validation
- **Input**: Payload with invalid JWT token
- **Expected Output**: 401 Unauthorized
- **Payload Example**:
  ```json
  {
    "task": "Buy groceries",
    "due_date": "2023-10-20",
    "priority": "medium"
  }
  ```
- **Expected Response**:
  ```json
  {
    "error": "Invalid JWT token"
  }
  ```

### Test 3: Task Creation
- **Input**: Valid task data
- **Expected Output**: Task ID and 200 OK
- **Payload Example**:
  ```json
  {
    "task": "Buy groceries",
    "due_date": "2023-10-20",
    "priority": "medium"
  }
  ```
- **Expected Response**:
  ```json
  {
    "task_id": "task_123"
  }
  ```

### Test 4: Task Update
- **Input**: Valid task ID and new status
- **Expected Output**: Updated status and 200 OK
- **Payload Example**:
  ```json
  {
    "task_id": "task_123",
    "status": "completed"
  }
  ```
- **Expected Response**:
  ```json
  {
    "status": "completed"
  }
  ```

### Test 5: Task Deletion
- **Input**: Valid task ID
- **Expected Output**: Confirmation and 200 OK
- **Payload Example**:
  ```json
  {
    "task_id": "task_123"
  }
  ```
- **Expected Response**:
  ```json
  {
    "message": "Task deleted"
  }
  ```

## Evidence and Assumptions

- **Assumption 1**: The JWT secret and API keys are stored securely in environment variables.
- **Assumption 2**: The task data structure is consistent and well-defined.
- **Assumption 3**: The error logging and notification system is in place and functional.
- **Assumption 4**: The webhook endpoint is deployed and accessible in the specified environments.
- **Assumption 5**: The task creation, update, and deletion workflows are implemented in the application.

## Boundaries and Unknowns

- **Unknown 1**: The exact structure of the task data and its validation rules.
- **Unknown 2**: The exact implementation of the error logging and notification system.
- **Unknown 3**: The exact deployment and configuration of the webhook endpoint.
- **Unknown 4**: The exact environment variables and secrets management setup.
- **Unknown 5**: The exact integration with the application's task management system.

## Notes
- This is a draft workflow

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [
    "Workflow specification now includes detailed node configurations and node types",
    "Integration tests are defined with expected payloads and responses",
    "Environment separation is detailed with specific configurations and deployment strategies"
  ],
  "missing_requirements": [],
  "evidence_limits": [
    "No actual implementation or test execution has been performed",
    "No evidence of secret management or JWT validation logic",
    "No evidence of error logging or notification system integration"
  ]
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: versioned, workflow, integration, tests.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.