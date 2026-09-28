# AI model comparison

Run on 28 Sept 2026, 12:13 am, 100 test cases. Ranked by accuracy, then speed. Times are per email on this Mac; *Load* is the first request, which loads the model into memory.

| # | Model | Accuracy | Job? | Status | Company | Errors | Avg/email | Total | Load |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | [ministral-3:8b](ministral-3-8b.md) | 99.0% | 100.0% | 98.7% | 100.0% | 0 | 11.8s | 1181.0s | 21.0s |
| 2 | [llama3.1:8b](llama3.1-8b.md) | 97.0% | 98.0% | 98.7% | 100.0% | 0 | 10.1s | 1007.1s | 19.8s |
| 3 | [gemma4:e4b](gemma4-e4b.md) | 97.0% | 98.0% | 97.3% | 98.7% | 0 | 10.8s | 1080.0s | 16.1s |
| 4 | [qwen3.5:9b](qwen3.5-9b.md) | 97.0% | 99.0% | 96.0% | 98.7% | 0 | 19.7s | 1968.7s | 22.9s |
| 5 | [qwen3.5:4b](qwen3.5-4b.md) | 96.0% | 96.0% | 94.7% | 94.7% | 0 | 10.8s | 1082.7s | 14.1s |

Columns: *Accuracy* = cases fully correct. *Job?* = application vs. not correctly detected. *Status* and *Company* = correct among application emails.
