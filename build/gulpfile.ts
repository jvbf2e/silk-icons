import { series, parallel } from 'gulp'
import { mkdir } from 'fs/promises'

import { withTaskName } from './utils/gulp'
import { run } from './utils/process'
import { epOutput } from './utils/paths'

const runTask = (name: string) =>
  withTaskName(name, () => run(`pnpm run build ${name}`))

export default series(
  withTaskName('clean', async () => run('rm -rf ./dist')),
  withTaskName('createOutput', () => mkdir(epOutput, { recursive: true })),

  parallel(
    runTask('buildModules'),
    runTask('buildFullBundle'),
    runTask('generateTypesDefinitions'),
    runTask('buildHelper'),
    series(
      withTaskName('buildThemeChalk', () =>
        run('pnpm run -C packages/theme-chalk build')
      )
    )
  )
)
