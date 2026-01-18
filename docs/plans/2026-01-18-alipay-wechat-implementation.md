# 支付宝/微信支付实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Stripe 替换为支付宝和微信支付官方商户接口。

**Architecture:** 生成二维码 API → 用户扫码 → 支付平台回调 → 更新 Supabase。

**Tech Stack:** alipay-sdk, 微信支付 v2 API, Vercel Serverless

---

## Task 1: 更新依赖

**Files:** `package.json`

替换 stripe 为 alipay-sdk。

---

## Task 2: 更新环境变量

**Files:** `.env.example`

添加支付宝/微信配置，删除 Stripe 配置。

---

## Task 3: 创建支付工具库和二维码 API

**Files:** `lib/alipay.js`, `lib/wechat.js`, `api/create-qrcode.js`

---

## Task 4: 创建支付宝回调

**Files:** `api/webhook/alipay.js`

---

## Task 5: 创建微信回调

**Files:** `api/webhook/wechat.js`

---

## Task 6: 创建订单查询 API

**Files:** `api/check-order.js`

---

## Task 7: 删除 Stripe 文件

**Delete:** `api/create-checkout.js`, `api/webhook/stripe.js`

---

## Task 8: 更新扩展 UI 和逻辑

**Files:** `extension/options.html`, `extension/options.js`

---

## Task 9: 更新 i18n

**Files:** `extension/lib/i18n.js`

---

## Task 10: 更新部署文档

**Files:** `API_DEPLOYMENT.md`
