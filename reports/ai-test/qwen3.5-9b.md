# AI test report: qwen3.5:9b

Run on 27 Sept 2026, 10:59 pm, 100 test cases from [scripts/ai-test-cases.ts](../../scripts/ai-test-cases.ts).

A case passes when the model gets *is this an application update* right and, for application emails, both the status and the company.

| Score | Job? | Status | Company | Errors | Avg per email | Total time | Model load |
|---|---|---|---|---|---|---|---|
| **97/100 (97.0%)** | 99.0% | 96.0% | 98.7% | 0 | 19.7s | 1968.7s | 22.9s |

## Failed cases (3)

### 1. Case #10 – "Your proposal was submitted: React Native developer for fitness app"

| Field | Expected | Got |
|---|---|---|
| Application update | `true` | ❌ `false` |
| Status | `applied` | `applied` |
| Company | matches `/fitbuddy/i` | ❌ _null_ |

Other fields the model returned: role _null_, platform `Upwork`, tech `mobile`, employment `contractor`, workplace _null_, location _null_

Model's summary: _This is a notification that a proposal was submitted on Upwork for a React Native developer role._

Time: 22.6s

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

### 2. Case #22 – "Chargebee - Pre-screening questions"

| Field | Expected | Got |
|---|---|---|
| Application update | `true` | `true` |
| Status | `screening` | ❌ `assessment` |
| Company | matches `/chargebee/i` | `Chargebee` |

Other fields the model returned: role `Software Engineer - Platform`, platform _null_, tech `backend`, employment _null_, workplace _null_, location _null_

Model's summary: _The company is requesting pre-screening questions regarding experience, work authorization, and start date before proceeding with the application._

Time: 22.3s

**Email**

````text
From: Chargebee Recruiting <no-reply@greenhouse.io>
To: me@example.com
Subject: Chargebee - Pre-screening questions

Hi Utkarsh,

Thank you for applying for the Software Engineer - Platform role at Chargebee. To help us understand your profile, please answer a few short questions about your experience, work authorization and earliest start date using the form below.

Chargebee Talent Team
````

### 3. Case #44 – "Toptal Step 3: Live technical interview scheduled"

| Field | Expected | Got |
|---|---|---|
| Application update | `true` | `true` |
| Status | `interview` | ❌ `assessment` |
| Company | matches `/toptal/i` | `Toptal` |

Other fields the model returned: role _null_, platform `Toptal`, tech _null_, employment _null_, workplace _null_, location _null_

Model's summary: _The candidate has been scheduled for a live technical interview involving coding and project discussion as part of the Toptal vetting process._

Time: 19.1s

**Email**

````text
From: Toptal Screening <screening@toptal.com>
To: me@example.com
Subject: Toptal Step 3: Live technical interview scheduled

Hi Utkarsh,

Great work on the algorithm test. Your live technical interview with a senior Toptal engineer is scheduled for Sep 30 at 7:00 PM IST. Expect live coding and questions about your past projects.

Toptal Talent Team
````
