import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { prepareCapture } from '../src/capture.ts'
import { captureBookmarks, selectTagIndexes, writePortalSource } from './add-bookmark.mjs'

let directory

const identity = {
  wordmark: '试厅',
  monument: ['甲', '乙'],
  eyebrow: 'BIBLIOTHECA',
  stampEn: 'SEVEN SHELVES',
  convergence: '七卷同归',
  whisper: ['第一行', '第二行'],
  placeholder: '键入书签或站点...',
  colophonLeft: 'LEFT',
  colophonRight: 'RIGHT',
}

function portalSource(bookmarks) {
  return JSON.stringify({ identity, bookmarks })
}

async function runCapture(original, answers) {
  const initial = prepareCapture(original, [])
  expect(initial.ok).toBe(true)
  if (!initial.ok) return null

  const question = async () => {
    const answer = answers.shift()
    if (answer === undefined) throw new Error('测试回答不足。')
    return answer
  }
  const captured = await captureBookmarks(
    question,
    initial.tags,
    JSON.parse(original).bookmarks.length,
    (drafts) => prepareCapture(original, drafts),
  )
  expect(answers).toEqual([])
  return captured
}

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true })
  directory = undefined
  vi.restoreAllMocks()
})

describe('bookmark:add helpers', () => {
  it('按编号多选标签并去重', () => {
    const options = [{ name: '工具' }, { name: '文档' }]
    expect(selectTagIndexes('2, 1, 2', options)).toEqual(['文档', '工具'])
    expect(selectTagIndexes('', options)).toEqual([])
    expect(selectTagIndexes('3', options)).toBeNull()
  })

  it('在最终汇总保留无效草稿并允许修改后写入', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const errors = []
    vi.spyOn(console, 'error').mockImplementation((message) => errors.push(message))
    const original = portalSource([
      { title: '已有', url: 'https://old.example/', tags: ['工具'] },
    ])

    const captured = await runCapture(original, [
      'https://old.example/#duplicate',
      '新增',
      '1',
      '',
      '',
      '1',
      '1',
      'HTTPS://NEW.EXAMPLE:443/#top',
      '',
      '',
    ])

    expect(errors.join('\n')).toContain('第 1 条 · URL：与其他书签重复。')
    expect(captured?.ok).toBe(true)
    expect(captured?.entries).toEqual([
      { title: '新增', url: 'https://new.example/', tags: ['工具'] },
    ])
  })

  it('确认后删除唯一暂存条目且不写入', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const original = portalSource([
      { title: '已有', url: 'https://old.example/', tags: ['工具'] },
    ])

    const captured = await runCapture(original, [
      'https://new.example/',
      '新增',
      '1',
      '',
      '',
      '1',
      '5',
      'y',
    ])

    expect(captured).toBeNull()
  })

  it('必填项空回车可确认放弃当前条目', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const original = portalSource([
      { title: '已有', url: 'https://old.example/', tags: ['工具'] },
    ])

    expect(await runCapture(original, ['', 'y'])).toBeNull()
  })

  it('一行展示三个标签并可用 q 放弃全部', async () => {
    const logs = []
    vi.spyOn(console, 'log').mockImplementation((message) => logs.push(message))
    const original = portalSource([
      { title: '已有一', url: 'https://one.example/', tags: ['工具'] },
      { title: '已有二', url: 'https://two.example/', tags: ['文档'] },
      { title: '已有三', url: 'https://three.example/', tags: ['设计'] },
    ])

    const captured = await runCapture(original, [
      'https://new.example/',
      '新增',
      '1',
      '',
      '',
      'q',
      'y',
    ])

    expect(logs.some((line) => line.includes('1.') && line.includes('2.') && line.includes('3.')))
      .toBe(true)
    expect(captured).toBeNull()
  })

  it('仅在门户源未变化时原子替换', async () => {
    directory = await mkdtemp(join(tmpdir(), 'webdirectory-capture-'))
    const path = join(directory, 'portal.json')
    await writeFile(path, 'before\n')

    await writePortalSource(path, 'before\n', 'after\n')
    expect(await readFile(path, 'utf8')).toBe('after\n')

    await expect(writePortalSource(path, 'before\n', 'wrong\n')).rejects.toThrow(
      '录入期间门户源已被修改',
    )
    expect(await readFile(path, 'utf8')).toBe('after\n')
  })
})
