import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { URL } from 'node:url'

const source = JSON.parse(await readFile(new URL('../node_modules/@iconify-json/devicon/icons.json', import.meta.url), 'utf8'))
const simple = JSON.parse(await readFile(new URL('../node_modules/@iconify-json/simple-icons/icons.json', import.meta.url), 'utf8'))
const output = new URL('../public/icons/', import.meta.url)
await mkdir(output, { recursive: true })
const icons = ['react', 'javascript', 'html5', 'css3', 'tailwindcss', 'wordpress', 'nodejs', 'express', 'postgresql', 'java', 'csharp', 'github']
for (const name of icons) {
  const icon = source.icons[name]
  const monochrome = ['wordpress', 'github', 'express'].includes(name)
  const body = monochrome ? icon.body.replace(/fill="#[A-Fa-f0-9]+"/g, 'fill="#c7d6ca"') : icon.body
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" fill="${monochrome ? '#c7d6ca' : '#000'}" viewBox="0 0 ${icon.width || source.width} ${icon.height || source.height}">${body.replace(/currentColor/g, '#c4d3c9')}</svg>\n`
  await writeFile(new URL(`${name}.svg`, output), svg)
}
for (const [slug, name, colour] of [['microsoft-office-365', 'microsoftoffice', '#d69b7e'], ['hostinger', 'hostinger', '#b7a1df'], ['godaddy', 'godaddy', '#9ed0bf']]) {
  const icon = simple.icons[name]
  await writeFile(new URL(`${slug}.svg`, output), `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 ${icon.width || simple.width} ${icon.height || simple.height}" fill="${colour}">${icon.body.replace(/currentColor/g, colour)}</svg>\n`)
}
// Keep the old URL working for portfolio tabs opened before this revision.
await writeFile(new URL('office-365.svg', output), await readFile(new URL('microsoft-office-365.svg', output), 'utf8'))
// Original illustrative flower and SG hosting monogram, drawn as paths only.
await writeFile(new URL('daisy-ui.svg', output), '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 128 128"><g fill="#b3a4c8"><ellipse cx="64" cy="36" rx="14" ry="27"/><ellipse cx="64" cy="92" rx="14" ry="27"/><ellipse cx="36" cy="64" rx="27" ry="14"/><ellipse cx="92" cy="64" rx="27" ry="14"/></g><circle cx="64" cy="64" r="19" fill="#233028"/><circle cx="64" cy="64" r="10" fill="#d2c7a6"/></svg>\n')
await writeFile(new URL('siteground.svg', output), '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 128 128" fill="none" stroke="#adc998" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="19" width="112" height="90" rx="20" stroke-width="3"/><path d="M53 43H35a11 11 0 0 0 0 22h9a11 11 0 0 1 0 22H25m76-42a25 25 0 1 0 0 38V65H86"/><path d="M22 98h84" opacity=".4" stroke-width="2"/></svg>\n')
await writeFile(new URL('NOTICE.txt', output), 'Twelve technology icons extracted from Devicon via @iconify-json/devicon (MIT).\nSource: https://github.com/devicons/devicon\nLicense: LICENSE-devicon.txt\nMicrosoft Office, Hostinger, and GoDaddy silhouettes extracted from Simple Icons via @iconify-json/simple-icons (CC0-1.0).\nSource: https://github.com/simple-icons/simple-icons\nLicense: LICENSE-simple-icons.txt\nBrand names and logos belong to their respective owners.\nDaisy UI flower and SiteGround SG monogram are original illustrative emblems.\nRegenerate: node scripts/prepare-technology-icons.mjs\n')
console.log(`Prepared ${icons.length + 5} local technology emblems.`)
