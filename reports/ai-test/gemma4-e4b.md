# AI test report: gemma4:e4b

Run on 27 Sept 2026, 11:36 pm, 100 test cases from [scripts/ai-test-cases.ts](../../scripts/ai-test-cases.ts).

A case passes when the model gets *is this an application update* right and, for application emails, both the status and the company.

| Score | Job? | Status | Company | Errors | Avg per email | Total time | Model load |
|---|---|---|---|---|---|---|---|
| **97/100 (97.0%)** | 98.0% | 97.3% | 98.7% | 0 | 10.8s | 1080.0s | 16.1s |

## Failed cases (3)

### 1. Case #56 – "You've received an offer: Build Next.js analytics dashboard"

| Field | Expected | Got |
|---|---|---|
| Application update | `true` | ❌ `false` |
| Status | `offer` | `offer` |
| Company | matches `/brightline/i` | `Brightline Analytics` |

Other fields the model returned: role `Build Next.js analytics dashboard`, platform `Upwork`, tech `fullstack`, employment `contractor`, workplace _null_, location _null_

Model's summary: _Upwork notified you of a contract offer from Brightline Analytics._

Time: 11.0s

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

### 2. Case #72 – "Re: Withdrawing my application"

| Field | Expected | Got |
|---|---|---|
| Application update | `true` | `true` |
| Status | `withdrawn` | ❌ `rejected` |
| Company | matches `/nutanix/i` | `Nutanix` |

Other fields the model returned: role `Member of Technical Staff - Frontend`, platform _null_, tech `frontend`, employment _null_, workplace _null_, location _null_

Model's summary: _Nutanix has officially withdrawn your candidacy for the role._

Time: 11.0s

**Email**

````text
From: Nutanix Recruiting <recruiting@nutanix.com>
To: me@example.com
Subject: Re: Withdrawing my application

Hi Utkarsh,

Thanks for letting us know that you've accepted another offer. As requested, we've withdrawn your candidacy for the Member of Technical Staff - Frontend role at Nutanix. Congratulations, and best of luck!

Nutanix Recruiting
````

### 3. Case #83 – "Application for Frontend Developer role"

| Field | Expected | Got |
|---|---|---|
| Application update | `false` | ❌ `true` |
| Status | _not checked_ | `applied` |
| Company | _not checked_ | `Acme Corp` |

Other fields the model returned: role `Frontend Developer`, platform _null_, tech `frontend`, employment _null_, workplace _null_, location _null_

Model's summary: _The user submitted an application for the Frontend Developer role._

Time: 10.5s

**Email**

````text
From: Utkarsh Sharma <me@example.com>
To: hr@acmecorp.com
Subject: Application for Frontend Developer role

Dear Hiring Team,

I'm writing to apply for the Frontend Developer role at Acme Corp. I have 5 years of experience with React and TypeScript. Please find my resume attached.

Regards,
Utkarsh
````
