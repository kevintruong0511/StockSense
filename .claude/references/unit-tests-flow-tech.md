# /unit-tests — Technical Flow (for engineers)

> Execution flow of the [`/unit-tests`](../commands/unit-tests/unit-tests.md) command, including on-demand rule loading, the review gate, and the verify→triage loop.
> Non-tech version: [`unit-tests-flow.md`](./unit-tests-flow.md).

---

## 1. Full pipeline

```mermaid
flowchart TD
    START([User: 'write tests for X']) --> MODE{Mode?}
    MODE -->|default| FULL[/Full mode/]
    MODE -->|"'just list' / 'chỉ liệt kê'"| CASES[/Cases-only mode/]

    FULL --> S1
    CASES --> S1

    subgraph STEP1["Step 1 — Analyze context (STRICT order)"]
      direction TB
      S1["① Detect stack<br/>grep test files + manifest<br/>(package.json/go.mod/pom.xml/…)"]
      S1 --> S1u{"Unfamiliar<br/>stack?"}
      S1u -->|yes| LF[["load frameworks.md"]]
      S1u -->|no| S2
      LF --> S2["② Read PRODUCTION code (target)<br/>map every branch/return/throw"]
      S2 --> S3["③ Read EXISTING tests<br/>house style + covered behaviors"]
      S3 --> S4["④ Read DEPENDENCIES<br/>DTOs, entities, collaborators"]
    end

    S4 --> LOAD{"Target touches…?<br/>(load-on-demand)"}
    LOAD -->|money/time/perm/state/validation| E1[["load edge-cases.md"]]
    LOAD -->|async/queue/retry/webhook| E2[["load async.md"]]
    LOAD -->|repo/DAO or service+DB| E3[["load integration-boundary.md"]]
    LOAD -->|non-trivial mocking| E4[["load mocking-fidelity.md"]]
    LOAD -->|pure sync logic| NONE[no extra rules]

    E1 & E2 & E3 & E4 & NONE --> S2b["Step 2 — Draft the TEST PLAN<br/>INCLUDE/EXCLUDE → GWT list · 1 case/branch<br/>collapse same-behavior × many inputs → table-driven"]

    S2b --> MG{Mode?}
    MG -->|Cases-only| OUT([Output test plan · STOP])
    MG -->|Full| GATE{"Step 3 — User<br/>approves the test plan?"}

    GATE -->|adjust| S2b
    GATE -->|approve| S4c["Step 4 — Generate test code<br/>1 case → 1 focused test · narrow assertions<br/>actionable name+message · idiomatic to the repo"]

    S4c --> VER["Step 5 — Run on the REAL runner"]
    VER --> R{Result?}
    R -->|no runner| NR([Mark 'written, NOT executed' · say so explicitly])
    R -->|green| DONE([✅ Done])
    R -->|red| FR[Failure Review]
    FR --> VER

    classDef load fill:#1f2937,stroke:#0b0f19,color:#fff;
    classDef gate fill:#d29922,stroke:#0b0f19,color:#000;
    classDef term fill:#238636,stroke:#0b0f19,color:#fff;
    class LF,E1,E2,E3,E4 load;
    class MODE,S1u,LOAD,MG,GATE,R gate;
    class OUT,DONE,NR term;
```

---

## 2. Failure Review — triage a red test (never loosen blindly)

```mermaid
flowchart TD
    RED[🔴 Test fails] --> WHY{Why is it red?}
    WHY -->|production output wrong| BUG["🐞 REAL BUG<br/>report exact branch/input<br/>fix CODE — do NOT rewrite<br/>the test to match buggy output"]
    WHY -->|test asserted wrong thing| EXP["Wrong expectation<br/>fix the assertion to real<br/>expected behavior"]
    WHY -->|asserts impl detail<br/>(call order/private state/query verify)| CPL["Over-coupled<br/>loosen toward behavior<br/>(see mocking-fidelity)"]
    WHY -->|reveals uncovered path| MIS["Missing branch<br/>add the case"]

    BUG & EXP & CPL & MIS --> RETRY[Re-run]
    RETRY --> OK{Green?}
    OK -->|no| WHY
    OK -->|yes| DONE([✅])

    classDef bad fill:#da3633,stroke:#0b0f19,color:#fff;
    classDef gate fill:#d29922,stroke:#0b0f19,color:#000;
    class RED bad;
    class WHY,OK gate;
```

> Report the verdict per failure: `test X fails on <branch/input> → real bug | wrong expectation | over-coupled | missing branch`. Loosening a test to force green = silencing the alarm.

