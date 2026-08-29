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
    console.log('此项不能为空。')
  }
}

async function chooseTags(question, options) {
  for (;;) {
    let selected = []
    if (options.length > 0) {
      console.log('\n已有标签：')
      for (const [index, tag] of options.entries()) {
        console.log(`  ${String(index + 1)}. ${tag.name}（${String(tag.count)}）`)
      }
      for (;;) {
        const answer = await question('选择标签编号，多个用逗号分隔（回车跳过）：')
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

    const action = (await question('每条书签至少需要一个标签。输入 c 取消本条，回车重新选择：'))
      .trim()
      .toLowerCase()
    if (action === 'c') return null
  }
}

async function promptEntry(question, tags) {
  const url = (await question('\nURL（回车取消当前条目）：')).trim()
  if (!url) return null
  const title = await required(question, '标题：')
  const selectedTags = await chooseTags(question, tags)
  if (!selectedTags) return null
  const description = (await question('描述（可选）：')).trim()
  return { title, url, tags: selectedTags, ...(description ? { description } : {}) }
}

async function main() {
  const original = await readFile(portalPath, 'utf8')
  const { prepareCapture } = await loadCapture()
  let prepared = prepareCapture(original, [])
  if (!prepared.ok) {
    console.error('当前门户源无效，未开始收录：')
    printIssues(prepared.issues)
    process.exitCode = 1
    return
  }

  const readline = createInterface({ input: stdin, output: stdout })
  const abort = new AbortController()
  readline.on('SIGINT', () => abort.abort())
  const question = (prompt) => readline.question(prompt, { signal: abort.signal })

  console.log('门户书签收录')
  try {
    for (;;) {
      const draft = await promptEntry(question, prepared.tags)
      if (!draft) break

      const candidate = prepareCapture(original, [...prepared.entries, draft])
      if (!candidate.ok) {
        console.error('当前条目无效，请重新填写：')
        printIssues(candidate.issues)
        continue
      }
      prepared = candidate
      console.log(`已暂存：${draft.title}`)
      if (!(await confirm(question, '继续添加？'))) break
    }

    if (prepared.entries.length === 0) {
      console.log('没有新增书签，门户源未修改。')
      return
    }

    console.log('\n待写入书签：')
    for (const [index, entry] of prepared.entries.entries()) {
      console.log(
        `  ${String(index + 1)}. ${entry.title} · ${entry.url} · ${entry.tags.join('、')}`,
      )
    }
    if (!(await confirm(question, '写入 public/portal.json？'))) {
      console.log('已取消，门户源未修改。')
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
