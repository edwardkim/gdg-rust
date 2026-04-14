# GDG Rust

[![CI](https://github.com/edwardkim/gdg-rust/actions/workflows/ci.yml/badge.svg)](https://github.com/edwardkim/gdg-rust/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.93%2B-orange.svg)](https://www.rust-lang.org/)
[![WASM](https://img.shields.io/badge/wasm-198KB-green.svg)](pkg/)

Rust/WASM 기반 고성능 데이터 그리드 렌더링 엔진.

[Glide Data Grid](https://github.com/glideapps/glide-data-grid)의 Canvas 렌더링 아키텍처를 분석하고, 핵심 기능을 Rust/WASM으로 재구현한 프로젝트.

## 구조

```
crates/grid-render/    # Rust 렌더링 엔진 (WASM)
demo/                  # HTML 데모 페이지
mydocs/                # 프로젝트 문서 (계획서, 보고서)
reference/             # GDG 원본 코드 (외형 참조용)
```

## 주요 기능

- **9종 셀 타입** — Text, Number, Boolean, URI, Bubble, Loading, Protected, Image, Empty
- **폰트 메트릭 내장** — 맑은 고딕, 나눔고딕, Noto Sans KR, Pretendard (JS measureText 호출 제거)
- **텍스트 자동 맞춤** — 장평(scaleX) 축소 / 말줄임
- **그룹 헤더** — 2단 헤더, 컬럼 아이콘/메뉴, 드래그 리사이즈
- **범위 선택** — 마우스 드래그 + Shift+방향키
- **테마 오버라이드** — 컬럼/행별 배경, 교대 행 색상
- **DPR 스케일링** — 고해상도 디스플레이 지원
- **hitTest** — WASM export, 드로잉과 동일 레이아웃 상태 사용

## 빌드

```bash
# Rust 테스트
cargo test

# WASM 빌드
cd crates/grid-render
wasm-pack build --target web --out-dir ../../pkg

# 데모 번들 (TypeScript)
npx esbuild demo/src/main.ts --bundle --format=esm --outfile=demo/bundle.js --external:../pkg/grid_render.js

# 데모 실행
python3 -m http.server 7700
# → http://localhost:7700/demo/index.html
```

## 크기

| 항목 | 크기 |
|------|------|
| WASM 바이너리 | 198 KB |
| JS 번들 (demo) | 30 KB |
| GDG core ESM (참고) | 535 KB |

## 라이선스

MIT License — 원본 [glide-data-grid](https://github.com/glideapps/glide-data-grid) 라이선스를 따름.