---

## 3. Mocking decision — which double, how much

```mermaid
flowchart TD
    C["Need to isolate a collaborator"] --> OWN{"Do you OWN<br/>the type?"}
    OWN -->|"no (3rd-party SDK/driver)"| WRAP["Wrap behind your own<br/>interface → double THAT<br/>(never mock what you don't own)"]
    OWN -->|yes| REAL{"Real impl fast +<br/>deterministic?"}
    REAL -->|yes| USEREAL["Use the REAL object<br/>(highest fidelity)"]
    REAL -->|no| FAKE["Use a FAKE<br/>(in-memory repo, fake clock)<br/>at the LOWEST seam"]
    WRAP --> ROLE
    FAKE --> ROLE
    USEREAL --> ROLE

    ROLE{"What is the<br/>collaborator's role?"}
    ROLE -->|"provides data (query)"| STUB["STUB it → feed inputs<br/>NEVER verify() a query"]
    ROLE -->|"receives an effect (command)"| VERIFY["Assert resulting STATE if possible;<br/>else spy/mock + verify the command"]

    STUB --> COUNT
    VERIFY --> COUNT
    COUNT{"> 2 mocks<br/>in this test?"}
    COUNT -->|yes| SMELL["⚠️ design smell<br/>unit does too much →<br/>extract logic or use a fake"]
    COUNT -->|no| OKM([OK])

    classDef gate fill:#d29922,stroke:#0b0f19,color:#000;
    classDef warn fill:#da3633,stroke:#0b0f19,color:#fff;
    class OWN,REAL,ROLE,COUNT gate;
    class SMELL warn;
```

Test-double glossary: **dummy** (fills a slot) · **stub** (canned query data) · **fake** (real lightweight impl — preferred) · **spy** (records calls) · **mock** (pre-set expectations, fails if unmet). Rule: *stub queries, spy/mock only commands, prefer a fake over either.*

---

## 4. Unit vs Integration boundary

```mermaid
flowchart TD
    T["Target under test"] --> K{What is it?}
    K -->|"pure logic (calc/validation/mapping), no I/O"| U1["UNIT — no doubles needed"]
    K -->|"service/use-case with a repo dep"| U2["UNIT — mock/fake the repo INTERFACE<br/>assert logic + what it asks the repo to do"]
    K -->|"repository/DAO — the code that IS the query"| I1["INTEGRATION — real/embedded DB<br/>(Testcontainers/in-memory/test schema)<br/>❌ don't mock the driver to 'unit test' a query"]
    K -->|"ORM mapping / migrations"| I2["INTEGRATION — needs a real engine"]

    U2 --> GUARD
    I1 --> GUARD
    I2 --> GUARD
    GUARD{"Test needs a real<br/>socket/file/DB conn?"}
    GUARD -->|yes| NOTUNIT["Not a unit test →<br/>write as integration (tagged/separate)<br/>or ask if in scope"]
    GUARD -->|no| ISUNIT([Valid unit test])

    classDef gate fill:#d29922,stroke:#0b0f19,color:#000;
    class K,GUARD gate;
```

---

## 5. Where each rule lives

```mermaid
flowchart LR
    MAIN["unit-tests.md<br/>(lean core — every run)<br/>workflow · Core Rules · INCLUDE/EXCLUDE<br/>coverage · output · checklist"]
    MAIN -.load on demand.-> R1["unit-tests-rules/<br/>edge-cases.md"]
    MAIN -.-> R2["async.md"]
    MAIN -.-> R3["integration-boundary.md"]
    MAIN -.-> R4["mocking-fidelity.md"]
    MAIN -.-> R5["frameworks.md"]

    classDef core fill:#1f6feb,stroke:#0b0f19,color:#fff;
    class MAIN core;
```

| Fragment | Loaded when | Holds |
|---|---|---|
| `edge-cases.md` | money/time/locale/null/perm/state/validation | domain edge-case matrix |
| `async.md` | queues/webhooks/retries/concurrency | timeout·retry·idempotency·race·cancellation·ordering |
| `integration-boundary.md` | repo/DAO or service+DB | unit-vs-integration table + language DB rules |
| `mocking-fidelity.md` | non-trivial mocking | real>fake>mock · doubles glossary · ≤2 mocks · state>interaction |
| `frameworks.md` | unfamiliar stack / naming idiom | framework map + naming per language |

---

*Full rules: [`unit-tests.md`](../commands/unit-tests/unit-tests.md) + [`unit-tests-rules/`](../commands/unit-tests/unit-tests-rules/).*
