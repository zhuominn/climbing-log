# 攀岩日志 App 维护笔记（Maintenance Notes）

这份文档记录“为什么这么实现”，用于避免未来维护时反复踩坑。
优先记录：行为规则、数据一致性、浏览器差异、关键约定。

---

## 目录
- [表格编辑与保存](#表格编辑与保存)
- [多行文本（换行）保存与显示](#多行文本换行保存与显示)
- [行展开/折叠交互](#行展开折叠交互)
- [表格样式约定](#表格样式约定)
- [回归测试清单](#回归测试清单)
- [改动记录模板](#改动记录模板)
- [改动记录](#改动记录)

---

## 表格编辑与保存

### 数据来源与渲染
- `loadLogsFromSupabase()` 从 Supabase 读取 `climbing_logs`，按日期排序渲染到表格。
- 每行 `<tr>` 绑定：
  - `data-id`：Supabase 主键
  - `data-new`：是否为新增未保存行
  - `data-dirty`：是否被编辑过（input 事件标记）

### 保存逻辑
- 保存新行：读取 `tr[data-new='true']` 组装 payload，insert 到 Supabase
- 保存修改：读取 `tr[data-dirty='true']` 且 `data-new !== 'true'` 的行，upsert/update 到 Supabase

---

## 多行文本（换行）保存与显示

### 目标行为
- 在单元格中输入多行（回车换行）
- 保存到 Supabase 后仍保留换行
- 重新加载/刷新后仍以多行显示

### 关键坑：不要用 textContent 读取 contenteditable 的多行内容
`contenteditable` 回车通常产生 `<br>` 或块级元素。
- `textContent` 可能会把 `<br>` 当作空，从而“多行合并成一行”
- 推荐读取方式：`innerText`（更接近“用户看到的文本”，会把换行转成 `\n`）

**约定：保存/更新时读取单元格内容使用 innerText（封装为 `readLogCellText(td)`）。**

### 显示换行：CSS white-space
- 数据库存的是 `\n`
- 显示时需要：
  - `.log-cell { white-space: pre-wrap; }`
否则会被浏览器折叠成一行。

---

## 行展开/折叠交互

### 目标行为（当前约定）
- 单击某一行：整行展开（该行所有格子）
- 再次单击同一行：保持展开（不会折叠）
- 单击不同行：前一行自动折叠，新行展开
- 保存（会重新拉取并重渲染表格）：展开状态回到默认（仅显示前三行）

### 编辑态行（edited-row）额外约定
- 任意单元格输入（触发 `input`）会标记该行 `tr.edited-row`
- `edited-row` 行会“强制展开”，直到保存并重新加载数据

### 实现方式
- 用行级 class 控制：`tr.row-expanded`
- CSS：
  - 默认 `.log-cell` 为 3 行截断（max-height + overflow）
  - 展开时 `tr.row-expanded .log-cell { max-height: none; }`

并且：
- `tr.edited-row .log-cell { max-height: none; overflow: visible; }`

**约定：展开/折叠使用“行级 class”，不要再用“单元格级 .expanded”，避免逻辑冲突。**

---

## 表格样式约定

### 表头居中
- `thead th { text-align: center; vertical-align: middle; }`

### 列对齐规则
- 序号/日期/时长（1-3列）：水平 + 垂直居中
- 内容/达成情况/备注（4-6列）：左对齐 + 垂直居中

### 日期不换行
- 日期列需要强制一行显示（例如 `2025-12-03`）
- 推荐使用 `[data-date-cell="true"] { white-space: nowrap; }`

### 编辑态样式（contenteditable focus）
- 不显示默认黑框（outline）
- 仅显示左侧细色条，并与文字留出间距
- 不使用背景色、外圈、边框

---

## 回归测试清单

每次合并到 main 前至少跑一遍：

1. 新增一行，在“内容”输入 3 行文字（包含换行），保存新记录 → 刷新 → 仍为多行显示
2. 编辑已有多行记录，增加/删除换行，保存修改 → 刷新 → 换行仍保留
3. 单击某行 → 整行展开；再单击同一行任意位置 → 仍保持展开；单击另一行 → 前一行折叠，新行展开
4. 日期显示为同一行，不被拆分
5. 进入编辑时不出现黑框/底色，只显示左侧细色条且有间距
6. 编辑过的行保持展开；保存后重新加载数据 → 回到默认仅显示前三行

---

## 改动记录模板

每次 agent 修改代码后，在 PR 描述或本文件末尾追加一段：

- **Change**：
  - （做了什么）
- **Why**：
  - （为什么这样做 / 避免什么坑）
- **How to test**：
  - 1)
  - 2)
  - 3)
- **Files**：
  - （改了哪些文件）

---

## 改动记录

### 2025-12-30

- **Change**：
  - 保存/更新时改用 `readLogCellText(td)` 读取 `.log-cell` 的 `innerText`，保留多行换行。
  - 编辑过的行（`tr.edited-row`）保持展开显示全部内容，直到保存并重新加载。
  - 行点击选中逻辑改为：同一行再次点击不再折叠；点击另一行才切换折叠/展开。
- **Why**：
  - `textContent` 读取 `contenteditable` 多行内容会丢换行，导致保存后“合并成一行”。
  - 训练内容/备注经常多行，编辑时被三行截断会影响可读性与校对。
  - 展开后的区域仍属于同一行点击目标，之前“再点同一行就折叠”会造成误触折叠。
- **How to test**：
  - 1) 新增/编辑一条记录，在“内容/备注”输入多行 → 保存 → 刷新 → 换行仍在。
  - 2) 编辑任意已有行 → 该行立即展开且保持；保存后回到默认三行截断。
  - 3) 单击行展开；在展开区域（前三行以外）继续点击 → 行仍保持展开；点击其它行才切换。
- **Files**：
  - `logs.js`
  - `main.css`

### 2026-01-06

- **Change**：
  - 将页面脚本/样式迁移到 `assets/`，并切换为 ES Modules：页面仅保留 `type="module"` 入口脚本，避免旧脚本重复绑定事件。
  - 新增“年页面”统一入口（`year.page.js`）：2025/2026 共用一套逻辑（加载数据 → 渲染月历/表格 → 月份过滤；2026 额外渲染 heatmap）。
  - 新增 `reset-password.html` 与对应页面脚本，用于 Supabase recovery 链接落地后更新密码（兼容 `?code=` 与 `#access_token=` 两种回调形态）。
  - 新增 `durationUtils.parseDurationToMinutes()`：严格解析 `x 小时`（含小数、含空格）用于 2026 heatmap 强度（分钟数，四舍五入）。
- **Why**：
  - 旧脚本与 ESM 混用会导致事件重复绑定、状态不一致（UMD 全局 session vs ESM session），从而出现“点击一次触发两次/跳转异常”等隐蔽问题。
  - 2025/2026 逻辑复用，减少“年份写死”与重复维护成本。
  - Supabase 登录报错（Invalid login credentials）需要通过 recovery 流程重置密码；增加独立页面避免依赖控制台手动改密码。
- **How to test**：
  - 1) 通过 `http://localhost:5173/` 打开 `index.html`：已登录跳 `2026.html`，未登录跳 `login.html?next=2026.html`。
  - 2) `2026.html`：heatmap 正常渲染；点击有记录日期可定位并高亮表格行；月份 tab 切换后表格过滤正常。
  - 3) Supabase 发送 recovery 邮件后，用邮件链接打开 `reset-password.html`：能设置新密码；更新后可用新密码登录。
