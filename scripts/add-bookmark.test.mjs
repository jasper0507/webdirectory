import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { selectTagIndexes, writePortalSource } from './add-bookmark.mjs'

let directory

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true })
  directory = undefined
})

describe('bookmark:add helpers', () => {
  it('按编号多选标签并去重', () => {
    const options = [{ name: '工具' }, { name: '文档' }]
    expect(selectTagIndexes('2, 1, 2', options)).toEqual(['文档', '工具'])
    expect(selectTagIndexes('', options)).toEqual([])
    expect(selectTagIndexes('3', options)).toBeNull()
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
