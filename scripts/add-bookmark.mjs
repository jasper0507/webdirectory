import { randomUUID } from 'node:crypto'
import { open, readFile, rename, rm, stat } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const portalPath = fileURLToPath(new URL('../public/portal.json', import.meta.url))

function normalizeTags(value) {
  return [...new Set(value.split(/[,，]/).map((tag) => tag.trim().normalize('NFC')).filter(Boolean))]
}

export function selectTagIndexes(value, options) {
  if (!value.trim()) return []
  const indexes = value.split(/[,，]/).map((part) => Number(part.trim()) - 1)
  if (indexes.some((index) => !Number.isInteger(index) || !options[index])) return null
  return [...new Set(indexes.map((index) => options[index].name))]
}

export async function writePortalSource(path, expected, next) {
  if ((await readFile(path, 'utf8')) !== expected) {
    throw new Error('录入期间门户源已被修改，请重新运行命令。')
  }

  const mode = (await stat(path)).mode
  const temporary = `${dirname(path)}/.${basename(path)}.${process.pid}.${randomUUID()}.tmp`
  let handle
  try {
    handle = await open(temporary, 'wx', mode)
    await handle.writeFile(next, 'utf8')
    await handle.sync()
    await handle.close()
    handle = undefined

    // ponytail: 两次比对覆盖日常编辑冲突；真有并发写入时再加跨进程锁。
    if ((await readFile(path, 'utf8')) !== expected) {
      throw new Error('录入期间门户源已被修改，请重新运行命令。')
    }
    await rename(temporary, path)
  } finally {
    await handle?.close()
    await rm(temporary, { force: true })
  }
}

async function loadCapture() {
  const server = await createServer({
    root: repoRoot,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })
  try {
    return await server.ssrLoadModule('/src/capture.ts')
  } finally {
    await server.close()
  }
}

function printIssues(issues) {
  for (const issue of issues) {
    console.error(`  - ${issue.path || '/'}：${issue.message}`)
  }
}

const FIELD_NAMES = {
  url: 'URL',
  title: '标题',
  tags: '标签',
  description: '描述',
}

function printDraftIssues(issues, existingCount) {
  console.error('\n需要修正：')
  for (const issue of issues) {
    const match = issue.path.match(/^\/bookmarks\/(\d+)(?:\/([^/]+))?/)
    const index = match ? Number(match[1]) - existingCount : -1
    const field = match?.[2] ? FIELD_NAMES[match[2]] : undefined
    const message =
      issue.code === 'duplicate-title' || issue.code === 'duplicate-url'
        ? '与其他书签重复。'
        : issue.message
    console.error(
      index >= 0
        ? `  - 第 ${String(index + 1)} 条 · ${field ?? '条目'}：${message}`
        : `  - ${issue.path || '/'}：${message}`,
    )
  }
}

async function confirm(question, prompt) {
  for (;;) {
    const answer = (await question(`${prompt} (y/N) `)).trim().toLowerCase()
    if (!answer || ['n', 'no', '否'].includes(answer)) return false
    if (['y', 'yes', '是'].includes(answer)) return true
    console.log('请输入 y 或 n。')
  }
}

async function required(question, prompt) {
  for (;;) {
    const answer = (await question(prompt)).trim()
    if (answer) return answer
    if (await confirm(question, '放弃当前条目并返回汇总？')) return null
  }
}

async function chooseTags(question, options, current = []) {
  for (;;) {
    let selected = current
    if (options.length > 0) {
      console.log('\n已有标签：')
      // ponytail: 三列覆盖常见终端；标签变长时再按显示宽度动态分栏。
      for (let index = 0; index < options.length; index += 3) {
        console.log(
          `  ${options
            .slice(index, index + 3)
            .map(
              (tag, offset) =>
                `${String(index + offset + 1)}. ${tag.name}（${String(tag.count)}）`,
            )
            .join('    ')}`,
        )
      }
      for (;;) {
        const answer = await question(
          `选择标签编号，多个用逗号分隔（回车${current.length > 0 ? '保持原值' : '跳过'}）：`,
        )
        if (!answer.trim() && current.length > 0) break
        const tags = selectTagIndexes(answer, options)
        if (tags) {
          selected = tags
          break
        }
        console.log('请输入列表中的编号。')
      }
    } else {
      console.log('\n当前还没有标签。')
    }

    let created = []
    if (await confirm(question, '需要创建新标签吗？')) {
      created = normalizeTags(await question('新标签，多个用逗号分隔：'))
    }
    const tags = [...new Set([...selected, ...created])]
    if (tags.length > 0) return tags

    console.log('每条书签至少需要一个标签。')
    if (await confirm(question, '放弃当前条目并返回汇总？')) return null
  }
}

