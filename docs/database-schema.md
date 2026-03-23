# Database Schema

Users
- id
- email
- created_at
- plan_type

Companies
- id
- user_id
- company_name
- company_number
- industry
- employee_count

Compliance Scores
- id
- company_id
- score
- created_at

Alerts
- id
- company_id
- type
- description
- severity
- due_date

Policies
- id
- company_id
- policy_type
- content
- created_at