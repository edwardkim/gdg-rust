# Contributing to GDG Rust

기여해 주셔서 감사합니다!

## 개발 환경 설정

```bash
# Rust 빌드 및 테스트
cargo test

# WASM 빌드
cd crates/grid-render
wasm-pack build --target web --out-dir ../../pkg

# 데모 실행
python3 -m http.server 7700
# → http://localhost:7700/demo/index.html
```

## 기여 방법

1. Fork → Branch (`task/이슈번호`)
2. 구현 및 테스트
3. `cargo fmt && cargo clippy` 확인
4. PR 생성 (dev 브랜치 대상)

## 커밋 메시지

```
Task #N: 변경 내용 요약

상세 설명 (필요 시)
```

## 코드 스타일

- `cargo fmt` 적용 필수
- `cargo clippy` 경고 없음
- 테스트 추가 권장

## 워크플로우

하이퍼-워터폴 방법론:
1. Issue 등록
2. 브랜치 생성 (`task/N`)
3. 수행계획서 작성 → 승인
4. 구현계획서 작성 → 승인
5. 단계별 구현 → 단계별 보고서 → 승인
6. 최종 보고서 → 승인
7. dev 브랜치에 merge
