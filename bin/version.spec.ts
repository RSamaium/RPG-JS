import { describe, expect, it } from 'vitest'
import { replaceWorkspaceReferences } from './version'

describe('publish manifest versioning', () => {
  it('replaces internal workspace protocols with publishable versions', () => {
    const packages = new Map([
      ['@rpgjs/common', {
        name: '@rpgjs/common',
        version: '5.0.0-rc.2',
        path: '/tmp/common'
      }]
    ])

    expect(replaceWorkspaceReferences({
      '@rpgjs/common': 'workspace:*',
      rxjs: '^7.8.2'
    }, packages)).toEqual({
      '@rpgjs/common': '5.0.0-rc.2',
      rxjs: '^7.8.2'
    })
  })

  it('leaves external dependency ranges unchanged', () => {
    const dependencies = { rxjs: '^7.8.2' }

    expect(replaceWorkspaceReferences(dependencies, new Map())).toBe(dependencies)
  })
})