- **Files**：
  - `index.html`
  - `2025.html`
  - `2026.html`
  - `login.html`
  - `reset-password.html`
  - `assets/js/core/supabaseClient.js`
  - `assets/js/pages/index.page.js`
  - `assets/js/pages/login.page.js`
  - `assets/js/pages/year.page.js`
  - `assets/js/pages/resetPassword.page.js`
  - `assets/js/data/logRepository.js`
  - `assets/js/features/monthCalendar.js`
  - `assets/js/features/githubHeatmap.js`
  - `assets/js/features/tableFilter.js`
  - `assets/js/shared/durationUtils.js`
  - `assets/css/main.css`
  - `assets/css/github-heatmap.css`

### 2026-01-08

- **Change**：
  - 2025/2026 页面补齐 heatmap 区块与样式，新增年份切换入口并调整 legend/header 布局；统一 2025 标题文案。
  - 月历 UI 重排：月份标签改为英文缩写，月份 tab 改为右侧竖排滚动，新增纵向月份标识与 `calendar-layout` 布局样式。
  - 月历与表格联动：可点击有记录的日期定位并高亮表格行；行选中逻辑抽成 `activateRow` 供程序调用。
  - heatmap 交互细化：仅对有记录日期绑定 click，网格/legend 间距与样式调整。
- **Why**：
  - 统一 2025/2026 页面布局与 heatmap 体验，年份切换更直观。
  - 减少查找记录的操作成本，右侧竖排 tab 更贴合布局。
  - 避免无数据日期误触，提升 heatmap 可读性与接近 GitHub 风格。
- **How to test**：
  - 1) 打开 `2025.html`/`2026.html`，确认 heatmap header/legend/年份切换显示正常，2025 页面也能渲染 heatmap。
  - 2) 在月历点击有记录日期，表格滚动到对应行并高亮/展开。
  - 3) 月份 tab 竖排可滚动，月份英文缩写与纵向月份标识显示正常。
- **Files**：
  - `2025.html`
  - `2026.html`
  - `assets/js/pages/year.page.js`
  - `assets/js/features/monthCalendar.js`
  - `assets/js/features/githubHeatmap.js`
  - `assets/css/main.css`
  - `assets/css/github-heatmap.css`
