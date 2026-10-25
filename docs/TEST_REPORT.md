# Test report

Recorded on 24 October 2026. This report distinguishes automated results from browser walkthroughs and environment limitations.

| Check | Result | Evidence |
| --- | --- | --- |
| Backend API and repository suite | 80 passed | `backend-test-report.txt`, `backend-junit.xml` |
| Backend coverage including branches | 99.32% | `backend-test-report.txt` |
| React/API client tests | 13 passed | `frontend-test-report.txt` |
| TypeScript and Vite production build | Passed | `frontend-build.txt` |
| Built frontend served by FastAPI | Passed on 25 October 2026 | `production-smoke.txt` |
| Interactive desktop walkthrough | Passed | Browser observations and screenshots |
| Interactive mobile walkthrough | Passed | Browser observations at 390 CSS pixels, screenshots |
| Standalone Playwright runner | Environment blocked; no passing run claimed | `browser-test-report.txt`, `browser-junit.xml` |
| Docker Compose syntax | Validated | `compose-validation.txt` |
| Docker image execution | Not run: Docker Engine unavailable | README limitation |
| Hosted CI run | Not run: project has not been pushed to a remote | CI definition included |

## Automated backend coverage

The suite verifies registration, normalized duplicate emails, Argon2 password storage, login, missing/invalid/expired/tampered tokens, malformed subjects, deleted accounts, and role changes. It checks all protected endpoints, admin-only management, input validation, nonnegative quantities, exact decimal prices, combined search filters, inclusive price boundaries, persistence across app instances, missing vehicles, and extreme vehicle identifiers.

Inventory cases include successful purchases, sold-out rejection, restocking, quantity limits, and twelve concurrent purchase attempts against three units. Three must succeed, nine must return conflict, and the final stock must be zero. Update-details requests cannot overwrite quantity.

Operations coverage verifies local admin promotion, repeatable seed behavior, health status, and serving frontend files without overriding API routing or authentication. The only uncovered application line/branch is the CLI module's direct-execution entry point; its `main()` behavior is tested. The suite reports one upstream Starlette/httpx deprecation warning, which does not affect the test result.

## Automated frontend coverage

The 13 tests cover out-of-stock purchase disabling, pending purchases, admin/customer controls, edit/restock/delete callbacks, request authentication, exact price serialization, empty delete responses, validation errors, non-JSON server errors, network outages, expired sessions, stock-conflict refresh, and reversed price-range validation.

## Browser walkthrough observations

The in-app browser exercised the real frontend against the real FastAPI server and a temporary on-disk SQLite database:

- Customer sign-in displayed six vehicles and no admin add/edit controls.
- Sold-out Golf displayed a disabled purchase button.
- A Toyota filter produced one result; purchase reduced Camry stock from six to five and displayed a success message.
- Clearing filters restored the collection.
- Admin sign-in exposed inventory management controls.
- Adding Honda Civic Test at quantity zero produced a disabled purchase control.
- Editing its price changed the displayed value from $22,000.25 to $21,000.50.
- Restocking by four changed stock from zero to four.
- Deleting that disposable test listing removed it from the collection.
- Mobile registration created a customer account and opened the dashboard.
- An unmatched make displayed an empty state; resetting restored all vehicles.
- At 390 CSS pixels, document width did not exceed viewport width. An additional narrower check also had no horizontal overflow.
- An incorrect password displayed “Invalid email or password”.
- A mobile purchase decremented Defender stock and displayed the remaining quantity.

The app's sample database was reset between preview sessions. Screenshots can therefore show different stock totals; they are not a single chronological inventory ledger.

## Playwright limitation

The four browser specifications are included in `frontend/tests/inventory.spec.ts`. The local runner started both servers, but Chrome exited before opening a page because the authoring host restricted launching the browser process. All four test attempts therefore failed at browser launch, not at an application assertion. The raw failed-run report is preserved. The same workflows were checked through the permitted in-app browser. CI installs Chromium and is configured to run the specifications; CI execution remains unverified until the repository is pushed.

## Genuine red/green evidence

The first test run occurred before the application and vehicle card were implemented. Its failures are retained in `backend-red.txt` and `frontend-red.txt`. After implementation, the green reports recorded 58 backend tests and four UI tests passing. A later test-first cycle added 13 identifier/static-hosting regressions, recorded the red result in `delivery-red.txt`, implemented the missing behavior, and passed the expanded suite. The Git history preserves these stages without backdating or fabricated test output.
