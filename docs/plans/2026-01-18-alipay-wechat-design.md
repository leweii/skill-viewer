# 支付宝/微信支付集成设计

日期: 2026-01-18

## 概述

将 Stripe 替换为支付宝和微信支付官方商户接口，支持国内用户扫码支付。

## 支付流程

```
用户点击升级 → 选择支付宝/微信 → 调用 API 生成二维码 → 用户扫码支付 → 支付平台回调 → 更新用户状态
```

## 架构

**API 端点：**
- `POST /api/create-qrcode` - 生成支付二维码
- `POST /api/webhook/alipay` - 支付宝异步通知
- `POST /api/webhook/wechat` - 微信异步通知
- `GET /api/check-order` - 查询订单状态（前端轮询）

## API 设计

### POST /api/create-qrcode

生成支付宝或微信的付款二维码。

**Request:**
```json
{
  "paymentMethod": "alipay" | "wechat"
}
```

**Headers:**
```
Authorization: Bearer <supabase_access_token>
```

**Response:**
```json
{
  "qrCodeUrl": "https://qr.alipay.com/xxx...",
  "outTradeNo": "SV20260118123456789"
}
```

**处理流程：**
1. 验证用户登录
2. 生成唯一订单号 `outTradeNo`（格式：SV + 时间戳 + 随机数）
3. 根据 `paymentMethod` 调用对应 API：
   - 支付宝：`alipay.trade.precreate`（当面付预下单）
   - 微信：统一下单 API（trade_type=NATIVE）
4. 将 `user_id` 放入透传参数（支付宝 passback_params / 微信 attach）
5. 返回二维码 URL

### POST /api/webhook/alipay

处理支付宝异步通知。

**验证流程：**
1. 使用支付宝公钥验证 RSA2 签名
2. 检查 `trade_status === 'TRADE_SUCCESS'`
3. 从 `passback_params` 解析 `user_id`
4. 更新 Supabase：`is_paid = true`, `paid_at = NOW()`
5. 返回纯文本 `success`

### POST /api/webhook/wechat

处理微信支付异步通知。

**验证流程：**
1. 解析 XML body
2. 使用 API 密钥验证 HMAC-SHA256 签名
3. 检查 `result_code === 'SUCCESS'`
4. 从 `attach` 解析 `user_id`
5. 更新 Supabase：`is_paid = true`, `paid_at = NOW()`
6. 返回 XML：`<xml><return_code>SUCCESS</return_code><return_msg>OK</return_msg></xml>`

### GET /api/check-order

查询订单支付状态（供前端轮询）。

**Request:**
```
GET /api/check-order?outTradeNo=SV20260118123456789
```

**Response:**
```json
{
  "status": "pending" | "paid" | "failed"
}
```

## 扩展 UI 设计

### 支付选择弹窗

```
┌─────────────────────────────────────────────┐
│  升级到 Pro - ¥39.9 (一次性)                │
├─────────────────────────────────────────────┤
│                                             │
│  选择支付方式：                              │
│                                             │
│  ┌─────────────┐    ┌─────────────┐        │
│  │  支付宝     │    │   微信      │        │
│  │    💙       │    │    💚      │        │
│  └─────────────┘    └─────────────┘        │
│                                             │
│         ↓ 点击后显示二维码                   │
│                                             │
│       ┌─────────────────┐                   │
│       │   [二维码图片]   │                   │
│       │                 │                   │
│       └─────────────────┘                   │
│       请使用支付宝扫码支付                    │
│                                             │
│       支付完成后请等待页面自动刷新            │
│                                             │
│              [取消]                          │
└─────────────────────────────────────────────┘
```

**交互流程：**
1. 用户点击「升级到 Pro」→ 显示支付选择弹窗
2. 选择支付宝/微信 → 调用 `/api/create-qrcode`
3. 使用 qrcode 库生成二维码图片显示
4. 开始轮询 `/api/check-order`（每 2 秒）
5. 支付成功 → 关闭弹窗，刷新用户状态，显示成功提示

## 环境变量

### 删除 (Stripe)

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID
```

### 新增 (支付宝)

```
ALIPAY_APP_ID=2021xxxxxx
ALIPAY_PRIVATE_KEY=MIIEvgIBADANBg...
ALIPAY_PUBLIC_KEY=MIIBIjANBgkqh...
```

### 新增 (微信支付)

```
WECHAT_APP_ID=wxxxxxxxxxxx
WECHAT_MCH_ID=16xxxxxxxx
WECHAT_API_KEY=xxxxxxxxxxxxxxxx
```

### 通用

```
PAYMENT_AMOUNT=39.9
```

## 文件变更

### 删除
- `api/create-checkout.js`
- `api/webhook/stripe.js`

### 新建
- `api/create-qrcode.js` - 生成支付二维码
- `api/webhook/alipay.js` - 支付宝回调
- `api/webhook/wechat.js` - 微信回调
- `api/check-order.js` - 查询订单状态

### 修改
- `package.json` - 删除 stripe，添加 alipay-sdk
- `.env.example` - 更新环境变量
- `extension/options.html` - 添加支付选择弹窗
- `extension/options.js` - 支付流程逻辑
- `extension/lib/i18n.js` - 添加支付相关翻译
- `API_DEPLOYMENT.md` - 更新部署文档

## 安全考虑

- 验证所有回调签名（支付宝 RSA2，微信 HMAC-SHA256）
- 订单号全局唯一，防止重复支付
- 回调处理幂等（同一订单多次回调只处理一次）
- 不在客户端暴露任何密钥
