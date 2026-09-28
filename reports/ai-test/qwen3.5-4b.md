# AI test report: qwen3.5:4b

Run on 27 Sept 2026, 11:18 pm, 100 test cases from [scripts/ai-test-cases.ts](../../scripts/ai-test-cases.ts).

A case passes when the model gets *is this an application update* right and, for application emails, both the status and the company.

| Score | Job? | Status | Company | Errors | Avg per email | Total time | Model load |
|---|---|---|---|---|---|---|---|
| **96/100 (96.0%)** | 96.0% | 94.7% | 94.7% | 0 | 10.8s | 1082.7s | 14.1s |

## Failed cases (4)

### 1. Case #10 – "Your proposal was submitted: React Native developer for fitness app"

| Field | Expected | Got |
|---|---|---|
| Application update | `true` | ❌ `false` |
| Status | `applied` | `applied` |
| Company | matches `/fitbuddy/i` | ❌ _null_ |

Other fields the model returned: role `React Native developer for fitness app`, platform `Upwork`, tech `mobile`, employment `contractor`, workplace _null_, location _null_

Model's summary: _Confirmation that a proposal was submitted on Upwork for a React Native developer role._

Time: 11.3s

**Email**

````text
From: Upwork <donotreply@upwork.com>
To: me@example.com
Subject: Your proposal was submitted: React Native developer for fitness app

Your proposal has been submitted.

Job: React Native developer for fitness app (hourly, 3-6 months)
Client: FitBuddy Labs (United States)
Your rate: $45.00/hr

We'll notify you when the client responds.
````

### 2. Case #21 – "Re: Contract React role at Deloitte"

| Field | Expected | Got |
|---|---|---|
| Application update | `true` | ❌ `false` |
| Status | `screening` | `screening` |
| Company | matches `/deloitte/i` | ❌ _null_ |

Other fields the model returned: role _null_, platform _null_, tech `frontend`, employment `contractor`, workplace `hybrid`, location _null_

Model's summary: _A staffing recruiter is forwarding the user's profile to Deloitte and requesting a call to confirm availability for rate and joining date._

Time: 11.4s

**Email**

````text
From: Rahul Verma <rahul@techstaffing.in>
To: me@example.com
Subject: Re: Contract React role at Deloitte

Hi Utkarsh,

Thanks for sharing your updated resume. I've forwarded your profile to Deloitte's hiring team for the 6-month contract React Developer role (Gurugram, hybrid). Could you confirm your availability for a quick call tomorrow so we can go over rate and joining date?

Regards,
Rahul Verma
TechStaffing Solutions
````

### 3. Case #29 – "Paytm Hiring Challenge: Your test link"

| Field | Expected | Got |
|---|---|---|
| Application update | `true` | ❌ `false` |
| Status | `assessment` | `assessment` |
| Company | matches `/paytm/i` | `Paytm` |

Other fields the model returned: role `Senior Node.js Developer`, platform `HackerEarth`, tech `backend`, employment _null_, workplace _null_, location _null_

Model's summary: _You have been shortlisted for the online coding test for Paytm's Senior Node.js Developer role._

Time: 11.1s

**Email**

````text
From: HackerEarth <noreply@hackerearth.com>
To: me@example.com
Subject: Paytm Hiring Challenge: Your test link

Hi Utkarsh,

You've been shortlisted for the online test for Paytm's Senior Node.js Developer role. The test window opens on Sep 24 at 10:00 AM IST and lasts 2 hours. Use the link below to start.

HackerEarth Assessments
````

### 4. Case #56 – "You've received an offer: Build Next.js analytics dashboard"

| Field | Expected | Got |
|---|---|---|
| Application update | `true` | ❌ `false` |
| Status | `offer` | `offer` |
| Company | matches `/brightline/i` | ❌ _null_ |

Other fields the model returned: role _null_, platform _null_, tech `frontend`, employment `contractor`, workplace _null_, location _null_

Model's summary: _Upwork is notifying the user about an offer received from Brightline Analytics for a Next.js analytics dashboard project._

Time: 10.7s

**Email**

````text
From: Upwork <donotreply@upwork.com>
To: me@example.com
Subject: You've received an offer: Build Next.js analytics dashboard

Brightline Analytics sent you an offer.

Contract: Build Next.js analytics dashboard
Rate: $50.00/hr, up to 30 hrs/week
Start date: Sep 29, 2026

Review and accept the offer to start working.
````
