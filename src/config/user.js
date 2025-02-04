/* eslint-disable no-console */

import { lilconfig } from 'lilconfig'
import merge from 'merge-options'
import { pathToFileURL } from 'url'

/**
 * @typedef {import("./../types").Options} Options
 */

/** @type {Omit<Options, "fileConfig">} */
const defaults = {
  // global options
  debug: false,
  // test cmd options
  test: {
    build: false,
    runner: 'node',
    target: ['node', 'browser', 'webworker'],
    watch: false,
    files: [],
    timeout: 60000,
    grep: '',
    bail: false,
    progress: false,
    cov: false,
    browser: {
      config: {
        buildConfig: {
          conditions: ['production']
        }
      }
    },
    before: async () => { return undefined },
    after: async () => {}
  },
  // build cmd options
  build: {
    bundle: true,
    bundlesize: false,
    bundlesizeMax: '100kB',
    types: true,
    config: {}
  },
  // linter cmd options
  lint: {
    silent: false,
    fix: false,
    files: [
      '*.{js,ts}',
      'bin/**',
      'config/**/*.{js,ts}',
      'test/**/*.{js,ts}',
      'src/**/*.{js,ts}',
      'tasks/**/*.{js,ts}',
      'benchmarks/**/*.{js,ts}',
      'utils/**/*.{js,ts}',
      '!**/node_modules/**'
    ]
  },
  // docs cmd options
  docs: {
    publish: false,
    entryPoint: 'src/index.js'
  },
  // ts cmd options
  ts: {
    preset: undefined,
    include: []
  },
  // release cmd options
  release: {
    build: true,
    types: true,
    test: true,
    lint: true,
    contributors: true,
    bump: true,
    changelog: true,
    publish: true,
    commit: true,
    tag: true,
    push: true,
    ghrelease: true,
    docs: true,
    ghtoken: '',
    type: 'patch',
    preid: undefined,
    distTag: 'latest',
    remote: 'origin'
  },
  // dependency check cmd options
  dependencyCheck: {
    input: [
      'package.json',
      '.aegir.js',
      '.aegir.cjs',
      'src/**/*.js',
      'src/**/*.cjs',
      'test/**/*.js',
      'test/**/*.cjs',
      'dist/**/*.js',
      'benchmarks/**/*.js',
      'benchmarks/**/*.cjs',
      'utils/**/*.js',
      'utils/**/*.cjs',
      '!./test/fixtures/**/*.js',
      '!./test/fixtures/**/*.cjs',
      '!./dist/test/fixtures/**/*.js',
      '!./dist/test/fixtures/**/*.cjs',
      '!**/*.min.js'
    ],
    productionOnly: false,
    productionInput: [
      'package.json',
      'src/**/*.js',
      'src/**/*.cjs',
      'dist/src/**/*.js',
      'utils/**/*.js',
      'utils/**/*.cjs'
    ],
    ignore: [
      '@types/*'
    ]
  }
}

/**
 * Search for local user config
 *
 * @param {string | undefined} [searchFrom]
 * @returns {Promise<Options>}
 */
export const config = async (searchFrom) => {
  let userConfig
  try {
    const loadEsm = async (/** @type {string} */ filepath) => {
      /** @type {any} */
      const res = await import(pathToFileURL(filepath).toString())

      if (res.default != null) {
        return res.default
      }

      if (typeof res.toString === 'function') {
        return res
      }

      // if there's no toString function, this was an ES module that didn't export anything
      return {}
    }
    const loadedConfig = await lilconfig('aegir', {
      loaders: {
        '.js': loadEsm,
        '.mjs': loadEsm
      },
      searchPlaces: [
        'package.json',
        '.aegir.js',
        '.aegir.cjs'
      ]
    })
      .search(searchFrom)

    if (loadedConfig) {
      userConfig = loadedConfig.config
    } else {
      userConfig = {}
    }
  } catch (err) {
    console.error(err)
    throw new Error('Error finding your config file.')
  }

  const conf = /** @type {Options} */(merge(
    defaults,
    userConfig
  ))

  return conf
}

export const loadUserConfig = () => config()
