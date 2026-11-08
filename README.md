# 学习乐园（Learning System）

给自己孩子用的学习 app。第一版是**学前数学（4–5 岁）**，跟着马来西亚学前课纲 Matematik Awal 的三个部分：
Pranombor（数前概念）、Konsep Nombor（数的概念）、Bentuk dan Ruang（形状与空间）。

- 不用上网、不用登录、没有广告，资料只存在手机里
- 全程有语音读题（中文 / Bahasa Melayu / English）
- 题目是自动生成的，可以一直练；会按孩子的表现自动调难度

## 现在有的游戏（11 种）

| 部分 | 游戏 | 建议年龄 |
|---|---|---|
| Pranombor | 比大小、按颜色分类、按形状分类、比多少、找规律 | 4+ |
| Konsep Nombor | 数数 1–5、认数字 1–5 | 4+ |
| Konsep Nombor | 数数 1–10、认数字 1–10、描数字 0–9 | 5+ |
| Bentuk dan Ruang | 认识形状（圆形、三角形、正方形、长方形） | 4+ |

一开始只开放 4 个最基本的游戏，孩子练得不错后会自动开放下一个（家长区可以设定全部开放）。

## 安装到 Android 手机

1. 用手机打开 **https://github.com/kiraeduvo/Learning-System/releases/tag/apk-latest**
2. 下载 `learning-system.apk`
3. 打开下载的文件。手机会问要不要允许"安装未知来源的应用"，选允许
4. 安装好后，桌面会出现「学习乐园」小熊图标

**更新**：每次代码有更新，GitHub 会自动打包新的 APK（大约 5–10 分钟），一样从上面的链接下载安装。

## 第一次使用

1. 输入孩子的名字、出生年份、选头像和语言
2. 点右上角 ⚙︎ 进家长区（要答一题加法，防止孩子乱改）
3. 在「语音」那里按「测试语音」。没有声音的话，到手机的
   「设置 → 系统 → 语言和输入法 → 文字转语音」下载中文 / 马来文语音资料
4. 可以设定：每次几题、每天最多几次、说话速度、奖励目标（例如集满 30 颗星星去公园）

## 设定固定签名（建议做一次）

Android 规定：新版 APK 的签名要跟旧版一样，才能直接覆盖安装。
没有设定的话，每次更新要先「导出备份 → 删除 app → 安装新版 → 还原备份」。

设定方法（只要做一次）：到 GitHub 这个 repo 的
**Settings → Secrets and variables → Actions → New repository secret**，加两个：

| 名字 | 内容 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | 签名档（base64 文字） |
| `ANDROID_KEYSTORE_PASSWORD` | 签名档密码 |

加好后到 **Actions → Build APK → Run workflow** 重新打包一次。
签名档和密码不要放进代码里（这个 repo 是公开的）。

## 资料备份

所有进度只存在这台手机里。换手机或删除 app 之前：家长区 → 资料备份 → 导出备份
（可以发给自己的 WhatsApp 或存到 Google Drive）。新手机上第一次打开时选「我有备份，要还原」。

## 开发

```bash
npm install
npm run dev        # 浏览器里开发：http://localhost:5173
npm test           # 单元测试（题目生成器、学习流程）
npm run build      # 打包网页
npx cap sync android   # 把网页放进 Android 项目
```

- `src/core/`：技能地图（`skills.ts`）、题目生成器（`generators.ts`）、学习流程（`learning.ts`）、三种语言（`i18n.ts`）
- `src/engines/`：四种题型：数数、选择题、拖拉分类、描数字
- `src/screens/`：主页、练习、奖励、贴纸册、家长区
- `android/`：Capacitor 产生的 Android 项目；`scripts/make-icons.cjs` 产生图标
- `.github/workflows/android.yml`：自动打包 APK

## 课纲说明

技能按 KSPK / KP2027 学前课纲 Matematik Awal 的分类整理，建议年龄（4+ / 5+）是大概的。
官方 DSKP 的 Standard Pembelajaran 编号还没对照，之后补上（见 [ROADMAP.md](ROADMAP.md)）。
