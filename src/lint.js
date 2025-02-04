/* eslint-disable no-console */

import { globby } from 'globby'
import { ESLint } from 'eslint'
import Listr from 'listr'
import path from 'path'
import { execa } from 'execa'
import fs from 'fs-extra'
import merge from 'merge-options'
import { fromRoot, readJson, hasTsconfig, isTypescript } from './utils.js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * @typedef {import("./types").GlobalOptions} GlobalOptions
 * @typedef {import("./types").LintOptions} LintOptions
 * @typedef {import("listr").ListrTaskWrapper} Task
 * @typedef {import("./types").TSOptions} TSOptions
 */

const tasks = new Listr(
  [
    {
      title: 'eslint',
      /**
       *
       * @param {GlobalOptions & LintOptions} ctx
       * @param {Task} task
       */
      task: async (ctx, task) => {
        const eslint = new ESLint({
          fix: ctx.fix,
          baseConfig: { extends: 'ipfs' },
          useEslintrc: true
        })
        const results = await eslint.lintFiles(await globby(ctx.files))
        const formatter = await eslint.loadFormatter('unix')
        const hasErrors = ESLint.getErrorResults(results).length > 0

        if (ctx.fix) {
          await ESLint.outputFixes(results)
        }

        if (!ctx.silent && hasErrors) {
          console.error(formatter.format(results))
        }

        if (hasErrors) {
          throw new Error('Lint errors')
        }
      }
    },
    {
      title: 'tsc',
      /**
       * @param {GlobalOptions & LintOptions} ctx
       */
      enabled: ctx => hasTsconfig && !isTypescript,
      /**
       * @param {GlobalOptions & LintOptions} ctx
       * @param {Task} task
       */
      task: async (ctx, task) => {
        const configPath = fromRoot('tsconfig-check.aegir.json')
        const userTSConfig = readJson(fromRoot('tsconfig.json'))
        try {
          fs.writeJsonSync(
            configPath,
            merge.apply({ concatArrays: true }, [
              userTSConfig,
              {
                compilerOptions: {
                  noEmit: true,
                  emitDeclarationOnly: false
                }
              }
            ])
          )
          await execa('tsc', ['--build', configPath], {
            localDir: path.join(__dirname, '../..'),
            preferLocal: true,
            stdio: 'inherit'
          })
        } finally {
          fs.removeSync(configPath)
          fs.removeSync(fromRoot('dist', 'tsconfig-check.aegir.tsbuildinfo'))
        }
      }
    }
  ],
  {
    renderer: 'verbose'
  }
)

export default tasks
