# AI test report: ministral-3:8b

Run on 28 Sept 2026, 12:13 am, 100 test cases from [scripts/ai-test-cases.ts](../../scripts/ai-test-cases.ts).

A case passes when the model gets *is this an application update* right and, for application emails, both the status and the company.

| Score | Job? | Status | Company | Errors | Avg per email | Total time | Model load |
|---|---|---|---|---|---|---|---|
| **99/100 (99.0%)** | 100.0% | 98.7% | 100.0% | 0 | 11.8s | 1181.0s | 21.0s |

## Failed cases (1)

### 1. Case #5 – "Notion - Thanks for applying!"

| Field | Expected | Got |
|---|---|---|
| Application update | `true` | `true` |
| Status | `applied` | ❌ `screening` |
| Company | matches `/notion/i` | `Notion` |

Other fields the model returned: role `Product Engineer, Frontend`, platform `Lever`, tech `frontend`, employment `fte`, workplace _null_, location _null_

Model's summary: _Application received; team is reviewing and will contact if there's a fit._

Time: 11.5s

**Email**

````text
From: Notion <no-reply@hire.lever.co>
To: me@example.com
Subject: Notion - Thanks for applying!

Hi Utkarsh,

Thanks for applying to the Product Engineer, Frontend position at Notion. We're excited you're interested in joining us. Our team is reviewing your application and we'll reach out if there's a fit.

The Notion Recruiting Team
````
