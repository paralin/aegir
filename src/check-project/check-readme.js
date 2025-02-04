
/* eslint-disable no-console */

import fs from 'fs'
import path from 'path'
import {
  ensureFileHasContents
} from './utils.js'
import { toc as makeToc } from 'mdast-util-toc'
import { parseMarkdown, writeMarkdown } from './readme/utils.js'
import { HEADER } from './readme/header.js'
import { LICENSE } from './readme/license.js'
import { INSTALL } from './readme/install.js'

/**
 * @param {string} projectDir
 * @param {string} repoUrl
 * @param {string} defaultBranch
 */
export async function checkReadme (projectDir, repoUrl, defaultBranch) {
  const repoParts = repoUrl.split('/')
  const repoName = repoParts.pop()
  const repoOwner = repoParts.pop()

  if (repoName == null || repoOwner == null) {
    throw new Error(`Could not parse repo owner & name from ${repoUrl}`)
  }

  console.info('Check README files')

  const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), {
    encoding: 'utf-8'
  }))

  const readmePath = path.join(projectDir, 'README.md')
  let readmeContents = ''

  if (fs.existsSync(readmePath)) {
    readmeContents = fs.readFileSync(path.join(projectDir, 'README.md'), {
      encoding: 'utf-8'
    })
  }

  // replace the magic OPTION+SPACE character that messes up headers
  readmeContents = readmeContents.replaceAll(' ', ' ')

  // parse the project's readme file
  const file = parseMarkdown(readmeContents)

  // create basic readme with heading, CI link, etc
  const readme = parseMarkdown(HEADER(pkg, repoOwner, repoName, defaultBranch))

  // remove existing header, CI link, etc
  /** @type {import('mdast').Root} */
  const parsedReadme = {
    type: 'root',
    children: []
  }

  let tocIndex = -1
  let installIndex = -1
  let licenseFound = false

  file.children.forEach((child, index) => {
    const rendered = writeMarkdown(child).toLowerCase()

    if (child.type === 'heading' && index === 0) {
      // skip heading
      return
    }

    if (child.type === 'paragraph' && index === 1) {
      // skip badges
      return
    }

    if (child.type === 'blockquote' && tocIndex === -1 && installIndex === -1) {
      // skip project overview
      return
    }

    if (rendered.includes('## table of')) {
      // skip toc header
      tocIndex = index
      return
    }

    if (tocIndex !== -1 && index === tocIndex + 1) {
      // skip toc header
      return
    }

    if (child.type === 'heading' && rendered.includes('install')) {
      // skip install
      installIndex = index
      return
    }

    if (installIndex !== -1 && index === installIndex + 1) {
      // skip install
      return
    }

    if ((child.type === 'heading' && rendered.includes('license')) || licenseFound) {
      licenseFound = true
      return
    }

    parsedReadme.children.push(child)
  })

  const installation = parseMarkdown(INSTALL(pkg))
  const license = parseMarkdown(LICENSE[repoOwner])

  parsedReadme.children = [
    ...installation.children,
    ...parsedReadme.children,
    ...license.children
  ]

  const toc = makeToc(parsedReadme, {
    tight: true
  })

  if (toc.map == null) {
    throw new Error('Could not create TOC for README.md')
  }

  readme.children = [
    ...readme.children,
    toc.map,
    ...parsedReadme.children
  ]

  await ensureFileHasContents(projectDir, 'README.md', writeMarkdown(readme))
}
