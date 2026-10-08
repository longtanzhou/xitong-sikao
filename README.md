# 系统思考 · Hugo 站点

基于邱昭良《如何系统思考（第2版）》一书内容构建的中文学习网站。

## 本地预览

需要安装 [Hugo Extended](https://gohugo.io/installation/)（构建时使用 v0.167.0）：

```bash
hugo server
```

## 构建

```bash
hugo --minify   # 产物输出到 public/
```

## 部署到 Cloudflare Pages（Git 集成）

- 构建命令：`hugo --minify`
- 输出目录：`public`
- 环境变量：`HUGO_VERSION=0.167.0`

## 内容说明

- `content/renzhi/` —— 认知篇：什么是系统、系统思考、思考的魔方
- `content/fangfa/` —— 方法篇：冰山模型、因果回路图、系统基模
- `content/yingyong/` —— 应用篇：成长引擎、解决问题、六要六不要
- `content/anli/` —— 12 个经典案例
- `content/jinju/` —— 15 条金句

> 原书约 103 页图表为图片，无法逐项核验，网站内容整理自文字版，图表细节请对照原书。
