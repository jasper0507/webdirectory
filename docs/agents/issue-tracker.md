# Issue 跟踪器：GitHub

本仓库的 Issue 与规格记录在 GitHub Issues 中，所有操作使用 `gh` CLI。

## 约定

- 使用 `gh issue` 命令创建、读取、评论、标记和关闭 Issue。
- 根据 `git remote -v` 推断仓库。
- 默认不将 Pull Request 视为待分诊请求。

## 当技能要求“发布到 Issue 跟踪器”时

创建一个 GitHub Issue。

## 当技能要求“获取相关工单”时

运行 `gh issue view <number> --comments`。
