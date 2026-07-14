# 网易云音乐全栈开源项目教程

从零开始，部署你自己的网易云音乐 Web 应用 —— 包含完整后端 API 服务与移动端前端 Web App。

## 目录

- [1\. 项目简介](https://www.doubao.cn)

- [2\. 架构概览](https://www.doubao.cn)

- [3\. 目录结构](https://www.doubao.cn)

- [4\. 前置准备](https://www.doubao.cn)

- [5\. 后端部署（API 服务）](https://www.doubao.cn)

- [6\. 前端部署与对接](https://www.doubao.cn)

- [7\. 环境变量说明](https://www.doubao.cn)

- [8\. API 接口速查](https://www.doubao.cn)

- [9\. 开发指南](https://www.doubao.cn)

- [10\. 开源贡献指南](https://www.doubao.cn)

- [11\. 常见问题排查](https://www.doubao.cn)

## 1\. 项目简介

本项目是全栈开源的网易云音乐 Web 应用方案，包含两个子项目：

### 🎯 前端：Music App \(music\-app\)

一个移动端优先的纯原生 Web 音乐播放器，**零构建步骤**，直接用浏览器打开`index.html` 即可运行。

**核心功能：**

- 🔍 **音乐搜索** — 支持歌曲、歌手搜索

- 📀 **完整播放器** — 迷你播放器 \+ 全屏播放器，播放/暂停/上下首/进度拖拽

- 🎵 **歌单系统** — 推荐歌单、每日推荐、歌单详情

- 📝 **歌词显示** — 逐行歌词滚动同步

- 🔐 **扫码登录** — 网易云音乐 APP 扫码登录

- 📱 **移动端适配** — 触摸手势、底部安全区适配

- 🎨 **动态主题色** — 从封面自动提取主题色

- 🔄 **播放模式** — 顺序/单曲/随机

### ⚙️ 后端：Netease Cloud Music API Enhanced \(api\-enhanced\)

功能完善的网易云音乐第三方 Node\.js API 服务，覆盖网易云音乐几乎所有功能接口（200\+ 个）。

**核心能力：**

- 用户系统（登录、注册、信息）

- 音乐播放（歌曲 URL、音质选择、解灰）

- 搜索发现（搜索、推荐、排行榜）

- 歌单管理（创建、编辑、收藏）

- 动态社交（评论、点赞、私信、关注）

- 云盘上传、私人 FM、签到等

## 2\. 架构概览

```Plain Text
┌─────────────────────────────────────────────────────┐
│                    用户浏览器                          │
│                                                       │
│   ┌─────────────────────────────────────────────┐   │
│   │              Music App (前端)                  │   │
│   │                                               │   │
│   │  index.html ──→ api.js (API 层)               │   │
│   │      │            │                           │   │
│   │      │            ▼                           │   │
│   │  apii.js ←──  fetch('/song/url', '/search'...) │   │
│   │  (业务层)       │                              │   │
│   │      │          │                              │   │
│   │      ▼          ▼                              │   │
│   │  ┌──────────────────────────────┐              │   │
│   │  │   API_BASE 配置请求目标地址    │              │   │
│   │  └──────────────────────────────┘              │   │
│   └─────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP / CORS
                      ▼
┌─────────────────────────────────────────────────────┐
│          Netease Cloud Music API Enhanced            │
│                                                       │
│   ┌──────────┐   ┌──────────┐   ┌────────────────┐  │
│   │  Express  │   │ 200+ API │   │  加解密引擎     │  │
│   │  路由层   │──→│  模块层   │──→│  eapi/weapi    │  │
│   └──────────┘   └──────────┘   │  /xeapi 等     │  │
│                                  └───────┬────────┘  │
│                                          │           │
└──────────────────────────────────────────┼───────────┘
                                           │
                                           ▼
                                 ┌──────────────────┐
                                 │  网易云音乐官方    │
                                 │  接口服务器        │
                                 │  interface.163   │
                                 └──────────────────┘
```

### 数据流

1. 用户在**前端**（Music App）上搜索歌曲

2. 前端调用 `api.js` 中的方法，发出 HTTP 请求

3. 请求到达**后端**（api\-enhanced）

4. 后端对请求进行加密处理，转发至网易云音乐官方接口

5. 网易云返回数据，后端处理后回传给前端

6. 前端拿到数据，渲染 UI、播放音乐

## 3\. 目录结构

```Plain Text
.
├── music-app/                          # 前端项目
│   ├── index.html                      # 主入口（包含所有页面视图）
│   └── yinyueapi/
│       ├── api.js                      # API 请求层（312 行）
│       ├── apii.js                     # 业务逻辑层（1944 行）
│       └── yy.css                      # 全部样式（2037 行）
│
```

## 4\. 前置准备

### 4\.1 后端环境要求

|依赖|版本要求|说明|
|---|---|---|
|**Node\.js**|≥ 18（推荐 22\+）|必须|
|**pnpm**|最新稳定版|推荐（也支持 npm/yarn）|
|**Git**|任意版本|必须|

### 4\.2 前端环境要求

无特殊要求。music\-app 是纯静态项目，使用 CDN 加载第三方库（Font Awesome、ColorThief）。

仅需确保浏览器支持：

- ES2017\+ （async/await、const/let）

- CSS Grid / Flexbox

- `<audio>` 元素

### 4\.3 服务器要求（自行部署时）

最低配置：**1 核 1G 内存，10G 硬盘**

推荐配置：**2 核 2G 内存**（如需部署桌面客户端等衍生项目）

## 5\. 后端部署（API 服务）

### 5\.1 Node\.js 手动部署

适合需要自定义修改或本地开发。

```Plain Text
# 1. 克隆项目
git clone https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced.git
cd api-enhanced

# 2. 安装依赖（推荐 pnpm）
pnpm install

# 3. 启动
node app.js
```

默认监听 `http://localhost:3000`。指定端口：

```Plain Text
PORT=4000 node app.js
```

### 5\.2 Vercel 一键部署

适合个人快速上线，免费额度足够日常使用。

1. **Fork** 项目仓库到你的 GitHub 账号

2. 前往 [Vercel](https://vercel.com) → New Project

3. 选择 Fork 的仓库，点击 **Import**

4. 默认配置，点击 **Deploy**

5. 等待部署完成，访问分配的域名即可

## 6\. 前端部署与对接

### 6\.1 连接后端 API

前端通过 `music-app/yinyueapi/api.js` 中的 `API_BASE` 变量来指定后端地址。

**第 18 行附近**：

```Plain Text
const API_BASE = '这里是自己的后端';  // ← 改成你自己的后端地址
```

**修改为**：

```Plain Text
const API_BASE = 'http://localhost:3000';  // 本地测试
```

或部署后的公网地址：

```Plain Text
const API_BASE = 'https://your-api-domain.com';  // 生产环境
```

### 6\.2 本地运行前端

双击`index.html` 即可。⚠️ 但部分浏览器对 `file://` 协议的 CORS 请求有限制，推荐使用 HTTP 服务器。

### 6\.3 生产环境部署

纯静态资源，可以部署到任何静态托管服务：

|平台|步骤|
|---|---|
|**Vercel**|导入项目根目录 → Framework 选 "Other" → Deploy|
|**Netlify**|拖拽 music\-app 文件夹上传即部署|
|**GitHub Pages**|Settings → Pages → Source 选 main/root|
|**自有服务器**|直接用 Nginx/Apache 托管|
|**OSS \+ CDN**|上传至阿里云 OSS / AWS S3 并配置 CDN|

## 7\. 环境变量说明

|变量名|默认值|说明|
|---|---|---|
|`CORS_ALLOW_ORIGIN`|`*`|允许跨域请求的域名。若需要限制，请指定具体域名（例如 `https://example.com` ）。|
|`ENABLE_PROXY`|`false`|是否启用反向代理功能。|
|`PROXY_URL`|`https://your-proxy-url.com/?proxy=<`|代理服务地址。仅当 `ENABLE_PROXY=true` 时生效。|
|`ENABLE_GENERAL_UNBLOCK`|`true`|是否启用全局解灰（推荐开启）。开启后所有歌曲都尝试自动解锁。|
|`ENABLE_FLAC`|`true`|是否启用无损音质（FLAC）。|
|`SELECT_MAX_BR`|`false`|启用无损音质时，是否选择最高码率音质。|
|`UNBLOCK_SOURCE`|`pyncmd,qq,bodian,migu,kugou,kuwo`|音源优先级列表（多个音源以逗号分隔）。|
|`FOLLOW_SOURCE_ORDER`|`true`|是否严格按照音源列表顺序进行匹配。|

## 8\. API 接口速查

本项目后端包含**200\+ 网易云音乐接口**，覆盖全场景功能，核心接口分类如下：

- **用户相关**：手机/密码登录、二维码登录、用户信息、歌单、播放记录、云盘数据

- **音乐核心**：歌曲搜索、歌曲链接获取、无损音质、灰歌解锁、歌词解析

- **发现推荐**：首页推荐、每日推荐、私人 FM、各类音乐排行榜

- **内容互动**：歌曲/歌单/MV 评论、点赞、收藏、转发

- **衍生功能**：歌手详情、专辑查询、MV 播放、签到、会员相关接口

完整接口文档、参数说明、调用示例可查看官方在线文档：[https://neteasecloudmusicapienhanced\.js\.org/](https://neteasecloudmusicapienhanced.js.org/)

## 9\. 开发指南

### 9\.1 本地开发调试

启动后端服务后，可通过本地地址 `http://localhost:3000` 直接调试所有接口，支持热更新修改代码。

项目内置单元测试，可通过以下命令校验接口可用性：

```Plain Text
pnpm test
```

### 9\.2 项目调用方式

支持 Node\.js 项目直接引入调用（Promise 格式），同时完整适配 TypeScript：

**JavaScript 调用示例**

```Plain Text
const { login_cellphone, user_cloud } = require('@neteaseapireborn/api')

async function main() {
  const result = await login_cellphone({ phone: '手机号', password: '密码' })
  console.log(result)
  const result2 = await user_cloud({ cookie: result.body.cookie })
  console.log(result2.body)
}

main()
```

**TypeScript 调用示例**

```Plain Text
import { banner } from '@neteaseapireborn/api'

banner({ type: 0 }).then((res) => console.log(res))
```

## 10\. 开源贡献指南

### 10\.1 如何贡献代码

1. **Fork** 本仓库

2. 创建你的 Feature 分支：`git checkout -b feat/your-feature`

3. 提交你的修改：`git commit -am 'feat: 添加新功能'`

4. 推送到分支：`git push origin feat/your-feature`

5. 提交 **Pull Request** 到 `main` 分支

### 10\.2 代码风格规范

后端使用 ESLint \+ Prettier 统一代码风格，提交代码前请执行校验命令：

```Plain Text
pnpm lint        # 检查代码规范
pnpm lint-fix    # 自动修复
pnpm test        # 运行单元测试
```

### 10\.3 接口抓包贡献工具

项目配套专属抓包工具 `api-clawer`，可抓取、解密网易云音乐客户端接口数据，用于新增、更新接口，详细使用教程可参考：[贡献指南](https://www.focalors.ltd/post/how-to-contribute-ncm-api)

## 11\. 常见问题排查

### 前端页面空白或白屏

**排查步骤**：

1. 浏览器 F12 打开开发者工具 → Console 查看报错

2. 常见原因：`api.js` 加载失败、CORS 被拦截、CDN 字体库加载失败

3. 测试纯后端：直接用 `curl`测试 API 是否正常

### 扫码登录后状态丢失

**原因**：Cookie 存储在服务端，重启后清空

**解决方案**：

- 生产环境配置 `NETEASE_COOKIE` 环境变量持久化

- 或在 `data/` 目录持久化 Cookie 文件

### 在小程序或 Electron 中使用

**问题**：微信小程序需要合法域名备案

**解决方案**：

- 后端必须使用 HTTPS 及已备案域名

- 小程序后台配置服务器域名白名单

- Electron 环境下可直接使用，无跨域限制

## 📄 License

本项目基于 [MIT License](https://opensource.org/licenses/MIT) 开源协议。

⚠️ 免责声明：本项目仅供学习交流使用，请勿用于任何商业用途。

## 🔗 相关资源

- **后端项目仓库**：https://github\.com/NeteaseCloudMusicApiEnhanced/api\-enhanced

- **后端在线文档**：https://neteasecloudmusicapienhanced\.js\.org/

- **NPM 包地址**：https://www\.npmjs\.com/package/@neteasecloudmusicapienhanced/api

- **Docker 镜像**：https://hub\.docker\.com/r/moefurina/ncm\-api

- **原版项目仓库**：https://github\.com/binaryify/NeteaseCloudMusicApi

- **贡献指南**：https://www\.focalors\.ltd/post/how\-to\-contribute\-ncm\-api

文档版本：v1\.0 ｜ 最后更新：2026 年 7 月

> （注：部分内容可能由 AI 生成）
