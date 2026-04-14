# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

[Glide Data Grid](https://github.com/glideapps/glide-data-grid) (TypeScript/React 기반 데이터 그리드)를 클론한 저장소이다. 이 프로젝트의 목적은 Glide Data Grid의 TypeScript 코드를 Rust로 재작성하여 WASM 기반 백엔드 Canvas 드로잉으로 전환할 수 있는지에 대한 **POC(Proof of Concept)**를 수행하는 것이다. POC 단계에서는 GitHub에 upstream하지 않고 **로컬 레포로만 진행**한다.

## 문서 생성 규칙

모든 문서는 한국어로 작성한다.

문서 폴더 구조 (`mydocs/` 하위):
- `orders/` - 오늘 할일 문서 (yyyymmdd.md)
- `plans/` - 수행 계획서, 구현 계획서
- `plans/archives/` - 완료된 계획서 보관
- `working/` - 단계별 완료 보고서
- `report/` - 기본 보고서
- `feedback/` - 피드백 저장
- `tech/` - 기술 사항 정리 문서
- `manual/` - 매뉴얼, 가이드 문서
- `troubleshootings/` - 트러블슈팅 관련 문서

문서 파일명 규칙 (`plans/`, `working/`):
- 수행 계획서: `task_{milestone}_{이슈번호}.md` (예: task_m100_71.md)
- 구현 계획서: `task_{milestone}_{이슈번호}_impl.md` (예: task_m100_71_impl.md)
- 단계별 완료 보고서: `task_{milestone}_{이슈번호}_stage{N}.md` (예: task_m100_71_stage1.md)
- 최종 보고서: `task_{milestone}_{이슈번호}_report.md` (예: task_m100_71_report.md)

## 빌드 및 실행

### 로컬 빌드

```bash
cargo build                    # 네이티브 빌드
cargo test                     # 테스트 실행
cargo build --release          # 릴리즈 빌드
```


### Docker 빌드 (WASM 전용)

```bash
cp .env.docker.example .env.docker   # 최초 1회: 환경변수 설정
docker compose --env-file .env.docker run --rm wasm    # WASM 빌드 (→ pkg/)
```

Docker는 **WASM 빌드 전용**으로만 사용한다. 네이티브 빌드/테스트에는 사용하지 않는다.


### 출력 폴더

- `output/` - 렌더링 결과물 (SVG, HTML 등) 기본 출력 폴더
- `.gitignore`에 등록되어 있으므로 Git에 포함되지 않음

### E2E 테스트

E2E 테스트는 Puppeteer (puppeteer-core) 기반이며, 두 가지 모드로 실행할 수 있다.

#### headless Chrome (자동화용)

```bash
cd rhwp-studio
npx vite --host 0.0.0.0 --port 7700 &   # Vite dev server
node e2e/text-flow.test.mjs              # 텍스트 플로우 테스트
```

#### 호스트 Chrome CDP (시각 확인용)

1. Chrome 실행 (원격 디버깅 활성화):
```
chrome --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --remote-allow-origins=*
```

## 워크플로우

### 브랜치 관리

| 브랜치 | 용도 |
|--------|------|
| `main` | 원본 Glide Data Grid 코드 보존 (변경하지 않음) |
| `dev` | POC 개발 통합 |
| `task/{num}` | 타스크별 작업 |

### Git 워크플로우 (로컬 전용)

POC 단계에서는 원격 push 없이 로컬 레포에서만 작업한다.

```
task/{N}  ──커밋──커밋──┐
task/{N+1}──커밋──커밋──┤
                         ├─→ dev에 로컬 merge
                         │
                         └─→ (POC 완료 후 필요 시 태그)
```

- **타스크 브랜치**: `task/{N}`에서 잘게 커밋. 작업 단위마다 커밋.
- **dev 브랜치**: 타스크 브랜치는 `dev`에서 분기하고 `dev`로 merge한다.
- **merge**: 로컬에서 `git merge --no-ff task/{N}` 으로 merge. PR 없음.
- **main 브랜치**: 원본 코드 보존용. POC 단계에서는 merge하지 않는다.

### 타스크 번호 관리

- **로컬 순번**으로 타스크 번호를 관리한다. (1, 2, 3, ...)
- 브랜치명: `task/{번호}` (예: `task/1`)
- 커밋 메시지: `Task #1: 내용`
- `mydocs/orders/`에서 타스크 번호로 참조

### 타스크 진행 절차

1. GitHub Issue에 타스크 등록 → 작업지시자가 지정한 타스크 수행
2. `local/task{issue번호}` 브랜치 생성 후 진행
3. 수행 전 수행계획서 작성 → 승인 요청
4. 구현 계획서 작성 (최소 3단계, 최대 6단계) → 승인 요청
5. 단계별 진행 시작
6. 각 단계 완료 후 단계별 완료보고서 작성 → 승인 요청
7. 승인 후 다음 단계 진행
8. 모든 단계 완료 시 최종 결과 보고서 작성 → 승인 요청
9. 승인 요청 시 작업지시자가 피드백 문서를 `mydocs/feedback/`에 등록
10. 모든 테스트 통과 시 피드백 없음
11. 최종 결과보고서 작성 후 오늘할일 해당 타스크 상태 갱신

### 작업 규칙

- 작업 시간의 시작과 종료는 작업지시자가 결정한다. 클로드가 임의로 작업 종료를 제안하거나 시간을 한정하지 않는다.
