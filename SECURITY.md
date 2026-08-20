# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ |

## Reporting a vulnerability

请通过 GitHub 的 **Private vulnerability reporting** 功能（仓库页面 →
Security → Report a vulnerability）提交安全问题，或向维护者发送私信。

请勿在公开 Issue 中披露未修复的安全漏洞。

### 我们承诺

- 48 小时内确认收到报告；
- 评估后 7 天内给出修复计划；
- 修复后发布补丁版本并在 CHANGELOG 中注明。

## Security notes

本项目工具（`tools/mem.js`、`tools/pdfread.py`）均为纯本地运行，无网络调用、
无遥测。PDF 解析依赖 PyMuPDF（C 实现）；如处理不可信 PDF，请使用受信任的
PyMuPDF 版本并关注其上游安全公告。