async function promptEntry(question, tags) {
  const url = await required(question, '\nURL：')
  if (!url) return null
  const title = await required(question, '标题：')
  if (!title) return null
  const selectedTags = await chooseTags(question, tags)
  if (!selectedTags) return null
  const description = (await question('描述（可选）：')).trim()
  return { title, url, tags: selectedTags, ...(description ? { description } : {}) }
}

function printDrafts(drafts) {
  console.log('\n待写入书签：')
  for (const [index, draft] of drafts.entries()) {
    console.log(
      `  ${String(index + 1)}. ${draft.title} · ${draft.url} · ${draft.tags.join('、')}`,
    )
  }
}

async function editDraft(question, draft, tags, number) {
  const edited = { ...draft, tags: [...draft.tags] }
  for (;;) {
    console.log(`\n第 ${String(number)} 条：`)
    console.log(`  1. URL    ${edited.url}`)
    console.log(`  2. 标题   ${edited.title}`)
    console.log(`  3. 标签   ${edited.tags.join('、')}`)
    console.log(`  4. 描述   ${edited.description || '（无）'}`)
    console.log('  5. 删除此条')

    const action = (await question('\n[Enter] 返回汇总；输入编号修改：')).trim()
    if (!action) return edited
    if (action === '1') {
      const value = (await question('URL（回车保持）：')).trim()
      if (value) edited.url = value
    } else if (action === '2') {
      const value = (await question('标题（回车保持）：')).trim()
      if (value) edited.title = value
    } else if (action === '3') {
      const value = await chooseTags(question, tags, edited.tags)
      if (value) edited.tags = value
    } else if (action === '4') {
      const value = (await question('描述（回车清空）：')).trim()
      if (value) edited.description = value
      else delete edited.description
    } else if (action === '5') {
      if (await confirm(question, '删除这条暂存书签？')) return null
    } else {
      console.log('请输入页面中的编号。')
    }
  }
}

export async function captureBookmarks(question, initialTags, existingCount, prepare) {
  let drafts = []
  let tags = initialTags

  for (;;) {
    const draft = await promptEntry(question, tags)
    if (draft) drafts.push(draft)
    else console.log('已放弃当前条目。')
    if (drafts.length === 0) return null

    for (;;) {
      const candidate = prepare(drafts)
      if (candidate.ok) {
        drafts = candidate.entries
        tags = candidate.tags
      }

      printDrafts(drafts)
      if (!candidate.ok) printDraftIssues(candidate.issues, existingCount)

      const action = (
        await question(
          `\n${candidate.ok ? '[Enter] 写入  ' : ''}[1-${String(drafts.length)}] 查看或修改  [0] 继续添加  [q] 放弃全部\n> `,
        )
      ).trim()
      if (!action) {
        if (candidate.ok) return candidate
        console.log('请先修正以上问题。')
        continue
      }
      if (action === '0') break
      if (action.toLowerCase() === 'q') {
        if (await confirm(question, '放弃全部暂存书签？')) return null
        continue
      }

      const index = Number(action) - 1
      if (!Number.isInteger(index) || !drafts[index]) {
        console.log('请输入页面中的编号。')
        continue
      }
      const edited = await editDraft(question, drafts[index], tags, index + 1)
      if (edited) drafts[index] = edited
      else drafts.splice(index, 1)

      if (drafts.length === 0) {
        console.log('\n没有待写入书签。')
        return null
      }
    }
  }
}

async function main() {
  const original = await readFile(portalPath, 'utf8')
  const { prepareCapture } = await loadCapture()
  const initial = prepareCapture(original, [])
  if (!initial.ok) {
    console.error('当前门户源无效，未开始收录：')
    printIssues(initial.issues)
    process.exitCode = 1
    return
  }

  const readline = createInterface({ input: stdin, output: stdout })
  const abort = new AbortController()
  readline.on('SIGINT', () => abort.abort())
  const question = (prompt) => readline.question(prompt, { signal: abort.signal })

  console.log('门户书签收录')
  try {
    const existingCount = JSON.parse(original).bookmarks.length
    const prepared = await captureBookmarks(
      question,
      initial.tags,
      existingCount,
      (drafts) => prepareCapture(original, drafts),
    )
    if (!prepared) {
      console.log('没有新增书签，门户源未修改。')
      return
    }

    await writePortalSource(portalPath, original, prepared.jsonText)
    console.log(`已收录 ${String(prepared.entries.length)} 条书签。请检查 git diff 后自行提交。`)
  } finally {
    readline.close()
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    if (error?.name === 'AbortError') {
      console.log('\n已取消，门户源未修改。')
      process.exitCode = 130
      return
    }
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
