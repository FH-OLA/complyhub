# Architecture

ComplyHub is built using a modern SaaS architecture designed for rapid development and scalability.

Frontend:
Next.js (React framework)

Backend:
Supabase (PostgreSQL database and authentication)

AI Services:
OpenAI API for policy generation and compliance assistance

Payments:
Stripe for subscription billing

Hosting:
Vercel

External APIs:
Companies House API

System Flow:

1. User signs up and logs into the platform
2. User enters a company number
3. System retrieves company data from Companies House
4. Compliance engine evaluates potential risks
5. A compliance score is generated
6. Alerts are displayed on the dashboard
7. Users can generate compliance policies using AI