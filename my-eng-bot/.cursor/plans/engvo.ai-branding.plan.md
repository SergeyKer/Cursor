---
name: Engvo.AI брендинг
overview: Заменить маскота на главной и в шапке на предоставленного робота в рамке «как ярлык iPhone», пересобрать favicon/PWA-иконки из того же изображения и обновить видимое имя бренда на Engvo.AI (без полного ребрендинга чата и меню).
todos:
  - id: squircle-shared
    content: Вынести общую iOS squircle-маску (SVG) для build:icons и UI-рамки на главной
    status: pending
  - id: assets
    content: Скопировать PNG в assets/icon-source.png и public/engvo-mascot.png; запустить build:icons и build:header-robot
    status: pending
  - id: mascot-frame
    content: HomeMascotFrame - квадратная «иконка iPhone» (squircle + тень + ring) на обоих местах стартового экрана
    status: pending
  - id: header-mascot
    content: Шапка - квадрат 40×40 со squircle (как ярлык), не круг; общая маска с главной
    status: pending
  - id: brand-copy
    content: Engvo.AI в layout, manifest, homeGreeting, HomeWelcomeBubble, стартовые строки page.tsx
    status: pending
  - id: verify
    content: Визуально сверить главную с ярлыком iOS и favicon в dev/build
    status: pending
isProject: true
---

См. актуальную версию плана: [engvo.ai_брендинг_2e72bafe.plan.md](file:///C:/Users/serk/.cursor/plans/engvo.ai_брендинг_2e72bafe.plan.md)

Ключевое: на главной маскот **только** внутри squircle-рамки как ярлык iPhone (общая маска с favicon), не голая картинка и не `rounded-2xl`.
