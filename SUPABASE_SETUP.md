# 练习工作台 · Supabase 配置指南

练习工作台（`/app/`）需要 Supabase 提供账号登录（魔法链接）和数据库。按下面 4 步配置，一次即可。

## 1. 创建 Supabase 项目

1. 打开 https://supabase.com ，注册/登录（可用 GitHub 账号直接登录）。
2. **New project** → 起个名字（如 `xitong-sikao`）→ 设一个数据库密码 → 选区域（`Northeast Asia (Tokyo)` 离中国最近）→ Create。
3. 等待约 1–2 分钟，项目就绪。

## 2. 执行数据库脚本

1. 左侧菜单进入 **SQL Editor** → **New query**。
2. 把本仓库 `supabase/schema.sql` 的全部内容粘贴进去 → **Run**。
3. 看到 `Success. No rows returned` 即成功。这会创建 `works` 表并开启行级安全（用户只能读写自己的练习）。

## 3. 配置登录邮件

1. 左侧 **Authentication** → **Sign In / Up**，确认 **Email** 登录方式已启用。
   （魔法链接 `Enable email confirmations` 保持默认即可；如需自定义邮件模板，可在 **Email Templates** → **Magic Link** 中修改。）
2. **Authentication** → **URL Configuration**：
   - **Site URL** 填你的网站地址，如 `https://xitong-sikao.pages.dev`
   - **Redirect URLs** 添加两条（把域名换成你的）：
     - `https://xitong-sikao.pages.dev/app/`
     - `https://xitong-sikao.pages.dev/**`（方便以后扩展）
3. 免费版每天可发 100 封登录邮件，MVP 阶段足够。

## 4. 把密钥填到 Cloudflare Pages

1. 回到 Supabase 项目 → **Project Settings**（左下齿轮）→ **API**，复制：
   - **Project URL**（如 `https://xxxx.supabase.co`）
   - **anon public** key（很长的一串，以 `eyJ` 开头）
2. Cloudflare 后台 → 你的 Pages 项目 → **Settings** → **Environment variables** → **Production** 添加：
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_ANON_KEY` = anon public key
3. 回到 **Deployments** → 右上角 **Retry deployment**（或推一次代码触发重新构建）。

完成后打开 `https://你的域名/app/`，输入邮箱即可收到登录链接，开始使用练习工作台。

## 说明

- `anon key` 是公开密钥，设计上就是给前端用的；真正的数据安全由数据库的 RLS 策略保证。
- 如需在本地预览：`SUPABASE_URL=... SUPABASE_ANON_KEY=... hugo server` 即可。
